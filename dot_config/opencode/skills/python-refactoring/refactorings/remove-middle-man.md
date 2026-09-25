# Remove Middle Man

Background reference: skill `fowler-refactoring`, ch07.

## When

Use Remove Middle Man when a class spends half or more of its methods simply forwarding calls to an internal delegate object.
Use it when every feature addition requires adding boilerplate forwarding methods on the host class.
Use it to resolve [Middle Man](../smells/middle-man.md).

## Python idiom

Encapsulation has a cost in boilerplate and cognitive indirection.
When a host class does not add behavior, validation, or transformation, expose the delegate object directly via a public attribute or property.
Callers interact directly with the delegate object, eliminating redundant forwarding methods on the host class.
Update implementation and all repository call sites in a single atomic step without backward compatibility shims.

## Mechanics

1. Create a getter or plain public attribute on the host class to access the internal delegate object.
2. For each forwarding method on the host class, find all callers across the repository.
3. Replace calls through the host forwarding method with direct calls to the method on the exposed delegate.
4. Remove the redundant forwarding method from the host class.
5. Repeat for all forwarding methods until only meaningful host operations remain.
6. Add Google-style docstrings and type annotations to the exposed delegate accessor.
7. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Law of Demeter trade-off: Exposing the delegate reintroduces client coupling to the delegate's interface; ensure this is acceptable.
- Bypassing validation: Verify that the forwarding methods being removed did not perform hidden parameter transformations or security checks.
- Direct mutation of delegate: Callers obtaining direct access to the delegate could mutate its state unexpectedly.

## Before/After

### Before

```pycon
>>> class Department:
...     def __init__(self, manager_name: str, budget: float):
...         self.manager_name = manager_name
...         self.budget = budget
>>> class Person:
...     def __init__(self, name: str, department: Department):
...         self.name = name
...         self._department = department
...     @property
...     def manager_name(self) -> str:
...         return self._department.manager_name
...     @property
...     def budget(self) -> float:
...         return self._department.budget
>>> dept = Department("Bob", 50000.0)
>>> person = Person("Alice", dept)
>>> person.manager_name
'Bob'
>>> person.budget
50000.0

```

### After

```pycon
>>> class Department:
...     """Department entity with manager and budget details."""
...     def __init__(self, manager_name: str, budget: float):
...         self.manager_name = manager_name
...         self.budget = budget
>>> class Person:
...     """Person entity exposing department directly without middle-man forwarders."""
...     def __init__(self, name: str, department: Department):
...         self.name = name
...         self.department = department
>>> dept = Department("Bob", 50000.0)
>>> person = Person("Alice", dept)
>>> person.department.manager_name
'Bob'
>>> person.department.budget
50000.0

```

## Inverse

The inverse of this refactoring is [Hide Delegate](hide-delegate.md).
Use Hide Delegate when clients are too tightly coupled to the internal navigation structure of a collaborator.
