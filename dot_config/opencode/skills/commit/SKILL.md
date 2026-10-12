---
name: commit
description: Create local git commits. Use when the user asks to commit changes, make a commit, amend a commit, or commit without pushing. Enforces cryptographic signing, Signed-off-by trailers, brief Conventional Commit messages, and bullet-list commit bodies when useful.
---

# Commit

Create local commits only. Never push unless the user explicitly asks.
Stop for wrong identity, unrelated staged changes, failed validation, or failed signing.

## Preflight

```bash
git worktree list
git config user.name
git config user.email
git status --short
git diff --check
git diff --stat
```

If the branch is checked out in another worktree, run all remaining commands there.
Use personal identity under `~/git/major/` and work identity under `~/git/redhat/`; ask if it looks wrong.
Run the smallest relevant validation unless the user says not to.

## Stage one concern

For mixed changes, review each hunk with `git-stage-batch`:

```bash
git-stage-batch start
git-stage-batch show
git-stage-batch include              # or skip; repeat for each hunk
git-stage-batch status --porcelain
```

Use `include --line <ranges>` or `skip --line <ranges>` to split a mixed hunk.
For already-grouped changes, use `git add <paths>` instead.
Never stage unrelated work.

## Commit

```bash
git commit -S -s -m "type(scope): summary" \
  -m "- first concise change" \
  -m "- second concise change"
```

Use a brief, imperative Conventional Commit subject without a trailing period.
Use separate `-m` arguments for body bullets; never put literal `\n` escapes in a message.
For a tiny change, omit the body.
For another concern, commit the current selection before `git-stage-batch again`.
Run `git-stage-batch stop` when the batch is finished.

## Verify

```bash
git log -1 --format='%h %G? %an <%ae>%n%(trailers:key=Signed-off-by,valueonly)'
git log -1 --format=%B | grep -F '\n'   # expect no output
```

Confirm the author, Signed-off-by trailer, and a valid signature.
If Git cannot verify the signature locally, inspect the commit's signature and resolve the verification issue; do not report it as verified.
Report the commit hash and whether it was pushed.

## Amend

```bash
git commit --amend --no-edit -S -s       # retain the message without opening an editor
# Use -m "type(scope): summary" when the message must change.
```
