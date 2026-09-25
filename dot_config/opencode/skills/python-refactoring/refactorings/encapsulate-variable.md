# Encapsulate Variable

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Encapsulate Variable when a mutable variable or data structure is accessed and modified widely across different modules.
Use it when an attribute requires validation, computed caching, or transformation upon access.
Use it to resolve [Global Data](../smells/global-data.md) and [Mutable Data](../smells/mutable-data.md).

## Python idiom

Python prefers plain public attribute access (`obj.value`) rather than Java-style `get_value()` and `set_value()` methods.
When access control, validation, or read-only protection is needed, use the `@property` decorator on methods while preserving public attribute syntax.
For module-level state, encapsulate access through explicit getter and setter functions, or better, package the state into a `@dataclass(frozen=True)` passed explicitly as a parameter.
When managing records, use frozen dataclasses updated with `dataclasses.replace` instead of mutable setting methods.

## Mechanics

1. Determine whether encapsulation is needed: use `@property` only if access logic is already needed (or pass-through attribute access is wrapped for future interception).
2. For class attributes: define a private underscore-prefixed attribute (e.g. `_celsius`) in `__init__`.
3. Add a `@property` method to expose the attribute for reading.
4. If modification is permitted, add a `@<name>.setter` method that passes through the value; note that adding new validation is a separate follow-up step.
5. If the attribute should be immutable, omit the setter to make it read-only.
6. For module-level variables: define accessor functions to read and update the variable.
7. Search the repository and replace direct global accesses with calls to the accessor functions.
8. Add Google-style docstrings and type annotations to the property and accessor methods.
9. Run tests, linter, and type checker to confirm that access syntax remains intact and behavior is preserved.

## Preservation pitfalls

- Performance in tight loops: `@property` invocation carries a slight method call overhead compared to direct slot or dictionary access.
- In-place mutation bypass: If the property returns a mutable object (such as a list or dictionary), callers can mutate the internal state without triggering any setter validation; return a copy or immutable tuple instead.
- Descriptor conflicts: Be mindful when combining properties with class-level decorators or custom descriptors.

## Before/After

### Before

```pycon
>>> class TemperatureSensor:
...     def __init__(self, celsius: float):
...         self.celsius = celsius
>>> sensor = TemperatureSensor(25.0)
>>> sensor.celsius = -300.0  # invalid physical temperature accepted
>>> sensor.celsius
-300.0

```

### After

```pycon
>>> class TemperatureSensor:
...     """Monitors temperature reading."""
...     def __init__(self, celsius: float):
...         self._celsius = celsius
...     @property
...     def celsius(self) -> float:
...         """Read current temperature in Celsius."""
...         return self._celsius
...     @celsius.setter
...     def celsius(self, value: float) -> None:
...         """Set temperature in Celsius."""
...         self._celsius = value
>>> sensor = TemperatureSensor(25.0)
>>> sensor.celsius = -300.0
>>> sensor.celsius
-300.0

```
