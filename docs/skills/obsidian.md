Summarize today's conversation and save it to Obsidian vault.

---

## Step 1 — Daily Note

Find the vault path:
```bash
vault=""
for candidate in "$HOME/development-personal/obsidian-vault" "$HOME/development/obsidian-vault"; do
  [ -d "$candidate" ] && vault="$candidate" && break
done

if [ -z "$vault" ]; then
  vault=$(find "$HOME" -maxdepth 5 -type d -name "obsidian-vault" \
    -not -path "$HOME/.zzang/ctx/*" \
    -not -path "$HOME/.claude/zzang-ctx/*" \
    -not -path "$HOME/.codex/*" \
    2>/dev/null | sort | head -1)
fi

printf '%s\n' "$vault"
```

Never use `~/.zzang/ctx/obsidian-vault` or `~/.claude/zzang-ctx/obsidian-vault` as the vault. Those paths are session-context storage, not the user's Obsidian vault.

Read today's existing daily note if it exists:
```bash
cat {vault}/Daily/YYYY-MM-DD.md 2>/dev/null
```

Append only **genuine questions** from the user. A genuine question is one where the user is asking for an explanation, opinion, or information that remains useful as lasting knowledge.

Skip the following even if written as a question:
- Simple commands/instructions (e.g., "커밋해줘", "파일 만들어줘", "스킬 추가해줘", "푸쉬해줘")
- Short operational prompts or work-order prompts (e.g., "이거 해야 하지 않냐", "이제 뭐 해야 되지", "다음 뭐 하지")
- Session-local execution decisions that do not add durable technical insight

Include only questions whose Q/A is still meaningful later without today’s execution context.

For each qualifying topic, append:

```
## [Topic Title]

**Q:** [User's question]

**A:** [Your answer, summarized concisely]
```

Do not duplicate topics already present in the file.

---

## Step 2 — Project Note

Identify the project name from the current working directory:
```bash
git rev-parse --show-toplevel 2>/dev/null | xargs basename
```

Read the existing project note:
```bash
cat {vault}/Projects/{ProjectName}.md 2>/dev/null
```

Update the project note using the rules below. The goal is a single file that always reflects the **current state** of the project — not just a history of sessions.

---

### 프로젝트 구조 (Project Structure)

This section is the live reference for the project.

**If the section does not exist yet** — read the codebase to build it from scratch:
```bash
# File tree (top-level + one level deep, excluding build artifacts)
find {project_root} -maxdepth 2 \
  -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -path '*/build/*' -not -path '*/.gradle/*' -not -path '*/target/*' | sort
```
Then read relevant source files as needed to populate the sections below. Include whichever apply (skip the rest):
- **개요** — 프로젝트 목적, 레포 URL
- **서비스 구조** — 서비스/모듈 목록, 포트, 기술 스택
- **브랜치 구조** — 브랜치별 역할
- **컴포넌트 상세** — 주요 클래스, API 엔드포인트, 설정값
- **데이터 구조** — DB 스키마, Redis 키, 주요 모델
- **주요 플로우** — 핵심 기능의 호출 흐름

**If the section already exists** — do NOT re-read the file tree. Instead, derive what changed from this session's commits and discussion only. Update the affected parts in-place. Mark non-obvious changes with `*(updated YYYY-MM-DD)*`. Leave everything else untouched.

---

### Commits & Changes

- Add a new dated subsection for this session's commits and file changes.
- Do not modify or delete existing subsections.

---

### Implementation Summary

- Re-read the existing Mermaid diagram.
- If the architecture, data flow, or component relationships changed this session, update the diagram to reflect the current state.
- If nothing structural changed, leave the diagram as-is.

---

### Session Log

- Add a new subsection for this session (brief bullets — what was done and decided).
- Do not modify existing session log entries.
- If any fact in a previous entry is now outdated, add a note directly below it:
  ```
  > ~~이전 내용~~ → 변경됨: [새 내용] (YYYY-MM-DD)
  ```

---

### TODO

- Remove items completed this session.
- Add new TODO items discovered this session.

---

Use today's date for all timestamps. Write all content in Korean.