---
name: python-test-writing
description: "Author and review focused Python tests, especially pytest, by specifying observable behavior, isolating side effects, and validating meaningful coverage without chasing arbitrary percentages."
---

# Python Test Writing

## Purpose and boundaries

Use this skill for focused pytest design and review that demonstrates observable behavior and protects regression boundaries.
Use `python-development` for general Python implementation, API design, typing, errors, packaging, and tooling.
Do not replace repository conventions or commands with generic advice.
Load `slatkin-effective-python` only when deeper Pythonic judgment is needed for test structure, helpers, iterators, exceptions, or mocks.

## Default workflow

1. Identify the observable contract, including values, exceptions, state, effects, and meaningful interactions.
2. Map meaningful inputs, preconditions, outcomes, and side effects before selecting cases.
3. Write the smallest independent test that proves one behavior with non-vacuous assertions.
4. Prefer the strongest stable contract over private structure, incidental order, or irrelevant call details.
5. Review missing branches and isolation, then run focused validation before broader checks when warranted.

## Decision rules

- **Fixtures:** Use the narrowest scope that keeps setup clear; use broader scope only for immutable or safely isolated state.
- **Parametrization:** Parameterize when setup, rationale, and assertions materially overlap; split tests when setup, outcome, failure, or intent differs.
- **Doubles:** Mock external boundaries and keep transformations, validation, and control flow real; constrain doubles with `spec`, `autospec`, or an explicit fake.
- **Branch coverage:** Test meaningful decision outcomes, early returns, exceptions, malformed, empty, and boundary inputs; treat coverage as evidence, not a percentage target.
- **Isolation:** Freshen mutable inputs and parameter data, patch the name used by the system under test, clean up environment, time, filesystem, process, and network changes, and avoid order coupling.
- **Behavioral docstrings:** Add a concise why or invariant docstring when the test name is insufficient, or whenever repository or user requirements make docstrings universal.
- **Validation:** Run the repository's native focused test command first, then applicable broader, coverage, branch-reporting, pre-commit, or lint commands, and report skips.

## Load references when needed

| Need | Reference |
| --- | --- |
| Choose cases, assertions, or coverage depth | [`behavior-and-coverage.md`](references/behavior-and-coverage.md) |
| Decide fixture, parameter, naming, or test-body structure | [`pytest-structure.md`](references/pytest-structure.md) |
| Select doubles or isolate external and mutable state | [`doubles-and-isolation.md`](references/doubles-and-isolation.md) |
