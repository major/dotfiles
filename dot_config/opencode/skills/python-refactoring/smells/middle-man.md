# Middle Man

Background reference: skill `fowler-refactoring`, ch03 and ch07.

## Symptom

A class spends half or more of its methods simply forwarding calls to an internal delegate object without adding behavior, validation, or transformation.
The class acts as an unnecessary layer of indirection that obscures direct interaction with the responsible object.

## Python forms

- Passthrough delegation: Methods whose entire body is `return self.delegate.some_method(*args, **kwargs)`.
- Wrapper facade bloat: Classes that mimic the entire public interface of an underlying dependency while doing nothing novel.
- Redundant forwarding wrappers: Helpers that wrap another service's calls purely to preserve legacy naming.

## Detect

### Evidence of harm

Do not remove delegation when a class genuinely shields callers from complex subsystems or provides essential abstraction.
Confirm Middle Man only when concrete harm exists:
- Boilerplate explosion: Every new method added to the underlying delegate forces writing a corresponding boilerplate forwarding method on the middle man.
- Cognitive overhead: Readers must step through forwarding stubs that add no value to understand where work is done.
- Obscured delegate features: Callers are prevented from using useful native capabilities of the underlying object.

### Ruff hints

- `PLR6301` (no-self-use): Flags forwarding methods that do not use instance state other than passing calls through.

### Look-alikes

- Lazy Element: A class that does almost nothing; Middle Man does too much delegating, while Lazy Element is simply too small.
- Facade: A facade aggregates calls across multiple underlying subsystems; Middle Man merely forwards one-to-one to a single object.

### Deliberate exceptions

- Structural Adapter: Adapting an incompatible third-party interface to a standard interface expected by internal code.
- Decorator or Proxy: Wrapping a delegate specifically to inject caching, access logging, or authentication checks.

## Choose

| Situation | Chosen refactoring | Alternative | Why |
| --- | --- | --- | --- |
| Class mostly forwards calls to an internal delegate | [Remove Middle Man](../refactorings/remove-middle-man.md) | Keep forwarding | Callers talk directly to the responsible delegate, eliminating boilerplate |
| Only a subset of methods are passthroughs | [Remove Middle Man](../refactorings/remove-middle-man.md) | Full inlining | Exposing the delegate directly for those methods avoids expanding the host class |
| Forwarder adds security or validation checks | Keep the current design | Remove Middle Man | Security or policy validation justifies retaining the intercepting method |

## Verify

- Run the full test suite across all updated call sites.
- Run project linter and type checker to verify that direct delegate calls type-check cleanly.
- Verify that no required security checks or validations were bypassed during delegate exposure.
