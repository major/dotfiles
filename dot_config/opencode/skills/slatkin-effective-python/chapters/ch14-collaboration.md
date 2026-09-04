# Chapter 14: Collaboration

## Core Idea
Writing Python in team environments requires establishing clear boundaries, reproducible environments, stable public APIs, and comprehensive documentation. Collaborating effectively means using virtual environments (`venv`), documenting modules with PEP 257 docstrings, defining explicit public APIs with `__all__` in `__init__.py`, breaking circular dependencies systematically, signaling deprecations with `warnings`, and enforcing correctness with static type checkers (`mypy` / `pyright`).

## Frameworks Introduced
- **Explicit API Boundary Protocol (`__all__`)**: Defining and maintaining stable public interfaces for Python packages.
  - When to use: In all package `__init__.py` files and public module interfaces.
  - How: Explicitly declare `__all__ = ["PublicClass", "public_function"]` in `__init__.py` and re-export public symbols. This restricts wildcard imports (`from pkg import *`), signals public contract to static analyzers, and hides internal implementation details.
- **Circular Dependency Resolution Protocol**: Systematically breaking circular module import cycles.
  - When to use: When two or more modules import each other, triggering `ImportError: cannot import name ... from partially initialized module`.
  - How:
    1. **Primary**: Refactor shared types and constants into a third, lower-level leaf module that both modules import.
    2. **Secondary**: Use `if typing.TYPE_CHECKING:` to import types exclusively during static analysis.
    3. **Tertiary**: Defer imports to function scope (dynamic import) if architectural refactoring is temporarily impractical.
- **Deprecation Warning Protocol (`warnings.warn`)**: Migrating APIs gracefully across releases without breaking downstream consumers.
  - When to use: When renaming functions, modifying parameter signatures, or sunsetting features.
  - How: Emit `warnings.warn("Use new_api() instead", category=DeprecationWarning, stacklevel=2)`. Setting `stacklevel=2` attributes the warning to the line in caller code that invoked the deprecated API.
- **PEP 257 Documentation Protocol**: Standardizing docstrings for maintainability.
  - When to use: On all public modules, classes, and functions.
  - How: Write a single-line summary ending with a period, followed by a blank line, an elaboration paragraph, parameter descriptions (`Args:`), return value description (`Returns:`), and exceptions raised (`Raises:`).

## Key Concepts
- **Virtual Environments (`venv`)**: Isolated Python environments preventing dependency conflicts between projects and isolating projects from the system Python installation.
- **`__all__`**: Special module-level list of strings defining the explicit exported symbols when imported via `from module import *` or analyzed by documentation generators.
- **PEP 257**: The official Python docstring convention standard.
- **`typing` Static Analysis**: Running static type checkers (`mypy`, `pyright`, `Ruff`) in CI/CD pipelines to catch type mismatches, missing attributes, and unhandled `None` states before runtime.
- **Standalone Application Packaging**: Using established bundling tools (PyInstaller, PEX, Shiv, Briefcase) to distribute standalone Python executables instead of fragile manual `zipapp` scripts.

## Mental Models
- **Think of `__init__.py` as a package storefront**: Internal modules are the warehouse; `__init__.py` curates what items are placed in the front window for customers to consume via `__all__`.
- **Think of circular imports as architectural smells**: A circular import almost always indicates that two modules are co-dependent and should either be merged into one module or have their shared core extracted into a common base.
- **`stacklevel=2` points at the caller, not the messenger**: Without `stacklevel=2`, a deprecation warning points to the `warnings.warn()` line inside your library, which is useless to the developer who needs to know where in *their* code the deprecated function was called.

## Anti-patterns
- **Installing packages globally into system Python**: Polluting the host operating system Python environment without using virtual environments.
- **Wildcard imports (`from module import *`)**: Polluting module namespaces, obscuring symbol origins, and breaking linters and static analyzers.
- **Missing or vague docstrings**: Leaving complex functions undocumented or writing tautological docstrings (`def process_order(): """Processes the order."""`).
- **Circular imports resolved by scattering local imports everywhere**: Masking architectural design flaws with haphazard local `import` statements buried inside methods.
- **Hard-breaking API changes without deprecation periods**: Modifying or removing public functions without warning cycles using `DeprecationWarning`.

## Code Examples

### Defining a Package API Surface in `__init__.py`
```python
# mypackage/__init__.py
"""High-performance telemetry processing package."""

from mypackage.models import TelemetryRecord, MetricBatch
from mypackage.client import TelemetryClient
from mypackage.exceptions import TelemetryError, ConnectionTimeoutError

# Explicit public API export
__all__ = [
    "TelemetryRecord",
    "MetricBatch",
    "TelemetryClient",
    "TelemetryError",
    "ConnectionTimeoutError",
]
```
- **What it demonstrates**: Creating clean, curated package boundaries with explicit `__all__` exports.

