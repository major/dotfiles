---
description: Review and merge low-risk Renovate PRs with token-efficient defaults; pass extra CLI flags as needed.
agent: build
---

Run the Renovate janitor helper in the current repository root.

Default behavior should be merge mode with standard policy:

```bash
python3 ~/.config/opencode/skills/renovate-pr-janitor/scripts/renovate_pr_janitor.py --mode merge --strategy standard $ARGUMENTS
```

Then report a compact result with:
- merged PR numbers and URLs
- blocked PR numbers and reasons
- remaining open Renovate PR count
