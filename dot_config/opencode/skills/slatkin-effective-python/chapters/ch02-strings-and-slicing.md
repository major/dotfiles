# Chapter 2: Strings and Slicing

## Core Idea
Strings and sequences are fundamental data types in Python with subtle boundaries: Unicode text (`str`) must never be mixed implicitly with raw 8-bit sequences (`bytes`), and sequence slicing should prioritize clear, unpackable bounds over tricky multi-stride one-liners.

## Frameworks Introduced
- **Unicode Sandwich Pattern**: The standard architecture for handling text input/output in Python.
  - When to use: In all applications dealing with network sockets, file I/O, or external APIs.
  - How: Decode incoming bytes to `str` at the outermost system boundary using explicit encoding (e.g. `utf-8`), process entirely as `str` in business logic, and encode back to `bytes` at the output boundary.
- **Explicit Type Conversion Helpers (`to_str` / `to_bytes`)**: Utility functions that ensure robust handling of unknown string/byte inputs.
  - When to use: When handling polymorphic inputs that could be either `bytes` or `str`.
  - How: Check `isinstance(data, bytes)` or `isinstance(data, str)` and call `.decode("utf-8")` or `.encode("utf-8")`.
- **Catch-All Starred Unpacking**: Using starred expressions (`*rest`) to extract arbitrary-length sublists without index arithmetic.
  - When to use: When separating headers, footers, or middle segments from lists and iterables.
  - How: Assign variables with an asterisk on one target (`first, *middle, last = sequence`).
- **Two-Step Slice and Stride Protocol**: Separating sequence slicing from striding to preserve readability.
  - When to use: Whenever extracting a sampled subset from a specific window of a sequence.
  - How: First slice the boundary range (`subset = data[start:end]`), then apply the stride in a second operation (`result = subset[::stride]`).

## Key Concepts
- **`bytes` vs `str`**: `bytes` contains raw 8-bit bytes (ASCII or binary); `str` contains Unicode characters. They cannot be combined with `+` or compared with `==` (evaluates to `False`).
- **F-Strings (`f"..."`)**: Interpolated string literals offering optimal readability, inline expression execution, formatting specifiers, and self-documenting debug syntax (`f"{var=}"`).
- **`__repr__` vs `__str__`**: `__repr__` produces an unambiguous, developer-focused string (ideally valid Python code); `__str__` produces human-readable output for end users.
- **Implicit String Concatenation Trap**: Two adjacent string literals `'a' 'b'` automatically concatenate to `'ab'`, which causes silent bugs when missing a comma in list literals `['first' 'second']`.
- **Slice Assignment**: Replacing a slice of a list with an iterable (`a[1:3] = [88, 99]`), mutating the list in place and dynamically resizing if lengths differ.
- **Catch-All Unpacking (`*`)**: Capturing unassigned items into a new list during tuple/sequence unpacking.

## Mental Models
- **Think of bytes as raw wire data and str as text**: Never assume an encoding; always be explicit with `utf-8` when converting between bytes and strings.
- **Think of `__repr__` as the recipe and `__str__` as the dish**: `repr()` should tell the developer exactly what the object is, while `str()` provides a pleasant presentation.
- **Use starred unpacking instead of slice boundaries**: When extracting known boundaries, `first, *rest = items` is more expressive and less error-prone than `first = items[0]; rest = items[1:]`.

## Anti-patterns
- **Mixing `bytes` and `str`**: Attempting to format or concatenate bytes into strings or vice versa without explicit decoding/encoding.
- **Implicit string concatenation in lists**: Writing `["item1", "item2" "item3"]` where a missing comma produces `["item1", "item2item3"]` without an error.
- **Three-argument slicing one-liners**: Writing `data[2:-1:2]` which obscures the start, stop, and step semantics.
- **Opening text files in default mode**: Calling `open("file.txt", "w")` without explicitly specifying `encoding="utf-8"`, leading to platform-dependent encoding bugs on Windows.

## Code Examples

### Enforcing Explicit String and Byte Boundaries
```python
def to_str(data: bytes | str) -> str:
    """Ensure output is always Unicode str."""
    if isinstance(data, bytes):
        return data.decode("utf-8")
    return data

def to_bytes(data: bytes | str) -> bytes:
    """Ensure output is always raw bytes."""
    if isinstance(data, str):
        return data.encode("utf-8")
    return data

# Always open files with explicit encoding or binary mode
with open("data.bin", "wb") as f:
    f.write(b"\xf1\xf2\xf3")

with open("text.txt", "w", encoding="utf-8") as f:
    f.write("Hello, 世界!")
```
- **What it demonstrates**: Boundary sanitization and explicit file encodings.

