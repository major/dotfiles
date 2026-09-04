# Chapter 11: Performance

## Core Idea
Performance optimization in Python must be driven by rigorous profiling rather than intuition. Writing high-performance Python requires identifying true execution bottlenecks with `cProfile` and `timeit`, accelerating binary operations with zero-copy `memoryview` and `bytearray` buffers, optimizing startup latency through bytecode caching and lazy imports, and integrating native C/Rust libraries or extension modules when raw CPU limits are reached.

## Frameworks Introduced
- **Measurement-Driven Optimization Protocol (`cProfile` & `pstats`)**: The standard diagnostic cycle for optimizing Python applications.
  - When to use: Whenever an application fails performance targets or before refactoring for speed.
  - How: Profile full execution using `cProfile.Profile()`, sort call statistics by `cumulative` and `tottime` with `pstats.Stats`, and target the top 1–3 bottleneck functions.
- **Microbenchmarking Protocol (`timeit`)**: Accurately measuring tight loops and micro-optimizations.
  - When to use: When comparing competing syntax constructs or algorithmic variations in isolation.
  - How: Use `timeit.timeit()` or `timeit.repeat()` with high iteration counts, avoiding external I/O and noise.
- **Zero-Copy Memory Buffer Protocol (`memoryview` & `bytearray`)**: Slicing and mutating large byte buffers without allocating copies.
  - When to use: In high-throughput network servers, cryptographic hashing, and media processing handling large byte streams.
  - How: Wrap binary data in `memoryview(b)` for zero-copy slicing (`view[start:end]`), and use `bytearray` for in-place byte mutation.
- **Lazy Module Import Protocol**: Deferring heavy module loading to optimize CLI and service startup latency.
  - When to use: In command-line tools, Lambda functions, and large monolithic applications with slow startup times.
  - How: Import heavy dependencies (e.g. `numpy`, `pandas`, complex ORMs) inside the specific functions or subcommands that require them rather than at global module level.

## Key Concepts
- **`cProfile`**: Built-in deterministic C-level profiler measuring function call frequencies and execution durations.
- **`tottime` vs `cumtime`**: `tottime` is the total time spent in the function body excluding subcalls; `cumtime` is the total time spent in the function and all sub-functions it invoked.
- **`memoryview`**: Built-in zero-copy buffer protocol wrapper allowing memory slicing without copying underlying bytes.
- **`bytearray`**: Mutable sequence of bytes supporting in-place modification and buffer sharing.
- **Native Extension Modules**: Compiled C, C++, or Rust (via PyO3) extensions linked into Python to execute CPU-intensive inner loops at bare-metal speeds.
- **`ctypes`**: Standard library foreign function library allowing Python code to call exported functions from C shared libraries (`.so`, `.dll`) dynamically.
- **Bytecode Caching (`__pycache__` / `.pyc`)**: Compiled Python bytecode stored on disk to accelerate module import on subsequent runs.

## Mental Models
- **Never optimize without a profile**: Intuition about Python performance bottlenecks is notoriously inaccurate; always let `cProfile` pinpoint where CPU time is actually being spent.
- **Think of `memoryview` as a window, not a copy**: Slicing a 100MB `bytes` object creates another 100MB allocation; slicing a `memoryview` creates a 200-byte pointer window with zero memory overhead.
- **Keep Python for orchestration, native code for computation**: When Python cannot meet performance requirements even after algorithmic optimization, delegate tight inner loops to compiled extensions (Rust/C) while keeping the top-level business logic in Python.

## Anti-patterns
- **Premature optimization**: Sacrificing readability for speculative micro-optimizations before measuring overall system bottlenecks.
- **Repeated slicing of large `bytes` objects**: Creating quadratic memory overhead by repeatedly slicing binary network payloads (`data = data[chunk_size:]`) instead of using `memoryview`.
- **Top-level heavy imports in CLI tools**: Importing massive machine learning or scientific libraries at the top of CLI entry points, causing noticeable multi-second startup latency on simple `--help` commands.
- **Benchmarking with `time.time()` instead of `timeit` / `perf_counter`**: Using coarse wall-clock timers that include system scheduling noise rather than high-resolution monotonic clocks.

## Code Examples

