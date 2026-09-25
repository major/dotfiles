# Change Function Declaration

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Change Function Declaration when a function or method name does not clearly communicate its purpose.
Use it when parameter names are misleading, or when parameters need to be added, reordered, or removed to clarify the interface.
Use it when resolving [Mysterious Name](../smells/mysterious-name.md).

## Python idiom

Python allows callers to pass arguments positionally or by keyword.
Parameter names are part of the public interface because callers often use keyword arguments.
Update implementation and all repository call sites in a single atomic step without backward compatibility shims or alias wrappers.
If the function is exported from an external library, identify the breaking change plainly for user approval before making modifications.

## Mechanics

1. Determine the new function name, parameter names, or parameter order.
2. Search the repository for all references and call sites of the function.
3. Check dynamic references such as `mock.patch` target strings, `__all__`, `getattr`, and package `__init__.py` re-exports.
4. Update the function definition with the new name, parameters, Google-style docstrings, and type annotations.
5. Update all in-repo call sites to match the new declaration in the same change.
6. Run tests, linter, and type checker to verify that all callers are updated and passing.

## Preservation pitfalls

- Keyword arguments at call sites: Renaming a parameter breaks any caller that passes the argument using `param_name=value`.
- String-based mock patches: `unittest.mock.patch("module.old_func_name")` in tests will fail silently or raise an `AttributeError`.
- Package re-exports: If the function was listed in `__all__` or imported in `__init__.py`, update those references atomically.
- Default argument evaluation: Default parameter values are evaluated once at definition time; do not use mutable defaults.

## Before/After

### Before

```pycon
>>> def calc(d: float, r: float) -> float:
...     # d is distance in miles, r is rate in mph
...     return round(d / r, 2)
>>> calc(120.0, 60.0)
2.0

```

### After

```pycon
>>> def calculate_travel_hours(distance_miles: float, speed_mph: float) -> float:
...     """Calculate travel duration in hours given distance and speed.
...
...     Args:
...         distance_miles: Distance to travel in miles.
...         speed_mph: Travel speed in miles per hour.
...
...     Returns:
...         Duration in hours rounded to two decimal places.
...     """
...     return round(distance_miles / speed_mph, 2)
>>> calculate_travel_hours(distance_miles=120.0, speed_mph=60.0)
2.0

```
