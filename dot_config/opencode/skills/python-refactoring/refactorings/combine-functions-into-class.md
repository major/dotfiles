# Combine Functions into Class

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Combine Functions into Class when a group of functions repeatedly pass the same arguments back and forth to operate on shared mutable state.
Use it when operations need to maintain an evolving context or lifecycle that cannot be modeled as a pure transform.
Use it to resolve [Shotgun Surgery](../smells/shotgun-surgery.md).

## Python idiom

Do not create classes merely to group stateless functions; use modules for grouping stateless pure functions.
When shared state or mutable lifecycle is necessary, encapsulate the data and functions into a cohesive class using `@dataclass` or explicit `__init__`.
Keep methods focused on manipulating `self` attributes rather than accepting excessive external arguments.
Avoid creating classes with only one public method unless satisfying a specific protocol requirement.

## Mechanics

1. Identify the common data structure and the group of functions operating on it.
2. Create a new class with an `__init__` method that accepts the common data and assigns it to instance attributes.
3. Move each function into the class as an instance method, adding `self` as the first parameter and removing the shared data from arguments.
4. Replace internal calls between the functions with method calls on `self`.
5. Update callers to instantiate the class once and invoke methods on the instance.
6. Add Google-style docstrings and type annotations to the class and its methods.
7. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Unintended state sharing: If an instance is shared across threads or callers, concurrent mutations to instance attributes cause race conditions.
- Extra layer of indirection: Converting pure functions to class methods can complicate testing if instances hold onto state between tests.
- Parameter aliasing: Modifying mutable objects passed into `__init__` affects external callers unless copies are made.

## Before/After

### Before

```pycon
>>> def base_rate(reading: dict[str, float]) -> float:
...     return reading["usage"] * reading["rate"]
>>> def taxable_rate(reading: dict[str, float]) -> float:
...     return max(0.0, base_rate(reading) - reading["tax_threshold"])
>>> r = {"usage": 100.0, "rate": 0.5, "tax_threshold": 20.0}
>>> base_rate(r)
50.0
>>> taxable_rate(r)
30.0

```

### After

```pycon
>>> class MeterReading:
...     """Cohesive reading entity encapsulating usage and charges."""
...     def __init__(self, usage: float, rate: float, tax_threshold: float):
...         self.usage = usage
...         self.rate = rate
...         self.tax_threshold = tax_threshold
...     def base_charge(self) -> float:
...         """Calculate base charge for the reading."""
...         return self.usage * self.rate
...     def taxable_charge(self) -> float:
...         """Calculate taxable charge exceeding threshold."""
...         return max(0.0, self.base_charge() - self.tax_threshold)
>>> reading = MeterReading(usage=100.0, rate=0.5, tax_threshold=20.0)
>>> reading.base_charge()
50.0
>>> reading.taxable_charge()
30.0

```
