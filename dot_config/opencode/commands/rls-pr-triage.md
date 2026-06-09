---
description: Triage open PRs across github.com/rhel-lightspeed repos for easy approvals
---

# RHEL Lightspeed PR Triage

Analyze all open PRs across `github.com/rhel-lightspeed` repos, classify them by merge readiness, and present an actionable summary.

## Execution Policy

- Read-only. Never approve, merge, or comment on PRs unless the user explicitly asks.
- If `$ARGUMENTS` contains repo names to exclude, add them to the exclusion list alongside the defaults.

## Repos to Exclude

Always exclude these repos (forks, not actively triaged, or user-specified):

```bash
EXCLUDE="linux-mcp-server"
# Append any $ARGUMENTS exclusions here
```

## Phase 1: Discover Repos (Sequential)

Get non-archived, non-fork repos:

```bash
gh repo list rhel-lightspeed --limit 100 --no-archived --source \
  --json name --jq '.[].name' | sort
```

Filter out excluded repos from the list.

## Phase 2: Fetch PR Data + CI Status (Parallel)

For ALL repos with open PRs, run these two queries **in parallel across repos** (batch into a single bash call per query type to minimize tool calls).

### Query A: PR metadata for all repos

Use `--jq` server-side filtering (more reliable than local jq piping, handles control characters in PR bodies):

```bash
for repo in $REPOS; do
  result=$(gh pr list --repo "rhel-lightspeed/$repo" --state open \
    --json number,title,author,createdAt,additions,deletions,changedFiles,mergeable,headRefName,labels \
    --jq '.[] | {number,title,author:.author.login,createdAt:(.createdAt[:10]),additions,deletions,changedFiles,mergeable,headRefName,labels:[.labels[].name]}' \
    --limit 30 2>/dev/null)
  [ -n "$result" ] && echo "REPO:$repo" && echo "$result"
done
```

### Query B: CI status for each PR found

Run this **after** Query A (depends on knowing PR numbers). Split into parallel batches of ~5 PRs per bash call to avoid output truncation. Use explicit `gh pr view` calls rather than a loop variable:

```bash
echo "CI:repo#N"
gh pr view N --repo "rhel-lightspeed/repo" \
  --json statusCheckRollup \
  --jq '[.statusCheckRollup[]? | {name,conclusion: (.conclusion // .status)}] | group_by(.conclusion) | map({(.[0].conclusion): length}) | add // {}' 2>/dev/null || echo "{}"
# Repeat for each PR, ~5 per bash call
```

Note: use `[]?` (optional iterator) to handle repos with no CI checks configured (empty `statusCheckRollup` array).

## Phase 3: Classify and Present

Classify each PR into one of these tiers based on the collected data:

### Classification Rules

**Tier 1 - Slam Dunk** (merge without hesitation):
- Author is `app/renovate` or `app/dependabot`
- CI: all checks SUCCESS or NEUTRAL (no FAILURE/PENDING)
- Mergeable: MERGEABLE
- Changes: lockfiles, dependency digests, or action version bumps only

**Tier 2 - Easy Approve** (quick glance, then merge):
- Author is a bot AND CI green, but changes are larger (non-major dep updates, lock file maintenance with big diffs)
- OR: author is human, CI green, docs-only changes, small diff

**Tier 3 - Needs Review** (human judgment required):
- Author is human with substantive code changes
- OR: CI green but architectural/behavioral changes
- Note the PR scope briefly

**Tier 4 - Skip/Stale/Broken**:
- CI FAILED
- Mergeable: CONFLICTED or UNKNOWN and PR is >30 days old
- PR is >6 months old with no recent activity

### Output Format

Present results as a markdown table per tier. Keep it compact:

```markdown
## Slam Dunk (N PRs)
| Repo | PR | Description | Size | CI |
|---|---|---|---|---|
| repo | [#N](url) | title | +X/-Y | All green |

## Easy Approve (N PRs)
...

## Needs Review (N PRs)
...

## Skip/Stale (N PRs)
...

## Summary
- X total open PRs across Y repos
- N ready to merge now, M need review, K stale/broken
```

## Rules

- Run repo discovery and PR fetching with minimal tool calls. Batch bash commands.
- When a jq parse error occurs, fall back to `--jq` server-side filtering rather than retrying with different flags.
- Do not fetch PR diff contents. Classify based on metadata, author, labels, CI status, and file count only.
- PRs labeled `kind/dependencies`, `dependencies`, or `skip/changelog` are strong signals for Tier 1/2.
- Include clickable GitHub PR URLs in the output: `https://github.com/rhel-lightspeed/{repo}/pull/{number}`
- If >30 PRs total, focus on Tier 1 and 2 in detail; summarize Tier 3 and 4 briefly.
