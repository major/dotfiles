# Inline Class

Background reference: skill `fowler-refactoring`, ch07.

## When

Use Inline Class when a class is no longer pulling its weight or doing meaningful work on its own.
Use it when an abstraction has shrunk down to a passthrough or single-method wrapper that causes more friction than benefit.
Use it to resolve [Lazy Element](../smells/lazy-element.md).

## Python idiom

Classes in Python carry cognitive and syntactic overhead.
When a class has only a single trivial method or delegates all its work, inline its behavior into the calling context or convert it to a module-level function.
Do not preserve dummy wrapper classes for backward compatibility; update all repository call sites in one step.
If instances are created in multiple places, consolidate instantiation to direct calls on the receiving entity.

## Mechanics

1. Identify the source class to be inlined and the target class or module that will absorb its responsibilities.
2. In the target class or module, create fields or functions corresponding to the source class's public members.
3. Update all methods in the source class to redirect to the target, or copy implementation bodies directly.
4. Replace all references and instantiations of the source class across the codebase with references to the target.
5. Once all call sites have migrated, delete the source class.
6. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- `isinstance` checks: Code checking `isinstance(obj, SourceClass)` will fail if the class is deleted; verify no external type checks rely on the inlined class.
- Dynamic imports: Check `__all__`, `__init__.py`, and string imports for references to the deleted class.
- Attribute collisions: Ensure attributes absorbed into the target class do not collide with existing target attributes.

## Before/After

### Before

```pycon
>>> class TrackingInformation:
...     def __init__(self, carrier: str, tracking_code: str):
...         self.carrier = carrier
...         self.tracking_code = tracking_code
...     def display(self) -> str:
...         return f"{self.carrier}: {self.tracking_code}"
>>> class Shipment:
...     def __init__(self, tracking_info: TrackingInformation):
...         self.tracking_info = tracking_info
...     def tracking_summary(self) -> str:
...         return self.tracking_info.display()
>>> track = TrackingInformation("FedEx", "12345")
>>> shipment = Shipment(track)
>>> shipment.tracking_summary()
'FedEx: 12345'

```

### After

```pycon
>>> class Shipment:
...     """Shipment entity directly holding carrier tracking details."""
...     def __init__(self, carrier: str, tracking_code: str):
...         self.carrier = carrier
...         self.tracking_code = tracking_code
...     def tracking_summary(self) -> str:
...         """Return formatted tracking summary."""
...         return f"{self.carrier}: {self.tracking_code}"
>>> shipment = Shipment("FedEx", "12345")
>>> shipment.tracking_summary()
'FedEx: 12345'

```

## Inverse

The inverse of this refactoring is [Extract Class](extract-class.md).
Use Extract Class when a class grows too large or contains distinct cohesive subsets of attributes and responsibilities.
