---
description: Create well-formatted commits with conventional commit messages
---

# Commit Command

Create a git commit from staged changes using Conventional Commits format with signing.

## Step 0: Check for Arguments

If the user provides `$ARGUMENTS` (a simple message), skip analysis and go directly to Step 4 using their message. Still apply commit signing.

## Step 1: Check Staged Changes

```bash
git diff --cached --stat
git diff --cached --name-only
```

If nothing is staged, list modified/untracked files with `git status --short` and ask the user what to stage. Do NOT auto-stage everything with `git add .`.

If files are already staged, proceed with those.

## Step 2: Gather Context

```bash
# Current branch
git branch --show-current

# Recent commits for style reference
git log --oneline -5

# Full staged diff for analysis
git diff --cached
```

## Step 3: Analyze Changes

From the diff, determine:

**Type** (one of):
- `feat` - new feature
- `fix` - bug fix
- `refactor` - code restructuring without behavior change
- `docs` - documentation only
- `test` - adding or fixing tests
- `chore` - maintenance, deps, config
- `perf` - performance improvement
- `style` - formatting, whitespace
- `ci` - CI/CD changes
- `revert` - reverting a previous commit

**Scope** (optional):
- Single component/module changed: use that name
- Multiple related files: use parent directory or feature name
- Broad changes: omit scope

**Body**: Include only when the "why" is not obvious from the diff. The body explains motivation, not a line-by-line recap. Do not narrate every file change.

**Issue/ticket references**: If a GitHub issue, GitLab issue, or Jira ticket was referenced, created, or discussed during the session, include a trailer in the commit body (e.g., `Fixes #123`, `Closes #45`, `Refs: RSPEED-678`). Use the appropriate keyword for the forge (`Fixes`/`Closes` for GitHub/GitLab, `Refs:` for Jira).

## Step 4: Present Commit Message Options

Offer 2-3 options:

```text
## Suggested Commits

### Option 1 (recommended)
feat(auth): add automatic token refresh

Tokens are refreshed 5 minutes before expiry to prevent
session interruption during long operations.

Fixes #42

### Option 2 (minimal)
feat(auth): add token refresh

Fixes #42

### Option 3 (detailed)
feat(auth): add proactive JWT token refresh

Add refresh check to auth middleware with a background
scheduler. Failures fall back to re-authentication.

Fixes #42
```

Let the user pick, edit, or provide their own. If user says "1" or "option 1", use that directly.

## Step 5: Execute the Commit

```bash
git commit -s -S -m "<message>"
```

Both flags are required:
- `-s` adds Signed-off-by
- `-S` adds GPG signature

Show the commit hash and a one-line summary on success.

## Rules

- Subject line: 72 characters max, imperative mood, no trailing period
- No AI-tool-related content in commit messages (will be rejected by upstream reviewers)
- No AI-sounding language ("comprehensive", "robust", "streamline", "leverage", "enhance")
- Do NOT push after committing. Never push without explicit user permission.
- Do NOT run build/lint/test commands as part of committing unless the user asks
- One commit per invocation. If the user wants to split changes across commits, help them stage selectively.
