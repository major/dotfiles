# Chapter 9: Concurrency and Parallelism

## Core Idea
Concurrency is about dealing with many things at once (I/O interleaving), while parallelism is about doing many things simultaneously (CPU multi-core execution). Writing scalable Python requires choosing the right tool: `subprocess` for system tasks, `asyncio` with `TaskGroup` for high-volume I/O, `ThreadPoolExecutor` for blocking calls, and `ProcessPoolExecutor` (or free-threaded Python 3.13+) for CPU-bound parallelism.

## Frameworks Introduced
- **Structured Concurrency Protocol (`asyncio.TaskGroup`)**: The modern standard (Python 3.11+) for launching and managing concurrent asynchronous tasks.
  - When to use: For all asynchronous fan-out operations requiring coordinated error handling and cleanup.
  - How: Use `async with asyncio.TaskGroup() as tg:` and spawn child coroutines with `tg.create_task()`. If any task raises an exception, remaining sibling tasks are automatically cancelled, and errors are bundled into an `ExceptionGroup`.
- **Hybrid Async/Thread Offloading Protocol (`asyncio.to_thread`)**: Preventing event loop stalls caused by synchronous blocking operations.
  - When to use: When calling blocking libraries (e.g. standard file I/O, legacy synchronous database drivers, heavy hashing) from within an async codebase.
  - How: Wrap synchronous blocking calls with `result = await asyncio.to_thread(blocking_func, *args, **kwargs)`.
- **Producer-Consumer Thread Pipeline Protocol (`queue.Queue`)**: Coordinating threaded worker stages with bounded memory and backpressure.
  - When to use: When processing multi-stage threaded workloads where stages run at different speeds.
  - How: Connect worker threads via `queue.Queue(maxsize=N)`. Use `queue.get()` and `queue.task_done()`, signaling completion with `queue.join()`.
- **Multi-Core Process Parallelism Protocol (`ProcessPoolExecutor`)**: Bypassing the Global Interpreter Lock (GIL) for CPU-bound computations.
  - When to use: For CPU-intensive data transformations, image processing, machine learning inference, and cryptographic workloads.
  - How: Offload chunked tasks via `concurrent.futures.ProcessPoolExecutor()` using `executor.map()` or `executor.submit()`.

## Key Concepts
- **Concurrency vs Parallelism**: Concurrency is structuring a program as independently executing processes/threads (handling many I/O requests); parallelism is executing multiple computations simultaneously on separate CPU hardware cores.
- **Global Interpreter Lock (GIL)**: CPython's internal mutex preventing multiple native OS threads from executing Python bytecode simultaneously. Threads release the GIL during I/O operations, but compete for it during CPU execution.
- **Free-Threaded CPython (PEP 703 / Python 3.13+)**: Build mode disabling the GIL entirely, allowing true multi-core parallel execution with native Python threads.
- **Thread-Safety & Race Conditions**: Operations that appear simple (such as `counter += 1`) translate into multiple bytecode instructions (LOAD, ADD, STORE); without a `threading.Lock`, pre-emptive context switches cause silent data corruption.
- **Structured Concurrency**: An execution paradigm where child tasks have a strictly bounded lifetime tied to an enclosing context block (`TaskGroup`), preventing orphaned background tasks.
- **`ExceptionGroup`**: Container exception type in Python 3.11+ that aggregates multiple concurrent errors into a unified tree structure.

## Mental Models
- **Think of threads for waiting, processes for calculating**: Use threads or coroutines when waiting on external networks/disks; use processes when utilizing CPU cores for calculation.
- **Think of `asyncio.to_thread` as an escape hatch for the event loop**: Never allow a blocking function to run directly on the event loop thread; offload it immediately to prevent freezing all other concurrent tasks.
- **Think of `TaskGroup` as a nursery for tasks**: Tasks cannot escape the `async with TaskGroup()` block alive; either they all complete successfully, or all unfinished tasks are cancelled upon the first failure.

## Anti-patterns
- **Using threads for CPU-bound speedups on standard CPython**: Spawning multiple `threading.Thread` instances to crunch numbers, which actually runs slower than single-threaded code due to GIL contention.
- **Spawning unbounded threads on demand**: Creating a new thread per incoming request without a pool, exhausting operating system file descriptors and memory.
- **Unprotected shared mutable state in threads**: Modifying dictionaries, counters, or lists across threads without `threading.Lock`.
- **Blocking the `asyncio` event loop**: Calling `time.sleep()`, synchronous `requests.get()`, or heavy computational loops inside an `async def` function.
- **Unstructured task spawning with `asyncio.create_task`**: Launching tasks without awaiting them or scoping them inside a `TaskGroup`, resulting in swallowed exceptions and lingering zombie tasks.

## Code Examples

### Modern Structured Concurrency with `asyncio.TaskGroup`
```python
import asyncio

async def fetch_data(service_id: int) -> dict:
    await asyncio.sleep(0.1)  # Simulated async network request
    if service_id == 3:
        raise ConnectionResetError(f"Service {service_id} failed")
    return {"id": service_id, "status": "ok"}

async def gather_all_services():
    results = []
    try:
        async with asyncio.TaskGroup() as tg:
            # Spawn concurrent tasks safely within the group
            tasks = [tg.create_task(fetch_data(i)) for i in range(1, 5)]
        # All tasks guaranteed completed here if no exception raised
        results = [t.result() for t in tasks]
    except* ConnectionResetError as eg:
        # Python 3.11+ except* syntax for handling ExceptionGroups
        print(f"Handled structured concurrency error: {eg.exceptions}")

asyncio.run(gather_all_services())
```
- **What it demonstrates**: Coordinated error management and automatic cancellation via `asyncio.TaskGroup` and `except*`.

