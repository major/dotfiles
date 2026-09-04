# Chapter 5: Functions

## Core Idea
Functions are the primary building blocks of Python programs. Writing robust functions requires understanding argument mutation semantics, enforcing explicit call-site clarity through positional-only (`/`) and keyword-only (`*`) parameters, avoiding mutable default argument traps, and preserving metadata with `functools.wraps`.

## Frameworks Introduced
- **Dynamic Default Argument Protocol**: The standard idiom for parameters whose default values must be computed at runtime or require a fresh mutable container.
  - When to use: Whenever a default value is dynamic (e.g. `datetime.now()`) or mutable (e.g. `list`, `dict`, `set`).
  - How: Set the parameter default to `None` in the signature and initialize the actual value inside the function body using `if arg is None: arg = []`. Document the behavior in the docstring.
- **Explicit Parameter Boundary Protocol (`/` and `*`)**: Designing robust function signatures that balance readability and API stability.
  - When to use: When designing public functions and APIs.
  - How: Place positional-only parameters before `/` (callers cannot use keyword names, allowing future parameter renaming without breaking callers). Place keyword-only parameters after `*` (forces callers to name arguments, eliminating ambiguity for booleans and optional flags).
- **Decorator Introspection Protocol (`functools.wraps`)**: Standard wrapper pattern for function decorators.
  - When to use: Whenever implementing a decorator.
  - How: Apply `@functools.wraps(func)` to the wrapper function to copy `__name__`, `__doc__`, `__module__`, `__annotations__`, and the `__wrapped__` original function reference.
- **Dedicated Result Object Pattern**: Returning structured result containers instead of large tuples.
  - When to use: Whenever a function returns three or more values.
  - How: Return a `@dataclass` or `typing.NamedTuple` with descriptive attribute names instead of a raw tuple.

## Key Concepts
- **Pass-by-Assignment Semantics**: Python passes object references. Mutating a mutable argument (e.g., calling `.append()` on a passed list) alters the caller's original object.
- **Mutable Default Evaluation**: Default argument expressions are evaluated once when the function definition is executed at module load time, not on each invocation.
- **`nonlocal`**: Keyword used in nested functions to assign to variables in outer enclosing scopes without declaring module-level globals.
- **Positional-Only Parameters (`/`)**: Python 3.8+ syntax indicating that preceding arguments must be supplied positionally and cannot be passed by keyword.
- **Keyword-Only Parameters (`*`)**: Arguments defined after a bare `*` or `*args` that must be supplied as keyword arguments at the call site.
- **`functools.partial`**: Function adapter that fixes a subset of arguments and keywords, providing a cleaner alternative to lambdas for callbacks.

## Mental Models
- **Think of default arguments as static class attributes**: Because defaults evaluate at module import, treating them as per-call initializers will cause subtle cross-request state pollution.
- **Use keyword-only arguments for boolean flags**: Calling `fetch(url, True, False)` is unreadable; calling `fetch(url, bypass_cache=True, verify_ssl=False)` self-documents intent.
- **Think of positional-only arguments as parameter name shields**: Use `/` when the parameter name is an implementation detail that you may want to change later without breaking callers.

## Anti-patterns
- **Mutable default arguments**: Writing `def append_item(val, target=[])` which reuses the same list across all calls.
- **Returning `None` to indicate errors**: Returning `None` instead of raising an exception, causing callers to mistakenly treat `0`, `""`, or `False` as an error condition via `if not result:`.
- **Unpacking 4+ tuple return values**: Returning large tuples `a, b, c, d = calculate()` where callers easily swap variable order silently.
- **Writing naked decorators without `@wraps`**: Writing decorators without `functools.wraps`, which strips function names, docstrings, and breaks debuggers and linters.
- **Overusing `nonlocal` in long closures**: Relying on multiple `nonlocal` variables in deep closures instead of encapsulating state within a class.

## Code Examples

### Dynamic Default Arguments with `None`
```python
from datetime import datetime
from typing import Optional
import json

# Anti-pattern: datetime.now() evaluated ONCE at import time
# def log_event(message: str, when: datetime = datetime.now()): ...

# Pythonic: Dynamic default with None sentinel
def log_event(message: str, when: Optional[datetime] = None) -> None:
    """Log a message with a timestamp.
    
    Args:
        message: Content to log.
        when: Timestamp when event occurred. Defaults to current time.
    """
    if when is None:
        when = datetime.now()
    print(f"[{when.isoformat()}] {message}")
```
- **What it demonstrates**: Avoiding shared default state by using `None` sentinel values.

