# Data Clumps

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

Groups of three or more data items appear together repeatedly across multiple places in the codebase.
These data items travel together as function parameters, dictionary keys, or class fields.

## Python forms

- Clumped function parameters: Several functions accept the exact same group of arguments, such as `street`, `city`, `zip_code`, and `state`.
- Clumped dictionary keys: Multiple functions access and process the same set of dictionary keys together without formal structure.
- Clumped class attributes: Multiple classes define the exact same subset of attributes representing a shared domain concept.

## Detect

### Evidence of harm

A list of parameters is not a smell by itself.
Confirm Data Clumps only when concrete harm is present:
- Duplicated signatures: Adding or modifying one parameter requires editing multiple function signatures and call sites across the codebase.
- Duplicated validation: Separate functions repeat identical validation checks on the clumped fields.
- Hidden domain concept: The code operates on related values without naming the underlying abstraction, making code harder to understand.

### Ruff hints

- `PLR0913` (too-many-arguments): Flags functions with more than five arguments, recommending grouping related parameters into an object.
- `PLR0917` (too-many-positional-arguments): Flags functions taking too many positional arguments, suggesting parameter grouping or keyword arguments.
- `PLR0914` (too-many-locals): Flags functions with excessive local variables, often resulting from unpacking clumped values.

### Look-alikes

- Long Parameter List: A single function takes many arguments, but those arguments do not appear together in other functions.
  Data Clumps recur in multiple places.
- Primitive Obsession: A single primitive value is used instead of a domain concept, such as an integer representing currency.
  Data Clumps represent multiple values traveling together.

### Deliberate exceptions

- Boundary unpacking: Framework entry points like CLI parsers or web controllers that immediately validate and unpack arguments.
- Pass-through wrappers: Generic wrapper functions that forward arbitrary arguments using `*args` and `**kwargs`.
- Prescribed interfaces: Callbacks conforming to external third-party API contracts where argument shapes cannot be changed.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Clumped parameters recur across function signatures | [Introduce Parameter Object](../refactorings/introduce-parameter-object.md) | Keep separate arguments | Introduces a frozen dataclass that encapsulates the concept and simplifies signatures |
| Clumped attributes recur across class definitions | [Extract Class](../refactorings/extract-class.md) | Keep duplicated fields | Encapsulates shared state and associated operations into a dedicated class |
| Clumped dictionary keys flow into core logic from external I/O | [Introduce Parameter Object](../refactorings/introduce-parameter-object.md) at boundary | TypedDict | Frozen dataclass gives immutability, clear contracts, and validation at the system edge |
| Arguments appear together in only one local scope | Keep the current design | Introduce Parameter Object | Introducing a class for a one-off parameter group adds unnecessary indirection |

### Record Selection Guidelines

- Newly created records must be `@dataclass(frozen=True)` updated via `dataclasses.replace`.
- Use `slots` and `kw_only` only when the target Python version supports them and the contract requires them.
- Convert existing mutable records to frozen only after confirming that callers do not mutate attributes or rely on dynamic fields.
- Prefer `NamedTuple` only when tuple unpacking or indexing behavior is explicitly required.
- Use Pydantic only if the project already includes it as a dependency.

## Verify

- Run the full test suite to confirm all callers pass the new record cleanly.
- Run project linter and type checker to verify correct types across all call sites.
- Verify that no callers retain deprecated individual parameter signatures.
