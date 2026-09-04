# Chapter 8: Metaclasses and Attributes

## Core Idea
Python's metaprogramming features provide fine-grained control over attribute access and class construction. By starting with plain attributes, migrating to `@property` when behavior is required, reusing attribute logic with descriptors (`__set_name__`), and using `__init_subclass__` or class decorators instead of heavyweight metaclasses, you can achieve clean abstraction without cognitive bloat.

## Frameworks Introduced
- **Progressive Attribute Refactoring Protocol**: The pattern of evolving attribute access from simple fields to dynamic properties and descriptors.
  - When to use: When designing domain objects that may eventually require validation, type casting, or lazy computation.
  - How: Start with public attributes (`self.voltage = 120`). If validation or calculation is needed, wrap the field in `@property` and `@setter` without modifying caller syntax. If the same validation logic is needed across multiple fields, extract it into a descriptor.
- **Descriptor Protocol (`__set_name__`, `__get__`, `__set__`)**: Creating reusable property behaviors across classes.
  - When to use: For field validation (e.g. non-negative integers), ORM column definitions, and unit conversions.
  - How: Define a class implementing `__set_name__(self, owner, name)` to automatically bind the attribute name, and manage instance data using `instance.__dict__[self.name]` to avoid memory leaks.
- **Subclass Registration Protocol (`__init_subclass__`)**: Automatic validation and registration of subclasses upon import.
  - When to use: For building plugin registries, serialization frameworks, and ensuring child classes implement required class-level constants.
  - How: Define `def __init_subclass__(cls, **kwargs):` on the parent class, validate attributes on `cls`, and register `cls` in a central dictionary.
- **Lazy Attribute Proxy Protocol (`__getattr__` vs `__getattribute__`)**: Intercepting dynamic attribute access.
  - When to use: For lazy database loading, RPC proxies, and dynamic wrappers.
  - How: Use `__getattr__` for lazy loading (it only triggers when an attribute is *missing* from `__dict__`). Use `__getattribute__` only when *every* access must be intercepted, always delegating to `super().__getattribute__` to avoid infinite recursion.

## Key Concepts
- **`@property`**: Built-in decorator allowing methods to be accessed with attribute syntax (`obj.voltage`), supporting getter, setter (`@voltage.setter`), and deleter.
- **Descriptor**: An object attribute with "binding behavior", defined by classes that implement `__get__()`, `__set__()`, or `__delete__()`.
- **`__set_name__`**: Hook called automatically when a descriptor is assigned to a class attribute, providing the attribute name as a string.
- **`__init_subclass__`**: Classmethod hook introduced in Python 3.6 that runs whenever a class inherits from the defining class, replacing most legacy uses of metaclasses.
- **`__getattr__`**: Fallback hook called only when an attribute cannot be found in the instance `__dict__` or class hierarchy.
- **`__getattribute__`**: Hook called unconditionally on every attribute lookup; accessing `self.attr` inside it causes infinite recursion.
- **Metaclass (`class Meta(type):`)**: The class of a class; used to construct class objects dynamically. Modern Python avoids metaclasses in favor of `__init_subclass__` and class decorators.

## Mental Models
- **Think of `@property` as a non-breaking behavioral upgrade**: Never write Java-style `get_value()` and `set_value()` methods preemptively; write plain attributes and upgrade to `@property` only when needed.
- **Think of descriptors as reusable `@property` instances**: If you find yourself writing identical `@property` validation logic for three different fields, extract a descriptor class.
- **Prefer `__init_subclass__` over metaclasses**: Treat `__init_subclass__` as the modern, readable replacement for class verification and plugin registration.

## Anti-patterns
- **Preemptive getters and setters**: Creating boilerplate `get_x()` and `set_x()` methods in fresh classes before any behavior is required.
- **Heavy calculations in `@property` getters**: Running slow database queries or network requests inside a property getter, violating caller expectations of fast attribute access.
- **Memory leaks in descriptors**: Storing per-instance descriptor state in a dictionary inside the descriptor itself using `self._values[instance] = val` (keeps `instance` alive preventing garbage collection). Instead, write to `instance.__dict__[self.name]`.
- **Infinite recursion in `__getattribute__`**: Accessing `self.other_attr` inside `__getattribute__` or `__setattr__` instead of calling `super().__getattribute__` or `super().__setattr__`.
- **Using metaclasses where class decorators or `__init_subclass__` suffice**: Introducing metaclass complexity for simple subclass checks or method decoration.

## Code Examples

