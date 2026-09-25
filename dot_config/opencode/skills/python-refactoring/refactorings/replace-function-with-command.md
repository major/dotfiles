# Replace Function with Command

Background reference: skill `fowler-refactoring`, ch11.

## When

Use Replace Function with Command when a complex function has tangled local variables and parameters that make extraction difficult.
Use it when a routine requires multi-stage execution, lifecycle hooks, or parameter retention across multiple invocations.
Use it to resolve [Long Function](../smells/long-function.md).

## Python idiom

Before creating a full command class with `__init__` and `__call__`, first consider using closures or `functools.partial`.
In Python, closures provide a lightweight way to capture configuration and state without the syntactic overhead of a class.
Introduce a command class only when the calculation needs inspectable attributes, intermediate state queries, or undo capabilities.
When a class is needed, keep it focused: initialize arguments in `__init__` and execute the logic in an `execute` method or `__call__`.

## Mechanics

1. Evaluate whether a closure or `functools.partial` captures the necessary state before introducing a class.
2. If a class is justified, create a new class named after the operation (e.g. `ScoreCalculator`).
3. Define `__init__` to accept and store the initial parameters and shared state.
4. Move the function body into an `execute` method or `__call__` on the class.
5. Convert tangled local variables into instance attributes or private helper method calls on the class.
6. Replace the original function call site with instantiation and invocation of the command or closure.
7. Add Google-style docstrings and type annotations to the new structure.
8. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Unintended state retention: If a command instance is reused across invocations, residual attribute values can pollute subsequent runs.
- Concurrency and thread safety: Command instances with mutable instance attributes cannot be safely shared across concurrent threads.
- Over-engineering: Wrapping a simple 10-line calculation in a command class adds indirection without benefit; prefer closures.

## Before/After

### Before

```pycon
>>> def score_candidate(years_exp: int, certifications: list[str], passed_interview: bool) -> int:
...     base = years_exp * 10
...     cert_bonus = len(certifications) * 15
...     multiplier = 1.2 if passed_interview else 0.8
...     return int((base + cert_bonus) * multiplier)
>>> score_candidate(3, ["AWS", "CKA"], True)
72

```

### After

```pycon
>>> from collections.abc import Callable
>>> def make_candidate_scorer(passed_interview: bool) -> Callable[[int, list[str]], int]:
...     """Create a scoring closure binding interview outcome.
...
...     Args:
...         passed_interview: Whether the candidate passed the interview.
...
...     Returns:
...         A callable accepting experience and certifications to produce a score.
...     """
...     multiplier = 1.2 if passed_interview else 0.8
...     def score(years_exp: int, certifications: list[str]) -> int:
...         base = years_exp * 10
...         cert_bonus = len(certifications) * 15
...         return int((base + cert_bonus) * multiplier)
...     return score
>>> scorer = make_candidate_scorer(passed_interview=True)
>>> scorer(3, ["AWS", "CKA"])
72

```
