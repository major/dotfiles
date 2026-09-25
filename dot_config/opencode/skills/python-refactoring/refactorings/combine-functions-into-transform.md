# Combine Functions into Transform

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Combine Functions into Transform when multiple independent functions derive calculations or enrichments from the same data structure.
Use it when callers repeatedly invoke several derivation helpers in sequence to assemble a complete view of a record.
Use it to resolve [Shotgun Surgery](../smells/shotgun-surgery.md).

## Python idiom

Prefer Combine Functions into Transform over Combine Functions into Class when shared mutable state is not required.
Transforms are pure functions: they accept an input record, compute derived values using list and dictionary comprehensions, and return an enriched `@dataclass(frozen=True)`.
Comprehensions and generator expressions keep data processing declarative, avoiding imperative loops and mutable accumulator lists.
Pure transform pipelines preserve referential transparency, making caching and unit testing straightforward.

## Mechanics

1. Define a target `@dataclass(frozen=True)` that includes both the original fields and the newly derived fields.
2. Create a pure transform function that accepts the source record.
3. Move each calculation helper into the transform pipeline, calculating derived fields using comprehensions or expressions.
4. Construct and return the enriched record from the transform function.
5. Update callers that previously called individual derivation functions to call the transform once and read attributes from the enriched record.
6. Add Google-style docstrings and type annotations to the transform and record.
7. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Shallow immutability: If the input record contains nested mutable objects (e.g. lists), frozen dataclasses do not prevent callers from mutating the contents of those lists.
- Eager vs lazy evaluation: If the transform calculates expensive fields eagerly, callers that only need a subset may suffer performance overhead; use `@cached_property` or deferred functions if profiling justifies it.
- Intermediate record divergence: Ensure the enriched record stays in sync if the source record schema changes.

## Before/After

### Before

```pycon
>>> def base_charge(reading: dict[str, float]) -> float:
...     return reading["usage"] * reading["rate"]
>>> def taxable_charge(reading: dict[str, float]) -> float:
...     return max(0.0, base_charge(reading) - reading["tax_threshold"])
>>> r = {"usage": 100.0, "rate": 0.5, "tax_threshold": 20.0}
>>> base_charge(r)
50.0
>>> taxable_charge(r)
30.0

```

### After

```pycon
>>> from dataclasses import dataclass
>>> @dataclass(frozen=True)
... class ReadingReport:
...     """Enriched meter reading report containing base and taxable charges."""
...     usage: float
...     rate: float
...     tax_threshold: float
...     base_charge: float
...     taxable_charge: float
>>> def enrich_reading(reading: dict[str, float]) -> ReadingReport:
...     """Transform raw reading dictionary into enriched immutable report."""
...     base = reading["usage"] * reading["rate"]
...     taxable = max(0.0, base - reading["tax_threshold"])
...     return ReadingReport(
...         usage=reading["usage"],
...         rate=reading["rate"],
...         tax_threshold=reading["tax_threshold"],
...         base_charge=base,
...         taxable_charge=taxable,
...     )
>>> r = {"usage": 100.0, "rate": 0.5, "tax_threshold": 20.0}
>>> report = enrich_reading(r)
>>> report.base_charge
50.0
>>> report.taxable_charge
30.0

```
