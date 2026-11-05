---
description: Keep the GitLab merge train full for my eligible MRs and stacks (approved, no open threads, not draft) until all merge.
---

Extra instructions or MR numbers: $ARGUMENTS

Goal: every eligible MR of mine that targets the default branch is on the merge train, and each stacked child is rebased and queued as soon as its parent merges.

Eligible means all four are true: fully approved, no open review threads, I am the author, and not a draft. Ignore every other MR, including ones I pass in `$ARGUMENTS` that fail a check (say so in one line). The watcher enforces this and prints `SKIP/<reason>` (`NOT_MINE`, `DRAFT`, `UNAPPROVED`, `THREADS`) for skipped MRs. Never land, rebase, fix, or comment on a skipped MR.

The watcher script does all polling, so waiting costs no tokens. Do not poll yourself and do not query GitLab per MR unless an event needs it.

1. Snapshot: run `~/.config/opencode/scripts/mr-stack-watch.sh --once $ARGUMENTS`. Project comes from `git remote get-url origin`. It prints one line per MR: `iid STATE[/reason] sha -> target`.
2. Preflight conflicts (one shell call): in a throwaway worktree on `origin/<default>`, trial-merge every `READY` branch in land order, printing `ok|CONFLICT <files>` per branch, and abort each failed merge. Hold back each `CONFLICT` MR; GitLab drops it from the train anyway. Land it after the MR it conflicts with merges, or stack it (see step 4 `FAILED`).
3. Land the ready ones: for every clean `READY` MR, call `land_merge_requests({items: [{iid, sha}], mode: "auto"})` in one batch. Put stack bases first. Use the full sha from `get_merge_requests`, never a short one.
4. Start the watcher in the background: `~/.config/opencode/scripts/mr-stack-watch.sh $ARGUMENTS` (shell `background: true`). Never start it in the same parallel block as an edit to the script or its prompt inputs. A `land_*` or `update_merge_request` call is not such an edit, so on a wake, put the restart in the same parallel block as your last land call. Write the status line before that block, then end your turn with no further text once the restart returns. It wakes you when something needs action.
5. On wake, handle each line it printed:
   - `READY iid sha stacked=1`: in one `execute` call, run `update_merge_request({iid, rebase: true})` (API rebase keeps approvals). The returned `head_sha` is the old one, so poll `get_merge_requests` up to 4 times until `head_sha` differs from the event sha. Then `land_merge_request` with that new sha. If it never changes, stop and report instead of landing a stale sha. Handle several stacked iids in the same call. If you still get HTTP 409 (SHA mismatch), re-read the head and retry once.
   - `READY iid sha stacked=0`: `land_merge_request` with that sha.
   - `CONFLICT`: rebase locally in `.worktrees/w<iid>` (branch `src=` from the event) with `git rebase --onto origin/<default> <parent=sha from the event>` (or plain `git rebase origin/<default>` if the event has no `parent=`). If the rebase finishes with no conflicts, run `ruff check` on the touched files only, then push with `--force-with-lease` and land; CI runs the tests. If you resolved conflicts by hand, also run only the test files you touched. Never use the rebase API.
   - `FAILED`: read the failure with `get_pipeline_failures({pipeline_id})` (`latest_pipeline_id` from `get_merge_request`, not `get_merge_requests`), then:
     - Infra failure (`runner_interrupted`, `stuck_or_timeout_failure`, `runner_system_failure`, `scheduler_failure`): re-land once with the same sha. GitLab starts a new train pipeline. Report it in one line.
     - A test added by another tracked MR that is merged or ahead on the train (for example a ratchet or allowlist test): run that test locally on each tracked MR merged with the culprit branch. Cancel every MR it breaks right away with `land_merge_requests({mode: "cancel"})`, because each failed entry restarts every pipeline behind it. After the culprit merges, add one fix commit per MR, run the test, push, and land again.
     - Several fixes edit nearby lines in the same file: stack the branches in order (`git rebase --onto <previous branch> origin/<default>`), resolve the conflicts once, push all, and land them in order. A branch that contains earlier MRs' commits merges them too, so GitLab marks those MRs merged.
     - Any other test failure: report once in one line. Do not retry CI unless I ask.
   - `CLOSED`: report in one line.
   - `DONE`: go to step 7.
   After handling, restart the watcher (step 4). It reports each blocker once per head sha, so a standing blocker does not wake you again.
6. Watch for collisions. Other sessions may push to these branches (`git worktree list`, branch `committerdate`). Any push clears auto-merge, so re-land with the new head sha. Do not edit a branch another worktree has checked out; report it and ask me.
7. Finish: re-run the snapshot, confirm each MR is `MERGED`, run `list_merge_requests({author, approved: true})` once and offer to include any MR that became eligible during the run (also not a draft, no open threads), remove worktrees you created, delete local branches for merged MRs, and run `~/.config/opencode/scripts/mr-stack-watch.sh --reset` (no `pkill` needed: the watcher exits `DONE` by itself). Report one table: MR, final state, and anything I still owe (approvals, threads, draft status). List skipped MRs with their `SKIP` reason.

- "Landed" is not "on the train". `auto_merge_strategy: add_to_merge_train_when_checks_pass` means GitLab adds the MR when its pipeline passes. Say so in reports instead of "queued".
- Leave other people's train entries and MRs outside the tracked set alone. Mention newly seen MRs of mine once and ask whether to include them.
- Keep updates to a few lines per wake. No tables until step 7 unless I ask.
- Fix commits: `git commit -S -s --no-verify`, then amend to strip `rh-pre-commit` trailer lines. Run the failing test plus `ruff check` on touched files before pushing.
- Check a script's real exit status, not the status of `| tail`.
- Do not work on review threads in this command. An MR with open threads is skipped until I resolve them. Never reply to or resolve a thread without `APPROVE`.
- State only what a tool result shows. If you did not check a cause (for example why a pipeline passed, or whether a thread is resolved), say "unknown" instead of guessing.

## Tool call shapes

Call these inside `execute`. `project` comes from `git remote get-url origin`. If a call is rejected, run `search({namespace: "gitlab"})` once and fix it.

- `tools.gitlab.get_merge_requests({project, iids})` returns `merge_requests[]` with `head_sha`, `source_branch`, `target_branch`, `merge_status`, `approved`, `pipeline_status`. It has no pipeline id.
- `tools.gitlab.get_merge_request({project, iid})` returns `latest_pipeline_id`. Use it for `FAILED`.
- `tools.gitlab.get_pipeline_failures({project, pipeline_id})` needs the numeric `pipeline_id`.
- `tools.gitlab.land_merge_request({project, iid, sha, mode: "auto"})`, `sha` is the full head sha.
- `tools.gitlab.land_merge_requests({project, items: [{iid, sha}], mode: "auto" | "cancel"})`, up to 20 items, in land order.
- `tools.gitlab.update_merge_request({project, iid, rebase: true})` returns the old `head_sha`.
- `tools.gitlab.get_merge_request_threads({project, iid, state: "open", view: "full"})`.
- `tools.gitlab.list_merge_train({project, target_branch})`.
