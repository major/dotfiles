# Primitive Obsession

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

Code relies on primitive types (strings, numbers, raw dicts, raw tuples) to model structured domain concepts with specific rules or invariants.
Logic performing validation, parsing, and unit conversion is duplicated across callers rather than encapsulated.

## Python forms

- Dicts used as records: Functions passing raw dictionaries around internal layers, accessing string keys repeatedly with ad-hoc validations.
- String constants that should be `Enum` or `Literal`: Free-form strings used for status flags, modes, or categories without compile-time constraints.
- Positional tuple returns: Functions returning multi-element tuples `(status, error_msg, count, payload)` forcing callers to remember index positions.
- Dense `Any`, `cast`, or `# type: ignore` use: Code resorting to type-checker suppressions because unstructured primitives obscure actual types.

## Detect

### Evidence of harm

Do not treat raw primitive usage in simple or isolated helpers as a smell.
Confirm Primitive Obsession only when concrete harm exists:
- Duplicated validation: Multiple callers repeat checks on string formats, currency bounds, or dictionary key existence.
- Index and key drift: Callers unpack tuple positions incorrectly or misspell dictionary keys leading to runtime errors.
- Type suppression clutter: Proliferation of `cast()` and `# type: ignore` to bypass type checker warnings on unstructured primitives.

### Ruff hints

- `PLR2004` (magic-value-comparison): Flags unnamed literal constants in comparisons that should be named constants or Enums.
- `ANN401` (any-type): Flags use of `typing.Any` where specific typed records should be declared.

### Look-alikes

- Data Clumps: Several primitives passed together repeatedly.
  Primitive Obsession focuses on individual concepts (e.g. currency, phone) modeled as raw types, while Data Clumps addresses groups of fields.
- Typing or style issue: A helper lacking type annotations but having a clear contract is a typing or style issue, not Primitive Obsession.

### Deliberate exceptions

- Dict at an I/O boundary: When a dictionary is parsed from JSON and immediately mapped to a record or passed to a single boundary function.
- Generic low-level serialization utilities: JSON encoders or database drivers that operate generically on primitive collections.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Raw dict used as internal record across modules | [Replace Primitive with Object](../refactorings/replace-primitive-with-object.md) | `TypedDict` | Frozen dataclasses provide immutability, dot-access, and explicit validation |
| String constants represent fixed set of domain states | [Replace Primitive with Object](../refactorings/replace-primitive-with-object.md) | String `Literal` | `Enum` centralizes domain values, prevents invalid states, and enables iteration |
| Positional tuple return with three or more values | [Introduce Parameter Object](../refactorings/introduce-parameter-object.md) | `NamedTuple` | Named attributes prevent index-misordering bugs at call sites |
| Dict parsed from JSON and immediately mapped | Keep the current design | Replace Primitive with Object | Boundary dictionaries immediately converted are idiomatic and need no extra layer |

## Verify

- Run the full test suite across all updated callers.
- Run project type checker to verify that annotations resolve cleanly without `Any` or `cast`.
- Verify JSON serialization and database compatibility for any transformed records.
