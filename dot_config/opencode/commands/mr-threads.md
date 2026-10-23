---
description: Fix unresolved review threads on my open GitLab MRs, amend, push, then reply and resolve.
---

MRs and extra instructions: $ARGUMENTS

Run from the repo's main checkout. Batch commands with `;` or `&&`, one shell call per step. Rename the session to "MR Feedback Review <TIMESTAMP>", using `date '+%Y-%m-%d %H:%M'` for the timestamp.

1. Scan (one call):
   - With no MR numbers: `glab api "projects/:id/merge_requests?state=opened&author_username=mhayden&per_page=100" --paginate | jq -r '.[].iid'`
   - Per MR: save `discussions?per_page=100 --paginate` to a temp file, keep threads with `any(.notes[]; .resolvable and (.resolved|not))`, and print `id[0:8]`, author, `file:line`, and the first body line.
   - Per MR with threads: `source_branch`, `target_branch`, `sha`, `has_conflicts`, the matching worktree, and `git log --oneline origin/<target>..origin/<src>`.
   - Write all full thread bodies to one temp file for the fixers.
2. Show one table: MR, thread, severity, `file:line`, verdict (fix / skip + reason). Then continue without waiting unless a finding is unclear.
   - Pick one option when a finding offers choices. Choose what keeps current behavior, or the simplest option.
   - Treat a finding as invalid only with evidence (code, tests, or main's behavior).
3. Base first:
   - Has conflicts, has stale parent commits, or the target branch was deleted: `git rebase --onto origin/main <last stale commit>` or `git rebase origin/main`. If needed, retarget after the push with `glab mr update <N> --target-branch main`.
   - Stacks: when a parent's SHA changes, restack each child, bottom-up, with `git rebase --onto <new parent> <old parent sha>`.
   - Resolve conflicts hunk by hunk. Never `git checkout --theirs/--ours` a whole file: it drops the other side's changes outside the hunk.
4. Fix: one `@fixer` per MR worktree, in parallel. Each brief has the worktree, the thread file section, exact decisions, one validation command, "do not commit or push", and "report which commit owns each changed file".
5. Fold (per branch):
   - Single commit: `git commit --amend --no-edit -S -s`.
   - Multiple commits: `git commit -S -s --fixup=<owning commit>` per file group. Split mixed files with `git apply --cached <partial patch>`. Then `GIT_SEQUENCE_EDITOR=: git -c core.hooksPath=/dev/null rebase -i --autosquash origin/<target>`.
   - Strip hook trailers: `git rebase --exec` amend with `grep -v '^rh-pre-commit'` and `--no-verify -S`.
   - Check: `git log --format='%G? %(trailers:key=rh-pre-commit.version,valueonly)' origin/<target>..HEAD` must show only `G` and no trailer.
6. Verify: on each branch, `make -s lint format-check complexity typecheck`. On each stack tip, run the full suite with the worktree's own venv: `systemd-run --user --scope -q -p MemoryMax=16G -p MemorySwapMax=0 -p CPUQuota=600% env PYTEST_WORKERS=6 make test-quick`. Re-fetch before pushing, and rebase again if main moved and now conflicts.
7. Push: `git push -q --force-with-lease=<src>:<old sha> origin HEAD:<src>`, retried 3 times, bottom-up. Confirm that the MR `sha` changed.
8. Replies: write one short draft per thread to `<tmp>/replies/<mr>_<thread8>.md`. Each draft starts with ✅, says what changed, and names any new tests. Skipped findings get a one-line reason. Ask me for APPROVE with the `question` tool.
9. After APPROVE: for each draft, skip the reply if I have already replied, otherwise `glab mr note create <mr> --reply <id> < file`, then `glab mr note resolve`. Rescan all my open MRs and report any thread still open.
10. Final reply: one table (MR, threads, change, new SHA), plus short bullets for judgment calls, and worktrees that are safe to delete.

- Stop and ask if an MR is closed or merged, a push is rejected, or a worktree has unpushed work.
- Add MRs to the merge train only when I ask: `glab api -X POST projects/:id/merge_trains/merge_requests/<N> -f auto_merge=true -f sha=<sha>`.
