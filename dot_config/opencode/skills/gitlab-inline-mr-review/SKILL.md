---
name: gitlab-inline-mr-review
description: Draft and post concise, actionable inline GitLab merge request review notes with glab.
---

# GitLab Inline MR Review Notes

Use this skill when the user wants to draft, add, or reply to review notes on a GitLab merge request.

## Prepare

- Confirm the merge request IID and target repository.
- Use `--repo <group/project>` whenever the target is not unambiguous from the current directory.
- Inspect the current MR and the latest diff before selecting lines:

  ```bash
  glab mr view <iid> --repo <group/project> --output json
  glab mr diff <iid> --repo <group/project> --color=never
  ```

- When the user requests an MR review, add the current user as a reviewer before posting any review feedback:

  ```bash
  glab mr update <iid> --repo <group/project> --reviewer '+@me'
  ```

- The `+` preserves existing reviewers.

- `glab mr diff` does not accept file-path arguments.
  Save or filter its full output locally when inspecting selected files.

- Review comments must be specific, concise, and actionable.
- Anchor each comment to the narrowest relevant changed line or line range.
- When the defect manifests in unchanged downstream code, anchor the comment on the changed inducing line and cite the downstream repository-relative file and line in the comment body.
- Verify the supported posting command before posting:

  ```bash
  glab mr note create --help
  ```

- Use `glab mr note create <iid> -m "..."`, not `glab mr note <iid> -m "..."`.

## Write LLM-Actionable Comments

- Write each finding so the author can paste it directly into an implementation agent.
- Include the defect, concrete evidence, the requested change, and a completion criterion.
- Use this compact shape when it fits:

  ```text
  <What is wrong and why it matters.>

  Evidence: <observed behavior, command output, or affected code path.>

  Requested change: <specific implementation or documentation change.>

  Done when: <observable acceptance criterion.>
  ```

## Approval Gate

- Draft every proposed comment before posting it unless the user has already explicitly approved its exact text.
- For each draft, show the repository-relative file, line or range, and full comment body.
- Do not post a comment, approve an MR, change reviewers, or alter MR metadata without the user's explicit request.
- When the review has no actionable findings, say so before drafting a comment and ask whether the user wants a concise approval summary. Do not invent findings to create inline notes.
- If the user asks for a file or line reference on a positive review, anchor the summary to the narrowest changed line that demonstrates the reviewed behavior.
## Create an Inline Comment

Use `glab mr note create` to create an inline, resolvable discussion:

```bash
glab mr note create <iid> \
  --repo <group/project> \
  --file path/to/file \
  --line <new-line-or-range> \
  -m "<comment body>"
```

- `--file` is repository-relative and must appear in the latest MR diff.
- Use `--line 42` for an added or current-side line.
- Use `--line 10:15` to comment on a current-side range.
- Use `--old-line 42` for a removed or old-side line.
- `--line` and `--old-line` both require `--file` and cannot be combined.
- Do not combine `--unique` with `--file`; the flags are mutually exclusive.
- Do not use `--resolvable=false` for review findings because it cannot be combined with `--file` and makes the note non-resolvable.

## Reply to an Existing Discussion

When replying to an existing thread, use its discussion ID rather than creating a new top-level comment:

```bash
glab mr note list <iid> --repo <group/project> -F json | jq -r '.[].id'
glab mr note create <iid> \
  --repo <group/project> \
  --reply <discussion-id-or-unique-8-character-prefix> \
  -m "<reply body>"
```

- A GitLab note URL identifies a note, not necessarily its discussion ID.
- Do not combine `--reply` with `--file`, `--line`, `--old-line`, or `--unique`.

## Posting and Verification

- After approval, post independent comments in parallel only when their text and locations do not overlap.
- Capture the note URLs returned by `glab` and report which comments posted successfully.
- Verify every posted review finding is an inline, resolvable discussion at its intended file and new-side line:

  ```bash
  glab mr note list <iid> --repo <group/project> -F json
  ```

  Confirm the note's file path, line, and resolvable state from the returned JSON.
- When a reviewer was added, verify it after posting:

  ```bash
  glab mr view <iid> --repo <group/project> --output json | jq -r '.reviewers[].username'
  ```

- If a line-targeted command fails, do not silently downgrade it to a general comment.
- Reinspect the latest MR diff, correct the file or line target, and ask for approval again if the comment text must change.
- Do not resolve a review discussion unless the user explicitly requests it.
