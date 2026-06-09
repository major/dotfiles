---
description: List all unresolved Jira tickets assigned to me across all projects
---

# My Unresolved Jira Tickets

Show every unresolved Jira ticket assigned to me, across all projects and spaces.

## Step 0: Setup

```bash
JIRA_BASE="https://$JIRA_HOST/rest"
# $JIRA_HOST and $JIRA_AUTH are set in ~/.zshrc.local
```

## Step 1: Query

```bash
curl -s -u "$JIRA_AUTH" -G \
  --data-urlencode 'jql=assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC' \
  --data-urlencode 'fields=key,summary,status,priority,project,updated,customfield_10020' \
  --data-urlencode 'maxResults=100' \
  "$JIRA_BASE/api/3/search/jql" \
  | jq -r '.issues[] |
      ((.fields.customfield_10020 // []) | map(select(.state == "active")) | .[0].name // "-") as $sprint_raw |
      ($sprint_raw | sub("^.*\\s(?<n>\\d+)\\s*$"; "\(.n)")) as $sprint |
      "\(.key)\t\(.fields.project.key)\t\(.fields.status.name)\t\(.fields.priority.name // "None")\t\($sprint)\t\(.fields.summary)"'
```

## Step 2: Present Results

Format as a table sorted by priority then most recently updated:

```text
KEY            PROJECT   STATUS         PRIORITY   SPRINT   SUMMARY
RSPEED-1234    RSPEED    In Progress    Major      37       Fix token refresh logic
RHEL-5678      RHEL      To Do          Minor      -        Update package metadata
```

Use a clean column layout. Truncate long summaries to keep lines readable. If there are no results, say so plainly.

## Rules

- `currentUser()` in JQL resolves to the authenticated user. No need to hardcode identity.
- `resolution = Unresolved` covers all open work regardless of status (New, To Do, In Progress, Review, etc.).
- No project filter: this query spans every project the user has access to.
- Read-only. This command never mutates tickets.
- Endpoint is `/rest/api/3/search/jql` (the legacy `/rest/api/3/search` was removed by Atlassian).
- Sprint comes from `customfield_10020`. The column shows the trailing number of the active sprint name (e.g. "CLA & Incubation Sprint 37" -> "37"), or "-" when there is no active sprint. If the sprint name has no trailing number, the full name is shown.
