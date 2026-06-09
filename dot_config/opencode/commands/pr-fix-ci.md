---
description: Diagnose and fix CI failures on an open PR/MR
---

Monitor CI status on the current branch's PR/MR, diagnose failures, fix them, fold each fix into the matching PR commit, and push.

Invoking `/pr-fix-ci` is push permission for the current PR/MR branch. Push without asking after verification. If history is rewritten with amend or fixup/autosquash, use `--force-with-lease`, never plain `--force`.

## Step 1: Identify PR and Forge

```bash
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Cannot fix CI failures directly on main/master"
  exit 1
fi

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if echo "$REMOTE_URL" | grep -qi gitlab; then
  FORGE="gitlab"
else
  FORGE="github"
fi
echo "Forge: $FORGE"

BASE=$(git rev-parse --abbrev-ref HEAD@{upstream} 2>/dev/null | sed 's|origin/||' || echo "main")
if ! git rev-parse --verify "origin/$BASE" >/dev/null 2>&1; then
  BASE="main"
fi
echo "Base: $BASE"

git status --short
```

If there are uncommitted changes before CI fixing starts, stop and ask the user whether to commit, stash, or discard them before continuing. Do not mix unrelated local changes with CI fixes.

For GitLab repos:
- Use `glab` for MR and CI operations.
- Push branches to the fork remote (`$GIT_FORK_REMOTE`) when it is set.
- If fetch or push fails, retry once before giving up.

## Step 2: Check CI Status

**GitHub:**

```bash
gh pr checks "$BRANCH"
```

**GitLab:**

```bash
glab ci status
```

If all checks pass, report success and stop. Nothing to fix and nothing to commit.

If checks are still running, ask the user: "CI is still in progress. Wait and re-check, or look at what's failed so far?"

## Step 3: Get Failure Details

For each failed job, fetch the logs.

**GitHub:**

```bash
gh run list --branch "$BRANCH" --limit 5
```

Then for each failed run:

```bash
gh run view <run-id> --log-failed
```

**GitLab:**

```bash
glab ci view
```

Then for each failed job:

```bash
glab ci trace <job-id>
```

If GitLab commands fail, retry once (flaky SSH/HTTPS).

## Step 4: Diagnose Failures

Read the failed job logs and categorize each failure:

- **Lint/format** - style violations, import ordering, formatting
- **Type errors** - compilation or type-check failures
- **Test failures** - failing test cases
- **Build errors** - dependency issues, missing modules, build script problems
- **Flaky/infra** - timeouts, network errors, runner issues (not fixable locally)

For flaky/infra failures, tell the user and ask whether to re-trigger the job or skip it.

Keep a tracking table while working:

```text
Job | Failure type | Fix commit target | Result
```

## Step 5: Fix Issues

For each fixable failure:

1. Read the relevant source files
2. Apply the minimal fix (do not refactor unrelated code)
3. Run the same check locally if possible (lint, test, build) to verify the fix before pushing

After all fixes, inspect what changed:

```bash
git diff
```

Do not ask for confirmation before committing or pushing. The command invocation already granted push permission.

If no CI failures required code changes, do not create a commit. Report the skipped failures and why.

## Step 6: Map Fixes to PR Commits

For each fixable failure, identify the PR commit that introduced the affected code. Prefer the failed check's changed file context and PR history.

```bash
git fetch origin
git log --oneline "$BASE"..HEAD
git log --oneline "$BASE"..HEAD -- <path>
git blame "$BASE"..HEAD -- <path>
```

Rules:
- If a fix touches code from one PR commit, target that commit.
- If a fix spans multiple original commits, split the changes and target each original commit separately.
- If a CI-only fix updates follow-up docs or config for a feature commit, target the docs/config commit if one exists, otherwise target the feature commit.
- If no clear original commit exists, create one normal signed commit with a specific Conventional Commits message.

## Step 7: Fold Fixes into PR Commits

Prefer history that leaves no visible `fixup!` commits in the PR. All commits must include Signed-off-by and GPG signature (`git commit -s -S`). Never include AI-tool-related items in commit messages.

### Option A: Amend directly when the target is HEAD

If all currently staged fixes belong to `HEAD`, amend that commit:

```bash
git add <files>
git commit -s -S --amend --no-edit
```

### Option B: Create fixup commits for older PR commits

When a fix belongs to an earlier PR commit, create a signed fixup commit targeting the original SHA:

```bash
git add <files>
git commit -s -S --fixup=<target-sha>
```

Repeat until every staged fix is committed to the correct target. Then autosquash non-interactively:

```bash
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash "$BASE"
```

If conflicts occur during autosquash:
1. Resolve only the conflicts caused by the CI fixes.
2. Run `git add <resolved-files>`.
3. Continue with `git rebase --continue`.
4. If the rebase becomes unsafe or unclear, run `git rebase --abort` and ask the user.

Verify that no fixup commits remain:

```bash
git log --oneline "$BASE"..HEAD
```

If any `fixup!` commits remain, do not push. Fix the history first.

### Option C: Create a normal commit only when no target is clear

Use a descriptive commit message for the fix, not "fix CI". Be specific about what was actually wrong.

```bash
git add -A
git commit -s -S -m "<type>: <what was actually fixed>"
```

## Step 8: Push to the PR/MR

If commits were only added without rewriting existing PR history:

**GitHub:**

```bash
git push
```

**GitLab:**

```bash
git push "${GIT_FORK_REMOTE:-origin}" "$BRANCH"
```

If any commit was amended or autosquashed, push with lease:

**GitHub:**

```bash
git push --force-with-lease
```

**GitLab:**

```bash
git push --force-with-lease "${GIT_FORK_REMOTE:-origin}" "$BRANCH"
```

Never force push to main/master. Never use plain `--force`. If push fails on GitLab, retry once.

## Step 9: Verify

Re-check CI status after pushing.

**GitHub:**

```bash
gh pr view "$BRANCH" --json url,reviewDecision,statusCheckRollup
gh pr checks "$BRANCH" --watch
```

**GitLab:**

```bash
glab ci status
```

If CI is still running, tell the user the fix has been pushed and they can re-run `/pr-fix-ci` if more failures appear.

Output:

```text
CI Fix pushed
Branch: $BRANCH
PR/MR: <url>
Push: normal / force-with-lease
Verification: <checks run and result>
Failures fixed: N
Status: passing / pending

Fixed:
- <job or file>: <what changed and why>

Skipped:
- <job or file>: <why no fix was needed>
```