### Catch-All Unpacking over Slicing
```python
car_ages = [0, 9, 4, 8, 7, 20, 19, 1, 6, 15]
car_ages_descending = sorted(car_ages, reverse=True)

# Anti-pattern: Fragile index slicing
oldest = car_ages_descending[0]
second_oldest = car_ages_descending[1]
others = car_ages_descending[2:]

# Pythonic: Clean starred unpacking
oldest, second_oldest, *others = car_ages_descending
# Also works for head and tail
newest, *middle, oldest = sorted(car_ages)
```
- **What it demonstrates**: Unpacking sequence elements cleanly without manual index calculations.

### F-Strings with Formatting and Debug Specifiers
```python
# Self-documenting debug strings and format specifiers
pantry = [("apples", 1.25), ("bananas", 2.50), ("cherries", 15.00)]
for item, price in pantry:
    print(f"{item:<10s} = ${price:>6.2f}")

# Debug syntax (Python 3.8+)
value = 42 * 10
print(f"{value=}")  # Outputs: value=420
```
- **What it demonstrates**: Precision alignment and zero-boilerplate debugging output with f-strings.

## Reference Tables

### String Formatting Syntax Comparison
| Feature | `%` Formatting | `str.format()` | F-Strings (`f"..."`) |
|---|---|---|---|
| Readability | Low (type specifiers disconnected) | Medium (numbered/named slots) | High (inline variables/expressions) |
| Performance | Slower | Moderate | Fastest (compiled directly to bytecode) |
| Inline Expressions | No | No | Yes (`f"{val + 1}"`) |
| Debug Specifier | No | No | Yes (`f"{val=}"`) |
| Recommendation | Deprecated | Legacy / Template only | Standard default |

### Slicing and Unpacking Cheat Table
| Intent | Idiom | Behavior |
|---|---|---|
| First element and rest | `head, *tail = items` | `head` is scalar, `tail` is a list |
| All elements except last | `*body, tail = items` | `body` is a list, `tail` is scalar |
| Shallow copy list | `copied = original[:]` | Creates a new list object with same references |
| Replace range in place | `items[start:stop] = new_list` | Modifies list in place, shifts length as needed |
| Clear list in place | `items[:] = []` | Clears contents while preserving object identity |

## Worked Example

### Building a Safe Log Message Parser with Binary/Text Demarcation
When ingesting audit logs over a network socket, payloads arrive as raw `bytes` containing log level, timestamp, and message.

```python
def parse_log_payload(raw_payload: bytes) -> dict[str, str]:
    # Ensure Unicode decoding at the system boundary
    decoded = to_str(raw_payload)
    
    # Split fields and use catch-all unpacking
    parts = decoded.strip().split(":")
    if len(parts) < 3:
        raise ValueError(f"Malformed log entry: {decoded!r}")
        
    timestamp, log_level, *message_parts = parts
    full_message = ":".join(message_parts).strip()
    
    return {
        "timestamp": timestamp.strip(),
        "level": log_level.strip().upper(),
        "message": full_message,
    }

# Usage with repr verification in tests
sample_raw = b"2026-08-24T12:00:00Z:INFO:User login succeeded: IP=192.168.1.1\n"
parsed = parse_log_payload(sample_raw)
assert parsed["level"] == "INFO"
assert parsed["message"] == "User login succeeded: IP=192.168.1.1"
```

## Key Takeaways
1. Never mix `bytes` and `str` instances; convert explicitly at system boundaries using the Unicode Sandwich model.
2. Always specify `encoding="utf-8"` when reading or writing text files.
3. Use f-strings for all string formatting, leveraging format specifiers for alignment and `f"{var=}"` for debugging.
4. Define `__repr__` on custom classes to provide actionable developer representations.
5. Use explicit concatenation (`+`) instead of implicit literal juxtaposition to avoid omitted-comma bugs in lists.
6. Prefer catch-all starred unpacking (`*rest`) over index slicing for boundary extraction.
7. Avoid combining slicing and striding in the same expression; execute them as two separate steps.

## Connects To
- **Ch 1**: Extends multiple-assignment unpacking with catch-all starred syntax.
- **Ch 4**: Feeds into dictionary key lookup and hashing string keys.
- **Ch 10**: Underpins robust file I/O, error formatting, and encoding validation.
