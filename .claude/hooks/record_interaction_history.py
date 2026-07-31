#!/usr/bin/env python3
"""Stop hook: append the just-finished turn(s) of this Claude Code session to
docs/coding_agent_interaction_history.md — prompt text only (no tool calls/results).

Reads the Stop hook's stdin JSON ({"transcript_path": ..., "cwd": ..., "session_id": ...}),
finds the lines of the session transcript (JSONL) that haven't been recorded yet
(tracked in .claude/hooks/.interaction_history_state.json, keyed by transcript_path),
and appends a formatted rendering of any new user/assistant text to the docs file.
Safe to run repeatedly: never re-emits lines already recorded, and never touches
anything outside the project directory.
"""
import json
import os
import sys
import datetime

STATE_FILENAME = ".interaction_history_state.json"
MAX_BLOCK_CHARS = 4000


def truncate(text, limit=MAX_BLOCK_CHARS):
    if text is None:
        return ""
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n... [{len(text) - limit} more characters truncated]"


def load_state(path):
    if os.path.isfile(path):
        try:
            with open(path) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_state(path, state):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f)
    os.replace(tmp, path)


def fmt_ts(ts):
    if not ts:
        return ""
    try:
        dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
        dt = dt.astimezone()
        return dt.strftime("%Y-%m-%d %H:%M:%S %Z")
    except Exception:
        return ts


def render_entries(entries):
    """Render transcript entries (in order) to a list of markdown chunks: prompt
    text only. Tool calls, tool results, and thinking blocks are intentionally
    skipped — this is a record of what was said, not what was done."""
    chunks = []

    for entry in entries:
        etype = entry.get("type")
        ts = fmt_ts(entry.get("timestamp"))
        msg = entry.get("message")
        if not isinstance(msg, dict):
            continue
        content = msg.get("content")

        if etype == "user":
            if isinstance(content, str):
                text = content.strip()
                if text:
                    chunks.append(f"### User  _{ts}_\n\n{text}\n")
            elif isinstance(content, list):
                for block in content:
                    if not isinstance(block, dict):
                        continue
                    if block.get("type") == "text":
                        text = block.get("text", "").strip()
                        if text:
                            chunks.append(f"### User  _{ts}_\n\n{text}\n")

        elif etype == "assistant":
            if not isinstance(content, list):
                continue
            parts = []
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "text":
                    text = block.get("text", "").strip()
                    if text:
                        parts.append(truncate(text))
            if parts:
                chunks.append(f"### Assistant  _{ts}_\n\n" + "\n\n".join(parts) + "\n")

    return chunks


def main():
    try:
        hook_input = json.load(sys.stdin)
    except Exception:
        hook_input = {}

    transcript_path = hook_input.get("transcript_path")
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or hook_input.get("cwd")

    if not transcript_path or not project_dir or not os.path.isfile(transcript_path):
        return
    project_dir = os.path.abspath(project_dir)

    docs_path = os.path.join(project_dir, "docs", "coding_agent_interaction_history.md")
    state_path = os.path.join(project_dir, ".claude", "hooks", STATE_FILENAME)
    os.makedirs(os.path.dirname(docs_path), exist_ok=True)
    os.makedirs(os.path.dirname(state_path), exist_ok=True)

    state = load_state(state_path)
    last_index = state.get(transcript_path, 0)

    with open(transcript_path, "r") as f:
        all_lines = f.readlines()

    new_raw_lines = all_lines[last_index:]
    if not new_raw_lines:
        return

    entries = []
    for raw in new_raw_lines:
        raw = raw.strip()
        if not raw:
            continue
        try:
            entries.append(json.loads(raw))
        except Exception:
            continue

    chunks = render_entries(entries)
    state[transcript_path] = len(all_lines)
    save_state(state_path, state)

    if not chunks:
        return

    is_new_file = not os.path.isfile(docs_path)
    is_new_session_in_file = last_index == 0
    session_id = hook_input.get("session_id", "")[:8]

    with open(docs_path, "a") as f:
        if is_new_file:
            f.write("# Coding Agent Interaction History\n\n")
            f.write(
                "Auto-recorded by a Stop hook (`.claude/hooks/record_interaction_history.py`). "
                "Appended after every assistant turn in this project.\n\n"
            )
        if is_new_session_in_file:
            f.write(f"\n---\n\n## Session `{session_id}`  _{fmt_ts(datetime.datetime.now(datetime.timezone.utc).isoformat())}_\n\n")
        f.write("\n".join(chunks))
        f.write("\n")


if __name__ == "__main__":
    main()
