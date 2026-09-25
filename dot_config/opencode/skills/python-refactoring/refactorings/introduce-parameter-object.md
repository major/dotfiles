# Introduce Parameter Object

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Introduce Parameter Object when a group of parameters naturally travels together across multiple functions (Data Clumps).
Use it when a long list of parameters makes function signatures hard to understand and maintain (Long Parameter List).
Use it when grouping parameters reveals a missing domain abstraction that can host related validation or query methods.

## Python idiom

Represent new parameter objects as immutable frozen dataclasses using `@dataclass(frozen=True)`.
Immutability prevents unexpected side effects across call chains and makes reasoning about data flow straightforward.
When instances need updated attributes, use `dataclasses.replace` to produce new instances rather than mutating fields.
Do not enable `slots` or `kw_only` based on Python version alone; enable them only when the design contract explicitly calls for memory optimization or strict keyword invocation.
Use `NamedTuple` only when positional unpacking or tuple interoperability is an explicit requirement.
Use Pydantic models only if the project already includes Pydantic in its dependencies.

## Mechanics

1. Define a new frozen dataclass containing fields for the clumped parameters.
2. Add type hints and a Google-style docstring to the new dataclass definition.
3. Update the function signature to replace the individual parameters with the new parameter object.
4. Update the function body to access attributes on the parameter object.
5. Identify any queries or validations performed on those attributes and consider moving them into methods on the dataclass.
6. Update all caller call sites in the repository in a single atomic step without backward compatibility shims.
7. Run tests, linter, and type checker to verify behavior preservation.

## Preservation pitfalls

- Keyword arguments: Callers that invoke the function using keyword arguments for the old parameters will raise `TypeError` until updated.
- Shallow immutability: Marking a dataclass as frozen prevents reassigning attribute references, but nested mutable structures like lists or dicts can still be mutated.
- Default arguments: If the original parameters had default values, ensure the dataclass fields specify appropriate defaults.
- Equality and hashing: Frozen dataclasses implement structural `__eq__` and `__hash__` by default, which may affect dictionary keys or set membership.
- Unpacking: Callers expecting to unpack arguments positionally cannot unpack a standard dataclass without explicit conversion.

## Before/After

### Before

```pycon
>>> def filter_readings(readings: list[dict], start_time: int, end_time: int) -> list[dict]:
...     return [r for r in readings if start_time <= r["timestamp"] <= end_time]
>>> sample = [{"timestamp": 10, "val": 1.0}, {"timestamp": 20, "val": 2.0}, {"timestamp": 30, "val": 3.0}]
>>> [r["timestamp"] for r in filter_readings(sample, 15, 25)]
[20]

```

### After

```pycon
>>> from dataclasses import dataclass
>>> @dataclass(frozen=True)
... class TimeRange:
...     """Represent an inclusive time interval.
...
...     Attributes:
...         start: The start timestamp.
...         end: The end timestamp.
...     """
...     start: int
...     end: int
...     def includes(self, timestamp: int) -> bool:
...         """Check if a timestamp falls within this interval."""
...         return self.start <= timestamp <= self.end
>>> def filter_readings(readings: list[dict], time_range: TimeRange) -> list[dict]:
...     return [r for r in readings if time_range.includes(r["timestamp"])]
>>> sample = [{"timestamp": 10, "val": 1.0}, {"timestamp": 20, "val": 2.0}, {"timestamp": 30, "val": 3.0}]
>>> [r["timestamp"] for r in filter_readings(sample, TimeRange(15, 25))]
[20]

```
