# Replace Conditional with Polymorphism

Background reference: skill `fowler-refactoring`, ch10.

## When

Use Replace Conditional with Polymorphism when multiple functions branch on the same type codes, status values, or object types.
Use it when adding a new variant requires editing several parallel `if/elif` or `match` statements across different files.
Use it to resolve [Repeated Switches](../smells/repeated-switches.md).

## Python idiom

Select the dispatch strategy that matches the context:
- Value-based dispatch: For status strings, error codes, or enum variants, use a dictionary mapping keys to pure handler functions, or Python 3.10+ `match` statements.
- Type-based dispatch: For operations that branch on the type of an argument, use `functools.singledispatch` on the first argument rather than modifying class definitions.
- Duck typing / Polymorphic classes: Use polymorphic methods on cooperating domain classes when objects naturally encapsulate diverse behaviors.
- Subclass hierarchies: Consider subclass hierarchies last, as inheritance adds coupling and rigidity compared to composition or functional dispatch tables.
- Interface contracts: Remember that `typing.Protocol` defines a structural interface for static type checking but does not perform runtime dispatch.
- Enum conversions: Converting string literals to `Enum` members can break string equality comparisons and JSON serialization unless handled explicitly.

## Mechanics

1. Determine whether the condition branches on values (strings, enums) or types (classes).
2. For value dispatch: create a dispatch dictionary mapping values to handler functions.
3. For type dispatch: use `functools.singledispatch` and register handlers for each supported type with `@dispatcher.register`.
4. For class polymorphism: define a common method on each variant class and move the branch-specific logic into the corresponding class method.
5. In the original function, replace the branching cascade with a lookup in the dispatch table or a call to the polymorphic method.
6. Provide a fallback handler or default value for unknown keys or unsupported types.
7. Add Google-style docstrings and type annotations to the handler functions.
8. Run tests, linter, and type checker to confirm all cases pass.

## Preservation pitfalls

- Key missing in dictionary dispatch: Always provide a fallback (via `.get()` or handling `KeyError`) to preserve default branch behavior.
- singledispatch mechanics: functools.singledispatch selects the most specific registered class by method resolution order (MRO), making registration order irrelevant; it dispatches on the first argument only, and class methods require functools.singledispatchmethod.
- Serialization and equality: If converting string discriminators to enums, ensure existing serialization and dictionary key equality remain intact.

## Before/After

### Before

```pycon
>>> def calculate_shipping(method: str, weight: float) -> float:
...     if method == "standard":
...         return round(5.0 + weight * 1.5, 2)
...     elif method == "express":
...         return round(15.0 + weight * 3.0, 2)
...     elif method == "overnight":
...         return round(30.0 + weight * 5.0, 2)
...     raise ValueError(f"Unknown shipping method: {method}")
>>> calculate_shipping("express", 2.5)
22.5

```

### After

```pycon
>>> from typing import Callable
>>> def _calc_standard(weight: float) -> float:
...     return round(5.0 + weight * 1.5, 2)
>>> def _calc_express(weight: float) -> float:
...     return round(15.0 + weight * 3.0, 2)
>>> def _calc_overnight(weight: float) -> float:
...     return round(30.0 + weight * 5.0, 2)
>>> SHIPPING_CALCULATORS: dict[str, Callable[[float], float]] = {
...     "standard": _calc_standard,
...     "express": _calc_express,
...     "overnight": _calc_overnight,
... }
>>> def calculate_shipping(method: str, weight: float) -> float:
...     """Calculate shipping cost via table-driven value dispatch."""
...     calculator = SHIPPING_CALCULATORS.get(method)
...     if calculator is None:
...         raise ValueError(f"Unknown shipping method: {method}")
...     return calculator(weight)
>>> calculate_shipping("express", 2.5)
22.5

```
