# Chapter 6: Types Declarations and @types

## Core Idea

Type declarations are executable API contracts for the compiler, editor, and every TypeScript consumer of a library.

Dependency choices, declaration precision, documentation, callback context, and declaration tests therefore affect runtime correctness indirectly by determining what bad calls are prevented and what good calls remain ergonomic.

Treat `.d.ts` files as public product code: version them deliberately, expose their surface honestly, document intent, and test the types that users actually infer.

## Frameworks Introduced

### Item 45: Put TypeScript and @types in devDependencies

Runtime implementation packages belong in `dependencies`; the compiler and declaration-only packages belong in `devDependencies` because neither is needed to execute published JavaScript.

### Item 46: Understand the Three Versions Involved in Type Declarations

For an unbundled typed library, maintain compatibility among the runtime package version, its `@types` declaration version, and the project's TypeScript version.

### Item 47: Export All Types That Appear in Public APIs

A type occurring in an exported signature is effectively public even if it is not named in the module's export list.

Export it explicitly rather than requiring consumers to reconstruct it with utility types.

### Item 48: Use TSDoc for API Comments

Use `/** ... */` TSDoc comments on exported symbols and fields so language services surface concise usage guidance at the call site.

### Item 49: Provide a Type for this in Callbacks

When a library invokes a callback with a specific `this`, model that dynamic binding in the callback type with a fake `this` parameter.

### Item 50: Prefer Conditional Types to Overloaded Declarations

When output depends on input shape, prefer one generic conditional declaration that distributes over unions instead of overload lists that only model individual cases.

### Item 51: Mirror Types to Sever Dependencies

Use structural typing to declare the small capability your public API needs instead of exposing a nonessential foreign type dependency.

### Item 52: Be Aware of the Pitfalls of Testing Types

Test declaration behavior, but distinguish assignability from exact inference and use an external type-test mechanism such as `dtslint` when exact inspection matters.

## Key Concepts

Package sections express different responsibilities.

```json
{
  "dependencies": { "react": "^16.8.6" },
  "devDependencies": {
    "typescript": "^3.5.3",
    "@types/react": "^16.8.19"
  }
}
```

Install TypeScript locally so builds, CI, and collaborators execute the same compiler with `npx tsc` instead of relying on a mutable global installation.

An `@types` package supplies declarations only; installing it as a runtime dependency makes downstream JavaScript users download a development artifact without benefit.

The declaration ecosystem has three independently changing versions.

| Version | What it describes | Common mismatch symptom | Usual repair |
| --- | --- | --- | --- |
| Library | Runtime code and API | Runtime method absent despite clean types | Upgrade/downgrade library and typings together |
| `@types/library` | Declared public API | New API rejected or old API advertised | Align major/minor API version |
| TypeScript | Syntax and type-system support | Errors inside `.d.ts` files | Upgrade TypeScript or select compatible declarations |

The package and matching `@types` versions may legitimately have different patch components: one tracks runtime patches and the other tracks declaration fixes.

If two dependencies require incompatible copies of the same `@types` package, npm may nest them, but globally visible declarations can collide or fail declaration merging.

Use `npm ls @types/foo` to diagnose the parent requirements, then align or update the conflicting packages.

Bundled declarations, normally pointed to by a package's `"types"` field, eliminate a separate runtime/type API version mismatch and work especially well when `tsc` generates them from TypeScript source.

They also couple every consumer to the package author's declaration maintenance and TypeScript compatibility decisions.

For a JavaScript-authored package, DefinitelyTyped can be a better maintenance model because its community supports declaration patches, multiple package versions, and compiler evolution.

Public signature types cannot actually be kept secret.

```ts
interface SecretName {
  first: string;
  last: string;
}

interface SecretSanta {
  name: SecretName;
  gift: string;
}

export function getGift(name: SecretName, gift: string): SecretSanta;

type MyName = Parameters<typeof getGift>[0];
type MySanta = ReturnType<typeof getGift>;
```

The consumer can infer the hidden types, so library authors should export `SecretName` and `SecretSanta` with stable names and documentation.

TSDoc is editor-facing documentation, not a replacement type system.

```ts
/**
 * Generate a greeting formatted for display.
 * @param name Name of the person to greet.
 * @param title The person's title.
 * @returns A human-readable greeting.
 */
export function greet(name: string, title: string) {
  return `Hello ${title} ${name}`;
}
```