### Reusable Field Validation with Descriptors
```python
class BoundedGrade:
    """Descriptor validating numerical grades between 0 and 100."""
    def __set_name__(self, owner, name):
        self.internal_name = "_" + name

    def __get__(self, instance, instance_type):
        if instance is None:
            return self
        return getattr(instance, self.internal_name, 0)

    def __set__(self, instance, value):
        if not isinstance(value, (int, float)):
            raise TypeError("Grade must be a number")
        if not (0 <= value <= 100):
            raise ValueError("Grade must be between 0 and 100")
        setattr(instance, self.internal_name, value)

class ExamRecord:
    math_grade = BoundedGrade()
    science_grade = BoundedGrade()
    history_grade = BoundedGrade()

exam = ExamRecord()
exam.math_grade = 95
# exam.math_grade = 105 -> ValueError: Grade must be between 0 and 100
```
- **What it demonstrates**: Descriptor encapsulation with automated attribute naming via `__set_name__`.

### Subclass Registration with `__init_subclass__`
```python
class PluginBase:
    registry: dict[str, type["PluginBase"]] = {}

    def __init_subclass__(cls, plugin_name: str, **kwargs):
        super().__init_subclass__(**kwargs)
        if not plugin_name:
            raise ValueError("Plugins must specify a non-empty plugin_name")
        if plugin_name in cls.registry:
            raise KeyError(f"Plugin {plugin_name!r} already registered")
        cls.registry[plugin_name] = cls

# Subclasses register automatically at definition/import time
class JSONPlugin(PluginBase, plugin_name="json"):
    pass

class XMLPlugin(PluginBase, plugin_name="xml"):
    pass

assert "json" in PluginBase.registry
assert PluginBase.registry["json"] is JSONPlugin
```
- **What it demonstrates**: Automatic class validation and registration using `__init_subclass__`.

### Lazy Attribute Proxy with `__getattr__`
```python
class LazyRecord:
    def __init__(self, record_id: int):
        self.record_id = record_id
        # Payload is not loaded yet

    def __getattr__(self, name: str):
        """Called ONLY when name is not found on self."""
        if name == "payload":
            print(f"Fetching payload for record {self.record_id} from database...")
            data = {"status": "success", "data": [1, 2, 3]}
            self.payload = data  # Cached in __dict__, __getattr__ won't run again
            return self.payload
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

record = LazyRecord(42)
print("Before access:", record.__dict__)
print("Payload:", record.payload)  # Triggers DB fetch and caches in __dict__
print("After access:", record.__dict__)
```
- **What it demonstrates**: Lazy evaluation and automatic caching using `__getattr__`.

## Reference Tables

### Attribute Interception Hook Comparison
| Hook Method | When It Triggers | Use Case | Critical Rule |
|---|---|---|---|
| `@property` | Explicitly named attribute access | Validation, computed fields, backward compatibility | Keep fast and side-effect free |
| `__getattr__` | Only when attribute is *missing* from `__dict__` | Lazy data loading, proxy objects | Cache retrieved values in `self.__dict__` |
| `__getattribute__` | *Every* single attribute lookup | Security auditing, universal tracing | Always access state via `super().__getattribute__` |
| `__setattr__` | *Every* single attribute assignment | Universal validation, change tracking | Always mutate state via `super().__setattr__` |

## Worked Example

### Building an ORM-Style Entity Validator
Construct an extensible database model framework that validates field types and enforces constraints without third-party dependencies.

```python
from typing import Any

class Field:
    def __init__(self, expected_type: type):
        self.expected_type = expected_type

    def __set_name__(self, owner, name):
        self.name = name
        self.storage_name = f"_{name}"

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return getattr(instance, self.storage_name, None)

    def __set__(self, instance, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(f"{self.name} must be of type {self.expected_type.__name__}")
        setattr(instance, self.storage_name, value)

class Model:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls._fields = [k for k, v in cls.__dict__.items() if isinstance(v, Field)]

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            if k not in self._fields:
                raise AttributeError(f"Unknown field: {k}")
            setattr(self, k, v)

class Customer(Model):
    name = Field(str)
    age = Field(int)

# Usage
customer = Customer(name="Alice", age=30)
assert customer.name == "Alice"
# Customer(name="Bob", age="thirty") -> TypeError: age must be of type int
```

## Key Takeaways
1. Start with plain public attributes; introduce `@property` only when behavior or validation is required.
2. Keep `@property` implementations fast and side-effect free; use explicit methods for expensive operations.
3. Use descriptors implementing `__set_name__` to eliminate duplicated property validation logic.
4. Always store descriptor instance state in `instance.__dict__` to avoid memory leaks.
5. Use `__getattr__` for lazy attribute loading, caching results on the instance upon first access.
6. Avoid `__getattribute__` and `__setattr__` unless building universal proxies or security firewalls; always call `super()`.
7. Use `__init_subclass__` for subclass validation and plugin registration instead of metaclasses.
8. Prefer class decorators over metaclasses for composable, non-invasive class enhancements.

## Connects To
- **Ch 7**: Builds upon class hierarchy design, mix-ins, and attribute visibility.
- **Ch 10**: Underpins robust schema validation, defensive programming, and runtime contracts.
