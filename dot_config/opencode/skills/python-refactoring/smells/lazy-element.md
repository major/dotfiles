# Lazy Element

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

A function, class, or module costs more to comprehend and maintain than the minimal value its indirection provides.
The abstraction acts as a passthrough or trivial wrapper that never grew to justify its existence.

## Python forms

- Single-method classes: A class defining only `__init__` and one public method, instantiated and immediately called in one expression at every call site.
- Trivial passthrough wrappers: Functions that merely forward arguments to another function without transformation or policy.
- Anemic modules: A module containing only a single two-line function or re-export that could live with its caller.

## Detect

### Evidence of harm

Do not remove an abstraction simply because it is short if it provides a meaningful semantic boundary.
Confirm Lazy Element only when concrete harm exists:
- Call site friction: Callers must instantiate a single-method class with configuration they do not otherwise use just to call one method.
- Indirection without abstraction: Readers must jump through multiple file layers to find where work is actually performed.
- Maintenance overhead: Changes require editing boilerplate across wrappers without altering business logic.

### Ruff hints

- `PLR0904` (too-many-public-methods): Contextual check; classes with only one trivial method risk being unnecessary structures.

### Look-alikes

- Middle Man: A class delegating most of its methods to another class.
  Lazy Element is an abstraction that is too small or does nothing, whereas Middle Man is over-delegation.
- Speculative Generality: Abstractions created for theoretical future requirements that are currently unused.

### Deliberate exceptions

- Reused configuration: A single-method class constructed once and called repeatedly across an application to retain configuration.
- Protocol implementations: A class implementing a formal `Protocol` or abstract interface required by an external framework.
- Adapters: Lightweight adapters translating an incompatible external interface to an internal standard.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Single-method class instantiated and called at once | [Inline Class](../refactorings/inline-class.md) | Keep class wrapper | Pure module-level functions eliminate unnecessary object instantiation overhead |
| Function only delegates to another function | [Inline Function](../refactorings/inline-function.md) | Keep wrapper | Calling the target function directly removes needless indirection |
| Class hierarchy provides no specialization | [Inline Class](../refactorings/inline-class.md) | Keep subclass | Collapsing the hierarchy simplifies the object model |
| Single-method class implements required Protocol | Keep the current design | Inline Class | Preserves conformance with external interface expectations |

## Verify

- Run the full test suite after inlining classes or functions.
- Run project linter and type checker across all affected callers.
- Check dynamic references such as `mock.patch` target strings pointing to the inlined elements.
