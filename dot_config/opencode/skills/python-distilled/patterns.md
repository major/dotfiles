# Patterns

## Safe Mutable Defaults
**When to use**: a function needs a fresh list, set, or dictionary per call.
**How**: default to `None`, create the container inside the function, and return or mutate it explicitly.
**Trade-offs**: one branch prevents hidden cross-call state.

## Context-Managed Resource
**When to use**: files, locks, connections, or any owned resource.
**How**: acquire through `with`, perform work, and let exit release it on success or failure.
**Trade-offs**: requires a context-manager interface but makes cleanup reliable.

## Generator Pipeline
**When to use**: process large or streaming data incrementally.
**How**: make each stage yield values and compose stages with iteration or `yield from`.
**Trade-offs**: lazy execution saves memory but requires a consumer to drive it.

## Composition and Dependency Injection
**When to use**: behavior varies independently from an object's state.
**How**: pass a function or policy object and delegate to it.
**Trade-offs**: adds an explicit seam while avoiding inheritance coupling.

## Protocol Adapter
**When to use**: an object needs to satisfy a consumer's expected calling shape.
**How**: implement the smallest required special methods or adapt with `partial()`.
**Trade-offs**: preserves interoperability but demands semantic, not merely nominal, compatibility.

## Runnable Module Guard
**When to use**: a single module must be importable and directly executable.
**How**: keep definitions at module scope and guard execution with `if __name__ == '__main__':`.
**Trade-offs**: clear lifecycle and testability require a small amount of structure.

## Package Entry Point
**When to use**: an application has a package namespace or will grow beyond one file.
**How**: add `package/__main__.py` and run it with `python -m package`.
**Trade-offs**: adds package structure but keeps imports, execution, and future modules clean.

## Shallow-versus-Deep Copy
**When to use**: a mutable object may be shared across an ownership boundary.
**How**: use `list(x)` or equivalent for a new outer container; use `copy.deepcopy()` only when nested independence is required.
**Trade-offs**: shallow copying shares children; deep copying costs time and fails for runtime resources.

## Safe Mapping Interception
**When to use**: custom mapping behavior must apply to updates and construction.
**How**: prefer `UserDict` or composition over overriding one method on `dict`.
**Trade-offs**: wrapper overhead buys predictable Python-level dispatch.

## Zero-Copy Buffer
**When to use**: binary data must be passed without repeated allocation.
**How**: allocate a contiguous destination buffer once and call `readinto(preallocated_buffer)` for each read.
**Trade-offs**: less allocation, but the caller must track the valid byte count and buffer lifetime.

## Trusted Serialization Boundary
**When to use**: persist or exchange data across a known trust boundary.
**How**: choose a data-only format for untrusted input; never unpickle untrusted data.
**Trade-offs**: pickle offers fidelity but deserialization can permit remote code execution.
