---
name: rspeed-jira
description: "RSPEED Jira expert using acli (Atlassian CLI). Cached IDs for efficient CLA and Incubation sprint work, command-line-assistant tickets, transitions, and sprint planning. Triggers: 'jira', 'RSPEED', 'sprint', 'ticket', 'backlog', 'CLA', 'incubation', 'command-line-assistant', 'story points'."
metadata:
  author: "Major Hayden"
  version: "8.0.0"
---

# RSPEED Jira Expert - acli (Atlassian CLI)

You are an expert in managing the RSPEED Jira project using `acli` (Atlassian CLI v1.3.x at `/usr/bin/acli`).

Your job is to keep RSPEED work fast and accurate by using cached project knowledge, pre-built JQL, known field mappings, and RSPEED-specific ticket templates.

**NEVER look up IDs already listed here. Use them directly.**

---

## Tooling Rules

1. Use `acli` for all Jira operations. Fall back to `curl` only for remote links and user search (see curl fallback sections).
2. Auth is persistent after one-time login. No per-command auth variables needed.
3. Use this skill for RSPEED-specific data: project key, boards, sprints, custom fields, JQL, templates, gotchas, and workflow defaults.
4. Prefer `--json` output. Pipe to `jq` for filtering and formatting.
5. Use `currentUser()` in JQL for self-references. Never use `major@redhat.com` in JQL.
6. Always pass `--yes` on mutating commands to skip confirmation prompts.

### Auth Setup (One-Time)

```bash
echo $JIRA_API_TOKEN | acli jira auth login \
  --site "redhat.atlassian.net" \
  --email "mhayden@redhat.com" \
  --token
```

