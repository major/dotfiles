# Long Parameter List

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

A function or method accepts excessive parameters, causing cognitive fatigue at call sites and tight coupling to caller data.
Callers frequently pass positional arguments out of order or pass configuration that the function barely uses.

## Python forms

- Clustered positional arguments: Signatures taking six or more parameters that represent related aspects of a domain entity.
- Boolean flag parameters: Signatures accepting boolean flags (`def process(item, active=True, verbose=False)`) that control internal execution branching.
- `**kwargs` pass-through: Indiscriminate `**kwargs` forwarding that obscures the actual parameters required by underlying callees.

## Detect

### Evidence of harm

Do not treat parameter count alone as proof of a smell.
Confirm Long Parameter List only when concrete harm exists:
- Call site errors: Callers frequently mix up argument ordering for parameters of the same type.
- Cascading signature changes: Adding a parameter forces edits across every caller in the codebase.
- Obscured callee contract: Callers cannot discover required arguments from `**kwargs` without reading the callee implementation.

### Ruff hints

- `PLR0913` (too-many-arguments): Flags functions defining more than 5 arguments.
- `PLR0917` (too-many-positional-arguments): Flags functions with more than 5 positional arguments.
- `FBT001` (boolean-type-hint-positional-argument): Flags boolean-typed positional parameters (boolean traps).
- `FBT002` (boolean-default-value-positional-argument): Flags boolean default values on positional parameters.

### Look-alikes

- Data Clumps: Identical groups of parameters appearing across multiple different signatures.
  Long Parameter List applies to a single bloated signature, whereas Data Clumps describes recurring parameter sets.
- Primitive Obsession: Using raw primitive values for structured data; often resolved together by introducing parameter records.

### Deliberate exceptions

- Framework callbacks: Event handlers, web routing hooks, or test fixtures whose parameter signature is dictated by an external framework.
- Dependency injection: Initializer signatures accepting several explicit service dependencies where encapsulation would obscure dependencies.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Related parameters describe a domain concept | [Introduce Parameter Object](../refactorings/introduce-parameter-object.md) | Dict parameter | Frozen dataclasses provide explicit typing, validation, and immutability |
| Boolean parameter switches internal behavior | [Remove Flag Argument](../refactorings/remove-flag-argument.md) | Boolean enum | Separate explicit functions communicate clear intent at call sites |
| Indiscriminate `**kwargs` passed across layers | [Introduce Parameter Object](../refactorings/introduce-parameter-object.md) | Keep `**kwargs` | Explicit parameter records document arguments and enable static type checking |
| Arguments represent independent required dependencies | Keep the current design | Introduce Parameter Object | Grouping unrelated dependencies creates artificial coupling |

## Verify

- Run the full test suite across all updated call sites.
- Run project type checker and linter to confirm argument types match.
- Verify keyword arguments and default argument evaluations at all call sites.
