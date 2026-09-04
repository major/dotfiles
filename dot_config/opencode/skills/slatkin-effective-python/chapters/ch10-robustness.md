# Chapter 10: Robustness

## Core Idea
Robust Python programs fail predictably, isolate errors cleanly, manage resources deterministically, and enforce clear static contracts. Writing resilient systems requires mastering the full four-block `try/except/else/finally` structure, building reusable context managers with `contextlib`, isolating errors with root exception hierarchies and explicit exception chaining (`raise ... from ...`), and enforcing structural typing contracts with `typing.Protocol`.

## Frameworks Introduced
- **Four-Block Exception Handling Protocol (`try/except/else/finally`)**: The standard lifecycle for error handling and resource cleanup.
  - When to use: Whenever executing error-prone operations that require subsequent actions upon success and mandatory cleanup upon exit.
  - How:
    - `try`: Run the minimal risky operation.
    - `except SpecificError:`: Handle anticipated failure modes.
    - `else`: Run operations that should only execute if the `try` block succeeded (isolates success logic from the `try` block).
    - `finally`: Execute guaranteed cleanup (closing files, releasing locks, resetting state).
- **Module Root Exception Hierarchy**: Designing domain-specific exception trees for packages and libraries.
  - When to use: In all shared libraries, internal packages, and public APIs.
  - How: Define a base exception `class Error(Exception): pass`. Inherit all library-specific exceptions from `Error`. This allows downstream callers to catch `except mymodule.Error:` to guard against all errors from your package while still permitting fine-grained handling of specific subclasses.
- **Explicit Exception Chaining (`raise ... from ...`)**: Preserving causal debugging context during error translation.
  - When to use: When catching a low-level library exception (e.g., `sqlite3.OperationalError`) and translating it into a domain-level exception (e.g., `DatabaseUnavailableError`).
  - How: Raise the new exception explicitly with `raise DomainError("Details") from original_err`, preserving the full original traceback.
- **Structural Typing Protocol (`typing.Protocol`)**: Static duck typing for compile-time interface verification.
  - When to use: When defining interface contracts that third-party or caller classes can satisfy implicitly without inheriting from an abstract base class.
  - How: Inherit from `typing.Protocol` and define the required method and attribute signatures.

## Key Concepts
- **`try...else` Block**: Ensures that subsequent code runs only when no exception was raised in the `try` block, preventing accidental catching of unexpected exceptions raised in subsequent lines.
- **`@contextlib.contextmanager`**: Decorator transforming a generator function with a single `yield` into a fully functional `with`-statement context manager with automated `try/finally` cleanup.
- **`contextlib.ExitStack`**: Dynamic context manager coordinator that programmatically manages a variable number of context managers and cleanup callbacks in a single block.
- **`ZoneInfo` (PEP 615)**: Python 3.9+ standard library IANA time zone support (`zoneinfo.ZoneInfo`).
- **`warnings.warn(..., stacklevel=2)`**: Emitting non-fatal deprecation and migration notices, with `stacklevel=2` attributing the warning to the caller's call site rather than the internal library definition.
- **`if typing.TYPE_CHECKING:`**: Guard block executed only by static type checkers, preventing runtime circular imports caused by type annotations.

## Mental Models
- **Think of `try/else` as keeping the `try` block as small as possible**: Never place code inside `try` that does not need error catching; put downstream code in `else` so unexpected exceptions are not swallowed by overly broad `except` clauses.
- **Think of `Protocol` as compile-time duck typing**: Instead of forcing classes to inherit from a shared base class, `Protocol` lets type checkers verify that an object has the required methods and properties.
- **Think of root exceptions as an insulation layer**: A caller should never have to catch standard library or third-party internal exceptions when using your package; wrap and re-raise them under your root exception hierarchy.

## Anti-patterns
- **Bare `except:` or catching `Exception` indiscriminately**: Swallowing critical signals like `KeyboardInterrupt`, `SystemExit`, or disguising typos (`NameError`, `AttributeError`).
- **Missing `finally` blocks for resource cleanup**: Relying on garbage collection or CPython reference counting to close sockets and file descriptors.
- **Naive time zone conversions with `time.localtime`**: Doing timezone calculations on naive datetime objects instead of using UTC and `zoneinfo.ZoneInfo`.
- **Swallowing original exceptions during re-raising**: Raising a new exception inside `except` without `from err`, losing the root-cause traceback.
- **Resolving circular imports with fragile local imports**: Scattering `import` statements inside functions rather than refactoring shared dependencies or using `TYPE_CHECKING` guards.

## Code Examples