Use TypeScript syntax for types rather than JSDoc type tags in a `.ts` declaration.

Document constraints, units, ownership, valid ranges, effects, and semantics that a type alone cannot communicate.

`this` is decided by invocation, unlike lexical variables.

Extracting a prototype method loses the receiver unless it is bound or called with `.call`.

Library declarations need to express a supplied callback receiver explicitly.

```ts
function addKeyListener(
  el: HTMLElement,
  fn: (this: HTMLElement, e: KeyboardEvent) => void,
) {
  el.addEventListener("keydown", (event) => fn.call(el, event));
}

addKeyListener(document.body, function (event) {
  this.innerHTML = event.key; // this: HTMLElement
});
```

The `this: HTMLElement` parameter is erased and does not consume a positional argument, but it requires the implementation to invoke the callback with a valid receiver.

An arrow callback intentionally captures lexical `this`, so it cannot receive the dynamic `this` supplied by such an API.

Conditional types preserve input/output relations that overloads often lose.

```ts
function double<T extends number | string>(
  value: T,
): T extends string ? string : number;
function double(value: any) {
  return value + value;
}
```

For `T = number | string`, a naked conditional type distributes across the union, yielding `number | string`.

That makes a function accepting a union usable without a hand-maintained catch-all overload.

Structural typing lets a library expose only the capability it consumes.

```ts
interface CsvBuffer {
  toString(encoding: string): string;
}

function parseCSV(contents: string | CsvBuffer): {[column: string]: string}[] {
  const text = typeof contents === "string" ? contents : contents.toString("utf8");
  return parseRows(text);
}
```

A Node `Buffer` remains assignable to `CsvBuffer`, while browser consumers are not forced to import `@types/node` merely because a convenience overload supports Node.

Testing a type with `assertType<T>(value)` only tests assignability.

It will accept a result with extra fields and, because JavaScript allows extra arguments, may accept a one-parameter function where a two-parameter function type was expected.

Inspect inferred parameter and `this` types in callback tests, and separately inspect `Parameters<typeof fn>` and `ReturnType<typeof fn>` when function arity is part of the contract.

## Mental Models

- **Declarations are a second implementation.** Runtime behavior and type behavior must evolve together, but their failures differ.
- **There are three clocks.** Package, declaration, and compiler release cadences are independent; dependency debugging starts by identifying which clock drifted.
- **A public signature commits a shape.** Hiding the interface declaration does not hide the contract from consumers.
- **`this` is an input channel.** If a callback receives it, omitting it from the type discards a material part of the API.
- **Overloads enumerate; conditional types compute.** Computing a relationship generalizes to unions automatically.
- **Type tests need an oracle.** Assignability proves compatibility, not exact inferred type equality or absence of `any`.

## Anti-patterns

| Anti-pattern | Why it fails | Better choice |
| --- | --- | --- |
| Global `tsc` installation | Team and CI can compile with different versions | Local `typescript` in `devDependencies` |
| `@types/foo` in `dependencies` | Runtime consumers receive type-only transitive baggage | `devDependencies` |
| Update runtime package alone | New runtime API and old declaration API diverge | Upgrade matching package and `@types` together |
| `declare module "foo";` as a permanent repair | Exports become contagious `any` | Compatible types, focused augmentation, or a real declaration |
| Non-exported type in exported signature | Consumers must extract an unstable anonymous public type | Export the named type |
| `//` comments for public API guidance | Editors usually do not show it at use sites | Concise TSDoc |
| Callback type omits dynamic receiver | Consumer code loses checked `this` semantics | `(this: Context, ...args) => Result` |
| Overloads for each primitive case | Union input often matches none or needs redundant overload | Generic conditional return |
| Public API accepts `Buffer` only for convenience | Unnecessary Node type dependency leaks to web consumers | Mirror `toString(encoding: string): string` |
| `assertType` alone | Checks assignability and can miss `any` | Exact inference tests with `dtslint` or equivalent |

## Code Examples

### Export the actual contract

```ts
// Before: API types are technically reachable but inconvenient.
interface Options { retries: number; }
export function connect(options: Options): Client;

// After: imports, documentation, and semver discussion have stable names.
export interface Options { retries: number; }
export interface Client { close(): Promise<void>; }
export function connect(options: Options): Client;
```

