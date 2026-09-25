# Refused Bequest

Background reference: skill `fowler-refactoring`, ch03 and ch12.

## Symptom

A subclass inherits methods and attributes from a superclass, but deliberately ignores, overrides with empty stubs, or raises `NotImplementedError` for many of them.
The subclass wants the code reuse of inheritance but refuses to honor the interface contract of its parent.

## Python forms

- Stubbed override methods: Subclasses overriding inherited methods with `pass`, `return None`, or raising `NotImplementedError`.
- Liskov substitution violations: Code expecting the base class crashing when supplied with an instance of the subclass.
- Inheritance for code reuse alone: Subclassing a heavy concrete class solely to reuse one helper method while ignoring the rest of the abstraction.

## Detect

### Evidence of harm

Do not treat standard abstract base class overrides as Refused Bequest when the subclass implements the full contract.
Confirm Refused Bequest only when concrete harm exists:
- Crashes at call sites: Callers expecting standard base class operations fail when interacting with the refusing subclass.
- Fragile coupling: Changes to superclass internals break the subclass, even though the subclass does not use those features.
- Confusing type hierarchies: Static type checkers or readers are misled by a type hierarchy that the subclass does not truly fulfill.

### Ruff hints

- `B024` (abstract-base-class-without-abstract-method): Flags incomplete abstract hierarchy design.

### Look-alikes

- Alternative Classes with Different Interfaces: Independent classes with different methods; Refused Bequest is an inheritance problem.
- Speculative Generality: Unused superclasses created for hypothetical future variants.

### Deliberate exceptions

- Intentional base class defaults: Base classes providing default no-op hooks designed to be optionally overridden by subclasses.
- Narrowed interfaces in private adapters: Private internal shims where full substitutability is explicitly not promised.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Subclass violates parent interface contract | [Replace Subclass with Delegate](../refactorings/replace-subclass-with-delegate.md) | Keep empty stubs | Composition separates independent behaviors and avoids broken polymorphism |
| Multiple unrelated classes share common behavior | [Replace Subclass with Delegate](../refactorings/replace-subclass-with-delegate.md) or `typing.Protocol` | Deep inheritance tree | `Protocol` defines duck-typed structural subtyping without rigid inheritance |
| Subclass only needs a subset of utility methods | [Replace Subclass with Delegate](../refactorings/replace-subclass-with-delegate.md) | Push Down Method | Calling a helper directly or delegating cleanly decouples interfaces |
| Subclass legitimately overrides optional lifecycle hook | Keep the current design | Replace Subclass with Delegate | Intentional framework hook points should be preserved |

## Verify

- Run the full test suite across all instances and call sites.
- Run project type checker to verify that callers interact cleanly with the delegate or `Protocol`.
- Verify that no call site relies on broken inheritance polymorphism.
