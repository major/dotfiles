# Chapter 4: Type Design

## Core Idea

Type design determines which states and calls can exist before implementation begins.
The best types make invalid states unrepresentable, accept reasonable input forms at a boundary, emit one canonical and easy-to-use result, preserve facts without duplicating them in prose, and accurately describe the actual external domain.
When exact modeling is infeasible, an honest incomplete type is safer than a detailed lie.

## Frameworks Introduced

* **Item 28: Prefer Types That Always Represent Valid States**: encode mutually exclusive states as discriminated unions, not correlated booleans and optional fields.
* **Item 29: Be Liberal in What You Accept and Strict in What You Produce**: accept “like” input forms and normalize them to a canonical output form.
* **Item 30: Don’t Repeat Type Information in Documentation**: types carry machine-checked structural facts; comments explain semantics, constraints, and rationale.
* **Item 31: Push Null Values to the Perimeter of Your Types**: make a compound result wholly absent or wholly present, and construct fully initialized objects.
* **Item 32: Prefer Unions of Interfaces to Interfaces of Unions**: represent correlated fields as a union of valid variants, preferably with a tag.
* **Item 33: Prefer More Precise Alternatives to String Types**: replace unconstrained strings with `Date`, literal unions, `keyof T`, or other domain types.
* **Item 34: Prefer Incomplete Types to Inaccurate Types**: precision must be validated against real behavior and developer experience.
* **Item 35: Generate Types from APIs and Specs, Not Data**: generate from an authoritative schema, not samples with unobserved edge cases.
* **Item 36: Name Types Using the Language of Your Problem Domain**: use established terminology and make naming distinctions meaningful.
* **Item 37: Consider “Brands” for Nominal Typing**: add a deliberate proof token when structural compatibility is too permissive.

## Key Concepts

**State-space reduction.** A type with `isLoading: boolean`, `error?: string`, and content permits contradictory combinations.
A tagged union replaces a matrix of independently changing fields with exactly the states the system supports.
The discriminant gives runtime code a direct branch and gives TypeScript a direct narrowing fact.

**Input flexibility versus output certainty.** Optional fields, alternate object forms, and tuple shorthand can make a function convenient to call.
Those same broad forms make a return difficult to consume.
Name the canonical model and a distinct `Like`/`Options` input model, then normalize at the perimeter.

**Null correlation.** Several nullable fields cause an exponential set of partial states and force every caller to rediscover their relationship.
Wrap related values in one nullable tuple/object or construct an instance only after all dependencies resolve.

**Correlated unions.** `layout: FillLayout | LineLayout` plus `paint: FillPaint | LinePaint` admits invalid pairings.
A union of `FillLayer | LineLayer` preserves the relationship and avoids assertions when reading it.
The same approach groups optional fields that must appear together.

**Precision has a cost.** A narrow type provides better errors, completion, and intent only if it includes all valid real inputs.
Overfitting based on familiar examples rejects legitimate users and trains them to assert away types.
Build valid and invalid test cases as declarations get more expressive, and inspect both diagnostics and completions.

**Types from authority.** Formal schemas contain rare variants and nullability that sample payloads omit.
Generated GraphQL types can connect query variables, selected fields, nullability, and documentation to one source of truth.

**Brands as evidence.** `string & { _brand: 'abs' }` does not validate a string by itself.
It makes validation a prerequisite of calling APIs that require the validated property, unless somebody deliberately asserts around the boundary.

## Mental Models

| Design question | Guiding model | Result |
| --- | --- | --- |
| Can fields have incompatible combinations? | Enumerate legal states, not field values independently | A discriminated union. |
| Do several fields become available together? | One absent/present boundary around the group | `Group \| null` or an optional nested object. |
| Is a flexible representation convenient only at input? | Parse loose forms once, expose canonical data thereafter | `XLike` input and `X` output. |
| Does every string make sense? | `string` is an enormous domain | A union, `Date`, `keyof T`, or brand. |
| Is a type definition based on examples? | Samples are observations, not a contract | Generate from a spec or retain honest gaps. |
| Must a value have passed a check? | A brand represents evidence, not object identity | Guard/factory introduces the brand. |

## Anti-patterns

| Anti-pattern | Failure mode | Better type design |
| --- | --- | --- |
| Boolean plus optional error/content fields | Allows loading-and-error or stale-content states | Tagged request-state union. |
| Returning `CameraOptions` from a calculation | Consumers must handle every optional/alternate input form | Return fully defined `Camera`. |
| Comments like “both fields are present together” | Critical relationship is unchecked prose | Nest them or create a union variant. |
| `number \| undefined` pairs for min/max | Callers confront partial states and correlations | `[number, number] \| null`. |
| Interface of independently unioned correlated fields | Permits invalid combinations | Union of matching interfaces. |
| `recordingType: string` | Permits misspellings and obscures valid options | `type RecordingType = 'studio' | 'live'`. |
| Perfect-looking declarations derived from sample JSON | Rare valid cases become apparent type errors | Generate from a schema/specification. |
| Vague synonyms such as `data`, `info`, and `entity` | Domain distinctions disappear | Established domain terms used consistently. |
| A brand introduced with arbitrary `as Brand` | Proof can be fabricated anywhere | Keep assertions in a validating guard or factory. |

## Code Examples

### Represent request states directly

