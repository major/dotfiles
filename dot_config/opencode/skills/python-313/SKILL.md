---
name: python-313-features
description: Reference for Python 3.13 syntax and behavior changes relative to 3.12. Use when writing, reviewing, or migrating Python code that targets 3.13+, when using generics or type parameter syntax, when code touches locals()/frame.f_locals, or when imports may reference stdlib modules removed in 3.13.
---

# Python 3.13 vs 3.12

## Before writing code
- Check the project's target version (pyproject.toml `requires-python`, CI matrix, Dockerfile, `.python-version`).
- Only use 3.13-only features if the minimum supported version is >= 3.13. Otherwise use the `typing_extensions` equivalents.

## Syntax (new in 3.13)

### Type parameter defaults (PEP 696)
Builds on 3.12's PEP 695 syntax.

```python
class Box[T = int]: ...
class Handler[**P = [str, int]]: ...
class Row[*Ts = *tuple[int, str]]: ...
def first[T = str](xs: list[T]) -> T: ...
type Pair[K, V = K] = tuple[K, V]
```

Rules:
- A parameter without a default must not follow one with a default.
- A TypeVar with a default must not immediately follow a TypeVarTuple.
- Defaults may reference earlier type parameters.
- Runtime introspection: `T.__default__`, `T.has_default()`, `typing.NoDefault`.
- Legacy form: `TypeVar("T", default=int)`. For older targets, use `typing_extensions.TypeVar`.

### Annotation scopes in class bodies
Lambdas and comprehensions are now allowed inside annotation scopes nested in class scopes. Comprehensions directly in class bodies are not inlined.

### Docstrings
The compiler strips common leading indentation from docstrings. Do not write code or tests that depend on the exact indentation of `__doc__`.

## Behavior changes to respect

### locals() (PEP 667)
- In functions, `locals()` returns a fresh, independent snapshot on each call. Writes to it do not affect real locals.
- `frame.f_locals` is a write-through proxy.
- `exec()`/`eval()` in function scope operate on a snapshot. Pass an explicit dict if you need the results back.
- Never rely on mutating `locals()` to change variables.

### Removed stdlib modules (PEP 594 and others)
The following imports will fail on 3.13:
aifc, audioop, cgi, cgitb, chunk, crypt, imghdr, mailcap, msilib, nis, nntplib, ossaudiodev, pipes, sndhdr, spwd, sunau, telnetlib, uu, xdrlib, lib2to3, tkinter.tix, typing.io, typing.re

Replacements:
- cgi.parse_header → email.message.Message or a custom parser
- cgi.FieldStorage → multipart (PyPI) or the framework's form parsing
- crypt → passlib / bcrypt / hashlib
- pipes.quote → shlex.quote
- imghdr → filetype or python-magic (PyPI)
- telnetlib → telnetlib3 (PyPI)
- lib2to3 → libcst or parso

## Prefer these 3.13 APIs
- `typing.TypeIs` (PEP 742) over `TypeGuard` for narrowing functions. It narrows in both if and else branches, and the narrowed type must be consistent with the input type.
- `typing.ReadOnly` (PEP 705) for immutable `TypedDict` keys.
- `@warnings.deprecated("msg")` (PEP 702) for deprecating functions and classes. It works at type-check time and at runtime.
- `copy.replace(obj, **changes)` for dataclasses, namedtuples, and objects defining `__replace__`.
- For older targets, import TypeIs, ReadOnly, and deprecated from `typing_extensions`.

## Runtime notes
- Free-threaded builds: the `python3.13t` binary. Check with `sys._is_gil_enabled()`. Do not assume C extensions are thread-safe without the GIL.
- The JIT is experimental and build-time only (`--enable-experimental-jit`). Do not recommend it for production.

## Reminder: these were 3.12, not 3.13
- `type X = ...` statements and `def f[T]()` / `class C[T]` (PEP 695)
- f-strings allowing nested quotes, backslashes, and comments (PEP 701)
- `typing.override` (PEP 698)
- `**kwargs: Unpack[TD]` (PEP 692)

## Review checklist
1. Does the code use PEP 696 defaults while supporting versions below 3.13? If so, switch to typing_extensions.
2. Are there any imports of removed modules?
3. Does anything write to `locals()` or depend on `exec()` mutating function locals?
4. Do tests compare `__doc__` strings verbatim?
5. Could `TypeGuard` be replaced with `TypeIs`?
