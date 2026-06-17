---
name: coderabbit
description: Run and interpret local CodeRabbit PR reviews. Use when the user asks for CodeRabbit, a local AI review, or before creating/updating a PR or MR to ask whether they want a local CodeRabbit review first.
---

# CodeRabbit Local Review

Use this skill to run a local CodeRabbit review before creating or updating a PR/MR, or whenever the user explicitly asks for CodeRabbit review feedback.

## Rules

- Binary: `~/bin/coderabbit`.
- Before creating or updating a PR/MR, ask the user if they want a local CodeRabbit review first.
- If the user explicitly asks to run CodeRabbit, run it without asking again.
- If the user says "just open it" or explicitly declines, skip the review and do not nag.
- Never run local CodeRabbit more than once per PR/MR.
- If fixes are needed after a review, apply them and rely on normal tests/lint/build instead of rerunning CodeRabbit.
- Fix actionable findings before opening the PR/MR.
- Flag nitpicks for the user to decide on.

## Command

Run from the repository root:

```bash
~/bin/coderabbit review --agent --base <base-branch> -c .coderabbit.yaml
```

If `coderabbit` is on `PATH`, this equivalent command is also acceptable:

```bash
coderabbit review --agent --base <base-branch> -c .coderabbit.yaml
```

## Important Config Detail

The CLI does not auto-read `.coderabbit.yaml` from the repo root. Always pass `-c .coderabbit.yaml` so local reviews match GitHub PR review behavior, including tone, path instructions, and review profile.

If `.coderabbit.yaml` is missing, surface that as a blocker or tradeoff before running the review.

## Output Interpretation

CodeRabbit emits JSON lines.

- The final line has `"type":"complete"` with a `findings` count.
- `findings: 0` means clean.
- Each finding includes file path, line range, severity, and description.

Summarize findings by severity and file. Keep the raw output out of the final response unless the user asks for details.
