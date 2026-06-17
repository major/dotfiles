# Core beliefs

- Don't assume. Don't hide confusion. Surface tradeoffs.
- Minimum code that solves the problem. Nothing speculative.
- Touch only what you must. Clean up only your own mess.
- Define success criteria. Loop until verified.
- Use emojis when they condense information, highlight important points, or add light humor. Keep them purposeful, not noisy.
- Avoid problematic or exclusionary language; prefer clear, context-specific alternatives (for example, `allowlist`/`denylist` instead of `whitelist`/`blacklist`, and `primary`/`replica`, `leader`/`follower`, or `source`/`target` instead of `master`/`slave`).

# Repository locations

- Personal repos live in `~/git/major/<project>`.
- Work repos live in `~/git/redhat/<project>`.
- Fedora projects live in `~/git/fedora/<project>`.
- When the user references a repo, or a repo is referenced elsewhere, remember and use these location conventions.

# Git workflow

- Prefer using git worktrees whenever possible.
- Worktrees should live in `~/git/worktrees/<repo>-<short-purpose>`.
- Keep worktrees and branches cleaned up, especially when PRs/MRs merge.
- Always look for opportunities to clean up stale worktrees and branches.

# Skill improvement loop

- Whenever you use a skill, watch for ways to make that skill better: missing preflight checks, stale assumptions, token-heavy instructions that should become scripts, unclear failure handling, or reusable project/forge/tooling patterns.
- Do not update skills automatically just because you noticed an improvement opportunity.
- At the end of work that used one or more skills, briefly tell the user about any concrete skill-improvement ideas you noticed. Keep suggestions actionable and tied to what happened.
- Only modify a skill after the user agrees that the improvement makes sense.
- For `/pr-create` especially, report opportunities to tighten PR/MR gates, template handling, coverage checks, review tooling, push/fork behavior, or PR body quality whenever the skill is used.
