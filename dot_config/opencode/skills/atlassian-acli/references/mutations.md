# Mutation workflows

Mutation commands require exact intent, a small target set, and focused verification.
Run command help first for commands whose leaf flags were not verified in the matrix.

## Create

Use explicit fields for simple work items.
Use `--generate-json` and `--from-json` for complex fields.

```bash
mkdir -p /tmp/opencode
acli jira workitem create --project PROJ --type Task --summary 'Summary' --assignee @me --json
acli jira workitem create --generate-json > /tmp/opencode/create-workitem.json
acli jira workitem create --from-json /tmp/opencode/create-workitem.json --json
```

## Edit

Read current values first, especially for labels and other collection fields.
Treat `--labels` as potentially replacing or normalizing labels unless current behavior is confirmed by help or a safe test target.

```bash
acli jira workitem view PROJ-123 --fields key,summary,status,assignee,labels --json
acli jira workitem edit --key PROJ-123 --summary 'Updated summary' --json
acli jira workitem edit --key PROJ-123 --remove-labels old-label --json
```

## Assign

`create --assignee` and `edit --assignee` accept email, account ID, `@me`, and `default`.
Use `workitem assign` only after checking leaf help if exact flags are needed.

```bash
acli jira workitem edit --key PROJ-123 --assignee @me --json
acli jira workitem edit --key PROJ-123 --remove-assignee --json
```

## Transition

No native transition-list command was verified.
If the destination status is known, transition directly after confirmation.
Use REST fallback only when credentials already exist and available transitions must be discovered.

```bash
acli jira workitem transition --key PROJ-123 --status 'Done' --json
```

## Comments

Commands `create`, `delete`, `list`, `update`, and `visibility` are verified as subcommands.
`comment list` has verified `--key`, `--json`, `--limit`, `--order`, and `--paginate` flags.
Run leaf help before comment mutation flags if not already known.

```bash
acli jira workitem comment list --key PROJ-123 --json
acli jira workitem comment list --key PROJ-123 --limit 10 --order -updated --json
```

**Formatting:** `--body`/`-b`/`--body-file` post plain text verbatim — Markdown is not converted and renders literally (`##` stays `##`).
Any comment with headings, bold, code blocks, links, or bullet lists needs `--body-adf <file>` with a real ADF document instead. See `references/adf.md` for the builder pattern.
`comment list --json` shows a flattened plain-text rendering of the body either way, so it will not reveal a bad literal-Markdown post — verify with `workitem view --key KEY --web` when formatting matters.

```bash
acli jira workitem comment create --key PROJ-123 --body-adf /tmp/opencode/comment.adf.json
acli jira workitem comment update --key PROJ-123 --id 10001 --body-adf /tmp/opencode/comment.adf.json
```

## Links

Commands `create`, `delete`, `list`, and `type` are verified as subcommands.
List current links and link types before creating or deleting links.
`link list --key --json` and `link type --json` are verified.

```bash
acli jira workitem link list --key PROJ-123 --json
acli jira workitem link type --json
```

## Watchers

Prefer `workitem list-watchers` for listing.
`workitem watcher list` exists but is deprecated.
`workitem watcher remove` exists.
`list-watchers --key --json` is verified.

```bash
acli jira workitem list-watchers --key PROJ-123 --json
```

## Archive, delete, and clone

Commands `archive`, `delete`, and `clone` exist, but leaf flags were not captured.
Run help first, confirm targets, mutate, then verify with focused reads or searches.

## Bulk edits and transitions

```bash
mkdir -p /tmp/opencode
acli jira workitem search --jql 'project = PROJ AND status = "To Do"' --count
acli jira workitem search --jql 'project = PROJ AND status = "To Do"' --fields key,summary,status --json --limit 100 > /tmp/opencode/bulk-candidates.json
# Confirm targets with the user before adding --yes.
acli jira workitem transition --jql 'project = PROJ AND status = "To Do"' --status 'In Progress' --yes --json
```

After every mutation, read only the fields that prove success.
