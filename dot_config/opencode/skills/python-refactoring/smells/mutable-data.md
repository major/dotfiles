# Mutable Data

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

Data structures are mutated in place across multiple functions or methods, making it hard to reason about state transitions.
Callers holding references find their data silently changed out from under them.

## Python forms

- In-place container mutations: Functions appending to lists, updating dictionaries, or modifying sets passed as arguments.
- Shared mutable class attributes: Class-level mutable attributes (such as `items = []` or `cache = {}`) shared across all instances.
  Mutable class attribute is a defect when instances share state by accident, and a smell otherwise.
- Methods mixing queries and updates: Methods that return a calculated value while simultaneously mutating internal instance state.

## Detect

### Evidence of harm

Do not treat local variable reassignment inside a short function as a smell.
Confirm Mutable Data only when concrete harm exists:
- Aliasing bugs: Mutating an object alters another caller's view of that data without warning.
- Difficult debugging: Inability to pinpoint which function or statement caused an invalid state transition.
- Fragile reasoning: Lack of referential transparency requiring readers to trace every statement to know the current value.

### Ruff hints

- `RUF012` (mutable-class-default): Flags class attributes defined with mutable default values.
- `B006` (mutable-argument-default): Flags mutable default argument values.
  A mutable default is a defect only when mutated, returned, or shared across calls; a read-only mutable default is not a defect.

### Look-alikes

- Global Data: Mutable state living at module or global scope.
  Mutable Data applies to all mutable references, including instance attributes and function parameters.
- Data Class: Classes that expose fields without methods; often also suffer from Mutable Data when unfrozen.

### Deliberate exceptions

- Local accumulators: Constructing a list or dictionary locally within a single pure function before returning an immutable result.
- Performance critical buffers: Explicit in-place mutation of byte arrays or numerical arrays for tight optimization loops.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Public attributes mutated by external callers | [Encapsulate Variable](../refactorings/encapsulate-variable.md) | Keep open attributes | Properties or accessor functions control access and isolate state updates |
| Method computes a value while mutating state | [Separate Query from Modifier](../refactorings/separate-query-from-modifier.md) | Keep combined method | Pure query methods ensure referential transparency and safe querying |
| Mutable record passed across domain boundaries | [Encapsulate Variable](../refactorings/encapsulate-variable.md) | In-place copy | Frozen dataclasses updated with `dataclasses.replace` prevent unintended aliasing |
| Local container mutation isolated in pure function | Keep the current design | Encapsulate Variable | Local mutation within a single scope is idiomatic and keeps functions concise |

## Verify

- Run the full test suite to ensure callers receive expected return values.
- Verify that objects returned from functions are not mutated by callers.
- Run project linter and type checker on affected classes.
