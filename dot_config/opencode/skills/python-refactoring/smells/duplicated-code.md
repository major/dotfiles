# Duplicated Code

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

Identical or near-identical code logic appears in multiple places across functions, methods, or modules.
Changes to the shared logic must be manually copied across every location.

## Python forms

- Repeated code fragments: The same five-line algorithm or formula pasted into different functions.
- Parallel conditional branches: Branches across different methods performing identical validations or calculations.
- Cloned helper logic: Similar helper functions written independently in two different modules.

## Detect

### Evidence of harm

Do not treat superficial similarities or coincidentally matching lines as duplication.
Confirm Duplicated Code only when concrete harm exists:
- Divergence bugs: A bug fix or domain rule update was applied in one location but forgotten in another.
- Maintenance drag: Modifying business logic requires tracking down multiple matching implementations.
- Obscured intent: Readers must compare implementations line by line to determine whether they differ intentionally.

### Ruff hints

- `PLR0912` (too-many-branches): High branch count caused by repeating the same validation blocks across branches.
- `PLR0915` (too-many-statements): Excessive statements indicating copied procedural sequences.

### Look-alikes

- Deliberate independence: Two algorithms happen to perform identical steps today but evolve under separate business requirements.
  Coupling them creates Divergent Change.
- Repeated Switches: The same conditional check recurring across multiple methods.
  The issue is branching on type codes rather than simple code duplication.

### Deliberate exceptions

- Coincidental repetition: Unrelated modules computing trivial expressions like percentage formulas where coupling is undesirable.
- Test fixture setup: Self-contained test cases repeating trivial arrange blocks to preserve independent readability.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Identical expressions inside the same module | [Extract Function](../refactorings/extract-function.md) | Keep duplicate | Centralizes single source of truth for the calculation |
| Functions share the same structure with minor variations | [Extract Function](../refactorings/extract-function.md) with parameter | Class inheritance | Function parameters provide clean parametrization without class hierarchy |
| Duplicated fragments across different modules | [Extract Function](../refactorings/extract-function.md) to shared module | Duplicate helper | Placing pure functions in a cohesive domain module enables reuse |
| Trivial repetition without risk of divergence | Keep the current design | Extract Function | Premature extraction couples independent concerns |

## Verify

- Run the test suite before and after extraction.
- Run linter and type checker on affected modules.
- Ensure all call sites produce identical outputs on regression tests.
