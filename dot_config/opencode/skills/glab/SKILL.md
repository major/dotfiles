---
name: glab
description: >
  GitLab CLI (glab) for working with GitLab from the command line. Read this
  skill before running any `glab` or GitLab API command — it applies to every
  GitLab operation, whether reading or writing (for example merge requests,
  issues, work items, discussions and threaded replies, comments, CI/CD
  pipelines, releases, packages, members, and project settings). Whenever a
  task touches GitLab in any way, consult this skill first so you use the
  correct, safe command on the first try. Prefer glab over raw API calls for
  all GitLab operations.
---

# GitLab CLI (glab)

`glab` is pre-configured and available in your environment. Use it for all
GitLab operations. Run `glab <command> --help` for detailed flag information.

## Quick reference

```shell
# Issues
glab issue view <iid>
glab issue list --label "bug,priority::1"
glab issue create --title "title" --description "$(cat /tmp/desc.md)"
glab issue note <iid> -m "comment text"

# Merge requests
glab mr create --push --title "fix: title" --description "$(cat /tmp/desc.md)"
glab mr view <iid>
glab mr list --assignee <user>
glab mr update <iid> --description "$(cat /tmp/desc.md)"
glab mr note create <iid> -m "comment text"

# CI/CD
glab ci status
glab ci status --output json
glab ci list
glab ci run -b main --variables "KEY:VALUE" --variables "K2:V2" | tail -1   # one flag per var, no commas in values
glab mr diff <iid> -R group/project | grep -n -E 'term'                    # filter diffs, don't dump them
# `glab mr diff` has no --stat flag; use git diff --stat in a local checkout.
git merge-tree --write-tree --name-only origin/main HEAD   # list conflicting files; MR has_conflicts is only true/false
glab ci get --merge-request <iid> --with-job-details
glab ci get --pipeline-id <id> --output json
glab ci retry <job-id>
glab api projects/:id/jobs/<job-id>/trace
glab api projects/:id/jobs/<job-id>/trace | grep -a -E 'FAILED|Error' | cut -c30- | tail -40   # lines start with a timestamp

# Machine-readable output
glab mr list --output json | jq '.[].title'
```

### Stacked merge requests

Create the parent MR against the default branch, then create each child MR against its parent's source branch.
Run these from the appropriate local branch after committing its changes:

```shell
glab mr create --push --target-branch main --title "Parent change" --description "..."
glab mr create --push --target-branch parent-branch --title "Child change" --description "..."
glab mr view <iid> --output json  # Check source_branch and target_branch.
```

GitLab detects the stack from those branch targets; review and merge bottom-up, checking each MR's target and diff after the previous one merges.
GitLab's stacked MRs do not require `glab stack` or its local metadata.
When a parent merges and GitLab retargets its child, check the child's diff and required pipeline before scheduling its merge.
Auto-merge does not create a passing pipeline after a target change.

`glab stack` is a separate experimental CLI workflow for creating and maintaining local stacked diffs; do not use it by default or assume it can adopt existing MRs.
For a new CLI-managed stack, use `glab stack create <name>`, make each logical change with `glab stack save`, then use `glab stack sync` to push branches and create chained MRs.
Run it from a clean, interactive checkout: `stack infer` can require a TTY, and a failed infer can leave a selected but empty stack.
Before any `stack sync`, inspect `glab stack list` and the branches and MRs it may change.
Sync can rebase and push stack branches; `--skip-mr-creation` prevents new MRs, not those other effects.
The selected stack is stored as `glab.currentstack` in repository-local Git config shared by worktrees, so switching stacks in one worktree can affect another.

**Templates:** Check `.gitlab/merge_request_templates/` and
`.gitlab/issue_templates/` for project-specific templates.

**References:** Always use full URLs in note/comment bodies (e.g.
`https://gitlab.com/org/project/-/issues/123`) instead of short references
(`#123`, `!456`). This applies to issues, merge requests, epics, and so on.
Short refs resolve against project context and render as literal text on
group-level items (epics, group work items); full URLs expand everywhere.

## Comments and discussions

### Posting MR review findings

For multiple inline findings, use this sequence:

1. In one shell invocation, get the current MR SHA and existing inline
   discussions, plus non-system general notes (summary reviews often list
   findings without a diff position). Compare each proposed finding with the local diff against
   the MR target branch. Print only the SHA and relevant discussion summaries.
   If you already read `sha` from `glab mr view <iid> -F json` earlier, reuse it
   instead of a separate request; post step 3 still catches a moved head.
   For long notes, print only heading and bold lines instead of whole bodies.
   If you will set reviewers or assignees afterward, get those user IDs in
   the same call (`glab api user`, `glab api "users?username=<name>"`).
   The MR author's ID is already in the MR JSON, so you do not need a user lookup for it:
   `glab mr view <iid> --output json | jq '{sha,draft,labels,author:.author.username,author_id:.author.id}'`
   If the reviewer to set is the MR author, reuse `author_id` and skip `glab api user`.
