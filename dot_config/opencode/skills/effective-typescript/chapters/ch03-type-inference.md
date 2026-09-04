# Chapter 3: Type Inference

## Core Idea

TypeScript’s type inference is not a fallback for missing annotations.
It is the normal mechanism that carries information from values, declarations, control flow, context, and standard library operations through a program.
Write explicit types where they state an externally useful contract, prevent an error from escaping its origin, or restore context that refactoring removed.
Otherwise, let inference reduce duplication and preserve refactorability.

## Frameworks Introduced

* **Item 19: Avoid Cluttering Your Code with Inferable Types**: annotate API surfaces intentionally, not every local binding.
* **Item 20: Use Different Variables for Different Types**: one variable should stand for one coherent concept and normally retain one type.
* **Item 21: Understand Type Widening**: inference generalizes a literal to balance accuracy with permitted mutation; control it with `const`, annotations, context, and `as const`.
* **Item 22: Understand Type Narrowing**: runtime checks and control flow reduce a union to a useful subset.
* **Item 23: Create Objects All at Once**: define object shape at construction, using spread and new variables to form new types.
* **Item 24: Be Consistent in Your Use of Aliases**: a refinement follows the checked name, not every alias or mutable property relationship.
* **Item 25: Use async Functions Instead of Callbacks for Asynchronous Code**: promises compose types and `async` enforces consistently asynchronous results.
* **Item 26: Understand How Context Is Used in Type Inference**: a value inline at a call site has expected-type context that a detached variable may lose.
* **Item 27: Use Functional Constructs and Libraries to Help Types Flow**: typed transformations propagate result types better than accumulator-heavy loops.

## Key Concepts

**Annotation placement.** Function parameters usually need annotation because their types are not inferred from their eventual body use.
Local variables derived from typed parameters usually do not.
Object literals and function return types are valuable exceptions: they establish a checked definition-site contract, enable excess-property checks, and stop implementation mistakes from appearing later as consumer errors.

**Stable variables.** A `let` binding has one declared or inferred type, although control flow can narrow a union temporarily.
If a variable first means an external product ID and later means a numeric serial number, it represents two concepts, not one `string | number` variable.
Separate `const` names improve inference, readability, and later operations.

**Widening.** The literal `'x'` may become `string`, and `[1, 2, 3]` may become `number[]`, because the checker must allow plausible future writes.
`const` preserves scalar literal types, but object properties are still widened because the object remains mutable.
`as const` applies the narrowest deeply readonly literal inference.

**Narrowing.** Truthiness, equality, `typeof`, `instanceof`, `in`, `Array.isArray`, discriminant switches, early exits, and type predicates can turn a broad type into a useful one.
The test must match JavaScript behavior: `typeof null === "object"`, and `!x` does not prove that `x` is absent when `0` and `""` are legal values.

**Contextual typing.** Inline arguments and callbacks receive types from their consumer.
Extracting them can alter inferred types even though JavaScript behavior is unchanged.
Restore information with a declaration, a whole-function annotation, or `as const` when the value is genuinely immutable.

**Type flow.** `map`, `filter` with a type guard, `flat`, `Promise.all`, and well-typed library chains create a new value with a computed type at each stage.
Imperative construction often needs a hand-written accumulator type and permits accidental mutation or `any[]` inference.

## Mental Models

| Situation | Inference question | Best lever |
| --- | --- | --- |
| Local value comes directly from a typed expression | Is an annotation merely repeating the source? | Omit it. |
| Object literal implements a known domain object | Should invalid or extra fields fail here? | Annotate the literal. |
| Function defines a public boundary | Where should a return-contract violation appear? | Annotate the return type. |
| Literal needs a finite union | Can the binding change later? | `const`, or `let name: Union`. |
| Array must retain length/order | Is it a tuple and will a callee mutate it? | Tuple annotation, or `as const` plus readonly parameter. |
| Unknown union needs behavior | What runtime fact distinguishes variants? | A guard, tag, or property test. |
| Callback is factored out | Which consumer formerly supplied parameter types? | Give the function the callback type. |

Inference is local and explainable, not psychic.
TypeScript generally chooses a type where the binding originates rather than inferring from arbitrary later uses, avoiding “spooky action at a distance.”

## Anti-patterns

| Anti-pattern | Why it harms code | Prefer |
| --- | --- | --- |
| `const id: number = product.id` everywhere | Redundant types become stale after refactors | Infer local derived values. |
| Reusing `id` for a string then a number | Couples unrelated concepts and forces a union | Separate, well-named `const` bindings. |
| `let axis = 'x'` passed where `'x' \| 'y' \| 'z'` is required | It widens to `string` | `const axis = 'x'` or an explicit union. |
| Asserting incomplete objects with `as Point` | Hides construction errors | Construct all fields in one literal. |
| Checking one alias and reading another | The second name remains unrefined | Check and use the same local alias. |
| Using truthiness to distinguish absence from zero/empty string | It does not express the real test | Compare against `null` or `undefined` as appropriate. |
| Callback-based cache with sync hits and async misses | Callers observe inconsistent timing | An `async` function that always returns `Promise<T>`. |
| Manual collection loops by default | Requires accumulator annotations and obscures transformations | Built-in functional operations or a typed utility library. |

## Code Examples

