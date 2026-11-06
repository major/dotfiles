---
description: Fix open review threads on my MRs in the current repo, push, then reply and resolve.
---

MRs and extra instructions: $ARGUMENTS

1. Find: get `project` from `git remote get-url origin` (path without host or `.git`). Run `tools.gitlab.list_merge_requests({project, author: "mhayden", limit: 100, include_source_branch: true})`. Do not filter on `has_open_threads`: reviewers also comment in resolved threads. If I named MRs, use only those. Read threads in batches of up to 20 MRs with `get_merge_request_threads({iids, state: ["open", "resolved", "comments"], view: "full", resolved_view: "full", max_body_chars: 600, include_mr_status: false})`.
   - Keep a thread when it is open, or when its last note is not by `mhayden` (unanswered feedback, even in a resolved thread).
   - Skip a resolved thread whose last note is only thanks or an acknowledgment. If unsure, ask me.
   - Fetch full bodies with `ids` for the threads you keep.
2. Worktree per MR in `.worktrees/w<iid>`, tracking the source branch. Set up the environment as the repo's AGENTS.md says.
3. Fix every finding.
   - Do not edit code yourself. Launch one background `@fixer` per MR, all in one message, with the worktree path, full thread bodies, `file:line`, and the lines from `~/.config/opencode/review-lessons/<repo>.md` if it exists. Fixers leave changes uncommitted.
   - For a resolved thread, first check whether the branch already fixes the point. If it does, reply with that SHA and make no new commit.
   - If a finding needs a decision (choices, a missing ticket), ask me. Fix what you can meanwhile and leave that thread open.
   - Out-of-scope production bug in a tests-only MR: draft a LWLP follow-up (summary, failure scenario, acceptance criteria). After APPROVE, create it, assign it to me, reply with the key, and resolve.
   - Sibling sweep: for each fix pattern (for example "remove asserts that always pass" or "add `Args:`"), check my other open MRs in the same stack or series for the same pattern and fix them in this run. Mark those rows `sweep` in the table.
   - Prove new tests can fail: revert the fix and confirm the test fails.
4. Check: the repo's lint, format, and tests, targeted at touched files. No full suite.
   - If any HIGH or MEDIUM was fixed, send oracle the thread text and `git diff <old-head>` before committing. Ask for callers or sibling gates with the same bug, and new failure paths the fix adds. Skip this when every finding is LOW or NIT.
   - Have a fresh fixer check the fix diff against this list and return `file:line` findings only: duplicate tests, rows, or asserts; asserts that always pass; unused fixtures, params, or helpers; `if` in tests; missing AAA markers or Google `Args:`; docstrings that cite line numbers or move history; unlabeled characterization cases; missing boundary rows (missing vs `None` vs empty, off-by-one, CRLF); the repo lessons file. Fix what it finds.
5. Commit: new signed commit per MR (`-S -s`), not an amend. Strip `rh-pre-commit` lines with `git commit --amend --no-verify -S -F <msg>`. Plain `git push`.
6. Show one table: MR, thread, state (open/resolved/comment), `file:line`, fix or skip, SHA. Draft one short reply per thread, starting with ✅. Wait for me to type exactly `APPROVE`.
   - Compare each MR description with the new head: test counts, ledgers, commit tables, and behavior claims. Put description edits in the same APPROVE packet.
   - Right before drafting replies, list threads again and add any new ones.
7. After APPROVE: `reply_to_threads`. Use `resolve: true` only for threads that were open. For resolved or comment threads, reply with `resolve: false`. Reply only on threads that need me. Re-list MRs and report open threads.
8. Clean up worktrees, local branches, and `~/.cache/opencode-tmp` files.
9. Lessons: if a finding type showed up in 2 or more MRs this run, add one line to `~/.config/opencode/review-lessons/<repo>.md`: the pattern, an example `file:line`, and the check that would have caught it. Skip types already listed.

- Name the session "Resolve MR Threads" plus a timestamp.
- Stop and ask if an MR is closed or a push is rejected.
