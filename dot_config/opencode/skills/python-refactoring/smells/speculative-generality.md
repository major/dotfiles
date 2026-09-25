# Speculative Generality

Background reference: skill `fowler-refactoring`, ch03 and ch08.

## Symptom

Code introduces abstract classes, unused parameters, configuration hooks, or indirection purely to support anticipated future requirements that do not currently exist.
The machinery adds complexity today for benefits that may never arrive.

## Python forms

- Unused parameters and flags: Function signatures accepting arguments that are never read or used in calculations.
- Over-abstract class hierarchies: Abstract base classes or complex generic protocols with only a single concrete implementation in the codebase.
- Dead extension hooks: Plug-in architectures, dispatch registries, or callback hooks that have exactly one consumer.

## Detect

### Evidence of harm

Do not treat well-documented public library interfaces as speculative generality if designed for third-party consumers.
Confirm Speculative Generality only when concrete harm exists:
- Cognitive tax: Readers must navigate layers of abstraction to find concrete execution paths.
- Unused parameter confusion: Callers are baffled by what arguments to pass when parameters have no effect.
- Fragile maintenance: Refactorings must preserve unused interfaces and theoretical extensibility points.

### Ruff hints

- `ARG001` (unused-function-argument): Flags function arguments that are unused in the function body.
- `ARG002` (unused-method-argument): Flags method arguments that are unused in the method body.
- `B024` (abstract-base-class-without-abstract-method): Flags abstract base classes that declare no abstract members.

### Look-alikes

- Lazy Element: Small classes that do little; speculative generality includes unused abstractions designed for future expansion.
- Dead Code: Completely uncalled functions; speculative generality refers to over-engineered structures actively called but carrying useless baggage.

### Deliberate exceptions

- Framework callback signatures: Parameters required by framework contracts (such as `request` in web views or `*args, **kwargs` in decorators).
- Public library extension points: Interfaces deliberately exported for external plugin authors in published libraries.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Abstract base class has only one concrete subclass | [Collapse Hierarchy](../refactorings/collapse-hierarchy.md) | Keep hierarchy | Merging subclass and superclass eliminates redundant inheritance layers |
| Trivial wrapper function created for hypothetical use | [Inline Function](../refactorings/inline-function.md) | Keep wrapper | Calling the direct implementation removes needless indirection |
| Signature contains unused parameters | [Collapse Hierarchy](../refactorings/collapse-hierarchy.md) | Prefix with `_` | Removing dead parameters clarifies the true caller contract |
| Parameter required by third-party protocol | Keep the current design | Collapse Hierarchy | Conformance with external contracts must be preserved |

## Verify

- Run the full test suite after collapsing hierarchies and removing parameters.
- Run project linter and type checker to ensure no references are left broken.
- Verify that removed parameters do not break callers passing arguments by keyword.
