---
name: github-pr-stacks
description: Create, inspect, extend, and dissolve GitHub.com stacked pull requests using GitHub's public-preview Stacks REST API. Use only for GitHub.com repositories and PR stacks. Never use for GitLab repositories or MRs, GitHub Enterprise, or a checkout whose selected remote is GitLab.
---

# GitHub.com PR Stacks

This skill applies only to GitHub.com PR stacks.
Never use it for GitLab repositories or merge requests, GitHub Enterprise, or a checkout whose selected remote is GitLab.

GitHub **Stacked pull requests** is a public preview feature.
It stores stack metadata separately from the branch-base chain.
A child PR whose base is its parent's head branch is eligible for a stack, but is not part of one until a user accepts the GitHub UI recommendation or the Stacks REST API creates it.

## Scope and prerequisites

- GitHub.com only, not GitLab, GitHub Enterprise, or another GitHub host until explicitly validated.
- Never use this skill for GitLab repositories, GitLab merge requests, or a checkout whose selected remote is GitLab.
- After the gate succeeds, use `gh` with an authenticated GitHub.com account.
- Route PR creation, branch publication, reviews, checks, CI, and other PR lifecycle work to `pr-create` and the repository's existing PR, commit, worktree, and review skills.
- Use an authenticated request with `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2026-03-10` on every REST request.
- `gh api` supplies authentication, so never print or pass tokens manually.
- Use an explicit `<owner>/<repo>` in every API endpoint and pass `--repo <owner>/<repo>` to `gh pr` commands instead of relying on the checkout remote.
- Do not create, append to, or dissolve a stack without the user's explicit request and a printed bottom-to-top PR order.

## Mandatory forge applicability gate

Run this gate first, before any other `gh` command, including authentication checks.
It rejects a GitLab-selected checkout locally, then verifies the explicit repository resolves to GitHub.com and normalizes it to GitHub's canonical `nameWithOwner`.
GitHub authentication, a GitHub mirror, and branch naming cannot bypass the checkout rejection.

Pass the requested repository as an explicit `owner/repo` argument:

```bash
set -euo pipefail

current_branch="$(git branch --show-current)"
selected_remote=""
if [[ -n "$current_branch" ]]; then
  selected_remote="$(git config --get "branch.$current_branch.remote" || true)"
fi
selected_remote="${selected_remote:-$(git config --get remote.pushDefault || true)}"
if [[ -n "$selected_remote" && "$selected_remote" != "." ]]; then
  selected_remote_url="$(git remote get-url "$selected_remote")"
  if [[ "${selected_remote_url,,}" == *gitlab* ]]; then
    printf '%s\n' 'Not applicable: the selected checkout remote is GitLab; use the standard GitLab merge-request workflow. No GitHub command was run.' >&2
    exit 2
  fi
fi

repo="${1:-}"
if [[ ! "$repo" =~ ^[^/]+/[^/]+$ ]]; then
  printf '%s\n' 'Usage: this skill requires an explicit GitHub owner/repo.' >&2
  exit 2
fi

export GH_HOST=github.com
repo_view="$(gh repo view "$repo" --json nameWithOwner,url)"
repo_url="$(jq -er '.url' <<<"$repo_view")"
if [[ ! "$repo_url" =~ ^https://github\.com/[^/]+/[^/]+/?$ ]]; then
  printf '%s\n' 'Not applicable: the repository is not on GitHub.com; use the standard forge workflow.' >&2
  exit 2
fi
repo="$(jq -er '.nameWithOwner' <<<"$repo_view")"
if [[ ! "$repo" =~ ^[^/]+/[^/]+$ ]]; then
  printf '%s\n' 'Repository lookup did not return a canonical owner/repo.' >&2
  exit 2
fi
api_headers=(-H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2026-03-10')
```

Do not continue to any example unless this gate succeeds.

## Pre-mutation checklist

Before any create, append, dissolve, unstack, or branch-relationship mutation, confirm all of these:

- The forge applicability gate completed successfully in the current checkout, with `GH_HOST=github.com` and canonical `$repo`.
- The user explicitly requested the mutation and the intended bottom-to-top PR order has been printed, or the dissolve consequence has been stated.
- Every affected PR exists, and every adjacent base/head relationship has been validated.
- The required REST headers are present in `api_headers`.
- For a local branch, the child PR has already been pushed and opened against the parent PR's head branch through `pr-create`.

If any item is unchecked, stop without mutating GitHub.

## Inspect before changing

Find the stack containing a PR:

```bash
gh api "${api_headers[@]}" \
  "/repos/$repo/stacks?pull_request=<pr-number>"
```

List every stack in the repository:

```bash
gh api "${api_headers[@]}" \
  "/repos/$repo/stacks"
```

