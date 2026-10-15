---
name: jira-dump
description: Bulk-download Jira issues (summary, description, status, assignee, reporter, labels, and all comments) to one JSON file with ~/bin/jira-dump, then analyze it with jq. Use when the user wants to analyze, count, group, search, or summarize many Jira issues at once, such as all open bugs in a project or the results of any JQL query. Prefer it over per-issue Jira MCP calls whenever more than a few issues are involved.
---

# jira-dump

`~/bin/jira-dump` saves Jira issues to one JSON file in a few seconds, even for thousands of issues.
It is read-only. Analyze the file with `jq` instead of making one Jira call per issue.

## Run it

```bash
cd ~/.cache/opencode-tmp/opencode          # keep dumps out of git repos
jira-dump                                  # open issues in $JIRA_DUMP_PROJECT
jira-dump PROJ                             # open issues in project PROJ
jira-dump PROJ -t Bug                      # one issue type (project key only)
jira-dump 'assignee = currentUser() AND statusCategory != Done' -o mine.json
jira-dump 'project = PROJ AND labels = foo' -o - | jq .count
```

- The positional argument is a project key if it looks like one (`PROJ`); anything else is JQL.
- A project key means `project = KEY AND statusCategory != Done ORDER BY key ASC`.
- Default output: `<project>-open-issues.json`, or `jira-results.json` for JQL. Use `-o NAME.json` so dumps do not overwrite each other, or `-o -` for stdout.
- `-t/--type` works only with a project key. With JQL, write `issuetype = Bug` yourself.
- Progress and errors go to stderr. A bad token (401), unknown project (404), or invalid JQL (400) exits 1 with Jira's message. Report it and stop; do not retry with guesses.
- Needs `JIRA_HOST`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` (or `JIRA_TOKEN`). With no argument it uses `JIRA_DUMP_PROJECT`; ask the user for a project if that is unset.
- Scale: about 1400 issues make a 4 MB file and download in under 10 seconds.

## Output shape

```json
{
  "jql": "...",
  "count": 131,
  "issues": [
    {
      "key": "PROJ-625",
      "url": "https://<JIRA_HOST>/browse/PROJ-625",
      "type": "Bug",
      "summary": "...",
      "description": "Jira wiki markup, or null",
      "status": "New",
      "priority": "Major",
      "assignee": {"name": "...", "account_id": "..."},
      "reporter": {"name": "...", "account_id": "..."},
      "created": "2026-08-22T12:21:11.392+0000",
      "updated": "2026-10-02T12:51:31.898+0000",
      "labels": ["..."],
      "components": ["..."],
      "comments": [
        {"author": {"name": "...", "account_id": "..."}, "created": "...", "updated": "...", "body": "..."}
      ]
    }
  ]
}
```

- `assignee` is `null` when unassigned. `description` can be `null`.
- Comments are complete (not truncated) and oldest first.
- Text is Jira wiki markup (`h2.`, `{code}`, `[text|url]`), not Markdown.

## Analyze it

Never read a whole dump into context. Slice it with `jq` first, then read only what you need.

```bash
F=proj-open-issues.json
jq -r '.issues | group_by(.status) | map("\(length)\t\(.[0].status)") | .[]' $F | sort -rn
jq -r '.issues | group_by(.assignee.name // "UNASSIGNED") | map("\(length)\t\(.[0].assignee.name // "UNASSIGNED")") | .[]' $F | sort -rn
jq -r '.issues[] | select(.assignee == null) | [.key, .type, .summary] | @tsv' $F
jq -r '.issues[] | select(.comments == []) | [.key, .created[:10], .summary] | @tsv' $F
jq -r '.issues | sort_by(.updated) | .[:20][] | [.key, .updated[:10], .status, .summary] | @tsv' $F   # stalest
jq -r '[.issues[].labels[]] | group_by(.) | map("\(length)\t\(.[0])") | .[]' $F | sort -rn | head -20
jq -r '.issues[] | select([.summary, .description, .comments[].body] | map(. // "") | join(" ") | test("timeout"; "i")) | [.key, .summary] | @tsv' $F
jq '.issues[] | select(.key == "PROJ-625")' $F                                # one full issue
```

- Write a short Python script for analysis that needs more than `jq`, such as finding duplicates or grouping text by theme. Read the JSON with the standard `json` module.
- For theme or duplicate analysis across many issues, first extract a compact view (`key`, `summary`, and the first 300 characters of `description`) as TSV, then read that.
- To check the newest state of a few specific issues, use a narrow JQL dump (`'key in (PROJ-1, PROJ-2)'`) instead of reusing an old file.

## Rules

- Dumps are snapshots. Mention the dump time when you report results, and make a fresh dump if the data might be old.
- Dumps contain internal and possibly sensitive data. Keep them in `~/.cache/opencode-tmp/opencode`, never in a repo, ticket, or MR.
- This skill only reads data. Change Jira issues only when the user asks, and use other tools to do it.
