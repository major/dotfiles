# Move Function

Background reference: skill `fowler-refactoring`, ch08.

## When

Use Move Function when a function accesses data or operations of another module or class more than its enclosing context.
Use it when moving the function colocates logic with the data it operates on, resolving Feature Envy, Shotgun Surgery, or Divergent Change.
Use it when an instance method does not use `self` and belongs at module scope or on a passed argument.

## Python idiom

Python treats modules as first-class namespaces and valid move targets.
Do not wrap independent functions in artificial utility classes just to move them.
If a function requires no instance state, prefer moving it to a module-level function in the destination module.
If the function operates on a specific dataclass or domain object, consider adding it as a method or keeping it as a pure module function taking that record.

## Mechanics

1. Check the source function for all variables and helpers it uses.
2. If only a portion of the function is envious, extract that portion first using [Extract Function](extract-function.md).
3. Copy the function to the target module or class.
4. Adjust parameters and references to fit the target home.
5. If moving to a class, add `self` as the first argument and remove the target object from the parameter list.
6. If moving from a class to a module, replace `self` references with explicit arguments.
7. Check dynamic references (mock.patch, __all__, __init__ re-exports, getattr, pickle, circular imports).
8. Update all call sites across the repository to call the new target directly in a single atomic step without backward compatibility shims.
9. Remove the original function definition from the source location.
10. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- Dynamic imports and mocks: Check whether tests mock the function using `unittest.mock.patch` with string paths pointing to the old location.
- Module exports: Check whether the function appears in `__all__` or is re-exported by package `__init__.py` files.
- Serialization and pickle: Moving functions or classes between modules can break unpickling of existing pickled payloads referencing old module paths.
- Circular imports: Moving a function across modules can introduce circular dependencies at import time.
- Keyword arguments: Changing parameter names during the move breaks callers passing arguments by keyword.
- Attribute inspection: Code using `getattr(obj, "func_name")` will fail if the attribute is removed without updating the caller.

## Before/After

### Before

```pycon
>>> class Customer:
...     def __init__(self, name: str, discount_rate: float):
...         self.name = name
...         self.discount_rate = discount_rate
>>> class OrderSummary:
...     def __init__(self, customer: Customer, subtotal: float):
...         self.customer = customer
...         self.subtotal = subtotal
...     def compute_discount(self) -> float:
...         # Method accesses customer attributes rather than its own
...         return round(self.subtotal * self.customer.discount_rate, 2)
>>> cust = Customer("Alice", 0.15)
>>> order = OrderSummary(cust, 100.0)
>>> order.compute_discount()
15.0

```

### After

```pycon
>>> class Customer:
...     def __init__(self, name: str, discount_rate: float):
...         self.name = name
...         self.discount_rate = discount_rate
...     def calculate_discount(self, amount: float) -> float:
...         return round(amount * self.discount_rate, 2)
>>> class OrderSummary:
...     def __init__(self, customer: Customer, subtotal: float):
...         self.customer = customer
...         self.subtotal = subtotal
...     def compute_discount(self) -> float:
...         return self.customer.calculate_discount(self.subtotal)
>>> cust = Customer("Alice", 0.15)
>>> order = OrderSummary(cust, 100.0)
>>> order.compute_discount()
15.0

```
