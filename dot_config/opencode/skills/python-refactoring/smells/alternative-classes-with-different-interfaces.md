# Alternative Classes with Different Interfaces

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

Two or more classes perform similar services or represent similar concepts, but cannot be used interchangeably because their method names or signatures differ.
Callers must write separate branch logic or custom wrappers to interact with each class.

## Python forms

- Mismatched method names: One class defining `send(msg)` while an alternative defines `dispatch(payload)`.
- Mismatched argument orders: Classes accepting identical parameters but in different positional orders or under different keyword names.
- Redundant internal wrappers: Callers maintaining helper functions purely to translate arguments between two equivalent service providers.

## Detect

### Evidence of harm

Do not align interfaces if the underlying operations have fundamentally different semantics or lifecycles.
Confirm Alternative Classes with Different Interfaces only when concrete harm exists:
- Call site conditional branching: Callers branching on class type to invoke slightly differently named methods that do the same work.
- Duplicate client logic: Parallel client code written twice to accommodate trivial interface variations between providers.
- Polymorphism barrier: Inability to substitute implementations via duck typing or `Protocol` without writing bespoke adapters.

### Ruff hints

- `PLR6301` (no-self-use): Methods on alternative classes that do not use instance state and could be normalized.

### Look-alikes

- Duplicate Code: Shared logic duplicated between classes; once interfaces are aligned, common logic can be extracted.
- Refused Bequest: Inheriting an interface but not using it; Alternative Classes involves unrelated classes that should share an interface.

### Deliberate exceptions

- Distinct domain concepts: Classes whose operations seem similar but operate on completely different underlying abstractions.
- Third-party library constraints: External library classes that cannot have their signatures modified directly; use an Adapter.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Methods perform the same task with different names | [Change Function Declaration](../refactorings/change-function-declaration.md) | Bespoke adapter | Renaming methods aligns signatures so classes satisfy the same duck type |
| Classes need identical argument structures | [Change Function Declaration](../refactorings/change-function-declaration.md) | Positional translation | Matching keyword arguments allows callers to substitute instances cleanly |
| Behavior needs relocation to complete alignment | [Move Function](../refactorings/move-function.md) | Duplicate logic | Moving behavior colocates missing operations on the target class |
| Classes represent fundamentally different abstractions | Keep the current design | Change Function Declaration | Forcing artificial uniformity onto distinct concepts creates confusing abstractions |

## Verify

- Run the full test suite across all client call sites.
- Verify that a `typing.Protocol` can describe the shared interface and both classes satisfy it.
- Run project type checker and linter.
