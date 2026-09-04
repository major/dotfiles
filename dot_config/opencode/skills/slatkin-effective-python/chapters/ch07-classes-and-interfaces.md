# Chapter 7: Classes and Interfaces

## Core Idea
Object-oriented programming in Python relies on duck typing, clean class composition, and standard library protocols. Writing maintainable object systems requires using functions for lightweight interfaces, leveraging `@dataclass` for data modeling, initializing inheritance hierarchies with `super()`, composing mix-in behaviors, and subclassing `collections.abc` to build standard-compliant custom containers.

## Frameworks Introduced
- **Callable Interface Protocol**: Using first-class functions and callable objects (`__call__`) instead of rigid single-method interface classes.
  - When to use: When designing hooks, callbacks, or strategy patterns.
  - How: Accept a `Callable` type in function signatures. Callers can pass standard functions, lambdas, methods, or classes with `__call__` for stateful hooks.
- **Single-Dispatch Polymorphism Protocol (`functools.singledispatch`)**: Functional polymorphism based on the type of the first argument.
  - When to use: When adding operations (e.g. serializers, exporters) to external or third-party class hierarchies without modifying their source code.
  - How: Decorate a base function with `@functools.singledispatch`, and register type-specific handlers using `@fn.register(TargetType)`.
- **Generic Constructor Protocol (`@classmethod` Factory)**: Constructing polymorphic instances without hardcoding class names.
  - When to use: When writing generic loaders, parsers, or deserializers that must instantiate the correct subclass dynamically.
  - How: Define `@classmethod def from_config(cls, ...)` on the base class and override in subclasses, returning `cls(...)`.
- **Standard Super Initialization Protocol**: Enforcing consistent Method Resolution Order (MRO) traversal.
  - When to use: In all subclass `__init__` methods and cooperative multiple inheritance hierarchies.
  - How: Always invoke `super().__init__(*args, **kwargs)` with cooperative parameter forwarding; never call parent constructors directly by name (`Parent.__init__(self)`).
- **Custom Container ABC Protocol**: Building robust custom sequences, sets, and mappings.
  - When to use: When creating custom collection types that integrate seamlessly with Python's container ecosystem.
  - How: Inherit from `collections.abc.Sequence`, `Mapping`, or `MutableMapping`. Implement the minimal abstract methods (e.g., `__getitem__`, `__len__`), and the ABC provides all standard derived methods (`index`, `count`, `keys`, `items`, `values`, `get`) automatically.

## Key Concepts
- **`dataclass` (PEP 557)**: Decorator generating `__init__`, `__repr__`, `__eq__`, and comparison methods automatically. Supports `frozen=True`, `kw_only=True`, and `slots=True`.
- **`frozen=True` Dataclasses**: Creates immutable, hashable instances that can be used safely as dictionary keys or stored in sets.
- **Mix-in Classes**: Lightweight classes defining only utility methods (no `__init__` or instance attributes) designed to be combined with other classes via multiple inheritance.
- **Name Mangling (`__private`)**: Python transforms `__attribute` into `_ClassName__attribute`. It is not access security; it exists solely to prevent naming collisions in inheritance trees.
- **Protected Convention (`_protected`)**: Single leading underscore indicating to collaborators and linters that an attribute is internal and should not be accessed directly outside the class hierarchy.
- **Method Resolution Order (MRO)**: The deterministic C3 linearization order Python follows when searching for methods and attributes in inheritance graphs.

## Mental Models
- **Think of functions as the simplest interface**: If an interface only requires one method, accept a `Callable` function or closure instead of creating an abstract class with a single method.
- **Use `super()` cooperatively**: Never call parent class initializers directly by name; `super()` ensures each ancestor in a complex multiple-inheritance diamond graph is initialized exactly once.
- **Prefer `_protected` over `__private`**: Python culture trusts developers; use a single underscore to signal internal implementation details rather than fighting name mangling with double underscores.

## Anti-patterns
- **Using `isinstance` cascades for polymorphism**: Writing chains of `if isinstance(x, TypeA): ... elif isinstance(x, TypeB): ...` instead of polymorphic method dispatch or `functools.singledispatch`.
- **Direct parent constructor calls**: Calling `ParentClass.__init__(self, ...)` directly in multi-inheritance hierarchies, causing initialization order bugs and duplicate runs in diamond inheritance.
- **Boilerplate classes for pure data**: Manually writing verbose `__init__`, `__repr__`, and `__eq__` methods instead of using `@dataclass`.
- **Overusing double-underscore private attributes**: Using `__private_attr` to restrict caller access, which frustrates subclass authors and complicates testing/debugging.
- **Ad-hoc container implementations**: Building custom list-like or dict-like classes without inheriting from `collections.abc`, leading to incomplete or non-standard container interfaces.

## Code Examples

