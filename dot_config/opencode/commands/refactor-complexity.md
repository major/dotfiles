---
description: Refactor a complex function down to smaller pieces carefully with TDD. 
---

Goal: Reduce the complexity of the user-provided function.

- Every new function created must be rated at a B or better.
- If it makes sense to move some functions to another file, or a new file, add it to the plan.
- If the function is part of a god-object, make extraction a high priority.
- Organize the work into stacked commits that go into the same pull/merge request.
- Each commit should have a good conventional commit title and a bullet list of changes that explain the value of the change itself for the reviewer.
- Make your work extremely easy to review by another developer who is very busy.
- Ensure that an AI-based reviewer will be pleased with the changes.
- All work must go in a git worktree build from origin/main or origin/master.
- Each commit should be small and contain a single concern or single portion of the refactor.
- Use test driven development (TDD) strategies.
- Test coverage is required for all functions that we touch as part of this work.
- Use pytest fixtures and parameterization whenever possible to reduce test duplication.
- All functions and test functions/methods must have docstrings.
- Always assume that pytest-cov's --cov-branch option is enabled and design your tests with branch coverage.
- When the work is complete, get an oracle review of the final state.
- Utilize these skills from trusted books as a guide: slatkin-effective-python python-distilled
- Tests and code changes should be stacked much like this example:

  fee9a9e4 fix(fetch-metadata): preserve fallback vector guards
  b883cc16 refactor(fetch-metadata): unify CVSS and CWE extraction
  da40d757 test(fetch-metadata): cover NVD metric selection
  9e9fc36d refactor(fetch-metadata): extract OSV parsing helpers
  465137f4 test(fetch-metadata): cover OSV CWE merging
  d8d9c837 refactor(fetch-metadata): extract VEX parsing helpers
  4e2eb4a5 test(fetch-metadata): cover VEX extraction ordering

- Run pre-commit after each commit to ensure all tests/lint/typechecks are passing before moving on.
- Build a plan for how we can do this in stacked commits within the same merge request first.
- When presenting the plan, use a numbered list of commit titles.
- Each item in the numbered list should have a list of which functions are being tested or simplified in that commit and why.
- You must get my explicit approval on the plan before proceeding.

User provided function: $ARGUMENTS
