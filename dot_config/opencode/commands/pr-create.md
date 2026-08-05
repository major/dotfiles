---
description: Prepare and open a GitHub PR or GitLab MR end to end using the pr-create skill.
agent: build
---

Load the `pr-create` skill and follow its pipeline exactly (tests/lint/coverage
gates, a manual over-engineering/scope pass, conditional one-time CodeRabbit,
commit splitting, human-sounding description from project templates, then
opening the PR/MR).

Extra arguments from the user, if any, may specify target branch, draft mode,
or other overrides: $ARGUMENTS

Stop and ask only when a gate genuinely blocks (failing tests you can't fix,
ambiguous template, no remote).
