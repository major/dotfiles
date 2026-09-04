# Chapter 10: Exceptions

## Core Idea
Exceptions are part of an API’s design, not merely an error-reporting mechanism.
Use them for exceptional conditions, classify failures by recoverability, preserve abstraction boundaries, and leave objects usable after failure whenever practical.

## Frameworks Introduced
- **Exceptional conditions only**: Use exceptions when normal control flow cannot reasonably handle the event.
  - When to use: A precondition fails, an external resource cannot be used, or an operation cannot complete.
  - How: Prefer recognizable iteration and state-testing APIs, and return `Optional` or a distinguished value when absence is an expected result.
  - Failure mode: Exception-driven loops obscure intent, cost more, and can catch an unrelated bug as if it were normal termination.
- **Recoverability classification**: Use checked exceptions for conditions callers can reasonably recover from, and runtime exceptions for programming errors or conditions where recovery is unlikely.
  - How: Ask whether the caller can take useful corrective action and whether the condition is preventable by correct API use.
  - Failure mode: A checked exception that callers can only wrap, print, or convert to an assertion is unnecessary API burden.
- **Exception translation and chaining**: Translate lower-layer failures into exceptions stated in the vocabulary of the higher-level operation, retaining the original cause when it aids diagnosis.
  - How: Catch the lower-level exception, throw a meaningful higher-level exception, and pass the cause with `super(cause)` or `initCause`.
  - Failure mode: Blind propagation leaks implementation details and makes future implementation changes observable.
- **Failure atomicity**: A failed operation should leave the receiver in its pre-invocation state, or document the resulting state explicitly.
  - How: Validate before mutation, perform failure-prone work before committing changes, use a temporary copy, or roll back durable state.

## Key Concepts
- **Checked exception**: A declared exceptional outcome that forces callers to catch or propagate it.
- **Runtime exception**: An unchecked exception normally representing a programming error or violated precondition.
- **Error**: An unchecked throwable conventionally reserved for JVM or unrecoverable environmental failures.
- **State-testing method**: A query such as `hasNext` that allows a caller to avoid using an exception for ordinary control flow.
- **Exception translation**: Replacing a lower-level exception with one appropriate to the current abstraction.
- **Exception chaining**: Attaching the lower-level cause to the higher-level exception for programmatic diagnosis.
- **Failure-capture information**: Parameter and field values needed to reconstruct what went wrong.
- **Failure atomicity**: The property that a failed method leaves the object unchanged or consistently documented.

## Mental Models
- Think of a checked exception as a design-time mandate to recover, not as a more serious stack trace.
- Treat every `readObject`-style or mutating operation as a transaction with a commit point.
- An exception message is an incident artifact: optimize it for diagnosis, but never expose secrets.
- If you cannot state a useful recovery action, prefer an unchecked failure or an absence-returning API.

## Anti-patterns
- **Exceptions as loop control**: It hides the termination condition and may swallow unrelated defects.
- **`throws Exception` on public APIs**: It communicates no actionable contract and obscures specific failures.
- **Mindless lower-layer propagation**: It couples callers to implementation details.
- **Empty catch blocks**: They silently convert a detected failure into later, harder-to-diagnose corruption.
- **Secret-bearing detail messages**: Stack traces can be broadly visible during operations and incident response.
- **Mutation before validation**: A later failure can leave the receiver partially updated.

## Code Examples
```java
public void transfer(Account source, Account target, Money amount)
        throws InsufficientFundsException {
    requireValid(amount);
    if (!source.canWithdraw(amount)) {
        throw new InsufficientFundsException(source.id(), amount,
                source.balance());
    }
    source.withdraw(amount);
    target.deposit(amount);
}

private static void load(Path path) throws ConfigException {
    try {
        Files.readString(path);
    } catch (NoSuchFileException e) {
        throw new ConfigException("Configuration file is unavailable", e);
    }
}
```
- **What it demonstrates**: Validate before mutation, expose recovery data through a typed exception, and translate a filesystem detail into a configuration abstraction.

## Reference Tables

| Situation | Preferred result | Typical type |
|---|---|---|
| Invalid non-null argument | Reject immediately | `IllegalArgumentException` |
| Null where prohibited | Reject immediately | `NullPointerException` |
| Invalid receiver state | Reject invocation | `IllegalStateException` |
| Invalid index | Reject range violation | `IndexOutOfBoundsException` |
| Unsupported optional operation | Reject operation | `UnsupportedOperationException` |
| Recoverable external condition | Force useful handling | Specific checked exception |
| Programming error | Fail fast | Specific `RuntimeException` |

| Technique | Best fit | Main cost or caveat |
|---|---|---|
| Precondition validation | Simple mutable operations | Validation may duplicate computation |
| Temporary copy then commit | Complex transformations | Extra memory and copying |
| Immutable result construction | Immutable value types | New object may not be created |
| Rollback | Durable or transactional state | High implementation complexity |

## Worked Example
Suppose `Stack.pop` decrements `size` before reading its element.
An empty stack then throws an array exception after `size` becomes negative, so every later operation sees corrupt state.
The failure-atomic version checks emptiness first, reads `elements[size - 1]`, clears the obsolete reference, decrements `size`, and returns the value.
The exception is now both appropriate to the abstraction and safe for callers to recover from.

## Key Takeaways
1. Never use exceptions for ordinary iteration or predictable branching.
2. Choose checked exceptions only when callers can prevent or recover from the condition.
3. Reuse standard exception types according to their documented semantics.
4. Translate exceptions at abstraction boundaries and chain causes when useful.
5. Document checked and unchecked exceptions with precise `@throws` conditions.
6. Include diagnostic inputs in detail messages without including credentials or keys.
7. Make specified failures failure-atomic and never ignore an exception without a documented reason.

## Connects To
- **Chapter 8: Methods**: Parameter validation, defensive copying, and API documentation determine exception contracts.
- **Chapter 11: Concurrency**: Synchronization failures can prevent failure atomicity and make recovery unsafe.
- **Chapter 12: Serialization**: Deserialization is a hidden constructor that must validate state defensively.
- **Transactions**: Validate, stage, and commit is the same structure used by reliable storage and messaging code.