Auth persists across sessions. Note `acli auth status` is unreliable (see gotcha #21): it can report "unauthorized" even when login succeeded. When in doubt, just re-run the login command above (idempotent, prints "Authentication successful") rather than trusting the status check. The real test is whether an actual `acli jira workitem` call works.

### Basic Command Patterns

```bash
# Search with JQL
acli jira workitem search \
  --jql 'project = RSPEED AND component = "command-line-assistant"' \
  --json --fields "key,summary,status,assignee,priority" --limit 50

# View a single issue
acli jira workitem view RSPEED-XXXX --json

# View with specific fields
acli jira workitem view RSPEED-XXXX --json \
  --fields "key,summary,status,assignee,priority,customfield_10028"
```

---

## Cached Identifiers

### Project

| Key | Value |
|-----|-------|
| Project | `RSPEED` |
| Jira instance | `redhat.atlassian.net` |
| Jira User | `Major Hayden` (display name) / `mhayden@redhat.com` (email) |
| Account ID | `712020:fed56895-9160-4662-9256-00c8b94870fd` |
| Default component | `command-line-assistant` |

### Boards

| Board | ID | Type | Notes |
|-------|----|------|-------|
| Command Line Assistant | `11355` | scrum | Primary CLA board |
| RHEL Lightspeed Scrum | `11219` | scrum | Cross-team board, use for sprint refresh |
| Incubation | `5294` | scrum | Incubation board |
| RHEL Lightspeed | `5292` | kanban | Overview board |

Use board `11219` for sprint refresh. CLA sprints originate there, and board `11355` may not show all future sprints.

### Sprints (CLA & Incubation)

Sprint IDs change every 2 weeks. If the current date is past the end date, refresh using the sprint refresh protocol.

| Sprint | ID | Start | End | State |
|--------|----|-------|-----|-------|
| CLA & Incubation Sprint 37 | `66339` | 2026-05-14 | 2026-05-28 | active |
| CLA & Incubation Sprint 38 | `67207` | 2026-05-28 | 2026-06-11 | future |

### Workflow Statuses

acli transitions use status **names** directly with `--status`. No transition IDs needed.

| Status Name | Notes |
|-------------|-------|
| `New` | Default for new tickets |
| `Refinement` | Needs refinement |
| `To Do` | Ready for work |
| `In Progress` | Actively being worked |
| `Review` | In review |
| `Closed` | Done |

### Custom Fields

| Field | ID | JQL Clause | Type |
|-------|----|------------|------|
| Sprint | `customfield_10020` | `Sprint` | array of json (greenhopper) |
| Story Points | `customfield_10028` | `Story Points` | float |
| Original Story Points | `customfield_10977` | `Original story points` | float |
| Epic Link | `customfield_10014` | `"Epic Link"` | epic key string, e.g. `"RSPEED-338"` |
| DEV Story Points | `customfield_10506` | `DEV Story Points` | float |
| QE Story Points | `customfield_10572` | `QE Story Points` | float |
| DOC Story Points | `customfield_10510` | `DOC Story Points` | float |
| Development | `customfield_10000` | `development` | dev panel counts only, no PR URLs |

### Link Types

| Name | ID |
|------|-----|
| Blocks | `10000` |
| Cloners | `10001` |
| Duplicate | `10002` |
| Related | `10077` |
| Triggers | `10082` |
| Depend | `10076` |
| Incorporates | `10080` |

acli link commands use type **names** (e.g. `--type Blocks`), not IDs.

### Active Epics (CLA Component)

Epics are long-lived but can close. If an epic seems stale, verify before using it.

Use these keys directly in `customfield_10014` when creating tickets. Do not search for epic keys.

| Key | Summary | Status |
|-----|---------|--------|
| RSPEED-338 | Continuous Improvement for Developer workflow | In Progress |
| RSPEED-1897 | CLA is able to understand caller system information | In Progress |
| RSPEED-1370 | CLA Streaming responses | New |
| RSPEED-1635 | CLA deterministic tests development 0.4.x | New |
| RSPEED-636 | Shell Integrations | New |
| RSPEED-603 | CLA Resiliency Tracking | New |
| RSPEED-280 | Managing user conversation history | New |
| RSPEED-168 | CLA Test Suite | New |
| RSPEED-1188 | CLA OffSec Pen-testing remediation | New |

---

## Pre-built JQL Templates

Use these directly unless the user asks for something custom.

### My unresolved tickets (all RSPEED)

```jql
assignee = currentUser() AND project = RSPEED AND resolution = Unresolved ORDER BY priority DESC, updated DESC
```

### My open CLA tickets (current sprint)

```jql
project = RSPEED AND component = "command-line-assistant" AND sprint in openSprints() AND assignee = currentUser() ORDER BY priority DESC, updated DESC
```

### All CLA tickets in current sprint

```jql
project = RSPEED AND component = "command-line-assistant" AND sprint in openSprints() ORDER BY status ASC, priority DESC
```

### Unassigned CLA backlog

```jql
project = RSPEED AND component = "command-line-assistant" AND assignee is EMPTY AND status = New ORDER BY priority DESC, created ASC
```

### CLA tickets needing refinement

```jql
project = RSPEED AND component = "command-line-assistant" AND status = Refinement ORDER BY priority DESC
```

### CLA tickets in review

```jql
project = RSPEED AND component = "command-line-assistant" AND status = Review ORDER BY updated DESC
```

### Recently closed CLA tickets

```jql
project = RSPEED AND component = "command-line-assistant" AND status = Closed AND updated >= -14d ORDER BY updated DESC
```

### CLA tickets updated this week

```jql
project = RSPEED AND component = "command-line-assistant" AND updated >= startOfWeek() ORDER BY updated DESC
```

### CLA tickets by specific sprint name

```jql
project = RSPEED AND component = "command-line-assistant" AND sprint = "CLA & Incubation Sprint 35" ORDER BY status ASC, priority DESC
```

---

## Common Operations

### Search with JQL

```bash
acli jira workitem search \
  --jql 'project = RSPEED AND component = "command-line-assistant" AND sprint in openSprints() ORDER BY status ASC, priority DESC' \
  --json --fields "key,summary,status,assignee,priority,customfield_10028" --limit 50
```

Useful `--fields` presets:

- Quick overview: `key,summary,status,assignee,priority`
- With story points: `key,summary,status,assignee,priority,customfield_10028`
- Full detail: `key,summary,status,assignee,priority,description,labels,issuetype,components,customfield_10028,customfield_10020`
- Keys only for batch operations: `key`

Additional output options: `--count` (count only), `--csv` (CSV format), `--web` (open in browser), `--paginate` (auto-paginate all results).

### View a Single Issue

```bash
acli jira workitem view RSPEED-XXXX --json \
  --fields "key,summary,status,assignee,priority,description,customfield_10028,customfield_10020"
```

### Create a New CLA Ticket

Jira create screens can reject some custom fields. Create the issue first with basic fields, then set story points, sprint, and assignee in follow-up calls.

**Step 1: Create the issue with `--from-json`**

CLA tickets require the `command-line-assistant` component, so use `--from-json` for the full payload:

```bash
cat > /tmp/issue.json << 'ENDJSON'
{
  "projectKey": "RSPEED",
  "type": "Task",
  "summary": "TITLE_HERE",
  "description": ADF_JSON_HERE,
  "additionalAttributes": {
    "components": [{"name": "command-line-assistant"}],
    "customfield_10014": "EPIC_KEY_HERE"
  }
}
ENDJSON

acli jira workitem create --from-json /tmp/issue.json
```

For simple descriptions without ADF formatting:

```bash
acli jira workitem create \
  --project RSPEED --type Task \
  --summary "TITLE_HERE" \
  --description "Plain text description here"
```

Note: the simple form cannot set components. Follow up with an edit if using this form.

**Step 2: Set custom fields and assign**

**Custom fields (story points, sprint, epic link) must be set via the REST API, NOT `acli workitem edit`.** acli v1.3.x `edit --from-json` rejects `additionalAttributes` (`json: unknown field "additionalAttributes"`) and its `--generate-json` template exposes only assignee/description/issues/labels/summary/type. There is no acli path to set arbitrary `customfield_*` on edit. Use a single REST `PUT` instead (verified working, returns HTTP 204):

```bash
JIRA_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"

# Story points (float), sprint (bare integer ID), epic link (key string).
# Combine all custom fields into ONE PUT.
curl -s -u "$JIRA_AUTH" -H "Content-Type: application/json" -X PUT \
  "https://redhat.atlassian.net/rest/api/3/issue/RSPEED-XXXX" \
  -d '{"fields": {"customfield_10028": STORY_POINTS_HERE, "customfield_10020": SPRINT_ID_HERE}}' \
  -w "\nHTTP %{http_code}\n"
# HTTP 204 = success (no response body). Any 4xx prints a JSON error with the bad field.

# Assign to self (acli handles assignee fine)
acli jira workitem assign --key RSPEED-XXXX --assignee @me --yes
```

Note: assignee, summary, labels, and description DO work via acli edit. Only `customfield_*` requires the REST PUT.

Hard rules for ticket creation:

1. Component is mandatory: every RSPEED CLA ticket must have `command-line-assistant`.
2. Story Points are mandatory: every ticket must set `customfield_10028`. If the user does not specify points, ask before creating the ticket.
3. Default type is Task. Use Bug, Story, Epic, Feature, or Sub-task only when explicitly requested.
4. Use the description template for the issue type.
5. Include the haiku section required by the templates.

### Update Fields

```bash
# Built-in fields (summary, assignee, labels) via acli
acli jira workitem edit --key RSPEED-XXXX --summary "New summary" --yes

# Custom fields (story points, sprint, epic link) via REST PUT, NOT acli edit.
# acli edit --from-json does NOT accept additionalAttributes or customfield_*.
JIRA_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"
curl -s -u "$JIRA_AUTH" -H "Content-Type: application/json" -X PUT \
  "https://redhat.atlassian.net/rest/api/3/issue/RSPEED-XXXX" \
  -d '{"fields": {"customfield_10028": 5, "customfield_10020": 65285, "customfield_10014": "RSPEED-338"}}' \
  -w "\nHTTP %{http_code}\n"
# HTTP 204 = success.
```

To update labels:

```bash
cat > /tmp/edit.json << 'ENDJSON'
{
  "issues": ["RSPEED-XXXX"],
  "labelsToAdd": ["label1", "label2"]
}
ENDJSON

acli jira workitem edit --from-json /tmp/edit.json --yes
```

### Transition a Ticket

```bash
# Transition by status name (not ID)
acli jira workitem transition --key RSPEED-XXXX --status "In Progress" --yes
```

### Assign a Ticket

```bash
# Assign to self
acli jira workitem assign --key RSPEED-XXXX --assignee @me --yes

# Assign to someone by email
acli jira workitem assign --key RSPEED-XXXX --assignee "user@redhat.com" --yes

# Unassign
acli jira workitem assign --key RSPEED-XXXX --remove-assignee --yes
```

### Add a Comment

**Formatting caveat (important):** `comment create --body`/`--body-file` treats input as **plain text**. Jira renders comments as ADF, so wiki markup (`h3.`, `{code}`, `*bold*`) shows up as **literal text**, not formatting. Use plain text for simple comments. For any formatted comment (headings, code blocks, lists, links), build ADF JSON and post it.

```bash
# Plain text comment (no formatting needed)
acli jira workitem comment create --key RSPEED-XXXX --body "Comment text here"

# Plain text from a file (for long unformatted comments)
acli jira workitem comment create --key RSPEED-XXXX --body-file /tmp/comment.txt
```

**Formatted comment via ADF.** `create` has no ADF flag, but `update` has `--body-adf`. Workflow: post a placeholder, then update it with ADF JSON. Build the ADF the same way as ticket descriptions (see ADF Conversion section: `heading`, `paragraph`, `codeBlock` with `attrs.language`, `bulletList`/`orderedList`, inline `code` marks, `link` marks).

```bash
# 1. Post a placeholder, capture nothing (we look it up next)
acli jira workitem comment create --key RSPEED-XXXX --body "placeholder"

# 2. Get the comment ID (note: list returns body as rendered text, not ADF)
acli jira workitem comment list --key RSPEED-XXXX --json \
  | jq -r '.comments[] | "\(.id)\t\(.author)"'
#   author shows as a plain string (display name), e.g. "Major Hayden" - do NOT use .author.displayName

# 3. Validate then update with ADF JSON
jq empty /tmp/comment.adf.json && \
acli jira workitem comment update --key RSPEED-XXXX --id COMMENT_ID --body-adf /tmp/comment.adf.json

# 4. (Optional) verify it stored as structured ADF, not literal text.
#    The list/view endpoints return rendered text; use the raw REST API to see node types:
curl -s -u "mhayden@redhat.com:$JIRA_API_TOKEN" \
  "https://redhat.atlassian.net/rest/api/3/issue/RSPEED-XXXX/comment/COMMENT_ID" \
  | jq -r '.body.content[].type' | sort | uniq -c
#   Expect heading/codeBlock/bulletList/paragraph counts, NOT a single block of literal "{code}" text.
```

Gotchas observed:
- `comment list --json` returns `author` as a **plain string**, and `body` as **rendered text** (not ADF). jq filters like `.author.displayName` or `.body.content[]` fail on the list endpoint. Use `.author` directly; use the raw REST comment endpoint to inspect stored ADF.
- `acli auth status` can report "unauthorized" even right after a successful `acli jira auth login`. The login itself prints "Authentication successful" - trust that and proceed; the status check is unreliable.

### Link Two Issues

```bash
acli jira workitem link create \
  --out RSPEED-XXXX --in RSPEED-YYYY --type Blocks --yes
```

To list links on an issue:

```bash
acli jira workitem link list --key RSPEED-XXXX --json
```

### Add a Remote Link (PR or Upstream Issue) - curl fallback

acli does not support remote links. Use curl:

```bash
JIRA_BASE="https://redhat.atlassian.net/rest"
JIRA_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"

curl -s -u "$JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -X POST "$JIRA_BASE/api/3/issue/RSPEED-XXXX/remotelink" \
  -d '{
    "object": {
      "url": "https://github.com/...",
      "title": "Upstream PR #NNN: title"
    }
  }' | jq '{id: .id}'
```

### Find PRs Linked to a Ticket

Use `gh` to search for PRs by ticket key:

```bash
gh search prs 'RSPEED-XXXX' --json title,url,state,repository,number
```

PRs are linked to Jira tickets via the ticket key in the PR title or branch name. Jira development field data usually provides counts, not the actual PR URLs.

### Backfill a Jira Ticket for an Existing PR

1. Get PR details with `gh pr view <PR_URL>`.
2. Create the ticket with the acli create command above.
3. Set story points and sprint via the REST `PUT` (gotcha #19), then assign with `acli jira workitem assign`.
4. Transition to In Progress: `acli jira workitem transition --key RSPEED-XXXX --status "In Progress" --yes`.
5. Add the PR as a remote link with the curl fallback command.
6. Update the PR title with the Jira ticket prefix: `RSPEED-XXXX: original title`.

### Batch Operations

acli supports bulk operations natively via `--jql` on mutating commands:

```bash
# Bulk transition
acli jira workitem transition \
  --jql 'project = RSPEED AND component = "command-line-assistant" AND sprint in openSprints() AND status = "To Do"' \
  --status "In Progress" --yes

# Bulk assign
acli jira workitem assign \
  --jql 'project = RSPEED AND assignee is EMPTY AND status = New' \
  --assignee @me --yes

# Bulk edit of CUSTOM fields: acli edit cannot set customfield_*, so fan out
# a REST PUT per key. Get the keys first, then loop.
JIRA_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"
acli jira workitem search \
  --jql 'project = RSPEED AND component = "command-line-assistant" AND "Story Points" is EMPTY' \
  --json --fields key | jq -r '.. | objects | .key? // empty' | while read -r KEY; do
    curl -s -u "$JIRA_AUTH" -H "Content-Type: application/json" -X PUT \
      "https://redhat.atlassian.net/rest/api/3/issue/$KEY" \
      -d '{"fields": {"customfield_10028": 3}}' -w "$KEY -> HTTP %{http_code}\n"
done

# Bulk transition/assign DO support --jql natively (built-in fields only).
```

**Always verify the JQL match set before running bulk mutations.** Run the JQL with `--count` first:

```bash
acli jira workitem search \
  --jql 'project = RSPEED AND assignee is EMPTY AND status = New' \
  --count
```

### User Search - curl fallback

acli does not support user search by email. Use curl:

```bash
JIRA_BASE="https://redhat.atlassian.net/rest"
JIRA_AUTH="mhayden@redhat.com:$JIRA_API_TOKEN"

curl -s -u "$JIRA_AUTH" -G \
  --data-urlencode 'query=user@redhat.com' \
  "$JIRA_BASE/api/3/user/search" | jq '.[] | {accountId, displayName, emailAddress}'
```

---

## Sprint Refresh Protocol

Sprint IDs become stale every 2 weeks. Check staleness before using cached sprint IDs.

1. Compare the current date against cached sprint end dates above.
2. If the current date is after the active sprint end date, refresh from board `11219`:

```bash
acli jira board list-sprints --id 11219 --state active,future --json \
  | jq '.. | objects | select(has("name") and has("state")) | {id, name, state, startDate, endDate}'
```

The `list-sprints --json` output is a wrapped object, not a flat array. Both `.[]` and `.values[]` fail on it (`Cannot index boolean with string "name"`). The recursive `.. | objects | select(has("name") and has("state"))` filter is structure-agnostic and works regardless of nesting. Filter by name in a follow-up if needed: append `| select(.name | test("CLA|Incubation"))`. Note the dates are UTC ISO timestamps (e.g. `2026-05-28T13:59:44Z`); compare against those, and remember the active sprint may already show `state: "active"` even though the cached table still lists it as `future`.

3. Select CLA or Incubation sprints from the response by name.
4. Update working context with the new sprint ID, name, state, start date, and end date.

---

## Sprint Reporting

### Sprint Velocity Check

```bash
acli jira workitem search \
  --jql 'project = RSPEED AND component = "command-line-assistant" AND sprint = "CLA & Incubation Sprint 35" AND status = Closed' \
  --json --fields "key,summary,customfield_10028" --limit 50 \
  | jq '[.[].fields.customfield_10028 // 0] | {total_points: add, ticket_count: length}'
```

### Sprint Burndown Snapshot

```bash
acli jira workitem search \
  --jql 'project = RSPEED AND component = "command-line-assistant" AND sprint in openSprints()' \
  --json --fields "key,summary,status,customfield_10028,assignee" --limit 50 \
  | jq '.[] | {key: .key, summary: .fields.summary, status: .fields.status.name, assignee: .fields.assignee.displayName, points: .fields.customfield_10028}'
```

Note: if jq paths return null, inspect raw `--json` output first and adjust field paths. acli output structure may differ from raw Jira API responses.

---

## Efficiency Guidelines

### Do Not Waste Calls

1. Do not search for board IDs: already known as 11355, 11219, 5294, 5292.
2. Do not fetch a known sprint ID unless it is stale.
3. Do not get an issue before editing it if the desired update is already known.
4. Do not search for active CLA epic keys: use the cached table.
5. Do not look up Major Hayden's account ID: use `@me` for self-assign.
6. Do not look up transition IDs: acli uses status names directly.
7. Do not fetch link type IDs: acli uses link type names directly.
8. Auth persists across sessions, so a login is usually unnecessary. But `acli auth status` is unreliable (gotcha #21), so if a call returns "unauthorized" just re-run the idempotent login rather than debugging the status check.

### Do Optimize

1. Use cached IDs everywhere.
2. Combine field updates into a single `--from-json` edit when possible.
3. Use pre-built JQL templates.
4. Request only needed fields with `--fields`.
5. Use `jq` for parsing and transforming JSON responses.
6. Use `--count` to verify batch operation scope before mutating.
7. Use `--jql` on edit/transition/assign for bulk operations instead of shell loops.

---

## Description Templates

Every issue type in RSPEED has a description template. Always use the matching template when creating tickets. When using `--from-json`, the description field uses Atlassian Document Format (ADF) JSON.

**Haiku rule:** Every ticket description must end with a Haiku heading containing a single original haiku in 5-7-5 syllable format relevant to the ticket's subject matter. Keep it work-appropriate and specific to the technical content.

### ADF Conversion

The templates below use human-readable notation. Convert to ADF JSON before sending via `--from-json`. Common ADF patterns:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {"type": "heading", "attrs": {"level": 4}, "content": [{"type": "text", "text": "Goal"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "Description text here"}]},
    {"type": "heading", "attrs": {"level": 4}, "content": [{"type": "text", "text": "Acceptance Criteria"}]},
    {"type": "bulletList", "content": [
      {"type": "listItem", "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "criterion 1"}]}
      ]},
      {"type": "listItem", "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": "criterion 2"}]}
      ]}
    ]}
  ]
}
```

For inline code, use `"marks": [{"type": "code"}]` on the text node.

Write the JSON payload to a temp file for large descriptions:

```bash
cat > /tmp/issue.json << 'ENDJSON'
{
  "projectKey": "RSPEED",
  "type": "Task",
  "summary": "TITLE_HERE",
  "description": ADF_JSON_HERE,
  "additionalAttributes": {
    "components": [{"name": "command-line-assistant"}],
    "customfield_10014": "EPIC_KEY_HERE"
  }
}
ENDJSON

