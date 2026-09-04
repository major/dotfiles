# Chapter 9: Input and Output

## Core Idea
I/O crosses a representation boundary: keep Unicode text and raw bytes distinct, then choose explicit layers for files, streams, serialization, and concurrency.

## Frameworks Introduced
- **Bytes/text boundary**: decode bytes at input and encode text at output.
  - When to use: files, sockets, subprocesses, and external data.
  - How: choose an encoding, normally UTF-8, and specify error policy consciously.
- **I/O abstraction layers**: separate raw binary streams, buffered streams, and text wrappers.
  - When to use: selecting efficient and correct file or device access.
- **Serialization boundary**: serialize only data whose format, trust, and compatibility are understood.
  - When to use: persistence or process exchange.

## Key Concepts
- **`str`**: Unicode text.
- **`bytes`**: immutable raw byte sequence.
- **`bytearray`**: mutable byte sequence.
- **Encoding**: conversion from text to bytes.
- **Decoding**: conversion from bytes to text.
- **Environment variable**: process configuration supplied externally.

## Mental Models
Choose text or bytes before choosing an API, then use the external protocol's actual encoding, commonly UTF-8 but not universally.
Treat external input as untrusted and serialization formats as compatibility contracts.
Buffering improves throughput while polling, threads, and `asyncio` solve different waiting and concurrency shapes.

## Anti-patterns
- **Implicit bytes/text mixing**: Python correctly raises errors rather than guessing.
- **Ignoring encoding errors**: data loss can be silent.
- **Blocking work in latency-sensitive concurrency**: it stalls the execution model.
- **Unpickling untrusted data**: deserialization can permit remote code execution.

## Code Examples
```python
text = data.decode('utf-8')
payload = text.encode('utf-8')
```
- **What it demonstrates**: explicit representation conversion.

## Worked Example
Open a text file with the protocol's known encoding, explicit mode, buffering, and newline policy, for example `open(path, 'rt', encoding='utf-8', newline='')` when preserving newline distinctions matters.
Process text internally, then encode only at the external boundary.
For trusted, version-matched data, `pickle` can preserve Python object graphs; for untrusted input, reject it and choose a data-only format such as JSON with validation.

## Source-Named Sections
- **Data Representation and Text Encoding and Decoding**: `str` stores Unicode text; `bytes` and `bytearray` store binary data, and conversion must name an encoding and error policy.
- **Files and File Objects**: choose `rt`, `wt`, `rb`, or `wb` deliberately; buffering and newline translation affect latency and exact byte/text preservation.
- **I/O Abstraction Layers**: raw streams, buffered streams, and text wrappers have different responsibilities; avoid bypassing the layer that owns decoding or buffering.
- **Zero-Copy I/O**: use `readinto(preallocated_buffer)` to fill a contiguous, preallocated destination buffer without allocating a new bytes object for each read.
- **Blocking Operations and Concurrency**: polling can avoid blocking a main loop, threads can isolate blocking work, and `asyncio` coordinates awaitable nonblocking operations; none makes CPU-bound work automatically parallel.
- **Object Serialization**: formats trade fidelity, portability, speed, and trust; pickle is powerful but executable and must never consume untrusted data.

## Decision Rules
- Ask the protocol owner which encoding to use; default to UTF-8 only when that protocol specifies it.
- Use buffering for throughput, unbuffered or flushed output for latency-sensitive boundaries.
- Use `readinto(preallocated_buffer)` when repeated reads fit a known contiguous destination and allocation overhead matters.
- Choose polling, a thread, or `asyncio` based on the blocking API and application execution model.
- **Security**: never unpickle untrusted data because deserialization can permit remote code execution.

## Key Takeaways
1. Make encoding decisions explicit.
2. Use context managers for file lifetime.
3. Separate blocking I/O from concurrency coordination.

## Connects To
- **Ch 3**: context managers guarantee resource cleanup.
- **Ch 10**: standard-library modules provide focused I/O tools.
