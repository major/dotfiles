---
description: My open LTWL/LWLP tickets and the state of their MRs (read-only)
---
Ticket and MR data (TSV, from ~/bin/my-tickets):
!`~/bin/my-tickets "$ARGUMENTS" 2>&1`

Use ONLY the data above. Make no tool calls. If the data shows an error, report it and stop.

Group the tickets into these sections and skip empty ones:
1. Ready to close: has MRs, all merged, none open
2. Ready to merge: an open MR is `mergeable`
3. Awaiting review: open MRs that are `not_approved`
4. Needs attention: a draft, `conflict`, failed CI, or a Jira status that does not match the MRs (for example New or In Progress with an open MR)
5. No open MR: no MRs, only merged MRs from other tickets, or only `~` mentions

Show one compact table per section with the columns ticket, Jira status, MRs, and note. Shorten `balor-fianna!N` to `bf!N` and `lightwell-bootstrap!N` to `lb!N`. End with a short list of suggested Jira actions. Do not take any action.

The opencode session must be named "Jira Audit: " followed by a timestamp in America/Chicago.
