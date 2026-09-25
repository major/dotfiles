# Replace Subclass with Delegate

Background reference: skill `fowler-refactoring`, ch12.

## When

Use Replace Subclass with Delegate when inheritance creates rigid coupling, or when a subclass only needs part of the superclass behavior.
Use it when a subclass refuses methods of its superclass or violates the Liskov substitution principle.
Use it to resolve [Refused Bequest](../smells/refused-bequest.md).

## Python idiom

Favor composition over inheritance.
In Python, duck typing and `typing.Protocol` provide flexible structural subtyping without requiring concrete class inheritance.
Instead of subclassing a heavy parent class to customize behavior, hold an instance of the collaborator (delegate) as an attribute.
Use `Protocol` to define the structural contract expected by callers, allowing independent classes to satisfy it without shared ancestors.

## Mechanics

1. In the subclass, add a parameter to `__init__` to accept or construct an instance of the former superclass as a delegate.
2. For each method inherited from the superclass that the subclass needs, add a method that forwards the call to the delegate.
3. Remove the inheritance relationship from the class definition (e.g. `class MyClass:` instead of `class MyClass(Parent):`).
4. If a structural contract is expected by callers, define a `typing.Protocol` describing the required methods and annotate parameters accordingly.
5. Update instantiation sites across the repository to pass or initialize the delegate cleanly.
6. Add Google-style docstrings and type annotations to the decoupled class.
7. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- `isinstance` checks: Callers using `isinstance(obj, ParentClass)` will evaluate to `False` once inheritance is severed; use `Protocol` checks with `@runtime_checkable` if runtime introspection is necessary.
- Missing refused methods: Refused methods such as `fly()` now raise `AttributeError` instead of `NotImplementedError` when called on the decoupled instance.
- Multiple inheritance tangles: Be cautious with complex `super()` cooperative method resolution order (MRO) when replacing subclasses in multi-inheritance hierarchies.
- Over-delegation: If the class ends up forwarding every single method verbatim, consider whether the class is needed at all.

## Before/After

### Before

```pycon
>>> class Bird:
...     def fly(self) -> str:
...         return "Flying through the sky"
...     def eat(self) -> str:
...         return "Eating seeds"
>>> class Penguin(Bird):
...     def fly(self) -> str:
...         # Refused bequest: penguins cannot fly!
...         raise NotImplementedError("Penguins cannot fly")
>>> p = Penguin()
>>> p.eat()
'Eating seeds'

```

### After

```pycon
>>> class BirdFeeder:
...     """Provides foraging and eating mechanics."""
...     def eat(self) -> str:
...         """Perform feeding action."""
...         return "Eating seeds"
>>> class Penguin:
...     """Penguin entity composing feeding behavior without flying inheritance."""
...     def __init__(self, feeder: BirdFeeder | None = None):
...         self.feeder = feeder if feeder is not None else BirdFeeder()
...     def eat(self) -> str:
...         """Delegate feeding to internal feeder."""
...         return self.feeder.eat()
>>> p = Penguin()
>>> p.eat()
'Eating seeds'

```
