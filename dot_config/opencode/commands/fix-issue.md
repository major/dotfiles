---
description: Fix a GitHub or GitLab issue in a worktree, create a PR, merge after green CI, and clean up
---

Fix an issue end to end in a dedicated git worktree: inspect the issue, implement the smallest correct fix, verify locally, create a PR/MR, wait for green CI, merge it, and remove the temporary worktree and branch.

Invoking `/fix-issue` is permission to complete the full issue-to-merge workflow without asking for routine confirmations, including creating a worktree, committing with `git commit -s -S`, invoking `/pr-create`, pushing through that command, pushing CI fixups with `--force-with-lease` after an amend or autosquash, watching CI, merging when required checks are green, deleting the remote branch, and cleaning up the local worktree and branch. Ask only when there is a real safety choice that cannot be inferred, such as unrelated uncommitted changes, likely secrets, multiple equally plausible issues, or a failing check that appears flaky or infrastructure-only.

## Inputs

Accept any of these argument shapes:

- Issue number: `74`
- GitHub or GitLab issue URL: `https://github.com/org/repo/issues/74`
- Ticket plus repo context: `Fix issue 74 in owner/repo`
- Optional base branch: `--base main` or `base: main`
- Optional skip merge: `--no-merge` when the user only wants the PR opened

If no issue identifier is provided, inspect the current conversation for the most recent issue URL or issue number. If there is still no single clear issue, ask one precise question for the issue number or URL.

## Phase 1: Pre-flight in the current repo

Determine forge, repository, base branch, issue ID, and current safety state.

```bash
pwd
git status --short
git branch --show-current
git remote -v
PRIMARY_BRANCH=$(git branch --show-current)
echo "Primary branch: $PRIMARY_BRANCH"
```

If the working tree has uncommitted changes, inspect them before proceeding. Continue only when they are clearly unrelated and can remain untouched in the primary worktree, or when they are clearly part of the requested issue and should be handled on the issue branch. Ask the user if the changes are ambiguous.

Detect forge from `origin`:

```bash
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if echo "$REMOTE_URL" | grep -qi gitlab; then
  FORGE="gitlab"
else
  FORGE="github"
fi
echo "Forge: $FORGE"
```

Resolve the base branch. Prefer an explicit `--base` argument, then upstream branch, then `main`, then `master`.

```bash
BASE=$(git rev-parse --abbrev-ref HEAD@{upstream} 2>/dev/null | sed 's|origin/||' || echo "main")
if ! git rev-parse --verify "origin/$BASE" >/dev/null 2>&1; then
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    BASE="main"
  else
    BASE="master"
  fi
fi
echo "Base: $BASE"
```

Fetch latest base before branching. For GitLab repos, retry fetch once if it fails because internal GitLab can be flaky.

```bash
git fetch origin "$BASE" || { [ "$FORGE" = "gitlab" ] && git fetch origin "$BASE"; }
```

## Phase 2: Inspect the issue

Read the issue before creating a plan.

GitHub:

```bash
gh issue view <issue-number> --json number,title,body,labels,state,url,comments
```

GitLab:

```bash
glab issue view <issue-number>
```

Extract and keep these facts visible while working:

- Issue title and URL
- Issue state. If the issue is already closed or merged, stop and report that no fix branch was created unless the user explicitly asked to reopen or backport it.
- Actual failure or missing behavior
- Acceptance criteria, explicit and implied
- Files, modules, commands, or APIs mentioned
- Security, compatibility, or documentation requirements

If the issue references an external library or unfamiliar API, use a librarian agent before implementation. If it spans multiple modules or unclear code paths, use 2-3 explore agents before implementation. Do not duplicate delegated searches manually.

## Phase 3: Create the worktree

Create a short, descriptive branch name from the issue number and title. Use lowercase words and hyphens.

```bash
ISSUE=<issue-number>
SLUG=<short-title-slug>
BRANCH="issue-${ISSUE}-${SLUG}"
REPO=$(basename "$(git rev-parse --show-toplevel)")
WORKTREE="/home/major/git/worktrees/${REPO}-issue-${ISSUE}"
git show-ref --verify --quiet "refs/heads/$BRANCH" && { echo "Local branch already exists: $BRANCH"; exit 1; }
git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1 && { echo "Remote branch already exists: $BRANCH"; exit 1; }
git worktree add "$WORKTREE" -b "$BRANCH" "origin/$BASE"
```

Move all implementation work into the new worktree. Do not switch branches in the primary worktree unless cleanup after merge requires it.

## Phase 4: Explore and plan inside the worktree

In the issue worktree, inspect relevant code and tests before editing.

```bash
git status --short
git log --oneline -10
```

Search for existing patterns that match the issue. Prefer direct reads and scoped searches when the target is obvious. Use explore agents for multi-module discovery. Identify:

- Code paths to change
- Existing tests to extend
- New tests required by the issue
- Documentation files that must be updated
- Commands needed for local verification