### Enforcing Signatures with `/` and `*`
```python
def safe_division(
    numerator: float,
    denominator: float,
    /,  # Positional-only before this line
    ndigits: int = 2,
    *,  # Keyword-only after this line
    ignore_overflow: bool = False,
    ignore_zero_division: bool = False,
) -> Optional[float]:
    """Perform division with caller-controlled safety flags."""
    try:
        return round(numerator / denominator, ndigits)
    except OverflowError:
        if ignore_overflow:
            return 0.0
        raise
    except ZeroDivisionError:
        if ignore_zero_division:
            return float("inf")
        raise

# Valid call
result = safe_division(10, 3, 4, ignore_zero_division=True)
# Invalid: safe_division(numerator=10, denominator=3) -> TypeError (positional-only)
# Invalid: safe_division(10, 3, 2, True) -> TypeError (keyword-only required)
```
- **What it demonstrates**: Precise API control using both positional-only and keyword-only markers.

### Robust Decorator with `functools.wraps`
```python
import functools
import time
from typing import Callable, Any

def trace(func: Callable) -> Callable:
    """Decorator that logs function execution time and preserves metadata."""
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        duration = time.perf_counter() - start
        print(f"{func.__name__} executed in {duration:.4f}s")
        return result
    return wrapper

@trace
def compute_metrics(samples: list[float]) -> float:
    """Compute standard deviation."""
    return sum(samples) / len(samples)

assert compute_metrics.__name__ == "compute_metrics"
assert compute_metrics.__doc__ == "Compute standard deviation."
```
- **What it demonstrates**: Preserving function name, docstring, and annotations in custom decorators.

## Reference Tables

### Parameter Boundary Syntax Reference
| Syntax Pattern | Meaning | Example Call |
|---|---|---|
| `def f(a, b, /):` | `a` and `b` MUST be positional | `f(1, 2)` (cannot do `f(a=1, b=2)`) |
| `def f(a, *, b):` | `a` positional/keyword, `b` MUST be keyword | `f(1, b=2)` or `f(a=1, b=2)` |
| `def f(a, /, b, *, c):` | `a` pos-only, `b` standard, `c` kw-only | `f(1, b=2, c=3)` |
| `def f(*args, **kwargs):` | Variable positional tuple and keyword dict | `f(1, 2, x=3, y=4)` |

## Worked Example

### Building a Safe Retry Decorator with Configurable Strategy
Implement an API client retry mechanism that preserves caller signatures, prevents mutable state leaks, and enforces clear keyword parameters.

```python
import functools
import time
from typing import Callable, Type, Tuple

def retry(
    max_attempts: int = 3,
    delay: float = 0.5,
    *,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
) -> Callable:
    """Decorator enforcing retry logic on transient errors."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            current_delay = delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as err:
                    if attempt == max_attempts:
                        raise
                    print(f"[Retry {attempt}/{max_attempts}] {func.__name__} failed: {err}. Retrying in {current_delay}s...")
                    time.sleep(current_delay)
                    current_delay *= backoff_factor
        return wrapper
    return decorator

# Usage
@retry(max_attempts=3, delay=0.1, backoff_factor=1.5, exceptions=(ConnectionError,))
def fetch_user_data(user_id: int) -> dict:
    """Fetch user profile from remote service."""
    # Simulated network call
    return {"id": user_id, "status": "active"}
```

## Key Takeaways
1. Be mindful of object reference semantics; mutating input arguments affects the caller's state.
2. Return dedicated `@dataclass` or named tuple objects when returning more than two or three values.
3. Raise explicit, specific exceptions rather than returning `None` to indicate failure modes.
4. Always use `None` as the default for dynamic or mutable parameters, initializing them inside the function body.
5. Use keyword-only arguments (`*`) to force explicit naming of boolean flags and optional configurations.
6. Use positional-only arguments (`/`) to decouple parameter names from public API contracts when appropriate.
7. Always decorate wrapper functions with `@functools.wraps` to preserve signature, name, and docstring metadata.
8. Prefer `functools.partial` over fragile lambda closures when creating callback adapters.

## Connects To
- **Ch 1**: Deepens helper function decomposition into robust API designs.
- **Ch 7**: Interfaces with methods, classmethods, and functional dispatch (`singledispatch`).
- **Ch 10**: Establishes exception handling patterns over `None` return values.
