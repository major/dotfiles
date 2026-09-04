# Chapter 13: Testing and Debugging

## Core Idea
High-reliability Python systems require comprehensive automated testing and disciplined debugging. Writing verifiable software involves structuring test suites with `unittest.TestCase` and `subTest`, enforcing test isolation with lifecycle fixtures, using `unittest.mock` with `autospec=True` alongside dependency injection, asserting floating-point precision safely with `assertAlmostEqual`, and diagnosing runtime issues using `breakpoint()` and `tracemalloc`.

## Frameworks Introduced
- **Parameterized Sub-Test Protocol (`self.subTest`)**: Running multiple test assertions within a single test method without aborting on the first failure.
  - When to use: When testing a function against a table of various inputs and expected outputs.
  - How: Iterate over test cases inside a `with self.subTest(param=val):` context block. If one case fails, `unittest` reports the failure specifically while continuing to run the remaining sub-tests.
- **Dependency Injection for Testability**: Designing classes and functions to accept dependencies as arguments rather than instantiating them internally.
  - When to use: When classes interact with external services, databases, clocks, or file systems.
  - How: Accept client/service instances in `__init__` (with sensible defaults), allowing unit tests to pass mock objects without invasive monkey-patching.
- **Mock Specification Protocol (`autospec=True`)**: Preventing mock drift and false-positive test passes.
  - When to use: Whenever using `unittest.mock.patch` or `create_autospec`.
  - How: Always pass `autospec=True` to `@patch` or `patch.object()`. This enforces that the mock's method signatures, parameter names, and attribute names match the real target, preventing tests from calling non-existent mocked methods.
- **Memory Profiling Protocol (`tracemalloc`)**: Diagnosing memory leaks and allocation hotspots.
  - When to use: In long-running background workers and services suspected of leaking memory.
  - How: Call `tracemalloc.start()`, take baseline snapshots before an operation, take second snapshots after, and call `snapshot2.compare_to(snapshot1, 'lineno')` to print top allocating lines.

## Key Concepts
- **`unittest.TestCase`**: Standard library test harness providing assertion methods (`assertEqual`, `assertRaises`, `assertCountEqual`).
- **Fixture Lifecycle (`setUp` / `tearDown`)**: `setUp()` runs before each test method; `tearDown()` runs after each test method even if an assertion fails. `setUpModule()` / `tearDownModule()` run once per test file.
- **`autospec=True`**: `unittest.mock` parameter ensuring the mock object mirrors the real class's API signature and rejects invalid method calls.
- **`assertAlmostEqual`**: Assertion method for floating-point calculations that checks equality within a given number of decimal places or `delta`.
- **`breakpoint()`**: Built-in function (PEP 553) that drops into the interactive Python debugger (`pdb`) at runtime, configurable via `PYTHONBREAKPOINT`.
- **`tracemalloc`**: Standard library module tracing memory allocations back to specific Python source file lines and stack frames.

## Mental Models
- **Think of `autospec=True` as a mock sanity guard**: Without `autospec=True`, typo-ridden mock calls like `mock_obj.asert_called()` silently create new mock attributes and pass tests; with `autospec=True`, an `AttributeError` is raised immediately.
- **Think of dependency injection as built-in test hooks**: Passing a database connection or API client into a class constructor makes the class 100% testable in milliseconds without monkey-patching.
- **Think of `subTest` as table-driven testing**: Instead of copy-pasting ten identical test methods or letting a failure in test case #2 hide failures in #3–10, `subTest` runs the entire table independently.

## Anti-patterns
- **Using raw `assert` statements in `unittest.TestCase`**: Using `assert a == b` instead of `self.assertEqual(a, b)`, losing informative failure diffs and error messages.
- **Mocking without `autospec=True`**: Calling `patch("mymodule.service")` without `autospec=True`, allowing tests to pass even when real method names change.
- **Testing floating-point equality with `assertEqual`**: Writing `self.assertEqual(0.1 + 0.2, 0.3)`, which fails due to binary representation limits; use `self.assertAlmostEqual()` instead.
- **State leakage across tests**: Modifying global variables, environment variables, or databases in tests without resetting them in `tearDown()` or using `addCleanup()`.
- **Leaving `breakpoint()` or `print()` debug statements in committed code**: Committing interactive debug breakpoints to version control.

## Code Examples

### Parameterized Sub-Tests with `self.subTest`
```python
import unittest

def normalize_phone(raw: str) -> str:
    digits = [c for c in raw if c.isdigit()]
    if len(digits) == 10:
        return f"+1{''.join(digits)}"
    if len(digits) == 11 and digits[0] == "1":
        return f"+{''.join(digits)}"
    raise ValueError(f"Invalid phone number: {raw}")

class PhoneNormalizationTest(unittest.TestCase):
    def test_normalization_table(self):
        cases = [
            ("555-0199", ValueError),
            ("(800) 555-0199", "+18005550199"),
            ("1-800-555-0199", "+18005550199"),
            ("invalid", ValueError),
        ]
        for raw_input, expected in cases:
            with self.subTest(raw_input=raw_input):
                if isinstance(expected, type) and issubclass(expected, Exception):
                    with self.assertRaises(expected):
                        normalize_phone(raw_input)
                else:
                    self.assertEqual(normalize_phone(raw_input), expected)

if __name__ == "__main__":
    unittest.main()
```
- **What it demonstrates**: Comprehensive table-driven unit testing with `self.subTest` and `self.assertRaises`.