### Full Four-Block Exception Pattern
```python
import json

def update_json_file(file_path: str, key: str, value: int) -> bool:
    try:
        f = open(file_path, "r+", encoding="utf-8")
    except OSError as err:
        print(f"Failed to open file: {err}")
        return False
    else:
        # Executes ONLY if open() succeeded
        try:
            data = json.load(f)
            data[key] = value
            f.seek(0)
            f.truncate()
            json.dump(data, f, indent=2)
            return True
        except (json.JSONDecodeError, KeyError) as err:
            print(f"Failed to update payload: {err}")
            return False
    finally:
        # Guaranteed cleanup
        f.close()
```
- **What it demonstrates**: Using `try`, `except`, `else`, and `finally` to separate acquisition, processing, and cleanup.

### Reusable Context Manager with `@contextmanager`
```python
import contextlib
import logging
from typing import Iterator

@contextlib.contextmanager
def temporary_log_level(logger: logging.Logger, level: int) -> Iterator[None]:
    """Temporarily adjust logging verbosity for a code block."""
    previous_level = logger.getEffectiveLevel()
    logger.setLevel(level)
    try:
        yield
    finally:
        logger.setLevel(previous_level)

# Usage
log = logging.getLogger("app")
with temporary_log_level(log, logging.DEBUG):
    log.debug("Verbose diagnostics enabled only inside this block")
```
- **What it demonstrates**: Encapsulating stateful setup and teardown into clean `with` blocks.

### Static Duck Typing with `typing.Protocol`
```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Renderable(Protocol):
    """Structural interface: Any object with a render() method qualifies."""
    def render(self) -> str: ...

class MarkdownReport:
    def render(self) -> str:
        return "# Report Title\n\nContent here."

class PDFInvoice:
    def render(self) -> str:
        return "[PDF Binary Stream]"

def publish(document: Renderable) -> None:
    # Type checker verifies document has .render() -> str without explicit inheritance
    output = document.render()
    print(f"Published {len(output)} chars")

publish(MarkdownReport())
publish(PDFInvoice())
```
- **What it demonstrates**: Defining compile-time and runtime verifiable interfaces via `typing.Protocol`.

## Reference Tables

### Exception Handling Block Lifecycle
| Block | Execution Trigger | Primary Purpose |
|---|---|---|
| `try` | Always entered | Minimal risky operation (I/O, network, parse) |
| `except SpecificError as e` | Only when matching exception occurs | Handle error, log, fallback, or wrap & re-raise |
| `else` | Only when `try` finishes *without* exception | Downstream operations that depend on `try` success |
| `finally` | Unconditionally before block exit | Guaranteed resource cleanup (close, unlock, reset) |

## Worked Example

### Building an Audited External API Client with Exception Translation
Wrap third-party HTTP errors in a structured module exception hierarchy with chained root causes.

```python
import contextlib
from typing import Any
import urllib.error
import urllib.request

class ApiError(Exception):
    """Base root exception for all API client errors."""

class NetworkTimeoutError(ApiError):
    """Raised when an API request times out."""

class InvalidPayloadError(ApiError):
    """Raised when the API returns an invalid payload."""

class ResilientApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def fetch_endpoint(self, path: str, timeout: float = 5.0) -> bytes:
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            with urllib.request.urlopen(url, timeout=timeout) as response:
                return response.read()
        except urllib.error.URLError as err:
            # Preserve original exception chain
            if "timed out" in str(err).lower():
                raise NetworkTimeoutError(f"Request to {url} timed out") from err
            raise ApiError(f"API request failed: {url}") from err

# Downstream caller can catch the root exception cleanly:
# client = ResilientApiClient("https://api.example.com")
# try:
#     data = client.fetch_endpoint("v1/users")
# except ApiError as err:
#     print(f"API operation failed: {err}")
```

## Key Takeaways
1. Use `try/except/else/finally` to clearly separate risky execution, error recovery, success actions, and guaranteed cleanup.
2. Use `@contextlib.contextmanager` and `contextlib.ExitStack` for clean, reusable resource management.
3. Use `datetime.datetime` with `zoneinfo.ZoneInfo` and convert to UTC for calculations; avoid naive timestamps.
4. Catch explicit, narrow exception types; never use bare `except:` or catch generic `Exception` without re-raising.
5. Define a module-level root exception class to insulate consumers from internal dependencies.
6. Use explicit exception chaining (`raise NewError() from original_err`) to preserve debugging context.
7. Use `warnings.warn` with `stacklevel=2` to communicate deprecations and API migrations.
8. Use `typing.Protocol` for structural typing and compile-time duck typing interfaces.
9. Use `if typing.TYPE_CHECKING:` guards to break circular dependency cycles in type annotations.

## Connects To
- **Ch 5**: Enforces explicit exception raising over ambiguous `None` returns.
- **Ch 7**: Replaces rigid inheritance interfaces with structural `typing.Protocol`.
- **Ch 13**: Directly supports unit testing error paths and mock verification.
