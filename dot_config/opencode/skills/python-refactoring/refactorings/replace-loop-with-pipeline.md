# Replace Loop with Pipeline

Background reference: skill `fowler-refactoring`, ch08.

## When

Use Replace Loop with Pipeline when an imperative `for` or `while` loop transforms, filters, or aggregates a collection.
Use it when a loop mutates an accumulator list, set, or dictionary.
Use it to resolve [Loops](../smells/loops.md).

## Python idiom

Python provides native comprehensions (list, dict, set) and generator expressions that express collection transformations declaratively.
Use built-in aggregation functions: `sum()`, `any()`, `all()`, `min()`, `max()`, and `itertools` when deriving summary values.
Comprehensions are pure: they avoid intermediate mutable variables and clearly convey the intent of the transformation.
Side-effecting operations (such as disk writes or network calls) should remain as explicit imperative loops pushed to the outer shell.

## Mechanics

1. Identify the input iterable, any filtering conditions, and the mapping expression inside the loop.
2. If the loop checks an existence predicate, replace it with `any()` or `all()` applied to a generator expression.
3. If the loop computes a sum or count, replace the accumulator with `sum()` over a generator expression.
4. If the loop constructs a new collection, write a list comprehension `[expr for item in iterable if condition]` or dict comprehension.
5. Replace the loop and its accumulator initialization with the comprehension or pipeline expression.
6. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Eager vs lazy evaluation: Generator expressions are lazy and evaluated on demand; list comprehensions are evaluated eagerly.
- Single-pass consumption: A generator expression can only be iterated once; if callers iterate multiple times, use a list comprehension or tuple.
- Exception timing: In a generator expression, exceptions are deferred until iteration occurs rather than when the generator is created.

## Before/After

### Before

```pycon
>>> def active_user_emails(users: list[dict[str, str | bool]]) -> list[str]:
...     emails = []
...     for u in users:
...         if u.get("is_active"):
...             emails.append(str(u["email"]).lower())
...     return emails
>>> users_data = [
...     {"email": "ALICE@EXAMPLE.COM", "is_active": True},
...     {"email": "bob@example.com", "is_active": False},
... ]
>>> active_user_emails(users_data)
['alice@example.com']

```

### After

```pycon
>>> def active_user_emails(users: list[dict[str, str | bool]]) -> list[str]:
...     """Extract lowercase email addresses of active users via comprehension."""
...     return [
...         str(u["email"]).lower()
...         for u in users
...         if u.get("is_active")
...     ]
>>> users_data = [
...     {"email": "ALICE@EXAMPLE.COM", "is_active": True},
...     {"email": "bob@example.com", "is_active": False},
... ]
>>> active_user_emails(users_data)
['alice@example.com']

```