### Non-Blocking Offloading with `asyncio.to_thread`
```python
import asyncio
import time
import hashlib

def heavy_password_hash(password: str) -> str:
    """CPU-heavy synchronous function that would stall the event loop."""
    return hashlib.pbkdf2_hmac("sha256", password.encode(), b"salt", 200_000).hex()

async def handle_registration(username: str, password_raw: str):
    # Offload CPU-heavy computation to thread pool automatically
    hashed_pw = await asyncio.to_thread(heavy_password_hash, password_raw)
    print(f"Registered user {username} with hash {hashed_pw[:8]}...")

async def main():
    await asyncio.gather(
        handle_registration("alice", "secret123"),
        handle_registration("bob", "pass456"),
    )

asyncio.run(main())
```
- **What it demonstrates**: Keeping the async event loop fully responsive while running heavy synchronous operations.

### True Parallelism with `ProcessPoolExecutor`
```python
from concurrent.futures import ProcessPoolExecutor
import math

def compute_heavy_factors(number: int) -> list[int]:
    """CPU-bound factor computation."""
    return [i for i in range(1, int(math.isqrt(number)) + 1) if number % i == 0]

def parallel_factorization(numbers: list[int]) -> list[list[int]]:
    # Utilizes all available CPU hardware cores
    with ProcessPoolExecutor() as executor:
        results = list(executor.map(compute_heavy_factors, numbers, chunksize=10))
    return results
```
- **What it demonstrates**: Bypassing the GIL to execute CPU-bound work in parallel across multi-core systems.

## Reference Tables

### Concurrency and Parallelism Selection Matrix
| Workload Type | Concurrency Model | Recommended Tool | Scaling Bottleneck |
|---|---|---|---|
| OS Commands / CLI tools | Separate processes | `subprocess.run` / `Popen` | OS process creation overhead |
| I/O-bound (massive scale: >1,000s) | Single-threaded cooperative | `asyncio` with `TaskGroup` | Non-blocking ecosystem compatibility |
| I/O-bound (legacy / blocking libs) | Multi-threaded pre-emptive | `concurrent.futures.ThreadPoolExecutor` | Thread stack memory & context switching |
| CPU-bound (multi-core compute) | Multi-process isolated memory | `concurrent.futures.ProcessPoolExecutor` | Inter-process data serialization (pickle) |
| CPU-bound (shared memory, 3.13+) | Free-threaded CPython (no GIL) | `threading.Thread` / `ThreadPoolExecutor` | Thread synchronization and locking discipline |

## Worked Example

### Building a Concurrent Resilient Web Scraper
Fetch multiple URLs concurrently with rate limiting, timeouts, and structured error isolation.

```python
import asyncio
from typing import Optional

async def download_page(url: str, semaphore: asyncio.Semaphore) -> Optional[str]:
    """Download a web page respecting concurrency limits."""
    async with semaphore:
        try:
            # Simulate network request with timeout
            async with asyncio.timeout(2.0):
                await asyncio.sleep(0.05)  # Simulated fetch
                return f"Content of {url}"
        except TimeoutError:
            print(f"Timeout fetching {url}")
            return None

async def scrape_site(urls: list[str], max_concurrency: int = 5) -> list[str]:
    sem = asyncio.Semaphore(max_concurrency)
    results: list[Optional[str]] = []
    
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(download_page(url, sem)) for url in urls]
        
    for task in tasks:
        if (content := task.result()) is not None:
            results.append(content)
    return results

# Execute
urls = [f"https://example.com/page/{i}" for i in range(10)]
pages = asyncio.run(scrape_site(urls))
assert len(pages) == 10
```

## Key Takeaways
1. Use `subprocess` with timeouts for executing system commands and managing child processes.
2. Standard Python threads do not execute CPU-bound code in parallel due to the GIL; use threads exclusively for blocking I/O.
3. Always guard shared mutable state in multi-threaded code with `threading.Lock`.
4. Use `queue.Queue` with `maxsize` to build robust thread pipelines with built-in backpressure.
5. Use `asyncio` for high-concurrency I/O-bound applications.
6. Always manage concurrent coroutines with `asyncio.TaskGroup` (Python 3.11+) to guarantee structured concurrency and error cleanup.
7. Wrap blocking synchronous calls in `await asyncio.to_thread()` to prevent stalling the `asyncio` event loop.
8. Use `ProcessPoolExecutor` for CPU-bound parallelism across multi-core CPUs.
9. Evaluate Python 3.13+ free-threaded builds for high-performance shared-memory parallel computing without the GIL.

## Connects To
- **Ch 6**: Interfaces with asynchronous generators (`async for`, `async yield`).
- **Ch 10**: Coordinates structured exception handling with `ExceptionGroup` and `except*`.
- **Ch 11**: Integrates with performance profiling and memory optimization techniques.
