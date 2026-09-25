# Inline Function

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Inline Function when a function body is just as clear and descriptive as its name.
Use it when an unnecessary layer of indirection obscures code flow without providing abstraction or reuse.
Use it to resolve [Lazy Element](../smells/lazy-element.md) and [Speculative Generality](../smells/speculative-generality.md).

## Python idiom

Python values readability and clarity over excessive fragmentation into single-line helpers.
When a helper simply delegates directly to a built-in or another function, inlining removes cognitive overhead.
Check dynamic references (`mock.patch` target strings, `__all__`, `getattr`) before deleting the inlined function definition.
Update all call sites across the repository in a single atomic step without backward compatibility shims.

## Mechanics

1. Check that the function is not polymorphic or intended to be overridden in a subclass.
2. Find all callers of the function across the repository.
3. Replace each call site with the body expression of the function, substituting argument expressions for parameter names.
4. If the function contains multiple statements or returns, simplify into caller context or retain as needed.
5. Once all call sites are replaced, delete the original function definition.
6. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Argument evaluation order: Inlining an expression containing arguments with side effects can change evaluation order.
- Variable name collisions: Ensure local variable names in the inlined expression do not shadow caller variables.
- String-based mock patches: If tests patch the function via `unittest.mock.patch`, tests will fail unless the test mock is updated.

## Before/After

### Before

```pycon
>>> def is_eligible_for_discount(customer: dict[str, int]) -> bool:
...     return customer["loyalty_points"] > 100
>>> def apply_discount_rate(customer: dict[str, int]) -> float:
...     return 0.15 if is_eligible_for_discount(customer) else 0.05
>>> cust = {"loyalty_points": 150}
>>> apply_discount_rate(cust)
0.15

```

### After

```pycon
>>> def apply_discount_rate(customer: dict[str, int]) -> float:
...     """Calculate customer discount rate directly without trivial helper."""
...     return 0.15 if customer["loyalty_points"] > 100 else 0.05
>>> cust = {"loyalty_points": 150}
>>> apply_discount_rate(cust)
0.15

```

## Inverse

The inverse of this refactoring is [Extract Function](extract-function.md).
Use Extract Function when an expression or statement block benefits from an intention-revealing name.