### Replace overloads with a relation

```ts
// Before: cannot accept string | number without an extra overload.
declare function normalize(value: string): string;
declare function normalize(value: number): number;

// After: distribution models each member of a union.
declare function normalize<T extends string | number>(
  value: T,
): T extends string ? string : number;
```

### Test callback context and inference

```ts
const names = ["john", "paul"];
map(names, function (name, index, array) {
  name;  // $ExpectType string
  index; // $ExpectType number
  array; // $ExpectType string[]
  this;  // $ExpectType string[]
  return name.length;
}); // $ExpectType number[]
```

The non-arrow function is intentional: it exposes the callback's dynamic `this` for inspection.

## Reference Tables

| Publishing situation | Recommended declaration strategy | Reason |
| --- | --- | --- |
| Library written in TypeScript | Bundle generated `.d.ts` | Source and declaration versions can move together |
| Library written in JavaScript | Consider DefinitelyTyped | Community maintenance and version support reduce author burden |
| Need a tiny foreign type capability | Mirror the minimum structural interface | Avoid nonessential `@types` coupling |
| Depend on foreign implementation substantially | Declare the type dependency explicitly | Large copied type surfaces become a hidden maintenance fork |
| Temporary missing API in declarations | Local augmentation | Preserves checking while upstream catches up |

| Type-test technique | Detects well | Misses or risks |
| --- | --- | --- |
| Calling the API | Obvious parameter-count/type errors | Return precision and `any` |
| Assignment to `T` | Basic assignability | Extra object properties; exact function arity |
| `assertType<T>(value)` | Same check without unused variable | Equality and `any` leaks |
| `Parameters` / `ReturnType` assertions | Function components | Full callback inference unless inspected |
| `dtslint` `$ExpectType` | Compiler-inferred display type | Text ordering differences in equivalent unions |

## Worked Example

Suppose a CSV package supports strings and Node buffers and offers a transform callback.

```ts
// Before: consumers need Node declarations and callback context is undocumented.
export declare function parseCSV(
  input: string | Buffer,
  transform: (row: any) => any,
): any[];
```

Model only the required input capability, publish the row shape, and state whether the callback uses `this`.

```ts
/** Data source that can decode its contents as text. */
export interface CsvBuffer {
  toString(encoding: string): string;
}

/** One parsed CSV row keyed by header name. */
export type CsvRow = {[column: string]: string};

/** Parse CSV and transform every row with the supplied column map as `this`. */
export declare function parseCSV<T>(
  input: string | CsvBuffer,
  transform: (this: string[], row: CsvRow, index: number) => T,
): T[];
```

Then test the contract at the inference points users rely on.

```ts
parseCSV("name\nAda", function (row, index) {
  row.name; // $ExpectType string
  index;    // $ExpectType number
  this;     // $ExpectType string[]
  return row.name.length;
}); // $ExpectType number[]
```

This declaration avoids a transitive Node requirement for browser users, keeps TypeScript users honest about `this`, and catches a regression such as changing `row` to `any` that normal call-only tests might not expose.

## Key Takeaways

- Pin the compiler locally and classify type-only packages as development dependencies.
- Diagnose declaration errors by checking library, `@types`, and TypeScript versions together.
- Export all named types present in public signatures and document the semantic parts with TSDoc.
- Make callback `this` explicit when invocation supplies a receiver.
- Use conditional types for correlated APIs that must support union inputs.
- Mirror only small, nonessential structural dependencies in public declarations.
- Test type inference, callback parameters, and `this`, not merely whether calls compile.

## Connects To

- Item 3 explains why types disappear at runtime, which is why TypeScript and `@types` are development tooling.
- Item 4's structural typing makes type mirroring viable and explains why public types can be reconstructed.
- Item 29's correlated input/output guidance leads directly to conditional types in Item 50.
- Item 30's advice to avoid redundant type prose applies to TSDoc: describe semantics rather than restating annotations.
- Item 38 and Item 44 explain why weak declarations and `declare module` stubs are dangerous sources of `any`.
- Item 49's callback model is essential when declaration tests cover browser and library callback APIs.
- Chapter 8 begins migration by installing accurate `@types`, then uses those contracts to surface real JavaScript errors.
