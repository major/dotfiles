# Python Performance Reference

Depth reference for `SKILL.md` section 11.
Primary sources: the CPython "What's New" release notes and the standard profilers below — cite these over enthusiast blogs, which routinely oversell free-threading and JIT maturity.

## Profile before optimizing

Pick the tool by what you need to see, not by habit:

| Tool | Use for | Notes |
| --- | --- | --- |
| `cProfile` (stdlib) | Quick function-level CPU profile, no install | Deterministic, adds overhead proportional to call count |
| [py-spy](https://github.com/benfred/py-spy) | Sampling profiler on a *running* process | Safe to attach to production processes; low overhead |
| [Scalene](https://github.com/plasma-umass/scalene) | Line-level CPU + GPU + memory, separates Python vs native time | Best single tool when you need both CPU and memory |
| [memray](https://github.com/bloomberg/memray) (Bloomberg) | Memory allocation profiling, flame graphs | Use when you suspect a leak or unexpected retention |
| `tracemalloc` (stdlib) | Lightweight memory snapshots/diffs | Good for "which allocation grew between snapshot A and B" |

Write the profile output down before changing code. "I think the loop is slow" is a hypothesis, not a finding — confirm it before refactoring, because the actual hot path is often somewhere else (serialization, a redundant DB round-trip, logging in a tight loop).

## CPython version-by-version (What's New, verify against <https://docs.python.org/3/whatsnew/>)

- **3.11**: "Faster CPython" project begins; broad speedups from specialized bytecode.
- **3.12/3.13**: Specializing adaptive interpreter continues; 3.13 adds an *experimental* free-threaded build and an *experimental* JIT.
- **3.14** (released Oct. 7, 2025): **Free-threading is officially supported** (PEP 779) via a separate `python3.14t` binary — still opt-in, not the default build. The JIT (PEP 744) is expanded but remains experimental; free-threaded builds don't support the JIT. Also ships deferred annotations by default and template strings (PEP 750).

**Free-threading caveats that matter in practice:**

- It's a separate build (`python3.14t`), not a flag on the normal interpreter — don't assume it's active.
- If a C extension hasn't declared thread-safety, the GIL is silently re-enabled for the *whole process*, silently negating any expected speedup.
- Per the official release notes, single-threaded code in the free-threaded build still pays "roughly 5-10%" overhead depending on platform/compiler.
- Don't adopt free-threading speculatively. Reach for it only after profiling shows a genuine multi-core CPU-bound bottleneck that `multiprocessing` or `concurrent.futures.ProcessPoolExecutor` doesn't already solve well enough.

## Numeric / data work

- Prefer vectorized **NumPy**/**pandas** or **[Polars](https://docs.pola.rs)** operations over Python-level loops for bulk numeric or tabular data. A `for` loop iterating rows of a DataFrame is almost always the bug, not a necessary cost.
- Watch dtype and overflow behavior explicitly (`int64` vs `float64`, NaN propagation) — silent upcasting/downcasting is a common source of subtly wrong numeric results, not just a performance issue.
- For CPU-bound numeric kernels that vectorization can't reach, consider Cython, Numba, or PyO3 (Rust) rather than hand-rolled optimization — established tools here reduce complexity rather than add it.
- Use `decimal.Decimal` for money and anywhere binary-float rounding error is unacceptable (see `SKILL.md` section 11); this is a correctness rule as much as a performance one, since chasing float rounding bugs after the fact is expensive.

## Async / I/O-bound work

See `SKILL.md` section 9 for async correctness rules (no blocking I/O inside `async def`, proper cancellation handling). The performance angle: a single blocking call inside an event loop doesn't just slow down that call — it stalls every other concurrent task on that loop. Profile async code with `py-spy` (works across the whole process) rather than `cProfile` alone, which won't show time spent blocked in another task.

## Sources

- CPython "What's New" — <https://docs.python.org/3/whatsnew/3.14.html> (and prior versions for 3.11-3.13).
- PEP 779 (free-threading), PEP 744 (JIT), PEP 703 (original free-threading proposal) — <https://peps.python.org>.
- Faster CPython project notes — <https://github.com/faster-cpython>.
- Scalene, py-spy, memray — linked above.
- asyncio docs — <https://docs.python.org/3/library/asyncio.html>.
- NumPy (now with free-threaded build support on Linux/macOS), pandas, Polars docs.
- *High Performance Python*, 2nd ed. (Gorelick & Ozsvald, O'Reilly, 2020) — the deepest treatment of profiling-driven optimization, NumPy, Cython/Numba, multiprocessing; predates free-threading, treat tooling specifics as dated while the profiling methodology remains sound. Proprietary — link, don't copy.
