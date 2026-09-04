# Practical Patterns

## Inspect before annotating

**When to use:** Inferred types are unclear, an error message seems implausible, or a declaration's behavior is uncertain.

**How:** Use editor hover, go-to-definition, rename, and the compiler's full diagnostics to inspect the expression, its declaration, and call sites.
Annotate only an API boundary, ambiguity, or intended invariant that inference cannot communicate.

**Trade-offs:** Inference reduces duplication but can hide a changed contract from a reader.
An annotation documents intent but can widen, lie, or become stale.

**References:** Items 2, 6, 19; [chapters 1](chapters/ch01-getting-to-know-typescript.md), [3](chapters/ch03-type-inference.md).

## Derive related types

**When to use:** Two types represent the same fields, a function preserves a relationship, or an API/spec already defines data shape.

**How:** Use `keyof`, indexed access, `typeof`, generics, mapped types, conditional types, or generation from the authoritative API/spec.
Export the resulting public types when consumers need them.

**Trade-offs:** Derivation prevents drift but can create error messages and declarations harder to read.
Name important intermediate concepts rather than duplicating fields.

**References:** Items 12-14, 18, 35, 47, 50-51; [chapters 2](chapters/ch02-typescripts-type-system.md), [4](chapters/ch04-type-design.md), [6](chapters/ch06-type-declarations-and-at-types.md).

## Model valid states as variants

**When to use:** Fields are conditionally present, state transitions matter, or consumers must branch by kind.

**How:** Define a union of complete interfaces with a literal discriminant.
Represent each valid case directly and narrow on the discriminant before accessing variant fields.
Keep `null` at input or output boundaries where possible.

**Trade-offs:** More variants increase declarations and branch handling.
They replace invalid combinations, optional-field guessing, and non-null assertions with compiler-checked control flow.

**References:** Items 28, 31-33, 36; [chapter 4](chapters/ch04-type-design.md).

## Validate boundaries, then narrow

**When to use:** Parsing JSON, accepting external input, traversing DOM, reading dynamic maps, or calling untyped code.

**How:** Receive `unknown`, run runtime checks or a validator, then expose a narrow, trustworthy result.
Use index signatures only when keys are truly dynamic, and choose arrays, tuples, or `ArrayLike` for numeric sequences.

**Trade-offs:** Validation costs code and runtime work.
Assertions are shorter but transfer all failure risk to downstream code.

**References:** Items 15-16, 33-34, 42, 55; [chapters 2](chapters/ch02-typescripts-type-system.md), [4](chapters/ch04-type-design.md), [5](chapters/ch05-working-with-any.md), [7](chapters/ch07-writing-and-running-your-code.md).

## Contain unavoidable unsafety

**When to use:** A library declaration is incomplete, an API cannot express a runtime guarantee, or a narrow interop point requires an assertion.

**How:** Choose the most precise alternative to `any`.
Place the assertion in a small function with a typed signature and runtime preconditions.
Keep its scope local and track `any` coverage to avoid regression.

**Trade-offs:** A wrapper centralizes audit and future fixes but adds an API boundary.
Broad `any` is expedient only at the cost of propagating unchecked operations.

**References:** Items 38-44; [chapter 5](chapters/ch05-working-with-any.md).

## Express immutability and ownership

**When to use:** A function should observe rather than mutate caller-owned data, or mutation causes aliasing bugs.

**How:** Accept `readonly` arrays and object properties where mutation is not part of the contract.
Use aliases consistently, and create fully formed objects instead of mutating a partially typed accumulator.

**Trade-offs:** `readonly` may require copies or different APIs for intentional updates.
It prevents mutations through the typed reference, not all mutation through other aliases.

**References:** Items 17, 23-24; [chapters 2](chapters/ch02-typescripts-type-system.md), [3](chapters/ch03-type-inference.md).

## Maintain truthful published declarations

**When to use:** Publishing a package, augmenting a library, or repairing an inaccurate `.d.ts` file.

**How:** Keep TypeScript, runtime package, and `@types` versions compatible.
Export public types, document APIs with TSDoc, specify callback `this`, and test types with awareness of declaration-testing pitfalls.

**Trade-offs:** Accurate types are part of the product contract and require maintenance alongside runtime changes.
Incomplete types are safer than precise-looking false promises.

**References:** Items 34, 45-52; [chapters 4](chapters/ch04-type-design.md), [6](chapters/ch06-type-declarations-and-at-types.md).

## Migrate in dependency order

**When to use:** Converting a JavaScript codebase gradually.

**How:** Modernize JavaScript first, trial checking with `@ts-check` and JSDoc, enable `allowJs`, then convert modules from leaves upward through the dependency graph.
Finish by enabling `noImplicitAny`.

**Trade-offs:** Mixed code enables delivery but extends two-language maintenance.
Converting entry points first creates more untyped pressure on dependencies.

**References:** Items 58-62; [chapter 8](chapters/ch08-migrating-to-typescript.md).