```ts
interface RequestPending {
  state: "pending"
}

interface RequestError {
  state: "error"
  error: string
}

interface RequestSuccess {
  state: "ok"
  pageText: string
}

type RequestState = RequestPending | RequestError | RequestSuccess

function render(request: RequestState) {
  switch (request.state) {
    case "pending":
      return "Loading"
    case "error":
      return `Error: ${request.error}`
    case "ok":
      return request.pageText
  }
}
```

No value can simultaneously be pending and failed, and each branch gains the data belonging to that state.

### Normalize liberal inputs to strict outputs

```ts
interface LngLat {
  lng: number
  lat: number
}

type LngLatLike = LngLat | { lon: number; lat: number } | [number, number]

interface Camera {
  center: LngLat
  zoom: number
  bearing: number
  pitch: number
}

interface CameraOptions extends Omit<Partial<Camera>, "center"> {
  center?: LngLatLike
}

declare function setCamera(camera: CameraOptions): void
declare function viewportForBounds(bounds: LngLatLike[]): Camera
```

`setCamera` accepts partial updates, while `viewportForBounds` guarantees a complete canonical `Camera` that downstream code can destructure without absence checks.

### Keep correlated optional data together

```ts
interface Person {
  name: string
  birth?: {
    place: string
    date: Date
  }
}

function eulogize(person: Person) {
  if (!person.birth) return person.name
  return `${person.name} was born on ${person.birth.date} in ${person.birth.place}.`
}
```

One check proves both related fields are available.

### Replace stringly property selection

```ts
function pluck<T, K extends keyof T>(records: T[], key: K): T[K][] {
  return records.map((record) => record[key])
}

interface Album {
  artist: string
  title: string
  releaseDate: Date
  recordingType: "studio" | "live"
}

declare const albums: Album[]
const dates = pluck(albums, "releaseDate")
// Date[]
```

The key is limited to actual fields and the result preserves the selected field’s type.

### Attach a nominal proof to a primitive

```ts
type AbsolutePath = string & { _brand: "abs" }

function isAbsolutePath(path: string): path is AbsolutePath {
  return path.startsWith("/")
}

function listAbsolutePath(path: AbsolutePath) {}

function list(path: string) {
  if (isAbsolutePath(path)) listAbsolutePath(path)
}
```

## Reference Tables

| Need | Input type | Output type | Why |
| --- | --- | --- | --- |
| Partial camera update | `CameraOptions` | `void` | Optional properties express an update patch. |
| Calculated camera | Bounds in flexible forms | `Camera` | Consumers should receive all required fields. |
| Optional min/max | `number[]` | `[number, number] \| null` | Pair is either complete or absent. |
| Dynamic request lifecycle | Event/response data | `RequestState` | Tag makes variants exclusive and narrowable. |
| Property accessor | `K extends keyof T` | `T[K]` | Key and value relationship is retained. |
| Validated filesystem path | `string` | `AbsolutePath` after guard | Brand records a proof beyond shape. |

| Precision level | Benefit | Risk and required discipline |
| --- | --- | --- |
| `any` | Maximum permissiveness | No useful checking; restrict it to genuine gaps. |
| Broad union/array | Captures common structure | May hide relationships. |
| Literal union/tagged variant | Strong validation and narrowing | Keep variants aligned with reality. |
| Recursive exact grammar | Detects detailed invalid calls | Test valid edge cases, errors, and completion before shipping. |
| Generated spec type | Reflects authoritative variability | Regenerate when schema/query changes. |

## Worked Example

An extent function begins with two implicitly correlated values:

```ts
function extent(values: number[]) {
  let min: number | undefined
  let max: number | undefined
  for (const value of values) {
    if (min === undefined) {
      min = value
      max = value
      continue
    }
    min = Math.min(min, value)
    max = Math.max(max!, value)
  }
  return [min, max]
}
```

This leaks `(number | undefined)[]`, requires readers to remember the relationship between elements, and invites incorrect truthiness handling for `0`.
Move the absence boundary outside the pair:

```ts
function extent(values: number[]): [number, number] | null {
  let result: [number, number] | null = null
  for (const value of values) {
    result = result
      ? [Math.min(value, result[0]), Math.max(value, result[1])]
      : [value, value]
  }
  return result
}

const range = extent([0, 1, 2])
if (range) {
  const [min, max] = range
  console.log(max - min)
}
```

The result type now tells every consumer the full truth: there is either no extent or an entirely valid pair.
The implementation has one null transition, correctly handles zero, and never needs to assert that `max` followed `min`.

## Key Takeaways

* Design types by enumerating valid values and excluding invalid combinations.
* Use discriminated unions whenever variant fields are related.
* Make compound data fully present or wholly absent instead of independently nullable.
* Be liberal at input boundaries only when you normalize to a strict canonical output.
* Put checked structural information in types, not comments or type-suffixed names.
* Use domain types, literal unions, and `keyof T` instead of unconstrained strings.
* Treat accurate coverage as more important than superficial precision.
* Generate external contracts from their authoritative schemas and specifications.
* Use accepted domain vocabulary consistently and make every naming difference meaningful.
* Use brands for evidence-based nominal distinctions that structural typing cannot express.

## Connects To

Chapter 1 establishes that static types are erased, so state types and brands must be paired with runtime validation where values enter the system.
Chapter 2 provides the set-theoretic, generic, mapped-type, and `readonly` tools that express these designs.
Chapter 3 explains why discriminants, canonical values, local aliases, and type guards give the inference engine the evidence required to narrow and preserve these contracts.