acli jira workitem create --from-json /tmp/issue.json
```

### Task (Default Type)

```text
h4. Goal
<What needs to be accomplished and why>

h4. Acceptance Criteria
* <criterion 1>
* <criterion 2>

h4. Hints
<Implementation hints, relevant files, links. Omit section if nothing useful to add.>

h4. Out Of Scope
<What this ticket explicitly does NOT cover. Omit section if not applicable.>

h4. Haiku
<A single original 5-7-5 haiku relevant to the ticket's work>
```

### Bug

```text
<Free-form description of the bug: what happened, expected vs actual, reproduction steps>

h4. Acceptance Criteria
* <what fixed looks like>

h4. Hints
<Stack traces, logs, related PRs, links>

h4. Out Of Scope
<What this fix does NOT address>

h4. Haiku
<A single original 5-7-5 haiku relevant to the ticket's work>
```

### Story

```text
h4. Goal
<User-facing goal, the why>

h4. Acceptance Criteria
* <criterion 1>
* <criterion 2>

h4. Hints
<Technical guidance, related work>

h4. Out Of Scope
<Boundaries of this story>

h4. Haiku
<A single original 5-7-5 haiku relevant to the ticket's work>
```

### Epic

```text
h4. Goal
<High-level objective>

h4. Acceptance Criteria
* <criterion 1>
* <criterion 2>

