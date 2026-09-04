# Chapter 5: Working with any

## Core Idea

`any` is TypeScript's escape hatch for gradual typing, not a normal application type.

It is useful when JavaScript reality is temporarily broader than the type system or when a local implementation boundary cannot be expressed economically.

Its cost is exceptional because it both accepts every value and is accepted as every type, so it removes checking and contaminates inferred types downstream.

Treat every `any` as a bounded, reviewed exception with a reason, a small scope, and an eventual removal path.

## Frameworks Introduced

### Item 38: Use the Narrowest Possible Scope for any Types

Constrain an assertion to the exact argument or property that needs it rather than widening a variable or object.

Keep an explicit return type at public or inference-sensitive boundaries so an accidental `any` cannot escape through inference.

### Item 39: Prefer More Precise Variants of any to Plain any

When dynamic data has known shape, retain that shape with `any[]`, `any[][]`, `{[key: string]: any}`, or callable signatures such as `(...args: any[]) => any`.

### Item 40: Hide Unsafe Type Assertions in Well-Typed Functions

Put a necessary assertion inside a function whose exported generic signature states the actual contract.

This turns many scattered unchecked call sites into one auditable implementation boundary.

### Item 41: Understand Evolving any

An unannotated `let` or empty array can begin as implicit `any` or `any[]` and acquire a union from writes under `noImplicitAny`.

This is special inference behavior, not ordinary narrowing, and it does not cross arbitrary callback boundaries.

### Item 42: Use unknown Instead of any for Values with an Unknown Type

Use `unknown` for values that exist but whose shape has not yet been established.

Consumers must validate or assert before use, keeping uncertainty at the input boundary rather than spreading it.

### Item 43: Prefer Type-Safe Approaches to Monkey Patching

Prefer redesigning global or DOM-attached state into structured state.

If a legacy integration requires a patch, use declaration augmentation or a deliberate local extended-interface assertion, never `(x as any).property` as a permanent design.

### Item 44: Track Your Type Coverage to Prevent Regressions in Type Safety

`noImplicitAny` catches only implicit declarations.

Track explicit and declaration-supplied `any` with a coverage tool and investigate regressions like test failures.

## Key Concepts

`any` differs from imprecise unions because it bypasses the checker in both directions.

```ts
declare const input: any;
const count: number = input; // Accepted regardless of runtime value.
input.notARealMethod();      // Also accepted.
```

An expression-level `as any` can be an appropriate narrow workaround when the surrounding variable retains its real type.

```ts
function processBar(bar: Bar): void {}
declare function expressionReturningFoo(): Foo;

function safeContainment() {
  const value = expressionReturningFoo();
  processBar(value as any);
  return value; // Foo, not any
}
```

In contrast, annotating `value: any` makes every later operation unchecked and makes the return type `any` unless it is explicitly constrained.

`@ts-ignore` suppresses a diagnostic while preserving the types on that line.

It is sometimes less damaging than an `any` cast but can hide future, unrelated diagnostics on the next line, so it still needs a narrowly documented reason.

Precise dynamic types preserve useful operations and return inference.

```ts
function getLengthBad(value: any) {
  return value.length; // any
}

function getLength(value: any[]) {
  return value.length; // number
}

function hasTwelveLetterKey(value: {[key: string]: any}) {
  return Object.keys(value).some((key) => key.length === 12);
}
```

`object` means any non-primitive, not “an object whose arbitrary values can be read.”

It permits enumerating keys but does not give an index signature for `value[key]`.

For functions, select the signature that models the permitted call shape instead of `any` or `Function`.

```ts
type Fn0 = () => any;
type Fn1 = (arg: any) => any;
type FnN = (...args: any[]) => any;
```

An implementation can rely on a contained unsafe assertion when its externally visible signature is correct and its preconditions are known.

```ts
function cacheLast<T extends Function>(fn: T): T {
  let lastArgs: any[] | null = null;
  let lastResult: any;
  return function (...args: any[]) {
    if (!lastArgs || !shallowEqual(lastArgs, args)) {
      lastArgs = args;
      lastResult = fn(...args);
    }
    return lastResult;
  } as unknown as T;
}
```

Review the gap between `T` and the wrapper honestly.

For example, the wrapper may not preserve a function's own properties or `this` behavior, so its signature is sound only when those parts are outside the supported contract.

Evolving `any` happens for implicit, initially uninformative storage.

