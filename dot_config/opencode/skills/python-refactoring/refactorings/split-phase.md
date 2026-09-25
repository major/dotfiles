# Split Phase

Background reference: skill `fowler-refactoring`, ch06.

## When

Use Split Phase when a single function or module performs two or more distinct tasks consecutively, such as parsing input data and then computing business calculations.
Use it when modifying the input format forces changes to the domain calculation logic, or vice versa.
Use it to resolve [Divergent Change](../smells/divergent-change.md).

## Python idiom

Decouple consecutive phases by introducing an explicit intermediate `@dataclass(frozen=True)` data contract.
The first phase parses, validates, and normalizes the input into the intermediate record.
The second phase takes the intermediate record and executes pure domain calculations.
This isolates I/O or schema changes to the first phase while keeping business logic pure and unit-testable.

## Mechanics

1. Identify the boundary between the first phase (e.g. data ingestion/parsing) and the second phase (e.g. domain calculation).
2. Extract the second phase logic into a standalone function using [Extract Function](extract-function.md).
3. Create an intermediate `@dataclass(frozen=True)` to hold the data passed from the first phase to the second.
4. Extract the first phase into its own function that builds and returns the intermediate record.
5. In the top-level coordinating function, call the first phase function to produce the record, then pass it to the second phase.
6. Add Google-style docstrings and type annotations to both phase functions and the intermediate record.
7. Run tests, linter, and type checker to confirm behavior preservation.

## Preservation pitfalls

- Premature optimization concerns: Allocating an intermediate dataclass has negligible overhead in almost all applications compared to the clarity gained.
- Missing field mapping: Ensure every piece of information required by the second phase is captured in the intermediate structure.
- Exception behavior: If invalid inputs previously raised exceptions during the calculation phase, ensure that validation in the first phase raises matching exception types.

## Before/After

### Before

```pycon
>>> def calculate_order_price(order_record: str) -> float:
...     # Phase 1: parse CSV line
...     parts = order_record.strip().split(",")
...     quantity = int(parts[0])
...     item_price = float(parts[1])
...     # Phase 2: calculate total with bulk discount
...     base = quantity * item_price
...     discount = base * 0.10 if quantity > 10 else 0.0
...     return round(base - discount, 2)
>>> calculate_order_price("12,10.0")
108.0

```

### After

```pycon
>>> from dataclasses import dataclass
>>> @dataclass(frozen=True)
... class ParsedOrder:
...     """Intermediate data contract representing parsed order line."""
...     quantity: int
...     item_price: float
>>> def parse_order_line(order_record: str) -> ParsedOrder:
...     """Parse raw CSV string into structured intermediate order record."""
...     parts = order_record.strip().split(",")
...     return ParsedOrder(quantity=int(parts[0]), item_price=float(parts[1]))
>>> def compute_pricing(order: ParsedOrder) -> float:
...     """Calculate price with bulk discount from parsed order."""
...     base = order.quantity * order.item_price
...     discount = base * 0.10 if order.quantity > 10 else 0.0
...     return round(base - discount, 2)
>>> def calculate_order_price(order_record: str) -> float:
...     """Coordinate order parsing and price calculation phases."""
...     parsed = parse_order_line(order_record)
...     return compute_pricing(parsed)
>>> calculate_order_price("12,10.0")
108.0

```
