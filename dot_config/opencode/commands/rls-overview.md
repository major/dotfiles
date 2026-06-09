---
description: List all open issues and PRs across github.com/rhel-lightspeed repos
---

# RHEL Lightspeed Issues & PRs Overview

Show all open issues and pull requests across every repository under `github.com/rhel-lightspeed`, excluding Renovate bot noise.

## Step 1: Identify repos to skip

Get the list of forked and archived repos so results from them can be excluded:

```bash
gh repo list rhel-lightspeed --fork --json nameWithOwner -q '.[].nameWithOwner' --limit 200
gh repo list rhel-lightspeed --archived --json nameWithOwner -q '.[].nameWithOwner' --limit 200
```

## Step 2: Search Open Issues

```bash
gh search issues --owner rhel-lightspeed --state open --limit 100 -- -author:app/renovate archived:false
```

## Step 3: Search Open Pull Requests

```bash
gh search prs --owner rhel-lightspeed --state open --limit 100 -- -author:app/renovate archived:false
```

## Step 4: Present Results

Summarize the results in two sections:

### Open Issues

List each issue with repository name, issue number, title, and age. Group by repository if there are many.

### Open Pull Requests

List each PR with repository name, PR number, title, author, and age. Group by repository if there are many.

If `$ARGUMENTS` is provided, use it as an additional search term appended to both queries.

## Rules

- Always exclude `app/renovate` authored items
- Exclude results from archived repositories (handled by `archived:false` qualifier)
- Exclude results from forked repositories (identified in Step 1)
- Default limit is 100 per category; mention if results were truncated
- Do not take any action on issues or PRs unless the user explicitly asks
