---
name: coderabbit
description: Run and interpret local CodeRabbit PR reviews. Use when the user asks for CodeRabbit, a local AI review, or before creating/updating a PR or MR to decide and run CodeRabbit when configured.
---

# CodeRabbit Local Review

Use this skill to run a local CodeRabbit review before creating or updating a PR/MR when the repo is configured for CodeRabbit, or whenever the user explicitly asks for CodeRabbit review feedback.

## Contract

- Inputs: repo root, base branch, CodeRabbit config when available.
- Outputs: review status plus findings summary by severity and file.
- Blocks on: actionable findings unless fixed, explicitly accepted by the user,
  or skipped by policy.

## Rules

- Binary: `~/bin/coderabbit`.
- Do not ask whether to run CodeRabbit; decide from config and user instructions.
- Run local CodeRabbit exactly once before creating/updating a PR/MR when a CodeRabbit config exists.
- Skip only when:
  1. the repo has no CodeRabbit config,
  2. the user explicitly told you to skip CodeRabbit, or
  3. CodeRabbit says quota reset is more than 10 minutes away.
- If CodeRabbit says quota reset is less than 10 minutes away, wait until reset and run it.
- Never run local CodeRabbit more than once per PR/MR.
- If fixes are needed after a review, apply them and rely on normal tests/lint/build instead of rerunning CodeRabbit.
- Fix actionable findings before opening the PR/MR.
- Flag nitpicks for the user to decide on.

## Command

Find a config from the repository root:

```bash
ls .coderabbit.yaml .coderabbit.yml coderabbit.yaml coderabbit.yml 2>/dev/null | head -n1
```

Run from the repository root with the config path found above. Use a 20-minute
timeout — CodeRabbit analysis can be slow on large diffs:

```bash
timeout 1200 ~/bin/coderabbit review --agent --base <base-branch> -c <config-path>
```

If `coderabbit` is on `PATH`, this equivalent command is also acceptable:

```bash
timeout 1200 coderabbit review --agent --base <base-branch> -c <config-path>
```

If the command times out after 20 minutes, skip the review and report that
CodeRabbit timed out.

## Important Config Detail

The CLI does not auto-read config from the repo root. Always pass `-c <config-path>` so local reviews match GitHub PR review behavior, including tone, path instructions, and review profile.

If no CodeRabbit config is found, skip the review and report that CodeRabbit was not configured.

## Output Interpretation

CodeRabbit emits JSON lines.

- The final line has `"type":"complete"` with a `findings` count.
- `findings: 0` means clean.
- Each finding includes file path, line range, severity, and description.

Summarize findings by severity and file. Keep the raw output out of the final response unless the user asks for details.
