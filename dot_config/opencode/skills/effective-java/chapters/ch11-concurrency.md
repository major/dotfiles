# Chapter 11: Concurrency

## Core Idea
Concurrency correctness requires both mutual exclusion and visibility under the Java Memory Model.
Prefer immutable or thread-confined state, use high-level concurrency utilities, keep locks narrow, and document the supported thread-safety level as part of the API contract.

## Frameworks Introduced
- **Synchronize shared mutable data**: Every thread that reads or writes shared mutable state must use a common synchronization mechanism.
  - How: Use synchronized access for compound invariants, `volatile` for visibility-only flags, and atomic classes for lock-free single-variable updates.
  - Failure mode: Atomic field reads do not imply visibility, and `volatile` does not make `x++` atomic.
- **Open calls**: Invoke alien or client-supplied methods outside synchronized regions.
  - How: Lock, snapshot or update protected state, unlock, then call callbacks.
  - Failure mode: Callback reentrancy can cause `ConcurrentModificationException`, deadlock, or corruption while an invariant is temporarily invalid.
- **Executor Framework**: Separate units of work from the mechanism and policy used to execute them.
  - How: Submit `Runnable` or `Callable` tasks to an appropriately sized executor, then shut it down deliberately.
  - Failure mode: Unbounded cached pools can amplify overload; forgotten shutdown can keep the VM alive.
- **Concurrency utilities over `wait`/`notify`**: Use concurrent collections, blocking queues, atomics, latches, barriers, and phasers before low-level monitors.
  - How: Choose a utility whose state transition expresses the coordination directly.
  - Failure mode: Hand-coded waiting commonly misses condition rechecks, interrupts, or notification races.
- **Thread-safety taxonomy**: State whether a type is immutable, unconditionally thread-safe, conditionally thread-safe, not thread-safe, or thread-hostile.
  - How: Document required external locks and invocation sequences for conditional safety.

## Key Concepts
- **Visibility**: A write by one thread becomes observable by another through a happens-before relationship.
- **Mutual exclusion**: At most one thread executes a protected critical section at a time.
- **`volatile`**: A visibility and ordering mechanism that supplies no compound-operation atomicity.
- **Safe publication**: Making an object reference visible so other threads observe a properly initialized object.
- **Safety failure**: A program computes an incorrect result or violates an invariant.
- **Liveness failure**: A program stops making progress through deadlock, starvation, or livelock.
- **Open call**: An alien method invocation performed outside a lock.
- **Thread starvation deadlock**: Tasks wait for worker capacity that the executor cannot provide.
- **Busy-wait**: Repeated polling that consumes CPU instead of blocking until progress is possible.

## Mental Models
- Treat synchronization as communication plus exclusion; atomicity alone is not enough.
- Minimize the number of runnable threads, not necessarily the total number of created threads.
- Design a concurrent component around state transitions, not around individual method calls.
- A lock is a private implementation resource unless the API explicitly documents a public lock.

## Anti-patterns
- **Unsynchronized stop flags**: A worker may never observe the request because visibility is not guaranteed.
- **`volatile` counters**: Read-modify-write races produce duplicate or lost values.
- **Callbacks under locks**: Client code can reenter, block, throw, or wait for the same lock.
- **Oversynchronization**: Contention destroys parallelism and may introduce deadlocks.
- **Direct thread ownership for work queues**: It mixes task identity with execution policy and creates lifecycle hazards.
- **Busy-waiting, `Thread.yield`, or priority tuning as fixes**: Scheduler hints are nonportable and mask the structural problem.

## Code Examples
```java
private static final AtomicLong NEXT_ID = new AtomicLong();

static long nextId() {
    return NEXT_ID.getAndIncrement();
}

ExecutorService pool = Executors.newFixedThreadPool(8);
try {
    Future<Result> result = pool.submit(() -> compute(input));
    consume(result.get());
} finally {
    pool.shutdown();
}
```
- **What it demonstrates**: Use an atomic primitive for a compound counter and an executor for task lifecycle instead of manually managing threads.

```java
synchronized (monitor) {
    while (!condition()) {
        monitor.wait();
    }
    performAction();
}
```
- **What it demonstrates**: Legacy monitor code must wait in a loop because state may change before wakeup and spurious wakeups are permitted.

## Reference Tables

| Need | Prefer | Does not provide |
|---|---|---|
| Visibility-only flag | `volatile` | Mutual exclusion or compound atomicity |
| Single-variable atomic update | `AtomicLong`, `AtomicReference` | Multi-object transaction by itself |
| General invariant protection | `synchronized` or `Lock` | Good design if the critical section is too broad |
| Concurrent map operations | `ConcurrentHashMap` and atomic methods | Atomic composition of arbitrary calls |
| Producer-consumer handoff | `BlockingQueue` | Automatic business-level cancellation |
| One-time coordination | `CountDownLatch` | Reuse after reaching zero |
| Repeated phase coordination | `CyclicBarrier` or `Phaser` | A substitute for correct state ownership |

| Level | Caller requirement | Example |
|---|---|---|
| Immutable | None | `String`, `BigInteger` |
| Unconditionally thread-safe | None | `AtomicLong`, `ConcurrentHashMap` |
| Conditionally thread-safe | Documented external lock for some sequences | Synchronized collection wrappers |
| Not thread-safe | Caller supplies synchronization | `ArrayList`, `HashMap` |
| Thread-hostile | Unsafe even with external locking | Unsynchronized mutable static state |

## Worked Example
An observable set initially locks its observer list while invoking each observer.
One observer removes itself during the callback, causing modification during iteration; another submits removal to a worker and deadlocks because the callback waits while holding the list lock.
The repair takes a snapshot under the lock and invokes callbacks after unlocking, or uses `CopyOnWriteArrayList` when writes are rare and traversals are frequent.
This is an open call: the protected state is captured first, while alien code runs without ownership of the lock.

## Key Takeaways
1. Synchronize both reads and writes, or use a deliberate visibility mechanism.
2. Use `volatile` only when the invariant tolerates independent reads and writes.
3. Avoid sharing mutable state; otherwise establish and document safe publication.
4. Keep synchronized regions small and never invoke alien methods inside them.
5. Submit tasks to executors and choose bounded capacity for overloaded services.
6. Prefer concurrent collections and synchronizers over new `wait`/`notify` code.
7. Use normal initialization by default; choose holder, double-check, or single-check lazy initialization only after measuring.
8. Never depend on scheduler behavior, busy-waiting, `yield`, or priorities for correctness.

## Connects To
- **Chapter 10: Exceptions**: Interrupts and task failures need explicit propagation or restoration, not empty catches.
- **Chapter 12: Serialization**: Serialization of a thread-safe object must use compatible locking while reading its state.
- **Java Memory Model**: Happens-before relationships explain visibility, publication, and reordering hazards.
- **Backpressure**: Bounded queues and fixed pools keep runnable work aligned with available processors and capacity.