2. Skip findings already covered by an equivalent discussion. Post the
   remaining distinct findings in one shell invocation using
   `glab mr note create <iid> --file <path> --line <new-line>` and a
   quoted heredoc for each Markdown body.
   If the bodies need user approval first, write each one to a file when you
   propose it, then post with `< file` so the text is generated only once.
   If the faulty consumer is unchanged, anchor the note to the changed line
   that introduces its input or behavior, and name the consumer in the body.
3. Collect the returned note IDs. Verify all their file and line positions
   with one discussions request. If the MR SHA changes or a post fails,
   stop and recheck the diff before continuing.
   Guard the posts with the reviewed SHA:
   `[ "$(glab mr view <iid> --output json | jq -r .sha)" = <reviewed-sha> ] || exit 1`
   `glab mr note create` prints only the note URL, so take the ID from
   its `#note_<id>` suffix (`ids+=("${url##*#note_}")`) and run the
   verification request in the same shell invocation as the posts.
   Filter with the collected array instead of typing IDs by hand:
   `jq --argjson ids "[$(IFS=,; echo "${ids[*]}")]" '.[].notes[] | select(.id as $i | $ids | index($i))'`.
   For `--line A:B` ranges, `position.new_line` is the end line; the start is
   `position.line_range.start.new_line`.
4. Set the reviewer and assignee in the same shell call as the posts, using
   one request that prints only the result:
   `glab api -X PUT projects/:id/merge_requests/<iid> -f reviewer_ids=<id> -f assignee_id=<id> | jq -c '{reviewers:[.reviewers[].username],assignees:[.assignees[].username]}'`

Keep each comment focused on the behavior, its impact, and a suggested fix.
Do not dump the full diff or all discussion bodies into the agent context.

Use the `mr note` subcommands (`create`, `resolve`, `reopen`); flags on the
root `glab mr note` command are deprecated.

### Short, inline bodies — pass `-m`

```shell
glab issue note        <iid> -m "comment text"
glab mr note create    <iid> -m "comment text"
glab incident note     <iid> -m "comment text"

# Cross-project
glab mr note create <iid> -m "..." --repo group/project
```

### Long or Markdown bodies — pipe to stdin (preferred for MR notes)

`glab mr note create` reads the body from stdin when its input is a pipe.
This avoids shell-quoting pitfalls (backticks, `$`, backslashes) and is the
safest pattern for non-interactive use.

```shell
# From a file
glab mr note create <iid> < /tmp/body.md

# Inline literal multi-line body — quoted heredoc, no shell expansion inside
glab mr note create <iid> << 'EOF'
Your **markdown** comment.
Code blocks and `inline code`, $variables, and \backslashes are all literal.
EOF
```

