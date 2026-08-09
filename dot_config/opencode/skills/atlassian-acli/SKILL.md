---
name: atlassian-acli
description: Use for Jira Cloud via Atlassian acli when requests mention Jira, Jira keys or URLs, JQL, boards, sprints, filters, comments, edit, assign, transition, jira, or jira-cli.
---

# Atlassian acli for Jira Cloud

Use `acli` for Jira Cloud work in this environment.
If the user asks for `jira`, `jira-cli`, or generic Jira CLI usage, use this skill and prefer `acli`.

## Scope and safety

- Default to read-only commands unless the user explicitly requests a Jira mutation.
- Do not run mutations against Jira while drafting, verifying, or exploring this skill.
- Treat Jira URLs like `https://redhat.atlassian.net/browse/PROJ-123` as key `PROJ-123`.
- Do not print, store, or transform API tokens.
- Use `/tmp/opencode` for generated payloads, exports, and large outputs.
- Run `mkdir -p /tmp/opencode` before writing files there.

## Authenticated context

Verified local context is `acli version 1.3.22-stable` authenticated to site `redhat.atlassian.net` as `mhayden@redhat.com` using `api_token`.
Verify auth before mutations, before work on a different site or user, or whenever the request is ambiguous.

```bash
acli --version
acli jira auth status
```

## Token-efficient output rules

- Ask Jira for only needed fields with `--fields`.
- Use `--count` before broad searches.
- Use `--limit` unless pagination is required.
- Redirect JSON or CSV to `/tmp/opencode` instead of pasting raw payloads.
- Summarize large result sets as compact key/status/summary tables.
- Probe JSON shape before writing parsing logic.
- See `references/output-handling.md` for snippets.

## Non-interactive policy

- Pass required flags explicitly.
- Avoid `--editor` and interactive commands unless the user explicitly asks.
- Use file-based JSON or description files for complex payloads.
- Use `--yes` only after the user confirms the exact targets and intended mutation.

## Default agent workflow

1. Parse the user's key, URL, JQL, board, sprint, filter, or mutation intent.
2. Verify auth if the operation mutates Jira or the site/user matters.
3. Read the smallest useful field set.
4. For broad work, count first and export candidates to `/tmp/opencode`.
5. Confirm target set and mutation when changing Jira.
6. Execute with explicit flags and no editor.
7. Verify with a focused post-mutation read.

## Safe quick reference

Read one work item.

```bash
acli jira workitem view PROJ-123
acli jira workitem view PROJ-123 --fields key,summary,status,assignee --json
acli jira workitem view PROJ-123 --web
```

Search work items.

```bash
acli jira workitem search --jql 'project = PROJ ORDER BY updated DESC' --limit 20 --fields key,summary,status --json
acli jira workitem search --jql 'assignee = currentUser() AND resolution IS EMPTY' --count
acli jira workitem search --filter 12345 --limit 50 --csv
```

Create with explicit fields or generated JSON.

```bash
acli jira workitem create --project PROJ --type Task --summary 'Summary' --assignee @me
acli jira workitem create --generate-json > /tmp/opencode/create-workitem.json
acli jira workitem create --from-json /tmp/opencode/create-workitem.json --json
```

Edit with explicit fields or generated JSON.

```bash
acli jira workitem edit --key PROJ-123 --summary 'New summary' --json
acli jira workitem edit --generate-json > /tmp/opencode/edit-workitem.json
acli jira workitem edit --from-json /tmp/opencode/edit-workitem.json --json
```

Assign through verified edit flags and transition.

```bash
acli jira workitem edit --key PROJ-123 --assignee default --json
acli jira workitem transition --key PROJ-123 --status 'Done' --json
```

Comment listing, link listing, link type discovery, and watcher listing have verified leaf flags.
Use help-first for comment/link/watch mutations unless the needed flags are already verified in `references/command-matrix-1.3.22.md`.

```bash
acli jira workitem comment list --help
acli jira workitem link list --help
acli jira workitem attachment list --help
acli jira workitem list-watchers --help
```

Boards, sprints, and filters are available, but use help-first for leaf flags.

```bash
acli jira board search --help
acli jira sprint view --help
acli jira filter search --help
```

## Bulk mutation workflow

1. Count the candidate set.
2. Export candidates with key, summary, status, and relevant fields.
3. Show a compact preview and ask for confirmation.
4. Mutate with exact `--jql`, `--filter`, or explicit keys plus `--yes` only after confirmation.
5. Verify changed items with focused reads.

```bash
mkdir -p /tmp/opencode
acli jira workitem search --jql 'project = PROJ AND status = "To Do"' --count
acli jira workitem search --jql 'project = PROJ AND status = "To Do"' --fields key,summary,status --json --limit 100 > /tmp/opencode/candidates.json
```

## ADF warning

Descriptions **and comments** use Atlassian Document Format JSON, not Markdown.
`--body`, `-b`, and `--body-file` on `workitem comment create`/`update` send the text verbatim as a plain-text comment — Markdown syntax (`##`, `**bold**`, ```` ``` ````, `[text](url)`) is **not** converted and renders as literal characters in Jira.
For any comment beyond a single plain sentence (headings, bold, code blocks, bullet lists, or links), build ADF JSON and pass it with `--body-adf` (comments) or `--description-file` (descriptions).
See `references/adf.md` for the comment ADF builder pattern, and always verify rendering afterward with `workitem view --key KEY --web` or `comment list` before telling the user it's done.

## Custom fields

Native verified `acli jira field` help exposes create, delete, restore, and update, but no field discovery command.
For custom field IDs, first inspect a work item with `--fields '*all'` or use the REST fallback only when credentials are already present.
See `references/custom-fields.md`.

## Labels and collection fields

`workitem edit --labels` and `--remove-labels` are verified.
Read current labels first and treat replacement versus additive semantics carefully before changing collection fields.
See `references/mutations.md`.

## References

- `references/command-matrix-1.3.22.md` for verified command surface.
- `references/output-handling.md` for large-output patterns.
- `references/adf.md` for rich-text payloads.
- `references/custom-fields.md` for custom field discovery limits and REST fallback.
- `references/mutations.md` for safe mutation workflows.