Before editing, write a short implementation plan with files to touch, exact behavior change, tests, docs, and verification commands. If the repo has local instructions such as `AGENTS.md`, follow them exactly. If the repo requires documentation updates after code changes, treat those docs as part of the fix, not a follow-up.

## Phase 5: Implement the smallest correct fix

Make surgical changes only. Match existing naming, imports, formatting, error handling, and test style. Do not use type suppression, empty catch blocks, deleted tests, or speculative refactors.

Update tests alongside the code. Cover the issue's acceptance criteria directly, including regressions from the issue body. Update user-facing docs and local agent docs when the public behavior, CLI behavior, API surface, workflow, or repository rules changed.

After editing, inspect the diff before verification:

```bash
git diff --stat
git diff --check
git diff
```

## Phase 6: Verify locally

Run diagnostics and the narrowest relevant test first, then project-level checks. Use the repository's own commands when documented.

Examples:

```bash
cargo test <focused-test>
make check
```

For TypeScript or Python projects, use equivalent local diagnostics, focused tests, typecheck, lint, and build commands from repo docs. If verification fails, fix the root cause and rerun the failed command. After three different failed approaches, revert unsafe edits and consult Oracle before continuing.

Before committing, inspect status and recent history:

```bash
git status --short
git diff
git log --oneline -10
```

Commit only intended files. Use a Conventional Commits subject, include issue references when useful, and always sign and sign off:

```bash
git add <intended-files>
git commit -s -S -m "fix(<scope>): <short issue fix>"
```

## Phase 7: Create PR or MR with `/pr-create`

Invoke `/pr-create` from the issue worktree. Include the branch, worktree path, base branch, issue number or URL, verification commands that passed, and any review result already obtained. `/pr-create` owns pushing, optional local CodeRabbit review, template discovery, PR/MR body generation, and PR/MR creation.

Example invocation context:

```text
Create a PR for branch <branch> in <worktree>. Base branch <base>. Fixes issue <issue-url>. Local verification passed: <commands>. Proceed without additional confirmation.
```

If CodeRabbit or `/pr-create` finds actionable issues, fix them in the worktree, verify again, commit or amend as appropriate, and continue the PR/MR flow. Do not run CodeRabbit more than once per PR/MR.

## Phase 8: Watch CI and fix failures

After the PR/MR exists, watch required checks until they are complete.

GitHub:

```bash
gh pr checks <pr-number> --watch --interval 30
```

GitLab:

```bash
glab mr checks <mr-number>
```

If CI fails with a fixable code, test, lint, format, or docs failure, diagnose logs, make the minimal fix in the worktree, run the matching local verification, fold the fix into the appropriate PR commit when possible, push with `--force-with-lease` if history was rewritten, and watch CI again.

If CI is flaky or infrastructure-only, report the evidence and rerun or ask only when rerun behavior is not safe to infer.

Do not merge until required checks are green. Skipped release-only jobs are acceptable when they are expected for PRs and not required checks.

## Phase 9: Merge after green CI

When all required checks are green and the user did not pass `--no-merge`, merge using the forge CLI.

GitHub:

```bash
gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed
gh pr merge <pr-number> --<merge|squash|rebase> --delete-branch
```

Choose the repository's allowed and preferred merge strategy. Use `--merge` only when merge commits are allowed and appropriate for the repo; otherwise use `--squash` or `--rebase`.

GitLab:

```bash
glab mr merge <mr-number> --remove-source-branch
```

If merge from the issue worktree fails because the base branch is checked out elsewhere, retry from the primary worktree for GitLab. Confirm the PR/MR state is merged before cleanup.

GitHub verification:

```bash
gh pr view <pr-number> --json state,mergedAt,mergeCommit,baseRefName,headRefName,url
```

GitLab verification:

```bash
glab mr view <mr-number>
```

## Phase 10: Clean up worktree and local branches

Before removing anything, verify the issue worktree is clean:

```bash
git -C "$WORKTREE" status --short
```

If clean, remove the worktree and delete the local issue branch:

```bash
git worktree remove "$WORKTREE"
git branch -d "$BRANCH"
```

Fetch and prune, then update the primary worktree's base branch when safe:

```bash
git fetch --prune origin
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "$BASE" ]; then
  git pull --ff-only origin "$BASE"
else
  echo "Primary worktree is on $CURRENT_BRANCH, leaving it there and only fetching $BASE"
fi
git worktree list
```

If stale worktrees or merged local branches remain, list candidates for cleanup but do not auto-delete unrelated ones.

## Final report

Report the result with these fields:

```text
Issue: <issue title and URL>
Branch: <branch>
Worktree: <removed path or retained path with reason>
Commit: <sha and subject>
PR/MR: <url and state>
Merge commit: <sha, if merged>
Verification: <local commands and CI result>
Cleanup: <worktree removed, branches deleted, base updated>
Open: <anything left, or none>
```

Keep the final report concise. Include only concrete evidence from commands and checks.