### Dependency Injection and Mocking with `autospec`
```python
from unittest import TestCase
from unittest.mock import patch, create_autospec

class PaymentGateway:
    def charge_card(self, token: str, amount_cents: int) -> dict:
        """Real network call to payment provider."""
        # ... network call ...
        return {"status": "success", "charge_id": "ch_123"}

class OrderService:
    def __init__(self, gateway: PaymentGateway | None = None):
        # Dependency injection with fallback default
        self.gateway = gateway or PaymentGateway()

    def process_order(self, order_id: str, amount_cents: int) -> bool:
        response = self.gateway.charge_card(f"tok_{order_id}", amount_cents)
        return response.get("status") == "success"

class OrderServiceTest(TestCase):
    def test_order_success(self):
        # Create autospec mock that mirrors real class methods and arguments
        mock_gateway = create_autospec(PaymentGateway, instance=True)
        mock_gateway.charge_card.return_value = {"status": "success", "charge_id": "test_1"}

        service = OrderService(gateway=mock_gateway)
        result = service.process_order("ord_99", 5000)

        self.assertTrue(result)
        mock_gateway.charge_card.assert_called_once_with("tok_ord_99", 5000)
```
- **What it demonstrates**: Unit testing isolated business logic using dependency injection and `autospec` mocks.

### Detecting Memory Leaks with `tracemalloc`
```python
import tracemalloc

def leak_demonstration():
    # Start tracing memory allocations
    tracemalloc.start()
    
    snapshot_before = tracemalloc.take_snapshot()
    
    # Operation that allocates memory
    leaky_cache = [f"data_item_{i}" * 100 for i in range(10_000)]
    
    snapshot_after = tracemalloc.take_snapshot()
    
    # Compare differences
    top_stats = snapshot_after.compare_to(snapshot_before, "lineno")
    print("[ Top 3 Memory Allocations ]")
    for stat in top_stats[:3]:
        print(stat)

leak_demonstration()
```
- **What it demonstrates**: Isolating and attributing memory allocation spikes to specific source lines.

## Reference Tables

### Common `unittest.TestCase` Assertion Methods
| Method | Verification Intent | Advantage over `assert` |
|---|---|---|
| `self.assertEqual(a, b)` | Value equality | Shows full diff of mismatched structures |
| `self.assertAlmostEqual(a, b, places=7)` | Float equality within precision | Prevents IEEE 754 precision test failures |
| `self.assertRaises(Error)` | Exception context manager | Ensures code raises expected exception |
| `self.assertCountEqual(a, b)` | Sequence has same elements regardless of order | Tests collections without pre-sorting |
| `self.assertIs(a, b)` | Object identity (`a is b`) | Tests singleton / `None` identity |

## Worked Example

### Building an Isolated Database Test Fixture with `addCleanup`
Ensure database transactions, temp files, and mock patches are cleanly rolled back even if assertions raise unexpected exceptions.

```python
import unittest
from unittest.mock import patch
import tempfile
import os

class DatabaseBackupService:
    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir

    def create_backup_file(self, filename: str) -> str:
        path = os.path.join(self.storage_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write("BACKUP_DATA")
        return path

class BackupServiceTest(unittest.TestCase):
    def setUp(self):
        # Create temporary directory for test isolation
        self.test_dir = tempfile.TemporaryDirectory()
        # addCleanup guarantees execution even if setUp or test fails halfway
        self.addCleanup(self.test_dir.cleanup)
        self.service = DatabaseBackupService(storage_dir=self.test_dir.name)

    def test_backup_creation(self):
        backup_path = self.service.create_backup_file("snapshot.db")
        self.assertTrue(os.path.exists(backup_path))
        with open(backup_path, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "BACKUP_DATA")
```

## Key Takeaways
1. Structure automated tests using `unittest.TestCase` and write test methods starting with `test_`.
2. Use `self.subTest` to parameterize test cases across input tables without early termination on the first failure.
3. Design classes with dependency injection to facilitate easy mocking and isolated testing.
4. Always use `autospec=True` when mocking functions and classes to prevent mock signature drift.
5. Use `self.assertAlmostEqual` for floating-point comparisons instead of exact equality checks.
6. Use `self.addCleanup()` in `setUp()` to guarantee deterministic teardown of resources.
7. Use `breakpoint()` (PEP 553) for interactive debugging sessions with `pdb`.
8. Use `tracemalloc` to profile memory allocation hotspots and diagnose memory leaks.

## Connects To
- **Ch 7**: Tests class hierarchies, interfaces, and dataclass models.
- **Ch 10**: Verifies custom exception hierarchies, context managers, and error paths.
- **Ch 11**: Complements CPU profiling with memory allocation profiling via `tracemalloc`.
