---
name: python-312-syntax
description: Apply Python 3.12 syntax (PEP 695 type params, `type` aliases, PEP 701 f-strings) correctly and safely. Use when writing, reviewing, refactoring, or modernizing Python code, adding type hints/generics, or when the project targets Python >= 3.12 or must stay compatible with 3.11.
---

# Python 3.12 Syntax Skill

## Step 1: Determine the target Python version FIRST
Before using any 3.12-only syntax, check in this order:
1. `pyproject.toml` → `[project] requires-python`, `[tool.ruff] target-version`, `[tool.mypy] python_version`
2. `.python-version`, `setup.cfg`, `tox.ini`, CI matrix (`.github/workflows/*.yml`), `Dockerfile` base image
3. If unknown, ASK or default to 3.11-compatible syntax.

- Minimum version >= 3.12 → PREFER the new syntax below.
- Minimum version <= 3.11 → NEVER use PEP 695 syntax, `type` statements, or PEP 701-only f-strings. They are SyntaxErrors at parse time and cannot be guarded by `sys.version_info`.

## Step 2: 3.12+ syntax rules

### Generics (PEP 695)
- Declare type params inline: `def f[T](x: T) -> T`, `class Box[T]:`.
- Bounds: `[T: Hashable]`. Constraints: `[T: (int, float)]`. ParamSpec: `[**P]`. TypeVarTuple: `[*Ts]`.
- Do NOT import or define `TypeVar`/`ParamSpec`/`TypeVarTuple` for new code.
- Do NOT subclass `Generic[T]` when using bracket syntax (runtime error).
- Do NOT pass `covariant=`/`contravariant=`; variance is inferred.
- Class-scoped names are not visible in type-param bounds; use module-level names.

### Type aliases
- Use `type Alias = ...` and `type Alias[T] = ...` instead of `Alias: TypeAlias = ...`.
- Forward/recursive references need no quotes (lazy evaluation).
- A `type` alias is a `typing.TypeAliasType` at runtime:
  - Never use it in `isinstance`/`issubclass`, `match` class patterns, or as a base class.
  - If runtime introspection or libraries (e.g. pydantic, cattrs, older frameworks) need the real type, either use `Alias.__value__` or keep a plain assignment `Alias = int | str`.

### f-strings (PEP 701)
- Reusing the outer quote type inside expressions is allowed: `f"{", ".join(xs)}"`.
- Backslashes are allowed inside expressions: `f"{"\n".join(lines)}"`.
- Comments are allowed only in multi-line (triple-quoted) replacement fields.
- Prefer readability: extract complex expressions to a variable rather than nesting f-strings.

### Overrides and kwargs
- Decorate overriding methods with `@typing.override` (3.12+) or `typing_extensions.override` (older).
- Type structured kwargs with `**kwargs: Unpack[SomeTypedDict]`.

## Step 3: Always-apply rules (any version)
- Use raw strings for regex and Windows paths: `r"\d+"`. Invalid escapes emit `SyntaxWarning` in 3.12 and will become errors.
- Do not import `distutils`, `imp`, `asyncore`, or `asynchat` (removed in 3.12). Replacements: `setuptools`/`packaging`/`sysconfig`, `importlib`, `asyncio`.
- Do not assume `setuptools` exists in a fresh venv.
- Comprehensions are inlined in 3.12 (no `<listcomp>` frame; `locals()` inside a comprehension includes enclosing locals). Do not write code that depends on comprehension frame isolation. Generator expressions still have their own frame.

## Step 4: Modernizing existing code (only if target >= 3.12)
- Ruff rules: `UP040` (TypeAlias → `type`), `UP046` (Generic class → PEP 695), `UP047` (generic function → PEP 695). Run `ruff check --select UP --target-version py312 --fix`.
- Or run `pyupgrade --py312-plus`.
- After conversion, check for runtime uses of converted aliases (isinstance, pydantic models, `get_type_hints`) and revert those to plain assignments if needed.
- Confirm the type checker version supports PEP 695 (recent mypy/pyright do).

## Quick reference

| 3.11 | 3.12 |
|---|---|
| `T = TypeVar("T")` + `def f(x: T) -> T` | `def f[T](x: T) -> T` |
| `class C(Generic[T]):` | `class C[T]:` |
| `TypeVar("N", bound=X)` | `[N: X]` |
| `P = ParamSpec("P")` | `[**P]` |
| `Ts = TypeVarTuple("Ts")` | `[*Ts]` |
| `A: TypeAlias = list[int]` | `type A = list[int]` |
| `f"{', '.join(x)}"` (quote swap required) | `f"{", ".join(x)}"` |
