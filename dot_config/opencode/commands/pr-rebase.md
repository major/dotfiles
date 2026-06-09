---
description: Rebase a PR branch to resolve merge conflicts reported by GitHub/GitLab
---

Rebase the current PR branch onto its base branch to resolve merge conflicts.

## Step 1: Pre-flight Check

```bash
BRANCH=$(git branch --show-current)
echo "Branch: $BRANCH"

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Cannot rebase main/master onto itself"
  exit 1
fi

# Detect forge
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if echo "$REMOTE_URL" | grep -qi gitlab; then
  FORGE="gitlab"
else
  FORGE="github"
fi
echo "Forge: $FORGE"

# Determine base branch
BASE=$(git rev-parse --abbrev-ref HEAD@{upstream} 2>/dev/null | sed 's|origin/||' || echo "main")
if ! git rev-parse --verify "origin/$BASE" >/dev/null 2>&1; then
  BASE="main"
fi
echo "Base: $BASE"

git status --short
```

If there are uncommitted changes, ask the user to commit or stash before continuing. All commits must include Signed-off-by and GPG signature (`git commit -s -S`). Never include AI-tool-related items in commit messages.

## Step 2: Fetch Latest

```bash
git fetch origin
```

For GitLab repos where the fork remote is `$GIT_FORK_REMOTE`, also fetch upstream:

```bash
git fetch origin
```

If fetch fails on GitLab, retry once (internal SSH/HTTPS can be flaky).

## Step 3: Start Rebase

```bash
git rebase "origin/$BASE"
```

If the rebase applies cleanly with no conflicts, skip to Step 5.

## Step 4: Resolve Conflicts

When conflicts occur:

1. List conflicted files:

```bash
git diff --name-only --diff-filter=U
```

2. For each conflicted file, read it and show the conflict markers to the user. Explain what each side of the conflict represents:
   - `<<<<<<< HEAD` = changes from the current branch
   - `=======` = separator
   - `>>>>>>> <commit>` = changes from the base branch

3. Ask the user how to resolve each conflict:
   - Keep ours (current branch version)
   - Keep theirs (base branch version)
   - Manual merge (edit the file to combine both)

4. After resolving each file:

```bash
git add <resolved-file>
```

5. Continue the rebase:

```bash
git rebase --continue
```

6. If more conflicts appear, repeat from substep 1.

If the user wants to abort at any point:

```bash
git rebase --abort
```

## Step 5: Verify Rebase

```bash
git log --oneline "$BASE"..HEAD
echo "---"
git diff "origin/$BASE"..HEAD --stat
```

Show the user the rebased commit history and confirm it looks correct before pushing.

## Step 6: Force Push

**Do NOT force push without user confirmation.**

Ask the user: "Rebase complete. Force push to update the PR?"

If yes:

```bash
git push --force-with-lease
```

For GitLab repos using the fork remote:

```bash
git push --force-with-lease "$GIT_FORK_REMOTE" "$BRANCH"
```

Use `--force-with-lease` (not `--force`) to avoid overwriting changes pushed by others.

If push fails on GitLab, retry once before giving up.

## Step 7: Verify PR

For GitHub:

```bash
gh pr view "$BRANCH"
```

For GitLab:

```bash
glab mr view "$BRANCH"
```

Output:

```text
Rebase complete
Branch: $BRANCH rebased onto $BASE
Commits: N
Force pushed: yes
```