### Generic Deserialization via `@classmethod` Polymorphism
```python
from abc import ABC, abstractmethod
from typing import Self

class GenericWorker(ABC):
    def __init__(self, input_data: str):
        self.input_data = input_data

    @abstractmethod
    def run(self) -> str:
        """Execute workload."""

    @classmethod
    @abstractmethod
    def from_config(cls, config: dict) -> Self:
        """Construct worker polymorphically from config dict."""

class LineCounterWorker(GenericWorker):
    def run(self) -> str:
        return f"Lines: {len(self.input_data.splitlines())}"

    @classmethod
    def from_config(cls, config: dict) -> Self:
        return cls(config["raw_text"])

# Generic factory runner
def execute_worker(worker_cls: type[GenericWorker], config: dict) -> str:
    worker = worker_cls.from_config(config)
    return worker.run()

result = execute_worker(LineCounterWorker, {"raw_text": "line1\nline2\nline3"})
```
- **What it demonstrates**: Polymorphic object instantiation via classmethod factories.

### Immutable and Slotted Data Models with `dataclasses`
```python
from dataclasses import dataclass, field

@dataclass(frozen=True, slots=True)
class DatabaseConnectionConfig:
    host: str
    port: int = 5432
    username: str = "postgres"
    database: str = "app_db"
    options: tuple[str, ...] = field(default_factory=tuple)

# Immutable: Attempting to assign config.host = 'new' raises FrozenInstanceError
# Hashable: Can be used as a key in caches or sets
config = DatabaseConnectionConfig(host="localhost", options=("sslmode=require",))
cache = {config: "active_pool"}
```
- **What it demonstrates**: High-performance, immutable configuration objects with `@dataclass(frozen=True, slots=True)`.

### Custom Container with `collections.abc.Sequence`
```python
from collections.abc import Sequence

class BinaryTreeSequence(Sequence):
    """Custom tree container exposing full sequence interface."""
    def __init__(self, root_node):
        self.root = root_node
        self._nodes = list(root_node)  # Flat list from generator

    def __len__(self) -> int:
        return len(self._nodes)

    def __getitem__(self, index):
        return self._nodes[index]

# Inheriting from Sequence automatically grants:
# .index(), .count(), __contains__ (in), __iter__, __reversed__
```
- **What it demonstrates**: Subclassing `collections.abc.Sequence` to gain rich sequence behaviors from just two method implementations.

## Reference Tables

### Modern Dataclass Configuration Matrix
| Parameter | Default | Recommended Use | Benefit |
|---|---|---|---|
| `frozen=True` | `False` | Configuration objects, DTOs, dictionary keys | Enforces immutability and generates `__hash__` |
| `slots=True` | `False` | High-volume instances (millions of objects) | Reduces memory usage by 40-60% and accelerates attribute access |
| `kw_only=True` | `False` | Classes with many optional fields | Forces explicit keyword naming, preventing positional ordering bugs |
| `order=True` | `False` | Domain models requiring sorting / comparisons | Generates `<, <=, >, >=` based on field order |

## Worked Example

### Building a Composable Auditing and JSON Serialization Mix-in
Equip domain models with automatic serialization and modification tracking without invasive inheritance coupling.

```python
import json
import time
from dataclasses import dataclass, asdict

class JsonSerializableMixin:
    """Mix-in providing standard JSON serialization."""
    def to_json(self) -> str:
        if hasattr(self, "__dataclass_fields__"):
            return json.dumps(asdict(self))
        return json.dumps(self.__dict__)

class AuditMixin:
    """Mix-in providing audit timestamps."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.created_at = time.time()

@dataclass
class UserAccount(JsonSerializableMixin, AuditMixin):
    user_id: int
    email: str
    is_active: bool = True

    def __post_init__(self):
        super().__init__()

# Usage
account = UserAccount(user_id=101, email="alice@example.com")
print(account.to_json())
assert hasattr(account, "created_at")
```

## Key Takeaways
1. Use simple functions or callable objects (`__call__`) instead of single-method abstract interfaces.
2. Replace `isinstance` branches with object-oriented polymorphism or `functools.singledispatch`.
3. Use `@dataclass` to eliminate boilerplate in classes that primarily store state.
4. Use `@dataclass(frozen=True)` to create immutable, hashable value objects.
5. Use `@classmethod` polymorphism to construct objects generically across subclass hierarchies.
6. Always initialize parent classes using `super().__init__(...)` to adhere to Python's MRO.
7. Use mix-in classes to compose independent, reusable behaviors without deep inheritance trees.
8. Prefer single-underscore protected attributes (`_attr`) over double-underscore private attributes (`__attr`).
9. Subclass `collections.abc` classes to ensure custom containers adhere to standard Python protocols.

## Connects To
- **Ch 4**: Composes data structures with `dataclasses` instead of nested dictionaries.
- **Ch 8**: Transitions into advanced attribute control (`__getattr__`, `@property`, and descriptors).
- **Ch 14**: Integrates with static type checking (`typing.Protocol`, `ABC`).