### Preserve contracts, infer implementation details

```ts
interface Product {
  id: string
  name: string
  price: number
}

function logProduct(product: Product) {
  const { id, name, price } = product
  console.log(id, name, price)
}

function getQuote(ticker: string): Promise<number> {
  return fetch(`https://quotes.example.com/?q=${ticker}`)
    .then((response) => response.json())
}
```

The parameter and return type form durable contracts; the destructured locals stay aligned when `Product` changes.

### Select widening deliberately

```ts
interface Vector3 {
  x: number
  y: number
  z: number
}

function getComponent(vector: Vector3, axis: "x" | "y" | "z") {
  return vector[axis]
}

const axis = "x"
getComponent({ x: 10, y: 20, z: 30 }, axis)

const origin = [0, 0] as const
// origin: readonly [0, 0]
```

If `axis` must later change, use `let axis: "x" | "y" | "z" = "x"` rather than pretending a mutable variable is one literal.

### Narrow with evidence rather than assertions

```ts
interface UploadEvent {
  type: "upload"
  filename: string
  contents: string
}

interface DownloadEvent {
  type: "download"
  filename: string
}

type AppEvent = UploadEvent | DownloadEvent

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case "upload":
      return event.contents.length
    case "download":
      return event.filename.length
  }
}
```

For reusable runtime facts, encode a predicate:

```ts
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

const members = ["Janet", "Michael"]
  .map((name) => ["Jackie", "Tito", "Michael"].find((member) => member === name))
  .filter(isDefined)
// string[]
```

### Build shapes in one expression

```ts
interface Point {
  x: number
  y: number
}

const point: Point = { x: 3, y: 4 }
const namedPoint = { ...point, name: "Pythagoras" }
```

When construction must be staged, create a fresh spread value at each stage so inference observes a new shape.

### Make an API consistently asynchronous

```ts
const cache: Record<string, string> = {}

async function fetchWithCache(url: string) {
  if (url in cache) return cache[url]
  const response = await fetch(url)
  const text = await response.text()
  cache[url] = text
  return text
}
```

Both branches now produce `Promise<string>`, so callers can reason about ordering with `await`.

## Reference Tables

| Inference control | Effect | Trade-off |
| --- | --- | --- |
| `const value = 'x'` | Keeps scalar literal type `'x'` | Binding cannot be reassigned. |
| `let value: Language = 'x'` | States a mutable finite domain | Annotation is needed and should be maintained. |
| Contextual argument | Consumer supplies expected type | Extracting the value can remove context. |
| `value as const` | Deeply readonly narrow literals and tuples | Can surface errors at a later use site. |
| Explicit object annotation | Validates definition and excess fields | Do not add merely duplicative local annotations. |
| Explicit return type | Locks function contract and localizes errors | More deliberate API design is required. |

| Narrowing form | Suitable evidence | Caveat |
| --- | --- | --- |
| `if (value)` | Nullish or falsy values are all invalid | Do not use if `0` or `""` is valid. |
| `value === undefined` | Specifically absent optional result | Preserve other falsy values. |
| `typeof value === 'string'` | Primitive category | `null` is historically `'object'`. |
| `value instanceof C` | Actual class instance | Interfaces have no runtime constructor. |
| `'key' in value` | Property distinguishes union variants | Prefer a discriminant for complex variants. |
| `value is T` | A tested reusable predicate | Predicate implementation must be truthful. |

## Worked Example

An inline tuple works, but a seemingly harmless extraction breaks it:

```ts
function panTo(where: [number, number]) {}

panTo([10, 20])

const loc = [10, 20]
panTo(loc)
// Error: number[] is not assignable to [number, number]
```

The inline value is contextually typed by `panTo`; `loc` is inferred in isolation as a mutable variable-length array.
Choose a solution based on ownership and mutation:

```ts
const loc: [number, number] = [10, 20]
panTo(loc)
```

When the coordinate is a true immutable constant, publish a non-mutating API instead:

```ts
function panTo(where: readonly [number, number]) {}

const loc = [10, 20] as const
panTo(loc)
```

This makes the function’s no-mutation contract visible and permits readonly callers.
Use the annotation form when the tuple will change, or when the definition site should receive the clearest diagnostic for a bad length.

## Key Takeaways

* Favor inferred local types and explicit function signatures.
* Annotate literals and return types when they improve error locality or establish a durable contract.
* Use a new, meaningful variable for each concept instead of broadening a reused one.
* Diagnose widening with the editor, then choose `const`, context, annotation, or `as const` intentionally.
* Model runtime distinctions with control flow, discriminants, and type guards rather than assertions.
* Build object shapes all at once and use spread to create typed extensions.
* Check and use the same alias; trust local refinements more than mutable property refinements.
* Prefer `async`/`await` and promises for consistent timing and type flow.
* Expect factoring to remove contextual typing, then restore the right contract deliberately.
* Favor typed transformations that return new values over manual mutable accumulation.

## Connects To

Chapter 1 explains why inference remains a static approximation and why runtime validation still belongs at system boundaries.
Chapter 2 supplies the set, `readonly`, function-type, generic, and type-guard tools used to direct inference.
Chapter 4 uses these inference results to create valid-state unions, null-safe boundaries, precise external APIs, and types that reflect domain invariants.
