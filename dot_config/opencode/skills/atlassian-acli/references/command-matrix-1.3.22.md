# acli Jira command matrix for 1.3.22-stable

This matrix is based on verified local help for `acli version 1.3.22-stable`.
Run leaf help before using commands not shown with flags here.

## Auth

| Command | Verified notes |
| --- | --- |
| `acli jira auth status` | Shows site, email, and auth type. |

## Work items

| Command | Verified flags or subcommands |
| --- | --- |
| `workitem view [key]` | Positional key; `--fields`, `--json`, `--web`. |
| `workitem search` | `--count`, `--csv`, `--fields`, `--filter`, `--jql`, `--json`, `--limit`, `--paginate`, `--web`. |
| `workitem create` | `--assignee`, `--description`, `--description-file`, `--editor`, `--from-file`, `--from-json`, `--generate-json`, `--json`, `--label`, `--parent`, `--project`, `--summary`, `--type`. |
| `workitem edit` | `--assignee`, `--description`, `--description-file`, `--filter`, `--from-json`, `--generate-json`, `--ignore-errors`, `--jql`, `--json`, `--key`, `--labels`, `--remove-assignee`, `--remove-labels`, `--summary`, `--type`, `--yes`. |
| `workitem transition` | `--filter`, `--ignore-errors`, `--jql`, `--json`, `--key`, `--status`, `--yes`. |
| `workitem assign` | Command exists; run help before use if exact flags are needed. |
| `workitem archive` / `unarchive` | Commands exist; run help before use. |
| `workitem clone` | Command exists; run help before use. |
| `workitem create-bulk` | Command exists; run help before use. |
| `workitem delete` | Command exists; run help before use and require confirmation. |
| `workitem comment` | Subcommands `create`, `delete`, `list`, `update`, `visibility`; `comment list` has `--key`, `--json`, `--limit`, `--order`, `--paginate`. |
| `workitem link` | Subcommands `create`, `delete`, `list`, `type`; `link list` has `--key`, `--json`; `link type` has `--json`. |
| `workitem attachment` | Subcommands `delete`, `list`; upload was not verified. |
| `workitem list-watchers` | Preferred watcher listing command; has `--key`, `--json`. |
| `workitem watcher list` | Exists but deprecated. |
| `workitem watcher remove` | Exists. |

Default `view --fields` is `key,issuetype,summary,status,assignee,description`.
Default `search --fields` is `issuetype,key,assignee,priority,status,summary`.
`create --assignee` and `edit --assignee` accept email, account ID, `@me`, and `default`.

## Boards, sprints, filters, and fields

| Area | Verified commands |
| --- | --- |
| `jira board` | `create`, `delete`, `get` deprecated, `list-projects`, `list-sprints`, `search`, `view`. |
| `jira sprint` | `create`, `delete`, `list-workitems`, `update`, `view`. |
| `jira filter` | `add-favourite`, `change-owner`, `get` deprecated, `get-columns` deprecated, `list`, `list-columns`, `reset-columns`, `search`, `update`, `view`. |
| `jira field` | `cancel-delete` deprecated, `create`, `delete`, `restore`, `update`. |

No native transition-list command was verified.
Use REST only if available credentials are already present and a transition list is required.
