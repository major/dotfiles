# Repeated Switches

Background reference: skill `fowler-refactoring`, ch03 and ch10.

## Symptom

The same conditional branching structure repeats across multiple functions or methods, switching on the same type code or discriminator.
Adding a new case requires hunting down and updating every matching conditional block.

## Python forms

- `isinstance` cascades: Chains of `if isinstance(x, Foo): ... elif isinstance(x, Bar): ...` repeated across multiple functions.
- String or enum branching: Repeated `if/elif` or `match` blocks branching on identical status strings or enum values in different modules.
- Parallel return branches: Multiple helpers matching on identical discriminator keys to return differing attributes or operations.

## Detect

### Evidence of harm

Do not treat an isolated conditional check in a single function as a smell.
Confirm Repeated Switches only when concrete harm exists:
- Missing branch bugs: Introducing a new variant requires edits across several files, and missing one causes runtime errors.
- Coordinated changes: Modifying one case's handling forces touching unrelated cases across multiple files.
- Duplicated domain dispatch: Different callers duplicate identical branching rules instead of calling a centralized abstraction.

### Ruff hints

- `SIM116` (if-else-block-instead-of-dict-lookup): Flags consecutive `if` statements with direct returns suitable for dictionary lookup.
- `PLR0911` (too-many-return-statements): Flags functions with excessive return statements across parallel branches.
- `PLR0912` (too-many-branches): Flags high branch counts in repetitive conditional blocks.

### Look-alikes

- Duplicated Code: Identical blocks of statements vs switching on a type code.
  If the branches do completely different work but the condition repeats, the smell is Repeated Switches.
- Divergent Change: A class changing for multiple reasons; Repeated Switches can be a symptom of Divergent Change.

### Deliberate exceptions

- Isolated parser or factory: A single switch statement in a factory function or serializer at a system boundary.
- Simple binary toggles: Straightforward `if/else` checks on boolean flags where polymorphism adds unnecessary complexity.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Switching on type across multiple functions | [Replace Conditional with Polymorphism](../refactorings/replace-conditional-with-polymorphism.md) | Subclass hierarchy | `singledispatch` or duck typing isolates type variations cleanly |
| Switching on string or enum value | [Replace Conditional with Polymorphism](../refactorings/replace-conditional-with-polymorphism.md) | Long if-elif chain | A dictionary mapping keys to handlers provides concise value dispatch |
| Sequential pattern matching with complex guards | [Replace Conditional with Polymorphism](../refactorings/replace-conditional-with-polymorphism.md) | Class hierarchy | Python 3.10+ `match` statements centralize structured pattern dispatch |
| Single switch isolated in a factory function | Keep the current design | Replace Conditional with Polymorphism | A single dispatch point at a boundary is clean and avoids speculative classes |

## Verify

- Run the full test suite covering all branch variants.
- Ensure adding a new variant tests only the new handler without regression in existing cases.
- Run project type checker and linter.
