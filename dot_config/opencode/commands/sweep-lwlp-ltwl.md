---
description: Sort my open LWLP/LTWL tickets and their MRs into action groups, then act on approval.
---

Sweep my open Jira tickets and their merge requests. Optional JQL filter: $ARGUMENTS

## Rules
- Read-only until I approve.
  - Jira writes: I name tickets (`close LWLP-1, LWLP-2`) or a group. List the keys back before writing.
  - MR comments: I type `APPROVE` in capitals.
- Use `execute` with `tools.jira.*` and `tools.gitlab.*`, and `gh` for GitHub PRs. Batch calls with `Promise.allSettled`.
- Jira access and REST fallbacks: see `triage-lwlp-ltwl.md`.
- A ticket is done only when its MR is merged or someone other than me confirms the fix.

## 1. Gather (3 batches)
- Batch 1 (parallel):
  - `cd ~/.cache/opencode-tmp/opencode && jira-dump '<JQL>' -o sweep.json` (skill: `~/.config/opencode/skills/jira-dump/SKILL.md`).
    - JQL: `project in (LWLP, LTWL) AND assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC`.
    - Append ` AND ($ARGUMENTS)` only when `$ARGUMENTS` is not empty.
  - `gitlab.get_current_user`.
- Batch 2 (one `execute`, one shell call):
  - From the dump (never read it whole):
    - List: `jq -r '.issues[] | [.key, .status, .summary[:90]] | @tsv' sweep.json`
    - MR links in the description and comments: the `scan(...)` line from `find-bugs-ltwl-lwlp.md`. Also scan for `github.com/.*/pull/[0-9]+`.
  - `jira_get_issue` per ticket: `fields: "issuelinks"`, `include: "remote_links"`, `comment_limit: 0`.
  - `list_merge_requests(author=<me>, state="opened")` for `lightwell/balor-fianna`, `lightwell/verification`, `lightwell/lightwell-bootstrap`, `lightwell/refactory-lightwell`, plus every project seen in links. Match ticket keys in titles.
  - Local work, in one shell call:
    `for r in ~/git/redhat/{balor-fianna,lightwell-bootstrap,lightwell-verification,refactory-lightwell,lightwell-pnc}; do git -C $r branch --list '*LWLP-*' '*LTWL-*'; ls $r/.worktrees 2>/dev/null; done`
- Batch 3 (one `execute` per project, `gh` in parallel):
  - `get_merge_requests(iids, include_commits_behind=true)`.
  - `get_merge_request_threads(iids, count_only=true)`.
  - `get_merge_request` only for open MRs, to read `reviewers` and `approved_by`.
  - `gh pr view <n> -R <repo> --json state,isDraft,reviewDecision,mergeStateStatus,reviewRequests,latestReviews,statusCheckRollup,updatedAt`.

## 2. Classify
- `approved: true` with empty `approved_by` means **not reviewed** (some projects have no approval rules).
- Open threads older than a later commit that looks like a fix: mark "fixed, not replied".
- A blocker is cleared when its ticket is closed or its MR is merged.
- Duplicate links have a direction: only `duplicates <other>` closes this ticket. `is duplicated by` does not.
- One group per ticket, first match wins:

| # | Group | Signal |
|---|---|---|
| 1 | ✅ Close: MR merged | All linked MRs merged, no follow-up MR planned in comments |
| 2a | 🗑️ Close: duplicate | This ticket `duplicates` another ticket |
| 2b | 🗑️ Close: confirmed | Someone other than me says it is fixed; quote the comment |
| 3 | 🔧 Respond | Open threads, `requested_changes`, or failed pipeline |
| 4 | 👀 Nudge review / rebase / merge | Open, not draft MR with no named approver, no reviewer, behind main, or no activity for 7+ days |
| 5 | 🚀 Ready to start | `New`/`Backlog` and blockers are cleared |
| 6 | 📣 Follow up | Waiting on another person's action in comments |
| 7 | ⏳ No action | Everything else: draft MR, active local work, epics, still blocked, in progress with no MR |

## 3. Report
- One table per group: ticket, MR/PR, one-line reason.
- Flag stacked MRs (`blocked_by`) and tickets that were just unblocked.
- End with `📊 N/N sorted` and offer the next actions.

## 4. Act (only after approval)
- Close tickets:
  - Re-fetch each MR (`get_merge_requests`) and ticket status first. Skip and report any ticket whose evidence changed.
  - Closed transition: LWLP `61`. LTWL: look it up once with `jira_get_issue(include="transitions")`.
  - Resolution: `Done` (merged or confirmed), `Duplicate`, or `Won't Do` (obsolete; ask me if it is not offered).
  - Add a one-line comment with the evidence: MR link, pipeline, or who confirmed.
  - Re-run `jira_search` on the keys and show `KEY status resolution`.
- Fixed, not replied:
  - Read the full thread bodies and the fixing commit with `git show <sha>`. The branch may only exist on the `fork` remote.
  - Show a table: thread ID, the ask, how the commit fixes it, test names. Call out anything the commit does not do.
  - Draft one reply per thread: `Fixed in <sha> ✅`, what changed, test names.
  - After `APPROVE`: `reply_to_threads(resolve=true)` in one call, re-add the reviewer, re-check `open_count` and `merge_status`.
  - Re-adding a reviewer does not clear `requested_changes`. Tell me if it remains.
- Nudge review: propose reviewer usernames per MR. Add them only after I approve.
