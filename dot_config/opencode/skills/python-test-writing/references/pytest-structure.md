# Pytest Structure

## Fixtures

- Use the narrowest fixture scope that makes setup clear.
- Broaden scope only for immutable state or state with deliberate, reliable isolation.
- Prefer direct setup when a fixture would hide the behavior or serve one simple case.
- Keep mutable fixture values fresh per test unless sharing is itself the contract.
- Treat module, session, cache, and global state as isolation risks.

## Parametrization

- Parameterize when setup, rationale, action, and assertions materially overlap.
- Split cases into separate tests when setup, expected outcome, failure mode, or explanatory intent differs.
- Give parameters meaningful IDs so failures identify the behavior and input.
- Never let one parameter case mutate data reused by another case.

## Test body and names

- Keep arrange, act, and assert phases recognizable without ceremonial scaffolding.
- Name tests after the condition and behavior they establish.
- Add a concise behavioral docstring when the name does not explain the boundary, regression, or invariant.
- Add docstrings to every test when repository or user requirements make documentation universal.
- A docstring should explain why the case matters, not narrate each test statement.

## Mutable data hazards

- Construct fresh nested data for each test when the system may mutate it.
- A shallow copy duplicates only the outer container, so nested lists, dictionaries, and objects remain shared.
- Prefer factories, deep copies when appropriate, or immutable values over hidden shared mutable fixtures.
- Assert input preservation when the contract says a caller-owned object must remain unchanged.
