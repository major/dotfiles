# Separate Query from Modifier

Background reference: skill `fowler-refactoring`, ch11.

## When

Use Separate Query from Modifier when a single function or method calculates and returns a value while simultaneously altering system state.
Use it when calling an inspection method has unexpected side effects on object state or external systems.
Use it to resolve [Mutable Data](../smells/mutable-data.md).

## Python idiom

Follow the principle of command-query separation (CQS).
Query functions should be pure, deterministic, and side-effect-free: they return values and can be called repeatedly without changing observable state.
Modifier functions perform state transitions, writes, or I/O, and should return `None` (or a newly created immutable state snapshot).
Push side-effecting modifiers to the outer imperative shell while keeping calculations in the pure functional core.

## Mechanics

1. Identify the calculation logic and the state-modifying logic within the target function.
2. Create a new query function that performs only the calculation and returns the result with no side effects.
3. Search all call sites across the codebase where the original function is called and its return value is used.
4. Update call sites to call the new query function to obtain the value, followed by a call to the modifier function where state changes are needed.
5. Remove the return value from the original modifying function so that it returns `None`.
6. Add Google-style docstrings and type annotations to the separated functions.
7. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- Race conditions: If state modification and query were formerly atomic under a threading lock, separating them can introduce concurrency windows if locks are released between calls.
- Call site omission: Forgetting to call the modifier at a call site where the side effect was relied upon will cause subtle state divergence.
- Duplicate computation: Ensure the query does not perform heavy I/O or expensive caching repeatedly if called multiple times.

## Before/After
<!-- interface-change -->

### Before

```pycon
>>> class Account:
...     def __init__(self, balance: float):
...         self.balance = balance
...     def get_and_deduct_fee(self, fee_rate: float) -> float:
...         fee = round(self.balance * fee_rate, 2)
...         self.balance -= fee  # side effect hidden inside query
...         return fee
>>> acc = Account(100.0)
>>> acc.get_and_deduct_fee(0.05)
5.0
>>> acc.balance
95.0

```

### After

```pycon
>>> class Account:
...     """Bank account with explicit query and modifier separation."""
...     def __init__(self, balance: float):
...         self.balance = balance
...     def calculate_fee(self, fee_rate: float) -> float:
...         """Calculate transaction fee without modifying account balance."""
...         return round(self.balance * fee_rate, 2)
...     def deduct_fee(self, fee: float) -> None:
...         """Deduct precalculated fee from balance."""
...         self.balance -= fee
>>> acc = Account(100.0)
>>> fee = acc.calculate_fee(0.05)
>>> fee
5.0
>>> acc.deduct_fee(fee)
>>> acc.balance
95.0

```