Get one stack by its stack number:

```bash
gh api "${api_headers[@]}" \
  "/repos/$repo/stacks/<stack-number>"
```

`GET /stacks` returns an array and supports `pull_request=<number>`, `per_page` (maximum 100), and `page`.
An empty filtered response means that no stack contains the PR.
Use `--paginate` when listing repositories with more than one page of stacks.

For compact membership checks, read the PR's `stack` object:

```bash
gh api "${api_headers[@]}" \
  "/repos/$repo/pulls/<pr-number>" | \
  jq '{number, url: .html_url, stack}'
```

Use the Stacks API, rather than the PR `stack` object, for mutations.

Inspect a PR's actual base and head before inferring any relationship:

```bash
gh pr view <pr-number> --repo "$repo" \
  --json number,url,state,isDraft,baseRefName,headRefName
```

A valid sequence is ordered **bottom to top**.
For every adjacent pair, the upper PR's `baseRefName` must equal the lower PR's `headRefName`.
Never infer the relationship from branch naming alone.
Report the stack number, order, base branch, PR URLs, and each PR's open or merged state.
Report only those fields unless raw API output is needed for later automation.

## Idempotency and existing membership

Inspect both sides of every requested edge before mutating: read each PR's state, base, head, and `stack` object, and inspect the containing stack when membership is present.
Apply this policy rather than retrying a request blindly:

- If the requested PRs are already members of the same stack in the exact requested bottom-to-top order, report a no-op and do not call a mutation endpoint.
- For an existing stack, if the requested PRs are an unstacked contiguous suffix directly above its current top, use the append endpoint, after validating every new base/head edge.
- If no requested PR belongs to a stack, create a stack from the complete contiguous chain.
- Refuse to mutate when a requested PR belongs to another stack, the order differs, the chain has a gap, or the operation would insert below an existing stack top.

Do not treat a `409` or `422` as evidence that a retry is safe.
Re-read both PRs and the affected stack, then apply the rules above.

## Stack this local branch on a parent PR

The Stacks API accepts PRs, not local branches.
To stack the checked-out branch, first make it a child PR whose base is the parent PR's head branch, and only then create or append the stack.

1. Run the applicability gate and inspect the parent PR with `gh pr view --repo "$repo"`, including its number, state, base, head, and head repository.
2. Record the checked-out branch and its intended push remote.
3. Push that branch to a repository where the child PR head is available.
4. Hand off to `pr-create` to open the child PR in `$repo` with the parent PR's `headRefName` as its exact base, then run the normal review, checks, and CI lifecycle.
5. Stop until `pr-create` returns an existing child PR number and URL, and verify that the child is open and its base/head edge is correct.
6. Inspect both the parent and child PRs for membership and idempotency, print the complete bottom-to-top order, and only then call the Stacks API.

### Fork-aware child head

The child PR's base repository is the parent PR's repository, while its head may be a fork.
If the current remote is a writable branch in the parent repository, push the local branch there and pass the branch name as the child head.
If it is not writable, push to an existing or newly configured fork remote instead:

```bash
branch="$(git branch --show-current)"
git push <fork-remote> "HEAD:$branch"
```

Tell `pr-create` to use `<fork-owner>:$branch` as the child PR head and `$parent_head` as the base, for example:

```text
base repository: $repo
base branch: $parent_head
head: <fork-owner>:$branch
```

Do not use a fork head that has not been pushed, and do not silently change the parent PR's base.
If the parent PR itself is fork-origin and its head branch is not available in the target repository as a base branch, refuse this path until `pr-create` establishes a compatible branch relationship.

### Handoff checklist to `pr-create`

- [ ] Canonical `$repo` and parent PR number/URL are recorded.
- [ ] Parent is open, and its exact head branch is the proposed child base.
- [ ] Local branch and commit are pushed to the intended repository.
- [ ] Child head is `branch` or `<fork-owner>:branch`, as appropriate.
- [ ] Child PR number/URL is returned, and base/head plus CI status are verified.
- [ ] Bottom-to-top PR order is printed for Stacks API approval.

`pr-create` owns PR lifecycle and CI; this skill owns only relationship validation and Stacks API mutation.

For a compact stack response:

```bash
gh api "${api_headers[@]}" \
  "/repos/$repo/stacks/<stack-number>" | \
  jq '{number, base: .base.ref, pull_requests: [.pull_requests[] | {number, url: .html_url, state, draft, merged_at}]}'
```

## Create a stack from existing PRs

First verify that no submitted PR already belongs to a stack.
Then verify that each PR exists, inspect every base-to-head edge, and confirm the requested PR numbers form one contiguous chain.
Create the stack only after presenting the intended bottom-to-top order.