### Graceful API Deprecation with `warnings.warn`
```python
import warnings

def calculate_volume(length: float, width: float, height: float) -> float:
    """Calculate 3D box volume."""
    return length * width * height

def get_volume(l: float, w: float, h: float) -> float:
    """Legacy API name retained for backward compatibility."""
    warnings.warn(
        "get_volume() is deprecated and will be removed in v2.0; use calculate_volume() instead",
        category=DeprecationWarning,
        stacklevel=2,  # Points to caller's line number
    )
    return calculate_volume(l, w, h)
```
- **What it demonstrates**: Notifying downstream consumers of API migrations with correct caller-oriented stack attribution.

### Breaking Circular Dependencies with Leaf Module Extraction
```python
# Anti-pattern: module_a.py imports module_b.py, and module_b.py imports module_a.py

# Pythonic Solution: Extract shared types into common leaf module (e.g. types.py)

# mypackage/types.py
from dataclasses import dataclass

@dataclass
class UserSession:
    user_id: int
    session_token: str

# mypackage/auth.py
from mypackage.types import UserSession

def authenticate_user(token: str) -> UserSession:
    return UserSession(user_id=1, session_token=token)

# mypackage/profile.py
from mypackage.types import UserSession

def load_profile(session: UserSession) -> dict:
    return {"user_id": session.user_id, "name": "Alice"}
```
- **What it demonstrates**: Eliminating circular dependencies by factoring shared domain models into independent leaf modules.

## Reference Tables

### Collaboration and Packaging Tooling
| Concern | Recommended Standard / Tool | Alternative / Legacy |
|---|---|---|
| Virtual Environment | `python -m venv .venv` / `uv venv` | Global system Python |
| Project Configuration | `pyproject.toml` (PEP 621) | `setup.py`, `setup.cfg` |
| Static Type Checking | `mypy`, `pyright` | Untyped runtime-only checks |
| Docstring Standard | PEP 257 (Google / NumPy style) | Undocumented / Ad-hoc |
| Linter & Formatter | `Ruff`, `Black` | Unformatted manual style |
| Executable Bundling | PyInstaller, PEX, Shiv | `zipapp`, `zipimport` |

## Worked Example

### Structuring a Multi-Module Python Package
Design a clean, production-ready package architecture with explicit API exports, custom exceptions, and type checking guards.

```text
telemetry_engine/
├── pyproject.toml
├── src/
│   └── telemetry_engine/
│       ├── __init__.py       # Exposes public symbols in __all__
│       ├── py.typed          # Signals PEP 561 typing support to mypy
│       ├── _internal/        # Private implementation details
│       │   ├── parser.py
│       │   └── socket_pool.py
│       ├── client.py         # Public client class
│       ├── exceptions.py     # Root exception hierarchy
│       └── models.py         # Dataclasses and domain models
└── tests/
    └── test_client.py
```

```python
# src/telemetry_engine/exceptions.py
class TelemetryError(Exception):
    """Base error for all telemetry_engine issues."""

class IngestionError(TelemetryError):
    """Raised when record serialization or transmission fails."""

# src/telemetry_engine/models.py
from dataclasses import dataclass
import time

@dataclass(frozen=True, slots=True)
class DataPoint:
    metric: str
    value: float
    timestamp: float = time.time()
```

## Key Takeaways
1. Always isolate project dependencies using virtual environments (`venv` or `uv`).
2. Write comprehensive PEP 257 docstrings for every public module, class, function, and method.
3. Use `__init__.py` with an explicit `__all__` list to expose a clean, stable public API surface.
4. Break circular dependencies by extracting common types into lower-level leaf modules.
5. Use `if typing.TYPE_CHECKING:` to import type annotations without incurring runtime circular import overhead.
6. Use `warnings.warn` with `DeprecationWarning` and `stacklevel=2` to communicate API deprecations gracefully.
7. Run static analysis tools (`mypy`, `pyright`, `Ruff`) in CI pipelines to eliminate bugs before execution.
8. Distribute standalone command-line applications using established packaging tools like PyInstaller or PEX.

## Connects To
- **Ch 1**: Enforces PEP 8 style guides across team development.
- **Ch 10**: Underpins package-level exception design, typing protocols, and circular import resolution.
- **Ch 13**: Pairs package structure with automated unit and integration testing suites.