### Profiling Application Hotspots with `cProfile`
```python
import cProfile
import pstats
import io

def heavy_computation():
    data = [i ** 2 for i in range(100_000)]
    return sum(data)

def run_application():
    for _ in range(10):
        heavy_computation()

# Run profiler programmatically
profiler = cProfile.Profile()
profiler.enable()
run_application()
profiler.disable()

# Format statistics sorted by cumulative execution time
stream = io.StringIO()
stats = pstats.Stats(profiler, stream=stream).sort_stats(pstats.SortKey.CUMULATIVE)
stats.print_stats(10)  # Print top 10 bottlenecks
print(stream.getvalue())
```
- **What it demonstrates**: Programmatically profiling code and sorting bottlenecks by cumulative execution time.

### Zero-Copy Binary Processing with `memoryview`
```python
import socket

def send_all_zero_copy(sock: socket.socket, data: bytes) -> None:
    """Send large binary payload without creating sliced copies."""
    view = memoryview(data)
    total_sent = 0
    while total_sent < len(data):
        # Slicing memoryview creates a lightweight view, NOT a new bytes allocation
        chunk = view[total_sent:]
        sent = sock.send(chunk)
        if sent == 0:
            raise ConnectionError("Socket connection broken")
        total_sent += sent
```
- **What it demonstrates**: Transmitting high-volume byte streams with O(1) memory overhead using `memoryview`.

### Lazy Dynamic Imports for Faster Startup
```python
def generate_pdf_report(data: dict, output_path: str) -> None:
    """Heavy reporting library imported only when this function is called."""
    # Defer importing expensive third-party library until needed
    import reportlab.pdfgen.canvas as pdf_canvas  # type: ignore

    canvas = pdf_canvas.Canvas(output_path)
    canvas.drawString(100, 750, f"Report for {data['title']}")
    canvas.save()
```
- **What it demonstrates**: Eliminating upfront startup latency in CLI tools by lazy-loading heavy dependencies.

## Reference Tables

### Profiling and Optimization Tools Matrix
| Tool | Scope | Best Used For | Overhead |
|---|---|---|---|
| `cProfile` | Whole program | Function-level CPU bottlenecks & call counts | Low (~1.5x slowdown) |
| `timeit` | Micro-benchmarks | Comparing isolated algorithms / syntax options | High (isolated runs) |
| `tracemalloc` | Memory allocations | Finding memory leaks & allocation hot spots | Moderate |
| `memoryview` | Binary I/O | Zero-copy slicing of large byte buffers | Zero allocation |
| `ctypes` / PyO3 | Native extensions | Running CPU-bound loops in compiled C/Rust | Near-zero Python overhead |

## Worked Example

### Accelerating Socket Buffer Processing
Compare memory allocation and throughput when processing 50MB binary packets using standard string slicing vs `memoryview`.

```python
import time

def simulate_slice_consumption(payload: bytes, chunk_size: int = 4096) -> float:
    start = time.perf_counter()
    # Anti-pattern: Allocates a new bytes object on every slice
    while payload:
        chunk = payload[:chunk_size]
        payload = payload[chunk_size:]
    return time.perf_counter() - start

def simulate_memoryview_consumption(payload: bytes, chunk_size: int = 4096) -> float:
    start = time.perf_counter()
    # Pythonic: Slices views without allocating underlying byte buffers
    view = memoryview(payload)
    offset = 0
    total_len = len(payload)
    while offset < total_len:
        chunk = view[offset : offset + chunk_size]
        offset += chunk_size
    return time.perf_counter() - start

# Benchmark with 20MB buffer
sample_bytes = b"x" * (20 * 1024 * 1024)
t_slice = simulate_slice_consumption(sample_bytes)
t_view = simulate_memoryview_consumption(sample_bytes)

print(f"Standard slice duration : {t_slice:.4f}s")
print(f"Memoryview duration      : {t_view:.4f}s (Speedup: {t_slice/t_view:.1f}x)")
```

## Key Takeaways
1. Always profile with `cProfile` before attempting to optimize code; focus on functions with the highest `tottime` and `cumtime`.
2. Use `timeit` to conduct rigorous micro-benchmarks when evaluating algorithmic alternatives.
3. Use `memoryview` and `bytearray` to achieve zero-copy operations when slicing and mutating large binary buffers.
4. Lazy-load heavy modules inside functions to dramatically speed up CLI and serverless function startup.
5. Consider `ctypes` or compiled C/Rust extensions (via PyO3) for tight CPU-bound numerical loops that bottleneck pure Python.
6. Rely on bytecode caching (`.pyc`) and filesystem caches for regular application deployments.

## Connects To
- **Ch 2**: Deepens binary string (`bytes`) manipulation with `memoryview` and zero-copy slicing.
- **Ch 9**: Complements process-based parallelism with low-level execution speedups.
- **Ch 12**: Pairs profiling insights with optimal standard library data structures.
