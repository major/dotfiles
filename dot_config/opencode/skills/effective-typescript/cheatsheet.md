# Implementation and Review Cheatsheet

## Decision Rules

| If you need to... | Default | Check before merging | References |
| --- | --- | --- | --- |
| Accept external data | `unknown` plus runtime validation | Every use occurs after narrowing | 33-34, 42 |
| Represent conditional state | Discriminated union of complete variants | Invalid field combinations are impossible | 28, 31-32 |
| Relate types | Derive with type operators or generics | There is one source of truth | 14, 18, 35 |
| Preserve a literal | Supply intentional context or narrow declaration | Widening does not erase required distinction | 21, 26 |
| Describe public behavior | Explicit exported API types and TSDoc | Runtime and declaration agree | 47-48 |
| Use dynamic keys | Index signature with realistic value uncertainty | Known keys are not being discarded unnecessarily | 15-16 |
| Suppress a type error | Local, justified assertion in typed wrapper | Runtime precondition proves it | 9, 40 |
| Choose a language feature | ECMAScript behavior first | Emitted JavaScript and runtime target support it | 1, 3, 53 |

## Decision Paths

### A type error appears

1. Inspect the inferred types and declaration in the editor.
2. Decide whether the runtime code, the stated type, or the API model is wrong.
3. Narrow with a runtime check if the value is uncertain.
4. Derive a relation if duplicate types drifted.
5. Assert only when a local runtime guarantee cannot be expressed otherwise.

### A function or API is being designed

1. List valid states and required caller inputs.
2. Use variants and discriminants for mutually exclusive cases.
3. Accept flexible safe input, return the most precise honest output.
4. Add `readonly` when mutation is not contractual.
5. Export types that cross the public boundary.

### JavaScript is being migrated

1. Modernize JavaScript.
2. Trial checks with `@ts-check` and JSDoc.
3. Enable `allowJs` for incremental conversion.
4. Convert dependency leaves before dependents.
5. Enable `noImplicitAny` before calling it complete.

## Trade-off Matrix

| Choice | Gain | Cost | Prefer when |
| --- | --- | --- | --- |
| Inference | Less duplication, preserved relationships | Intent can be less visible | Local implementation is obvious |
| Annotation | Visible contract | Can widen or drift | Public boundary or ambiguity |
| `unknown` | Forces proof before use | Requires narrowing code | Input is untrusted |
| `any` | Short-term escape | Disables safety transitively | Only contained legacy or interop boundary |
| Union of interfaces | Valid combinations and narrowing | More named variants | Fields correlate by state |
| Interface of unions | Compact syntax | Allows invalid combinations | Fields are truly independent |
| Conditional type | One expressed relationship | Complex diagnostics | Output systematically depends on input |
| Overloads | Familiar call signatures | Duplication and gaps | Calls have materially separate behavior |

## Review Defaults

- Enable and understand strict checking options.
- Favor primitive `string`, `number`, and `boolean`, never wrapper object types.
- Favor declarations over assertions.
- Favor `async` and promises over callback control flow.
- Favor arrays, tuples, and `ArrayLike` over numeric index signatures.
- Favor generated types from authoritative APIs or specs over sampled data.
- Favor source maps for debugging emitted TypeScript.

## Smells to Investigate

- `as any`, broad `any`, or a growing `any` coverage count.
- Optional properties used to encode mutually exclusive states.
- Types copied into documentation or repeated across declarations.
- Object literals bypassing presumed exactness through aliases or variables.
- A callback whose `this` contract is implicit.
- A `.d.ts` declaration promising behavior the runtime does not have.
- Reliance on TypeScript `private` for runtime secrecy.
- A migration declared complete while implicit `any` remains allowed.
