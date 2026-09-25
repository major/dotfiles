# Global Data

Background reference: skill `fowler-refactoring`, ch03 and ch06.

## Symptom

Mutable data lives at module scope or is accessible globally without controlled access boundaries.
Functions anywhere in the system can mutate this shared state, causing unpredictable side effects.

## Python forms

- Module-level mutable containers: Global dictionaries, lists, or sets modified by multiple functions across the application.
- Import-time side effects: Code executed at module import that establishes connections, modifies environment variables, or mutates global state.
- Bare global flags: Variables updated via `global` statements within arbitrary helpers.

## Detect

### Evidence of harm

Do not treat immutable constants (such as `MAX_CONNECTIONS = 10`) as global data.
Confirm Global Data only when concrete harm exists:
- Spooky action at a distance: A function call unexpectedly alters state relied on by an unrelated subsystem.
- Flaky tests: Test order dependence caused by residual state mutations persisting across test runs.
- Concurrency race conditions: Concurrent threads or tasks corrupting shared un-synchronized state.

### Ruff hints

- `PLW0603` (global-statement): Flags use of the `global` statement to update identifiers.
- `PLW0602` (global-variable-not-assigned): Flags unassigned global references, identifying global dependencies.

### Look-alikes

- Mutable Data: Mutable state in general, including instance attributes and local structures.
  Global Data specifically addresses state accessible across the entire module or application.
- Temporary Field: Fields populated conditionally within classes rather than global scope.

### Deliberate exceptions

- Immutable module constants: Uppercase module constants (`DEFAULT_TIMEOUT = 30`) that are read-only and never mutated.
- Logging and telemetry singletons: Established logging instances configured once at application entry.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Module variable directly mutated across functions | [Encapsulate Variable](../refactorings/encapsulate-variable.md) | Keep global variable | Accessor functions or properties restrict mutation points and ease tracing |
| Global state holds application configuration | [Encapsulate Variable](../refactorings/encapsulate-variable.md) | Class variables | Encapsulating in a frozen record passed explicitly eliminates global coupling |
| Import-time side effect modifies environment | [Encapsulate Variable](../refactorings/encapsulate-variable.md) | Lazy module import | Deferring state initialization to explicit functions prevents surprise during imports |
| Constant configuration value never mutated | Keep the current design | Encapsulate Variable | Immutable constants at module level are idiomatic in Python |

## Verify

- Run the test suite with randomized test ordering (e.g. `pytest -p randomly`) to verify no residual state coupling.
- Run project linter and type checker on modified files.
- Verify module import executes with zero side effects.
