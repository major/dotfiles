# Behavior and Coverage

## Case-selection matrix

Use the matrix to select cases where the observable result or safety contract changes.

| Input or condition | Minimum case | Assert |
| --- | --- | --- |
| Normal input | One representative success case. | Result and meaningful effects. |
| Invalid or malformed input | One rejection per distinct contract. | Exception, message or code, and no forbidden effect. |
| Empty or absent input | One case for each supported meaning. | Empty result, default, skip, or error. |
| Boundary value | Just below, at, and just above when behavior changes. | Limit behavior and preservation. |
| Partial or interrupted operation | One recoverable and one unrecoverable case. | Partial-result policy and cleanup. |

## Assertion quality

- Assert returned data, raised errors, state changes, emitted output, or side effects that callers can observe.
- Pair a rejection assertion with proof that forbidden writes, calls, or mutations did not occur.
- A test is vacuous when it can pass after the behavior is removed, bypassed, or replaced with an unrelated result.
- Assert stable contracts rather than private helpers, incidental call order, or every mock call.

## Coverage decisions

- Line coverage answers whether executable lines ran, while branch coverage answers whether decision outcomes ran.
- Use branch coverage when an `if`, fallback, exception handler, version gate, or early return changes behavior.
- Do not add execution-only tests to reach a percentage, and inspect uncovered branches after focused runs.
- Force supported version branches deterministically instead of relying on the current interpreter path.
- Keep statement and branch coverage artifacts separate when the tooling requires distinct stores.

## Provenance, precedence, and fallback

- Test success, failure, empty, malformed, and boundary paths whenever each has a distinct contract.
- When sources conflict, test the documented precedence and the losing source's effect on the result.
- Test trusted and untrusted provenance separately when equivalent values receive different validation or handling.
- Test fallback activation, fallback failure, and preservation of the primary result and user-supplied values.
- Test defaults, retries, normalization, and fallback logic for accidental overwriting of current caller values.

## External and collection semantics

- Test pagination termination, duplicate or missing-page handling, and the contract for partial results.
- Test transport errors where they are translated or propagated, including cleanup and error identity when relevant.
- Test archive and path safety with regular entries, absolute paths, traversal, symlinks, and hardlinks when supported.
- Prove rejected path input cannot write outside the controlled temporary directory, including setup and error paths.
