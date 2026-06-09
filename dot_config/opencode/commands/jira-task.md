---
description: Create an RSPEED Jira task for the command-line-assistant component
---

# Create RSPEED Jira Task

Create a Jira Task in the RSPEED project with proper fields, description template, and haiku.

**Prerequisite:** Load the `rspeed-jira` skill first for cached IDs, field mappings, and API patterns.

## Step 0: Setup

```bash
JIRA_BASE="https://$JIRA_HOST/rest"
# $JIRA_HOST, $JIRA_AUTH, and $JIRA_ACCOUNT_ID are set in ~/.zshrc.local
```

## Step 1: Gather Information

Collect from the user (or infer from `$ARGUMENTS` and session context):

- **Summary** (required): short imperative title
- **Goal** (required): what needs to be accomplished and why
- **Acceptance criteria** (required): list of criteria
- **Story points** (optional): defaults to 2
- **Epic** (optional): pick from active CLA epics in the skill's cached table, or omit
- **Sprint** (optional): current sprint by default, or specify. Check sprint staleness per the skill's refresh protocol.
- **Assign to self** (optional): defaults to yes

If hints or out-of-scope details are relevant, collect those too.

Before building the payload, write a one-paragraph **source-of-truth note** in your working context that states exactly what the ticket is about and which user request/session facts you are using. If `$ARGUMENTS` is empty, infer from the immediately preceding user request and the current session topic, not from any temp file.

**Hard guard against stale tickets:** never read, reuse, patch, or treat an existing `/tmp/jira-task.json` as authoritative. That file is only an output artifact for the payload you build during this exact command invocation. If `/tmp/jira-task.json` already exists, ignore its contents and overwrite it from scratch after the source-of-truth note is complete.

If the inferred summary, goal, or acceptance criteria conflict with the current user request, stop and ask one clarification question before creating the Jira issue. Creating the wrong issue is worse than asking.

## Step 2: Build Description (ADF)

Use the Task template from the rspeed-jira skill:

```text
h4. Goal
<What needs to be accomplished and why>

h4. Acceptance Criteria
* <criterion 1>
* <criterion 2>

h4. Hints
<Implementation hints, relevant files, links. Omit section if nothing useful.>

h4. Out Of Scope
<What this ticket does NOT cover. Omit if not applicable.>

h4. Haiku
<A single original 5-7-5 haiku relevant to the ticket's work>
```

Convert this to ADF JSON. Write the full payload to `/tmp/jira-task.json` for large descriptions. The payload must be newly generated from `$ARGUMENTS` and/or current session context each time. Do not inspect an existing `/tmp/jira-task.json` except after overwriting it, and only to verify the newly written payload.

The haiku is mandatory. Write an original 5-7-5 haiku specific to the ticket's technical content.

## Step 3: Create Issue

Before running `curl`, verify the payload summary in `/tmp/jira-task.json` matches the source-of-truth note and the current user request. At minimum, inspect `.fields.summary` and confirm it names the work requested for this command invocation. If it names any unrelated prior task, discard and rebuild the payload.

```bash
curl -s -u "$JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -X POST "$JIRA_BASE/api/3/issue" \
  -d @/tmp/jira-task.json | jq '{key: .key, id: .id, self: .self}'
```

Payload structure:

```json
{
  "fields": {
    "project": {"key": "RSPEED"},
    "issuetype": {"name": "Task"},
    "summary": "TITLE_HERE",
    "description": "<ADF_JSON>",
    "components": [{"name": "command-line-assistant"}],
    "customfield_10014": "EPIC_KEY_HERE"
  }
}
```

Omit `customfield_10014` if no epic was selected.

## Step 4: Set Post-Create Fields

Story points and sprint can fail on create. Always set them separately:

```bash
TICKET="RSPEED-XXXX"

# Set story points and sprint
curl -s -u "$JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -X PUT "$JIRA_BASE/api/3/issue/$TICKET" \
  -d '{"fields": {"customfield_10028": POINTS, "customfield_10020": SPRINT_ID}}'

# Assign to self
curl -s -u "$JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -X PUT "$JIRA_BASE/api/3/issue/$TICKET/assignee" \
  -d "{\"accountId\": \"$JIRA_ACCOUNT_ID\"}"
```

Skip sprint assignment if user did not request it. Always assign to self unless user says otherwise.

## Step 5: Confirm

Output the created ticket:

```text
Created: RSPEED-XXXX
Summary: <title>
Points: <N>
Sprint: <sprint name>
Epic: <epic key or none>
URL: https://$JIRA_HOST/browse/RSPEED-XXXX
```

## Rules

- Component `command-line-assistant` is mandatory on every ticket.
- Story points (`customfield_10028`) are mandatory. Defaults to 2 if not specified.
- Sprint field takes a bare integer, not `{"id": N}`.
- Description must be ADF JSON, not wiki markup text.
- Always include the haiku section.
- Never use a pre-existing `/tmp/jira-task.json` as input. Always overwrite it from scratch for the current command invocation before creating the issue.
- The ticket's summary, goal, and acceptance criteria must trace to `$ARGUMENTS` or the immediately preceding session context. Do not prefer stale filesystem artifacts over conversation context.
- If a GitHub issue, GitLab issue, or related Jira ticket was referenced or discussed during the session, link it (add a remote link for GitHub/GitLab URLs, or an issue link for other Jira tickets).
- Do not search for IDs that are cached in the rspeed-jira skill (board IDs, account ID, epic keys, transition IDs, field IDs).
- **Sprint cache maintenance:** If you refresh sprints (per the skill's sprint refresh protocol) and find the cached table in `~/.config/opencode/skills/rspeed-jira/SKILL.md` is stale (different IDs, names, dates, or states than the API returned), update the "Sprints (CLA & Incubation)" table in that file with the fresh values. Then remind the user to run `chezmoi re-add ~/.config/opencode/skills/rspeed-jira/SKILL.md`.