h4. Dependencies
<Other teams, epics, external blockers>

h4. Stakeholders
<Who cares about this epic>

h4. Haiku
<A single original 5-7-5 haiku relevant to the ticket's work>
```

### Feature

```text
h4. Feature Overview
<What this feature is>

h4. Goals
<What we're trying to achieve>

h4. Requirements
||Requirement||Notes||isMvp?||
|<requirement>|<notes>|Yes/No|

h4. Use Cases (Optional)
<User scenarios>

h4. Out of Scope
<What this feature does NOT include>

h4. Background and strategic fit
<Why this matters>

h4. Customer Considerations
<Customer impact, rollout concerns>

h4. Haiku
<A single original 5-7-5 haiku relevant to the ticket's work>
```

### Sub-task

No template. Keep it concise since context comes from the parent ticket. Still include a Haiku heading at the end.

---

## Gotchas

1. Story points and sprint can fail on create. Create first, then set `customfield_10028` and `customfield_10020` via a **REST `PUT`** (not acli edit; see gotcha #19).
2. Assignee on create may be ignored by Jira screens. Use `acli jira workitem assign` after creation.
3. Component is mandatory for CLA tickets: `command-line-assistant`.
4. Story Points are mandatory: use `customfield_10028`, not DEV/QE/DOC variants.
5. Default issue type is Task. Do not create Bug, Story, Epic, Feature, or Sub-task unless explicitly requested.
6. Sprint names contain `&`. Quote sprint names in JQL: `sprint = "CLA & Incubation Sprint 35"`.
7. Always use description templates and include the haiku section.
8. Epic link field is `customfield_10014` with the epic key as a string, e.g. `"RSPEED-338"`.
9. JQL self-reference should use `currentUser()`. For other team members, use display names or `@redhat.com` emails. `major@redhat.com` does not work.
10. Dev panel PR details are not reliable for URLs. Use `gh search prs 'RSPEED-XXXX'` for actual PR details.
11. Sprint field takes a bare integer in JSON: `65285`, not `{"id": 65285}`.
12. Sprint refresh uses board `11219`. Board `11355` may not show all future CLA sprints.
13. Mutating commands need extra care. Use `--count` to verify JQL scope before bulk operations.
14. **Description format is ADF, not wiki markup.** When using `--from-json`, build proper ADF JSON for the description field. The templates use wiki markup notation for readability but must be converted to ADF JSON. For simple plain-text descriptions, `--description "text"` works without ADF.
15. **Remote links and user search require curl.** Set `JIRA_BASE` and `JIRA_AUTH` for those two operations only (see curl fallback sections).
16. **Always pass `--yes`** on mutating acli commands to skip confirmation prompts.
17. **acli transitions use status names** ("In Progress"), not transition IDs. Do not use numeric IDs with acli.
18. **acli `--json` output structure may differ from raw API responses.** When writing jq filters, prefer the structure-agnostic `.. | objects | select(has("..."))` over positional paths like `.[]`, `.issues[]`, or `.values[]`, which break on wrapped objects (e.g. `list-sprints` fails with `Cannot index boolean with string "name"`).
19. **acli edit CANNOT set custom fields.** `acli jira workitem edit --from-json` rejects `additionalAttributes` (`json: unknown field "additionalAttributes"`) in v1.3.x, and `--generate-json` only exposes assignee/description/issues/labels/summary/type. Set any `customfield_*` (story points `10028`, sprint `10020`, epic link `10014`) with a REST `PUT /rest/api/3/issue/KEY` carrying a `{"fields": {...}}` body (HTTP 204 on success). `additionalAttributes` works on **create** (`--from-json`) but NOT on edit.
20. **acli auth is per-site.** If switching between Jira instances, re-login. For RSPEED, the site is always `redhat.atlassian.net`.
21. **`acli auth status` is unreliable** and may print "unauthorized" even when authenticated. Don't gate work on it; just run the login command (it prints "Authentication successful") and proceed. Conversely, don't trust a green status blindly either, the actual API call is the real test.
