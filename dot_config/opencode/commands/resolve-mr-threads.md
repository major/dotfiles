---
description: Fix open review threads on my MRs in the current repo, push, then reply and resolve.
---

MRs and extra instructions: $ARGUMENTS

1. Find: get `project` from `git remote get-url origin` (path without host or `.git`). Run `tools.gitlab.list_merge_requests({project, author: "mhayden", limit: 100, include_source_branch: true})`. Do not filter on `has_open_threads`: reviewers also comment in resolved threads. If I named MRs, use only those. Do the list, the thread reads, and the full-body fetches in one `execute` with `Promise.all`, not one call per step. Read threads in batches of up to 20 MRs with `get_merge_request_threads({iids, state: ["open", "resolved", "comments"], view: "full", resolved_view: "full", max_body_chars: 600, include_mr_status: false})`.
   - Keep a thread when it is open, or when its last note is not by `mhayden` (unanswered feedback, even in a resolved thread).
   - Skip a resolved thread whose last note is only thanks or an acknowledgment. If unsure, ask me.
   - Fetch full bodies with `ids` for the threads you keep.
   - This first fetch is the snapshot for the whole run. Never call `list_merge_requests` or `get_merge_request_threads` again in this run, even if new threads appear. New threads wait for the next run.
2. Worktree per MR in `.worktrees/w<iid>`, tracking the source branch. Create all worktrees in one shell call. Each fixer builds its own venv as its first step, as the repo's AGENTS.md says, so installs run in parallel instead of one after another.
3. Fix every finding.
   - Do not edit code yourself. Launch one background `@fixer` per MR, all in one message, with the worktree path, full thread bodies, `file:line`, and the lines from `~/.config/opencode/review-lessons/<repo>.md` if it exists. Fixers leave changes uncommitted.
   - For a resolved thread, first check whether the branch already fixes the point. If it does, reply with that SHA and make no new commit.
   - If a finding needs a decision (choices, a missing ticket), do not stop the run. Fix, check, commit, and push every other MR first, leave that thread open, then ask all decisions in one `question` call at the end.
   - Out-of-scope production bug in a tests-only MR: draft a LWLP follow-up (summary, failure scenario, acceptance criteria). After APPROVE, create it, assign it to me, reply with the key, and resolve.
   - Sibling sweep: for each fix pattern (for example "remove asserts that always pass" or "add `Args:`"), check my other open MRs in the same stack or series for the same pattern and fix them in this run. Mark those rows `sweep` in the table.
   - Work each MR as its own pipeline, not in phases. When an MR's fixer returns, start its checks, its checklist fixer, and its commit at once; never wait for the slowest MR.
   - While fixers run, do not idle: draft LWLP follow-ups, and draft description edits.
   - Prove new tests can fail: revert the fix and confirm the test fails.
4. Check: the repo's lint, format, and tests, targeted at touched files. No full suite. Each fixer runs them in its own worktree and reports pass or fail. Before commit, rerun them for all MRs in one parallel batch (one shell call per worktree, not a loop).
   - Oracle is expensive (one call cost about as much as the whole run). Default to no oracle. Call it only when a HIGH finding changed production control flow, error handling, or a safety gate, or when I put "oracle" in the arguments. At most one call per run: batch all qualifying MRs into one prompt with diff file paths, not pasted diffs, and ask for at most 10 lines of real bugs. If it has not answered after one nudge, proceed without it. Never call it for MEDIUM, LOW, NIT, tests-only, docstring, or sweep changes.
   - Launch one fresh background fixer per MR (not one for all MRs) to check that MR's fix diff against this list and return `file:line` findings only: callers of changed functions and sibling gates that now see a different value, exception, or `None` vs empty (grep the repo); new failure paths the fix adds; duplicate tests, rows, or asserts; asserts that always pass; unused fixtures, params, or helpers; `if` in tests; missing AAA markers or Google `Args:`; docstrings that cite line numbers or move history; unlabeled characterization cases; missing boundary rows (missing vs `None` vs empty, off-by-one, CRLF); the repo lessons file. Fix what it finds.
5. Commit: new signed commit per MR (`-S -s`), not an amend. Strip `rh-pre-commit` lines with `git commit --amend --no-verify -S -F <msg>`. Plain `git push`. Commit and push all MRs in one message, one shell call per MR.
6. Show one table: MR, thread, state (open/resolved/comment), `file:line`, fix or skip, SHA. Draft one short reply per thread, starting with ✅. Wait for me to type exactly `APPROVE`.
   - Compare each MR description with the new head: test counts, ledgers, commit tables, and behavior claims. Read all MR descriptions in one `execute` with `Promise.all`. Put description edits in the same APPROVE packet.
7. After APPROVE: `reply_to_threads`. Use `resolve: true` only for threads that were open. For resolved or comment threads, reply with `resolve: false`. Reply only on threads that need me. Report which snapshot threads are still open, using the `reply_to_threads` results, not a new list. Tell me to run the command again for any newer threads.
8. Clean up worktrees, local branches, and `~/.cache/opencode-tmp` files. Do it right after each MR's push is confirmed (`git ls-remote`), in parallel with drafting replies. Recreate a worktree only if I ask for more changes.
9. Lessons (write them while waiting for APPROVE): if a finding type showed up in 2 or more MRs this run, add one line to `~/.config/opencode/review-lessons/<repo>.md`: the pattern, an example `file:line`, and the check that would have caught it. Skip types already listed.

- Name the session "Resolve MR Threads" plus a timestamp.
- Stop and ask if an MR is closed or a push is rejected.