```ts
const result = [];      // any[] while written
result.push("a");      // subsequently string[]
result.push(1);         // subsequently (string | number)[]
```

It is fragile when control flow reads before a write or when writes occur inside callbacks.

Use an explicit annotation when the intended invariant is stronger than the inferred accumulation.

```ts
const ids: number[] = [];
ids.push(1);
// ids.push("two"); // rejected at the source of the mistake
```

`unknown` is the top type in the useful assignability sense: every value can flow into it, but it cannot flow out to a specific type without proof.

`never` is the complementary bottom type: it can flow into every type, while no ordinary value can flow into it.

Use `instanceof`, `typeof`, property checks after null checks, or a user-defined predicate to narrow unknown data.

```ts
interface Book {
  name: string;
  author: string;
}

function isBook(value: unknown): value is Book {
  return typeof value === "object" && value !== null &&
    "name" in value && "author" in value;
}
```

A generic parser `function parse<T>(text: string): T` is not truly generic if `T` is chosen entirely by the caller without evidence.

It is a disguised assertion, so return `unknown` and make the assertion or validation visible at the use site.

For legacy mutation of built-ins, augmentation affects the global type environment.

```ts
export {};

declare global {
  interface Document {
    /** Genus or species supplied by the legacy integration. */
    monkey?: string;
  }
}
```

Use `?:` or `| undefined` if the runtime patch is applied only to some instances or after startup.

A local interface avoids global contamination but makes the assertion explicit at every legacy access.

```ts
interface MonkeyDocument extends Document {
  monkey: string;
}

(document as MonkeyDocument).monkey = "Macaque";
```

Type coverage measures symbols whose types are not `any` or aliases to `any`.

It exposes stale annotations, unsafe module stubs such as `declare module "my-module";`, and third-party declarations that silently produce unchecked values.

## Mental Models

- **`any` is a hole, not a broad set.** A union says what could happen; `any` stops the checker from asking.
- **Uncertainty needs a quarantine boundary.** `unknown` represents untrusted ingress; validate it before domain logic sees it.
- **Assertions spend a proof obligation.** Spend that budget once in a focused adapter, not repeatedly throughout business logic.
- **Inference is data flow.** A single `any` return turns callers into untyped territory, while an argument-only cast does not.
- **Global augmentation is global runtime policy.** It announces a property everywhere even when runtime initialization is conditional.
- **Type coverage is a trend metric.** Its best use is preventing a worsening baseline and prioritizing old compromises, not chasing a decorative percentage.

## Anti-patterns

| Anti-pattern | Failure mode | Prefer |
| --- | --- | --- |
| `const x: any = ...` to satisfy one call | `x` and inferred returns become unchecked | `processBar(x as any)` at the call |
| Returning `any` from an adapter or parser | Callers silently infer `any` | Return `unknown`, validate, or declare the real result |
| Casting an entire config `as any` | Correct sibling fields lose checking | Cast only the incompatible leaf |
| `(...args: any)` | Rest value itself is `any`; derived results become `any` | `(...args: any[])` |
| `parse<T>(): T` without validation | Caller-selected type masquerades as evidence | `parse(): unknown` plus guard or schema |
| `(document as any).monky` | Typos and wrong values are accepted | augmentation or `MonkeyDocument` |
| Unannotated accumulator across callbacks | Evolving-any inference cannot establish the type | `const out: number[] = []` or `map` |
| `declare module "vendor";` as a durable fix | Every exported symbol is `any` | install, write, or contribute focused declarations |

## Code Examples

### Localize a compatibility exception

```ts
// Before: loss spreads past the one disputed call.
function renderBad(value: Foo) {
  const unchecked: any = value;
  processBar(unchecked);
  return unchecked;
}

// After: Foo remains Foo for the rest of the function and its caller.
function render(value: Foo): Foo {
  processBar(value as any);
  return value;
}
```

### Validate unknown ingress

```ts
function parseBook(text: string): Book {
  const value: unknown = JSON.parse(text);
  if (!isBook(value)) throw new Error("Expected Book");
  return value;
}
```

The cast-free result makes the runtime validation, rather than caller confidence, the reason a `Book` enters the application.

### Centralize an unavoidable object-index assertion

