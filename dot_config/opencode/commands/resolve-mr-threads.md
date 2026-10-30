---
description: Fix open review threads on my MRs in the current repo, push, then reply and resolve.
---

MRs and extra instructions: $ARGUMENTS

1. Find: get `project` from `git remote get-url origin` (path without host or `.git`). Run `tools.gitlab.list_merge_requests({project, author: "mhayden", has_open_threads: true, limit: 100, include_source_branch: true})`. If I named MRs, use only those. Read threads with `get_merge_request_threads({state: "open", view: "full", include_mr_status: false})`.
2. Worktree per MR in `.worktrees/w<iid>`, tracking the source branch. Set up the environment as the repo's AGENTS.md says.
3. Fix every finding.
   - Edit small changes yourself. Use `@fixer` when a finding touches more than 3 files.
   - If a finding needs a decision (choices, a missing ticket), ask me. Fix what you can meanwhile and leave that thread open.
   - Prove new tests can fail: revert the fix and confirm the test fails.
4. Check: the repo's lint, format, and tests, targeted at touched files. No full suite.
5. Commit: new signed commit per MR (`-S -s`), not an amend. Strip `rh-pre-commit` lines with `git commit --amend --no-verify -S -F <msg>`. Plain `git push`.
6. Show one table: MR, thread, `file:line`, fix or skip, SHA. Draft one short reply per thread, starting with ✅. Wait for me to type exactly `APPROVE`.
7. After APPROVE: `reply_to_threads` with `resolve: true`. Reply only on threads that need me. Re-list MRs and report open threads.
8. Clean up worktrees, local branches, and `~/.cache/opencode-tmp` files.

- Name the session "Resolve MR Threads" plus a timestamp.
- Stop and ask if an MR is closed or a push is rejected.
