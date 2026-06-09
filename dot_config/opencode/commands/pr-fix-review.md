---
description: Address actionable PR/MR review comments and push fixes
---

Review comments on the current branch's PR/MR, fix actionable feedback, fold each fix into the matching PR commit, and push.

Invoking `/pr-fix-review` is push permission for the current PR/MR branch. Push without asking after verification. If history is rewritten with fixup/autosquash, use `--force-with-lease`, never plain `--force`.

## Step 1: Identify PR/MR and Forge

```bash
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Cannot fix review comments directly on main/master"
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

If there are uncommitted changes, stop and ask the user whether to commit, stash, or discard them before continuing. Do not mix unrelated local changes with review fixes.

For GitLab repos:
- Use `glab` for MR operations.
- Push branches to the fork remote (`$GIT_FORK_REMOTE`) when it is set.
- If fetch or push fails, retry once before giving up.

## Step 2: Fetch Review Comments

Fetch both summary comments and inline review comments.

**GitHub:**

```bash
gh pr view "$BRANCH" --json number,url,title,headRefName,baseRefName,reviewDecision,reviews,comments
PR_NUMBER=$(gh pr view "$BRANCH" --json number --jq .number)
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api "repos/$REPO/pulls/$PR_NUMBER/comments" --paginate
gh api "repos/$REPO/pulls/$PR_NUMBER/reviews" --paginate
```

**GitLab:**

```bash
glab mr view "$BRANCH"
glab mr notes "$BRANCH"
```

For GitLab inline discussions, use the GitLab API when `glab mr notes` does not include enough context:

```bash
PROJECT=$(glab repo view --output json | jq -r .id)
MR_IID=$(glab mr view "$BRANCH" --output json | jq -r .iid)
glab api "projects/$PROJECT/merge_requests/$MR_IID/discussions"
```

## Step 3: Classify Comments

For each review comment, classify it before editing:

- **Fix required** - correctness bug, safety issue, broken docs, missing test for changed behavior, style/lint issue that matches repo policy.
- **Already fixed** - comment points at stale code or a newer commit already addressed it.
- **No code change** - question, suggestion, nitpick, preference, or non-actionable summary.
- **Needs user decision** - conflicting reviewer requests, product behavior choice, or risky scope expansion.

Only edit for **Fix required** comments. For **Needs user decision**, stop and ask one precise question with the tradeoff.

Keep a tracking table while working:

```text
Comment URL | File/area | Classification | Fix commit target | Result
```

## Step 4: Map Each Fix to the Original PR Commit

For each actionable comment, identify the PR commit that introduced the affected code. Prefer the review comment's `commit_id` when it is part of the current PR history. Otherwise use file history inside the PR range.

```bash
git fetch origin
git log --oneline "$BASE"..HEAD
git log --oneline "$BASE"..HEAD -- <path>
git blame "$BASE"..HEAD -- <path>
```

Rules:
- If a fix touches code from one PR commit, target that commit.
- If a fix spans multiple original commits, split the changes and target each original commit separately.
- If a fix only updates follow-up docs for a feature commit, target the docs commit if one exists, otherwise target the feature commit.
- If no clear original commit exists, create one normal signed commit with a specific Conventional Commits message.

## Step 5: Apply Minimal Fixes

For each actionable comment:

1. Read the relevant files and nearby tests.
2. Apply the smallest change that addresses the comment.
3. Add or update tests when behavior changes.
4. Update docs when command behavior, args, output, error codes, or workflow changes.
5. Do not refactor unrelated code.

After each logical fix, inspect the diff before staging:

```bash
git diff
```

## Step 6: Verify Locally

Run the narrowest relevant checks first, then any project-standard aggregate check if the changes are non-trivial.

Examples:

```bash
cargo fmt --all
cargo test <module-or-test-filter>
make check
```

Use the repository's own documented checks. If a check cannot be run locally, explain why in the final output.

## Step 7: Fold Fixes into PR Commits

Prefer history that leaves no visible `fixup!` commits in the PR.

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
1. Resolve only the conflicts caused by the review fixes.
2. Run `git add <resolved-files>`.
3. Continue with `git rebase --continue`.
4. If the rebase becomes unsafe or unclear, run `git rebase --abort` and ask the user.

Verify that no fixup commits remain:

```bash
git log --oneline "$BASE"..HEAD
```

If any `fixup!` commits remain, do not push. Fix the history first.

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

Never force push to main/master. Never use plain `--force`.

## Step 9: Re-check PR/MR Status

**GitHub:**

```bash
gh pr view "$BRANCH" --json url,reviewDecision,statusCheckRollup
gh pr checks "$BRANCH"
```

**GitLab:**

```bash
glab mr view "$BRANCH"
glab ci status
```

If checks are still running, report that the fixes were pushed and checks are pending. Do not wait indefinitely unless the user asked you to watch.

## Step 10: Final Output

Keep the summary brief and specific:

```text
Review fixes pushed
Branch: <branch>
PR/MR: <url>
Push: normal / force-with-lease
Verification: <checks run and result>

Fixed:
- <comment URL or file>: <what changed and why>

Skipped:
- <comment URL or file>: <why no fix was needed>
```

If no comments required changes, do not create a commit. Report the skipped comments and why.