`glab issue note` and `glab incident note` do **not** read stdin. For long
bodies on those commands, use `glab api` with `-F body=@file` (see
[Content-type guidance](#content-type-guidance)) or inline a quoted heredoc
into `-m`:

```shell
glab issue note <iid> -m "$(cat << 'EOF'
Your **markdown** comment.
Code blocks and `inline code` are safe.
EOF
)"
```

For descriptions on `glab issue create` / `glab mr create` / `glab mr update`,
inline a quoted heredoc into `--description`, or for very large or reusable
bodies write to a file and use `--description "$(cat /tmp/desc.md)"`.

### Threaded replies on merge requests

`glab mr note create` supports `--reply <discussion-id>` for replying inside
an MR thread. The value can be the full discussion ID or a unique prefix of
at least 8 characters.

Diff comments accept a single line (`--line 42`), a range (`--line 10:15`),
a removed line (`--old-line 7`), or no line for a file-level comment.
Follow [Posting MR review findings](#posting-mr-review-findings) for duplicate
checks, batching, and position verification.
For a stacked MR, compare against its target branch, not `origin/main`.
Filter discussion responses before displaying them; activity events are not
review findings and can make the output very large:

```shell
glab api "projects/:id/merge_requests/<iid>/discussions?per_page=100" --paginate \
  | jq -r '.[] | .id as $discussion | .notes[] |
      select(.position.new_path != null) |
      "discussion=\($discussion) note=\(.id) \(.position.new_path):\(.position.new_line) \(.body | gsub("\\n"; " ") | .[0:240])"'
# General (non-inline) review notes: show author and finding headings only
glab api "projects/:id/merge_requests/<iid>/discussions?per_page=100" --paginate \
  | jq -r '.[] | .notes[] | select(.system == false and .position == null) |
      "note=\(.id) author=\(.author.username)",
      (.body | split("\n")[] | select(test("^(#+ |\\*\\*)")) | "  \(.[0:160])")'
```

For multi-line Markdown, prefer the quoted heredoc below over `-m` so the
body is easy to read and shell quoting stays predictable.

```shell
glab mr note create  <iid> --reply <discussion-id> -m "I agree!"
glab mr note create <iid> --file main.go --line 42 << 'EOF'
**[HIGH] Short finding title**

Explain the behavior and its impact.

**Suggested fix:** Describe the change and a focused test.
EOF
# After posting, verify all new note positions in one request, using the note
# IDs returned by glab (not discussion IDs):
glab api "projects/:id/merge_requests/<iid>/discussions?per_page=100" --paginate \
  | jq -r '.[] | .notes[] | select(.id | IN(<note-id-1>, <note-id-2>)) |
      "\(.id) \(.position.new_path):\(.position.new_line)"'
glab mr note create  <iid> --file main.go --line 10:15 -m "Extract this block"
glab mr note create  <iid> --file main.go --old-line 7 -m "Why was this removed?"
glab mr note create  <iid> --file main.go -m "General comment on this file"
glab mr note create  <iid> -m "LGTM" --unique    # idempotent: skip if same body exists
```

`glab mr note resolve` / `reopen` take the MR identifier followed by the
discussion identifier. The identifier can be a discussion ID (full 40-char
hex or 8+ char prefix) or a note ID (integer; the parent discussion is
looked up automatically):

```shell
glab mr note resolve <iid> <discussion-id>
glab mr note resolve <iid> <note-id>           # integer note ID also works
glab mr note reopen  <iid> <discussion-id>
```

When approving and merging a reviewed MR, guard both actions against new
commits. Prefer the merge train whenever the project enables it:

```shell
glab mr approve <iid> --sha <reviewed-sha>
glab api projects/:id | jq '{merge_trains_enabled}'
```

If `merge_trains_enabled` is `true`, add or schedule the MR on the train
with the reviewed SHA. Do not use `--auto-merge=false`:

```shell
glab api -X POST projects/:id/merge_trains/merge_requests/<iid> \
  -f auto_merge=true -f sha=<reviewed-sha>
```

If merge trains are unavailable, use
`glab mr merge <iid> --sha <reviewed-sha> --auto-merge --yes`.
Confirm that the MR is queued or merged; joining a train does not mean it
has merged.

For merged-results pipelines, the pipeline SHA is a merge-commit SHA, not
the source-branch HEAD SHA. Do not compare them as though they must match.

### Threaded replies on issues, incidents, and work items

The CLI does not wrap threaded replies for these, so you fall back to
`glab api`. **For any non-trivial body, write it to a file and post the file**
rather than inlining rich Markdown — inlined backticks, `$`, newlines, and a
leading `@` all break (see [Content-type guidance](#content-type-guidance)):

```shell
# Discover the discussion ID
glab api projects/:id/issues/<iid>/discussions --paginate \
  | jq '.[] | {id, body: .notes[0].body}'

# Build the body in a file, then post it with -F body=@file
cat > /tmp/reply.md << 'EOF'
@user — here's the result, with `code`, a $variable, and an emoji ✅.
EOF
glab api projects/:id/issues/<iid>/discussions/<discussion-id>/notes \
  -F body=@/tmp/reply.md
```

For a short, plain reply you can still inline it with `-f body="reply text"`.

## API calls

`glab api` auto-prepends `/api/v4/`. Use relative paths:

Run repository-aware commands inside the checkout so repository placeholders resolve correctly.
Outside a checkout, use `glab api --hostname <host>` with an explicit project ID or URL-encoded project path.
For commands supporting `--repo`, pass `-R <full-project-URL>`.
If `jq` reports `parse error: Invalid numeric literal`, glab probably called the wrong host and got HTML back.

```shell
glab api user                              # NOT /api/v4/user
glab api projects/:id/merge_requests
glab api projects/:id/issues | jq '.[0]'
glab api projects/group%2Fsub%2Fproject    # another project: URL-encode its full path
```

### Members and access levels

`members` lists only direct members.
`members/all` also includes members inherited from parent groups and invited groups; it can list a user more than once.
Access levels are numbers: 10 Guest, 20 Reporter, 30 Developer, 40 Maintainer, 50 Owner.

```shell
glab api "projects/:id/members/all?per_page=100" --paginate \
  | jq -r '.[] | "\(.username) \(.access_level)"' | sort -u
glab api projects/:id | jq '{visibility, shared_with_groups}'
```

When using `-f` for PUT/POST, pass simple `key=value` pairs. Array bracket
syntax like `ids[]=1` is not supported:

```shell
glab api projects/:id/merge_requests/<iid> -X PUT -f "assignee_id=1"
```

### Content-type guidance

```shell
# -f / --raw-field — literal string value
glab api projects/:id/issues/<iid>/notes -f body="comment text"

# -F / --field — reads @file as a string. The leading @ means "read this
# file", so only pass a real path here. A literal body that starts with @
# (e.g. "@user thanks") must NOT go through -F — it would be read as a
# filename. Use -f for literal inline text, or write the body to a file and
# point -F at the file (recommended for rich/markdown bodies).
glab api projects/:id/issues/<iid>/notes -F body=@/tmp/comment.md

# --input — raw request body from a file (or '-' for stdin). Does NOT set
# Content-Type. Without the header, JSON endpoints return HTTP 415.
glab api projects/:id/issues/<iid>/notes \
  --input /tmp/body.json \
  -H "Content-Type: application/json"

# --form — multipart/form-data. Required for endpoints that take a real file
# upload, such as project or group uploads and wiki attachments. -F does not
# do this: it reads the file into a text field, and the endpoint rejects the
# request with HTTP 400.
#
# IMPORTANT: --form is mutually exclusive with -f, -F, and --input. Every
# field in a multipart request must use --form
glab api projects/:id/uploads --method POST --form "file=@screenshot.png"

# Wiki attachment — both fields must use --form
glab api projects/:fullpath/wikis/attachments --method POST \
  --form "file=@screenshot.png" --form "branch=main"
```

### Arrays and nested objects

`-F` / `--field` parses a value that starts with `[` or `{` as JSON, so arrays
and nested objects go inline without a file. Placeholders are expanded inside
the JSON. Invalid JSON returns an error rather than being sent as a string.

```shell
# Array of strings
glab api -X PUT projects/:id -F 'topics=["my-topic","GitLab"]'

# Nested object, with a placeholder expanded inside it
glab api projects/:id/merge_requests/<iid>/discussions -X POST \
  -F body="looks good" \
  -F 'position={"position_type":"text","new_path":"main.go","new_line":42}'

# Empty array clears a field
glab api -X PUT projects/:id -F 'topics=[]'
```

`-f` / `--raw-field` never parses JSON: a bracketed value like
`-f 'scopes=[api,read_api]'` is sent as the literal string. Use `-F` with real
JSON for arrays. On GET and DELETE requests, and whenever `--input` is used,
`-F` arrays are serialized as repeated `key[]=` query parameters.

## Common mistakes

- **Supply note bodies explicitly**: use `-m` for issue/incident notes; MR
  notes also accept redirected or piped stdin. Without a supplied body,
  these commands may open `$EDITOR`.
- **Use `glab mr note create`, not `glab mr note -m`** — the `--message`,
  `--unique`, `--resolve`, and `--unresolve` flags on the root `glab mr note`
  command are deprecated. Use the `create`, `resolve`, and `reopen`
  subcommands instead.
- **Avoid editor-opening description values**: do not use `--description "-"`
  on `issue create`, `mr create`, or `mr update`. Pass an explicit description
  as shown above.
- **`glab issue note` and `glab incident note` only post root-level
  comments** — use `glab mr note create --reply` for MRs, or
  `glab api .../discussions/<id>/notes` for issues/incidents (write the body
  to a file and pass `-F body=@file` for anything non-trivial).
- **`-F` does not upload files** — `-F file=@x.png` sends the file contents as
  a string field, and upload endpoints reject it with HTTP 400. Use `--form
  file=@x.png` for multipart uploads. `-F` reads a file only to fill a *text*
  field, such as a note body. Also, `--form` is mutually exclusive with `-f`,
  `-F`, and `--input` — every field in a multipart request must use `--form`
  (e.g. `--form "file=@x.png" --form "branch=main"`).
- **`--input` requires an explicit `Content-Type` header** — `glab api
  --input file.json` sends raw bytes without setting Content-Type, causing
  HTTP 415. Add `-H "Content-Type: application/json"` or use `-f` / `-F`
  instead.
- **`glab ci retry` takes a job ID, not a pipeline ID** — to retry an
  entire pipeline, use `glab api projects/:id/pipelines/<id>/retry -X POST`.
- **`glab ci trace` streams** — it blocks until the job finishes. For
  agents, use `glab ci get` for pipeline state or
  `glab api projects/:id/jobs/<job-id>/trace` to fetch a finished log.
- **`glab ci view` is interactive** — terminal UI that blocks. Use
  `glab ci status` or `glab ci get` for pipeline state instead.
- **Always `--push` on `glab mr create`** — without it the remote branch
  may not exist and MR creation fails.
- **No `--state` on `mr list`** — use `--all`, `--merged`, or `--closed`.
- **No `--body` flag** — `--body` is a `gh` flag. `glab` uses `--description`.
- **Labels** — `--label` to add, `--unlabel` to remove. Scoped labels like
  `status::doing` auto-replace within their scope.