```ts
function shallowObjectEqual<T extends object>(a: T, b: T): boolean {
  for (const [key, aValue] of Object.entries(a)) {
    if (!(key in b) || aValue !== (b as any)[key]) return false;
  }
  return Object.keys(a).length === Object.keys(b).length;
}
```

The signature remains useful to every caller, while the one assertion is justified by the preceding membership check and easy to audit.

## Reference Tables

| Type or construct | Values accepted | Operations allowed without narrowing | Typical boundary |
| --- | --- | --- | --- |
| `any` | All values | All operations | Last-resort internal escape hatch |
| `unknown` | All values | Almost none | Parsed, external, or plugin data |
| `{}` | All except `null` and `undefined` | Very little | Rarely useful, only when nullish is excluded |
| `object` | Non-primitives | Object-level operations, not arbitrary indexing | Object identity or enumeration without values |
| `any[]` | Arrays only | Array operations; element reads are `any` | Unknown element type but known collection |
| `{[key: string]: any}` | String-indexable objects | Key lookup is `any` | Dynamic records with known key shape |
| `never` | No values | N/A | Exhaustive branches and impossible states |

| Decision | Use | Review question |
| --- | --- | --- |
| One false-positive call | `as any` on the argument, or guarded `@ts-ignore` | Can the assertion be made narrower? |
| Dynamic external payload | `unknown` | Where is the guard or schema decode? |
| Generic wrapper difficult to implement | Correct public signature plus internal assertion | Does implementation preserve every promised behavior? |
| Legacy built-in patch | augmentation or local extension | Is state optional and is global scope acceptable? |
| Migration stopgap | Explicit, tracked local `any` | What removes it and how will coverage detect drift? |

## Worked Example

Consider a legacy feature reader that parses JSON, annotates DOM nodes, and caches a callback.

```ts
// Before: one source of any disables three independent checks.
function install(raw: string, el: HTMLElement, callback: any) {
  const feature: any = JSON.parse(raw);
  (el as any).feature = feature;
  return callback(feature);
}
```

First, define the payload that the application actually consumes and validate it at ingress.

```ts
interface FeatureConfig {
  enabled: boolean;
  label: string;
}

function isFeatureConfig(value: unknown): value is FeatureConfig {
  return typeof value === "object" && value !== null &&
    "enabled" in value && "label" in value;
}

function parseFeatureConfig(raw: string): FeatureConfig {
  const value: unknown = JSON.parse(raw);
  if (!isFeatureConfig(value)) throw new Error("Invalid feature config");
  return value;
}
```

Next, do not make DOM storage a hidden global protocol if a closure or `Map` can own the association.

```ts
const featureByElement = new WeakMap<HTMLElement, FeatureConfig>();

function install(
  raw: string,
  el: HTMLElement,
  callback: (feature: FeatureConfig) => void,
) {
  const feature = parseFeatureConfig(raw);
  featureByElement.set(el, feature);
  callback(feature);
}
```

The final version has no `any`: parsing is checked at the boundary, storage is structured and garbage-collection-friendly, and the callback advertises precisely what it receives.

If the legacy library truly requires `el.feature`, define a documented `interface FeatureElement extends HTMLElement { feature?: FeatureConfig }` and contain the cast at its adapter rather than weakening `install`.

## Key Takeaways

- Use `any` only as a local escape hatch and never let it become a returned inferred type.
- Preserve known structure with precise `any` variants when `any` is unavoidable.
- Encapsulate unsafe mechanics behind truthful, well-typed APIs.
- Recognize evolving `any`, but choose explicit accumulator types when correctness depends on element shape.
- Use `unknown` for unvalidated values and narrow it with runtime evidence.
- Replace monkey-patched global state with structured ownership where possible.
- Measure type coverage because explicit and dependency-supplied `any` bypass `noImplicitAny`.

## Connects To

- Item 7's set-of-values model explains why `unknown` and `never` fit assignability while `any` deliberately breaks it.
- Item 9's assertion discipline supplies the review standard for every cast contained in Item 40 or Item 43.
- Item 19's explicit return annotations stop inference from exporting accidental `any`.
- Item 22's narrowing contrasts with Item 41's write-driven evolving `any`.
- Item 35 supports replacing `unknown` assertions with generated types and validators at API boundaries.
- Chapter 6 explains how `@types` and weak declaration files become another major source of unchecked `any`.
- Chapter 8 makes `unknown`, local assertions, and coverage useful migration tools while moving a JavaScript codebase toward `noImplicitAny`.
