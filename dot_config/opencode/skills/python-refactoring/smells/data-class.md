# Data Class

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

A class contains only fields and raw accessors, but callers across the codebase manipulate its fields and enforce domain rules outside the class.
The class acts as an anemic data holder while business logic is scattered across caller procedures.

## Python forms

- Caller-enforced invariants: External callers validating fields, calculating totals, or modifying state that inherently belongs to the record.
- Mutable records exposed to uncontrolled updates: Classes with public mutable fields where external callers perform arbitrary state mutations.
- Procedural manipulation scripts: Functions that repeatedly inspect and update fields on a passed record instead of invoking methods.

## Detect

### Evidence of harm

Do not treat frozen data records manipulated by pure functions as a smell.
Confirm Data Class only when concrete harm exists:
- Duplicated domain calculations: Multiple callers repeat identical computations or invariant checks on the record's fields.
- Broken invariants: Callers mutate fields directly without performing necessary validations, causing corrupt states.
- High change coupling: Modifying a field name or data representation forces updates across dozens of caller procedures.

### Ruff hints

- `RUF012` (mutable-class-default): Flags mutable default values on class or dataclass attributes.
- `PLR6301` (no-self-use): In client methods that manipulate external records without using their own state.

### Look-alikes

- Feature Envy: A client function overly interested in a data class.
  The client suffers from Feature Envy, while the target class is the Data Class; resolving one often resolves the other.
- Primitive Obsession: Primitives used instead of objects; Data Class already has an object, but lacks encapsulated domain operations.

### Deliberate exceptions

- Pure frozen records: A `@dataclass(frozen=True)` with no methods, processed by pure module functions, is a deliberate functional programming pattern.
- Local mutable records without harm: A mutable dataclass constructed and populated in a single local function scope where callers enforce no external invariants.
- Boundary DTOs: Simple transfer objects returned from deserialization before boundary conversion.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Callers repeatedly compute values from record fields | [Move Function](../refactorings/move-function.md) | Keep procedural calls | Moving logic into the class colocates calculations with data |
| Fields are mutated directly by external callers | [Encapsulate Variable](../refactorings/encapsulate-variable.md) | Make fields read-only | Properties or frozen records protect invariants against invalid mutations |
| Pure frozen record processed by pure functions | Keep the current design | Move Function | Pure functions over immutable records are idiomatic in functional Python |
| Local mutable scratchpad without external callers | Keep the current design | Encapsulate Variable | Local mutable records within a single scope carry no external coupling harm |

## Verify

- Run the full test suite after moving methods onto the data class.
- Run project linter and type checker across callers and the data class.
- Verify that domain invariants cannot be bypassed by external callers.
