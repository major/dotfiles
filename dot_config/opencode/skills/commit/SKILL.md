---
name: commit
description: Create local git commits. Use when the user asks to commit changes, make a commit, amend a commit, or commit without pushing. Enforces cryptographic signing, Signed-off-by trailers, brief Conventional Commit messages, and bullet-list commit bodies when useful.
---

# Commit

Create local commits only. Never push unless the user explicitly asks.

## Contract

- Inputs: prepared diff, intended logical grouping, repo root.
- Outputs: signed local commits on the current branch.
- Blocks on: wrong identity, unrelated files, failed relevant validation, or
  commit/signing failure.

## Rules

- Use cryptographic signing and DCO signoff on every commit: `git commit -S -s`.
- Commit messages must be brief Conventional Commits:
  - `type(scope): summary` or `type: summary`
  - Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`, `revert`.
  - Summary: imperative, lowercase unless proper noun, no trailing period.
- Prefer a short bullet-list body when there is more than one meaningful change:
  - blank line after subject
  - bullets start with `- `
  - keep bullets factual and concise
- For a tiny one-purpose change, subject-only is fine.
- Stage only relevant files. Do not sweep unrelated work into the commit.
- Before committing, show/inspect `git status --short`, `git diff --check`, and an appropriate diff/stat.
- **Worktree Pre-flight Check**: Run `git worktree list` to check if the target branch is checked out in a separate worktree. If it is, perform all staging, validation, and commits inside that worktree's directory to avoid checkout collision errors.
- Verify repo identity with `git config user.name` and `git config user.email`.
  - Repos under `~/git/major/` should use the personal identity.
  - Repos under `~/git/redhat/` should use the work identity.
  - If the identity looks wrong, stop and ask; do not commit.
- Run the smallest relevant validation for the repo/change unless the user says not to.
- After committing, report the commit hash and confirm it was not pushed.

## Commands

Typical commit:

```bash
git status --short
git diff --check
git diff --stat
git config user.name
git config user.email
git add <paths>
git commit -S -s -m "type(scope): summary" \
  -m "- first concise change" \
  -m "- second concise change"
```

Subject-only commit:

```bash
git commit -S -s -m "type(scope): summary"
```

Typical worktree staging & commit:

```bash
git worktree list
cd /path/to/worktree/detected/above
git status --short
git add <paths>
git commit -S -s -m "type(scope): summary"
```

Amend while preserving the existing message style:

```bash
git commit --amend -S -s
```
