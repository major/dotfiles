# Hide Delegate

Background reference: skill `fowler-refactoring`, ch07.

## When

Use Hide Delegate when a client must navigate through one object to invoke methods on a second collaborator (e.g. `client.server.manager.department`).
Use it when a client is tightly coupled to the intermediate structure of another object's relationships.
Use it to resolve [Message Chains](../smells/message-chains.md) and [Insider Trading](../smells/insider-trading.md).

## Python idiom

Enforce encapsulation by introducing simple forwarding methods or properties on the immediate server object.
This shields the client from knowing about or depending on the server's internal delegate structure.
Do not over-apply this refactoring: if every single method of the delegate is forwarded, the server becomes a [Middle Man](../smells/middle-man.md).
Use `@property` for straightforward attribute access when hiding an underlying delegate attribute.

## Mechanics

1. For each method or attribute on the delegate that the client calls, create a forwarding method on the server.
2. Inside the server's forwarding method, delegate the call directly to the internal delegate object.
3. Replace client calls to the delegate chain (e.g. `person.department.manager`) with calls to the server method (e.g. `person.manager`).
4. Update all call sites across the repository in a single atomic step without backward compatibility shims.
5. If no clients need direct access to the delegate object anymore, remove client-facing accessors to the delegate.
6. Add Google-style docstrings and type annotations to the new forwarding methods.
7. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Middle Man smell emergence: Creating too many delegating methods creates an unnecessary wrapper class; balance encapsulation with simplicity.
- Return value exposure: If the delegating method returns internal mutable objects, callers can still violate encapsulation.
- Null navigation safety: If the internal delegate can be `None`, ensure the forwarding method handles or returns `Optional` explicitly.

## Before/After
<!-- interface-change -->

### Before

```pycon
>>> class Department:
...     def __init__(self, manager_name: str):
...         self.manager_name = manager_name
>>> class Person:
...     def __init__(self, name: str, department: Department):
...         self.name = name
...         self.department = department
>>> dept = Department("Bob")
>>> person = Person("Alice", dept)
>>> # Client must navigate through department to find manager
>>> person.department.manager_name
'Bob'

```

### After

```pycon
>>> class Department:
...     """Department entity with manager details."""
...     def __init__(self, manager_name: str):
...         self.manager_name = manager_name
>>> class Person:
...     """Person entity delegating manager queries to department."""
...     def __init__(self, name: str, department: Department):
...         self.name = name
...         self.department = department
...     @property
...     def manager_name(self) -> str:
...         """Read department manager name directly from person."""
...         return self.department.manager_name
>>> dept = Department("Bob")
>>> person = Person("Alice", dept)
>>> person.manager_name
'Bob'

```

## Inverse

The inverse of this refactoring is [Remove Middle Man](remove-middle-man.md).
Use Remove Middle Man when a class spends excessive methods doing nothing but forwarding calls to a delegate.
