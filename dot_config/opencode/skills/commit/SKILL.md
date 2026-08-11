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
- Prefer `git-stage-batch` for unstaged or mixed changes so each commit contains
  one concern and remains easy to review.
- Start a batch with `git-stage-batch start`, then inspect each hunk and use
  `git-stage-batch include` or `git-stage-batch skip`.
- If a hunk mixes concerns, use `git-stage-batch include --line <ranges>` or
  `git-stage-batch skip --line <ranges>` using the line IDs shown in the hunk.
- Commit the selected concern before running `git-stage-batch again` to process
  skipped and remaining hunks for the next focused commit.
- Use `git-stage-batch status --porcelain` for machine-readable progress and
  `git-stage-batch show --porcelain` to check whether a hunk remains.
- Stage only relevant files when `git-stage-batch` is unavailable or the diff is
  already cleanly grouped; never sweep unrelated work into the commit.
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
git-stage-batch start
git-stage-batch include  # repeat for hunks belonging to this concern
git-stage-batch skip     # repeat for hunks belonging to later concerns
git commit -S -s -m "type(scope): summary" \
  -m "- first concise change" \
  -m "- second concise change"
git-stage-batch again
```

Repeat the include/skip, commit, and again cycle until all concerns are committed.

For a diff that is already grouped by concern, stage explicit paths instead:

```bash
git add <paths>
git commit -S -s -m "type(scope): summary"
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