```bash
jq -n '{pull_requests: [2301, 2303]}' | \
gh api --method POST "${api_headers[@]}" \
  "/repos/$repo/stacks" --input -
```

Keep request payloads and API responses in stdin or shell variables; do not create temporary payload or response files.

The `pull_requests` integer array is required and must be bottom to top.
The endpoint returns `201 Created` with the stack object.
After creation, verify the returned stack number and PR order.
Re-read `GET /repos/{owner}/{repo}/stacks/{stack_number}` when the response is truncated, compact output is required, or a following operation depends on the canonical server state.
`422 Unprocessable Entity` means the PRs do not form an eligible chain or a referenced PR is unavailable.

## Append PRs at the top

Verify the first new PR's base equals the current stack top's head, and verify every later PR's base equals the preceding new PR's head.
The request order begins with the PR directly above the current top and continues upward.

```bash
jq -n '{pull_requests: [2304, 2305]}' | \
gh api --method POST "${api_headers[@]}" \
  "/repos/$repo/stacks/<stack-number>/add" --input -
```

Keep request payloads and API responses in stdin or shell variables; do not create temporary payload or response files.

The endpoint returns `200 OK` with the updated stack.
On `409 Conflict`, another request is modifying the stack, so re-read it before retrying.
On `422`, correct the PR base chain rather than retrying unchanged.

## Full-chain verification

After every create or append, verify the complete chain in one compact pass.
The stack response supplies membership and bottom-to-top order; each PR supplies state and the actual adjacent base/head edge:

```bash
stack_json="$(gh api "${api_headers[@]}" \
  "/repos/$repo/stacks/<stack-number>")"
expected_prs=(2301 2303 2304)
mapfile -t actual_prs < <(jq -r '.pull_requests[].number' <<<"$stack_json")
[[ "${actual_prs[*]}" == "${expected_prs[*]}" ]] || {
  printf '%s\n' 'Stack membership/order does not match the approved chain.' >&2
  exit 1
}
jq '{number, pull_requests: [.pull_requests[] | {number, state, url: .html_url}]}' \
  <<<"$stack_json"

previous_head=""
for pr in "${actual_prs[@]}"; do
  pr_json="$(gh pr view "$pr" --repo "$repo" \
    --json number,url,state,baseRefName,headRefName)"
  jq '{number, url, state, base: .baseRefName, head: .headRefName}' <<<"$pr_json"
  base="$(jq -r '.baseRefName' <<<"$pr_json")"
  if [[ -n "$previous_head" && "$base" != "$previous_head" ]]; then
    printf 'Broken adjacent edge before PR %s: expected base %s, got %s\n' \
      "$pr" "$previous_head" "$base" >&2
    exit 1
  fi
  previous_head="$(jq -r '.headRefName' <<<"$pr_json")"
done
```

Do not report success unless this pass confirms PR state, every adjacent base/head pair, and exact stack membership/order.

## Dissolve a stack

This action removes every unmerged PR that GitHub can remove from the stack, not an individually selected member.
State that consequence and obtain explicit confirmation before running it.

```bash
gh api --method POST "${api_headers[@]}" \
  "/repos/$repo/stacks/<stack-number>/unstack"
```

The response is `200 OK` with remaining members or `204 No Content` when the stack is fully dissolved.
PRs that cannot be unstacked, such as PRs queued for merge, remain in the stack.
`422` means every member is locked and none can be removed.
On `409 Conflict`, another request is modifying the stack, so re-read it before retrying.

## Change order or branch relationships

The REST API has no reorder, insert, replace-members, or base-update mutation.
To change the branch hierarchy, update the affected PR bases through the ordinary pull-request API or use GitHub CLI's interactive `gh stack modify` when appropriate.
Then re-read the stack and, if needed, unstack and recreate it in the desired bottom-to-top order.
Do not rebase or change PR bases without the user's approval and the normal PR workflow validation.

## Merge caveat

For a stacked PR, do not use legacy synchronous REST merge endpoints or GraphQL merge mutations.
Use GitHub's asynchronous stacked-merge API when automating a merge:

```text
PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge-async
GET /repos/{owner}/{repo}/pulls/{pull_number}/merge-async/{uuid}
```

Submission performs only basic PR-state checks.
Branch protection and repository rules are evaluated asynchronously, so poll the returned UUID and treat a later failed result as a merge failure.
The operation is atomic: the requested PR and all unmerged PRs below it either merge, enter the merge queue, or none do.

## References

- https://docs.github.com/en/pull-requests/get-started/about-stacked-prs
- https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-stacked-pull-requests
- https://docs.github.com/en/rest/pulls/stacks
- https://docs.github.com/en/pull-requests/reference/stacked-pull-requests-rest-and-graphql-apis
