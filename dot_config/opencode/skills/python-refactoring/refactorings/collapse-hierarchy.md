# Collapse Hierarchy

Background reference: skill `fowler-refactoring`, ch12.

## When

Use Collapse Hierarchy when a superclass and subclass have grown so similar that they no longer justify separate existence.
Use it when a subclass is the only subclass of an abstract or base class and provides no meaningful specialization.
Use it to resolve [Speculative Generality](../smells/speculative-generality.md).

## Python idiom

Deep or single-child inheritance trees in Python add unnecessary complexity without polymorphic benefit.
Prefer a single concrete class, or prefer composition and `typing.Protocol` over concrete inheritance hierarchies.
Merge fields and methods from the redundant class into the surviving class.
Update all instantiation sites to construct the surviving class directly in a single atomic step without backward compatibility shims.

## Mechanics

1. Choose which class to remove: typically the subclass is merged into the superclass, or the superclass is absorbed if abstract.
2. Move all unique methods and attributes from the doomed class into the surviving class.
3. Adjust references to `super()` inside methods, replacing them with direct calls or inlining the logic.
4. Update all call sites and type annotations across the codebase that reference the doomed class to reference the surviving class.
5. Remove the empty or redundant class definition.
6. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- `isinstance` and `issubclass` tests: External callers testing for the removed class type will fail; verify no code relies on the collapsed type.
- Method override subtleties: Ensure that merged methods do not accidentally overwrite essential behavior when collapsing.
- Abstract base class decorators: Remove `@abstractmethod` decorators and `abc.ABC` inheritance if the surviving class is now concrete.

## Before/After

### Before

```pycon
>>> class Employee:
...     def __init__(self, name: str, salary: float):
...         self.name = name
...         self.salary = salary
>>> class RegularEmployee(Employee):
...     # Subclass provides zero specialization or additional behavior
...     pass
>>> emp = RegularEmployee("Alice", 75000.0)
>>> emp.name
'Alice'

```

### After

```pycon
>>> class Employee:
...     """Concrete employee record without speculative subclass."""
...     def __init__(self, name: str, salary: float):
...         self.name = name
...         self.salary = salary
>>> emp = Employee("Alice", 75000.0)
>>> emp.name
'Alice'

```
