# Glossary

| Term | Definition | References |
| --- | --- | --- |
| `any` | An escape hatch that disables useful checking and propagates unsafety through expressions. | Items 5, 38-44; [ch. 5](chapters/ch05-working-with-any.md) |
| Assertion | A programmer claim to the compiler, written with `as`, which adds no runtime validation. | Items 9, 40; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Brand | A phantom marker combined with a base type to prevent unintended structural compatibility. | Item 37; [ch. 4](chapters/ch04-type-design.md) |
| Conditional type | A type-level `T extends U ? X : Y` relationship that can express input-dependent outputs. | Item 50; [ch. 6](chapters/ch06-type-declarations-and-at-types.md) |
| Contextual typing | Inference influenced by the position where an expression appears, such as a callback or object literal. | Item 26; [ch. 3](chapters/ch03-type-inference.md) |
| Declaration | A type description for JavaScript code, whether inferred, authored in `.d.ts`, or supplied by `@types`. | Items 45-52; [ch. 6](chapters/ch06-type-declarations-and-at-types.md) |
| Discriminated union | A union of object variants with a shared literal tag that enables safe narrowing. | Items 28, 32; [ch. 4](chapters/ch04-type-design.md) |
| Excess-property check | Extra checking for fresh object literals that catches likely misspelled or unintended properties. | Item 11; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Evolving `any` | An inferred `any` whose apparent element type changes as values are written to it. | Item 41; [ch. 5](chapters/ch05-working-with-any.md) |
| Generic | A parameterized type relationship that preserves the connection among inputs and outputs. | Item 14; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Index signature | A `[key: string]: T` declaration for dynamic keyed data, with deliberately limited knowledge of individual keys. | Item 15; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Intersection | A type representing values that satisfy every constituent type, not object-property merging in all cases. | Item 7; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Mapped type | A type constructed by transforming each property of another type, keeping related structures synchronized. | Item 18; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Narrowing | Reducing a value's possible types through control flow, checks, or discriminants. | Item 22; [ch. 3](chapters/ch03-type-inference.md) |
| Nominal typing | Compatibility based on declared identity rather than shape, approximated in TypeScript with brands. | Item 37; [ch. 4](chapters/ch04-type-design.md) |
| Overload | Multiple callable declarations for one function, sometimes replaceable by a conditional type. | Item 50; [ch. 6](chapters/ch06-type-declarations-and-at-types.md) |
| `readonly` | A type-level restriction on mutation through a reference, useful for documenting and enforcing ownership expectations. | Item 17; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Structural typing | Compatibility based on required members and their types, rather than declared class or interface identity. | Item 4; [ch. 1](chapters/ch01-getting-to-know-typescript.md) |
| Type space | The namespace containing types, which is distinct from runtime values despite shared spellings. | Item 8; [ch. 2](chapters/ch02-typescripts-type-system.md) |
| Type widening | Inference that generalizes literals, such as `'x'` to `string`, when a value may later vary. | Item 21; [ch. 3](chapters/ch03-type-inference.md) |
| `unknown` | The safe top type for an untrusted value: it requires narrowing before most use. | Item 42; [ch. 5](chapters/ch05-working-with-any.md) |
| Union | A type representing values in any constituent set, requiring safe handling of each possible member. | Items 7, 32; [chapters 2](chapters/ch02-typescripts-type-system.md), [4](chapters/ch04-type-design.md) |
| Value space | The runtime namespace containing variables, functions, classes, and other JavaScript values. | Item 8; [ch. 2](chapters/ch02-typescripts-type-system.md) |
