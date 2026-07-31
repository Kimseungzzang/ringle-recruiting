After finishing a development task, run a Codex CLI code review and fix any issues found. Repeat until the review is clean or 3 iterations are reached.

## Step 1 — Verify there are changes to review

Run the following to check for uncommitted changes:

```bash
git diff HEAD --stat
git status --short
```

If there are no changes, inform the user and stop.

## Step 2 — Run Codex Review

Run the following command to get a non-interactive code review from Codex:

```bash
codex review --uncommitted "다음 관점에서 코드를 리뷰해줘:
1. 버그 및 로직 오류
2. 보안 취약점
3. 성능 문제
4. 코드 품질 및 가독성
5. 엣지 케이스 처리

각 이슈에 대해 심각도(Critical / Warning / Info)를 표시해줘."
```

Capture the full output of this command.

## Step 3 — Analyze the Review

Parse the Codex review output and classify findings:

- **Critical**: 버그, 보안 취약점, 로직 오류 → 반드시 수정
- **Warning**: 성능 문제, 엣지 케이스 → 가능하면 수정
- **Info**: 스타일, 가독성 → 참고만

If there are **no Critical or Warning issues**, go to Step 5 (Done).

If Critical or Warning issues exist, go to Step 4.

## Step 4 — Fix Issues and Re-review

Fix all Critical issues and as many Warning issues as possible.

After fixing, display a summary of what was changed:
```
✅ Fixed: [이슈 설명]
⚠️ Skipped: [이슈 설명] (이유)
```

Then go back to **Step 2** and re-run the Codex review.

**Maximum iterations: 3**
- Iteration 1: Fix Critical + Warning
- Iteration 2: Fix remaining Critical
- Iteration 3: Final review — if still Critical, report to user and stop

## Step 5 — Done

When the review is clean (no Critical/Warning), output a final summary:

---

## ✅ 코드 리뷰 완료

**반복 횟수**: [N]회

**수정된 이슈**:
- [수정 내용 목록]

**최종 Codex 리뷰 결과**: 이슈 없음 🎉

---

If max iterations were reached without resolving all issues, output:

---

## ⚠️ 최대 반복 횟수 도달 (3/3)

**미해결 이슈**:
- [남은 이슈 목록]

**권장 조치**: 위 이슈들을 수동으로 검토해주세요.

---