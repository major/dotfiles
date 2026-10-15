#!/usr/bin/env python3
"""Rank fan-in/fan-out refactoring candidates in a Python package.

Based on the dependency guidance in "Robust Python" (Viafore, ch. 16):

* High fan-in code (many dependents) should be stable leaves: few outgoing
  dependencies and little churn.
* High fan-out code (many dependencies) should sit at the top of the graph,
  where business logic lives and change is cheap.

The script builds a static module import graph and an approximate function
reference graph with only the standard library, adds git churn and optional
Radon complexity, and prints a short ranked report. Output is plain text and
sized for an LLM context window.

Limitations: calls through instance attributes (``obj.method()``) and other
dynamic dispatch are not resolved, so function fan-in is a lower bound.
"""

from __future__ import annotations

import argparse
import ast
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

SKIP_DIRS = {".venv", "venv", ".worktrees", "node_modules", "build", "dist", ".git", "__pycache__"}


@dataclass
class Module:
    """Static facts about one Python module."""

    name: str
    path: Path
    tree: ast.Module
    loc: int
    imports: set[str] = field(default_factory=set)
    aliases: dict[str, str] = field(default_factory=dict)
    defs: set[str] = field(default_factory=set)


def find_packages(root: Path) -> list[Path]:
    """Return top-level package directories under ``root`` or ``root/src``.

    Args:
        root: Repository root.

    Returns:
        Package directories, excluding test packages.
    """
    bases = [root / "src", root] if (root / "src").is_dir() else [root]
    pkgs = []
    for base in bases:
        for child in sorted(base.iterdir()):
            if (
                child.is_dir()
                and (child / "__init__.py").exists()
                and child.name not in SKIP_DIRS
                and not child.name.startswith("test")
            ):
                pkgs.append(child)
    return pkgs


def module_name(path: Path, pkg_parent: Path) -> str:
    """Convert a file path into a dotted module name.

    Args:
        path: Python source file.
        pkg_parent: Directory that contains the top-level package.

    Returns:
        Dotted module name; ``__init__`` files map to their package name.
    """
    parts = list(path.relative_to(pkg_parent).with_suffix("").parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


def resolve_relative(mod: Module, node: ast.ImportFrom) -> str:
    """Return the absolute module named by an ``ImportFrom`` node.

    Args:
        mod: Module that contains the import.
        node: The import statement.

    Returns:
        Absolute dotted module name.
    """
    if not node.level:
        return node.module or ""
    is_pkg = mod.path.name == "__init__.py"
    base = mod.name.split(".")
    drop = node.level - 1 if is_pkg else node.level
    base = base[: len(base) - drop] if drop else base
    return ".".join(base + ([node.module] if node.module else []))


def collect_imports(mod: Module, known: set[str]) -> None:
    """Fill ``mod.imports`` (internal modules) and ``mod.aliases``.

    Args:
        mod: Module to update in place.
        known: All internal module names.
    """
    for node in ast.walk(mod.tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                if a.asname:
                    mod.aliases[a.asname] = a.name
                else:
                    head = a.name.split(".")[0]
                    mod.aliases.setdefault(head, head)
                _add_internal(mod, a.name, known)
        elif isinstance(node, ast.ImportFrom):
            base = resolve_relative(mod, node)
            for a in node.names:
                if a.name == "*":
                    _add_internal(mod, base, known)
                    continue
                target = f"{base}.{a.name}" if base else a.name
                mod.aliases[a.asname or a.name] = target
                if target in known:
                    _add_internal(mod, target, known)
                else:
                    _add_internal(mod, base, known)


def _add_internal(mod: Module, name: str, known: set[str]) -> None:
    """Record the longest internal module prefix of ``name`` as a dependency.

    Args:
        mod: Importing module.
        name: Dotted name that was imported.
        known: All internal module names.
    """
    parts = name.split(".")
    while parts:
        cand = ".".join(parts)
        if cand in known:
            if cand != mod.name:
                mod.imports.add(cand)
            return
        parts.pop()


def load_modules(pkgs: list[Path], include_tests: bool) -> dict[str, Module]:
    """Parse every Python file in the given packages.

    Args:
        pkgs: Package directories.
        include_tests: Keep files under ``tests`` directories when True.

    Returns:
        Mapping of module name to parsed module.
    """
    mods: dict[str, Module] = {}
    for pkg in pkgs:
        for path in pkg.rglob("*.py"):
            if SKIP_DIRS & set(path.parts):
                continue
            if not include_tests and any(p.startswith("test") for p in path.relative_to(pkg).parts):
                continue
            try:
                src = path.read_text(encoding="utf-8")
                tree = ast.parse(src)
            except (SyntaxError, UnicodeDecodeError):
                continue
            name = module_name(path, pkg.parent)
            mods[name] = Module(name, path, tree, src.count("\n") + 1)
    known = set(mods)
    for mod in mods.values():
        collect_imports(mod, known)
    return mods


def git_churn(root: Path, days: int) -> Counter[str]:
    """Count commits touching each file in the last ``days`` days.

    Args:
        root: Repository root.
        days: Look-back window.

    Returns:
        Commit counts keyed by absolute resolved path; empty without git.
    """
    try:
        out = subprocess.run(
            ["git", "-C", str(root), "log", f"--since={days}.days", "--no-merges", "--name-only", "--format="],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        top = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return Counter()
    return Counter(str((Path(top) / line).resolve()) for line in out.splitlines() if line.endswith(".py"))


def radon_cc(mods: dict[str, Module]) -> dict[str, int]:
    """Return cyclomatic complexity per function key when Radon is installed.

    Args:
        mods: Parsed modules.

    Returns:
        Complexity keyed by ``module:qualname``; empty when Radon is missing.
    """
    try:
        from radon.complexity import cc_visit
    except ImportError:
        return {}
    result = {}
    for mod in mods.values():
        try:
            blocks = cc_visit(mod.path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 - radon parse errors are not fatal here
            continue
        for b in blocks:
            qual = f"{b.classname}.{b.name}" if getattr(b, "classname", None) else b.name
            result[f"{mod.name}:{qual}"] = b.complexity
    return result


def function_nodes(mod: Module) -> list[tuple[str, ast.AST, str | None]]:
    """List top-level functions, classes, and methods of a module.

    Args:
        mod: Module to scan; ``mod.defs`` is filled as a side effect.

    Returns:
        Tuples of (qualname, node, enclosing class name or None).
    """
    out = []
    for node in mod.tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out.append((node.name, node, None))
        elif isinstance(node, ast.ClassDef):
            out.append((node.name, node, None))
            for sub in node.body:
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    out.append((f"{node.name}.{sub.name}", sub, node.name))
    mod.defs = {q for q, _, _ in out}
    return out


def dotted(node: ast.AST) -> str | None:
    """Return ``a.b.c`` for a Name/Attribute chain, else None.

    Args:
        node: AST expression.

    Returns:
        Dotted string or None.
    """
    parts = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        parts.append(node.id)
        return ".".join(reversed(parts))
    return None


class Resolver:
    """Resolve names in a module to internal function keys."""

    def __init__(self, mods: dict[str, Module]) -> None:
        """Index all modules.

        Args:
            mods: Parsed modules with defs and aliases filled.
        """
        self.mods = mods

    def fq_to_key(self, fq: str, depth: int = 0) -> str | None:
        """Map a fully qualified dotted name to ``module:qualname``.

        Follows re-exports (for example through ``__init__``) up to 5 hops.

        Args:
            fq: Dotted name such as ``pkg.mod.func`` or ``pkg.mod.Cls.meth``.
            depth: Current re-export hop count.

        Returns:
            Function key or None when the name is not internal.
        """
        parts = fq.split(".")
        for i in range(len(parts) - 1, 0, -1):
            mod_name, rest = ".".join(parts[:i]), parts[i:]
            mod = self.mods.get(mod_name)
            if not mod:
                continue
            qual = ".".join(rest[:2]) if len(rest) >= 2 and ".".join(rest[:2]) in mod.defs else rest[0]
            if qual in mod.defs:
                return f"{mod_name}:{qual}"
            if depth < 5 and rest[0] in mod.aliases:
                return self.fq_to_key(".".join([mod.aliases[rest[0]], *rest[1:]]), depth + 1)
            return None
        return None

    def resolve(self, mod: Module, name: str, cls: str | None) -> str | None:
        """Resolve a dotted reference used inside ``mod``.

        Args:
            mod: Module where the reference appears.
            name: Dotted reference such as ``helper`` or ``x.y.func``.
            cls: Enclosing class name for ``self``/``cls`` lookups.

        Returns:
            Function key or None.
        """
        head, _, tail = name.partition(".")
        if cls and head in {"self", "cls"} and tail:
            meth = f"{cls}.{tail.split('.')[0]}"
            return f"{mod.name}:{meth}" if meth in mod.defs else None
        if head in mod.defs:
            sub = f"{head}.{tail.split('.')[0]}" if tail else head
            return f"{mod.name}:{sub if sub in mod.defs else head}"
        if head in mod.aliases:
            return self.fq_to_key(mod.aliases[head] + (f".{tail}" if tail else ""))
        return None


def function_graph(mods: dict[str, Module]) -> dict[str, set[str]]:
    """Build an approximate reference graph between internal functions.

    Args:
        mods: Parsed modules.

    Returns:
        Mapping of caller key to the set of referenced function keys.
    """
    nodes = {name: function_nodes(mod) for name, mod in mods.items()}
    res = Resolver(mods)
    graph: dict[str, set[str]] = defaultdict(set)
    for name, mod in mods.items():
        for qual, node, cls in nodes[name]:
            if isinstance(node, ast.ClassDef):
                continue  # methods are scanned on their own
            key = f"{name}:{qual}"
            for sub in ast.walk(node):
                if isinstance(sub, (ast.Name, ast.Attribute)):
                    ref = dotted(sub)
                    target = res.resolve(mod, ref, cls) if ref else None
                    if target and target != key:
                        graph[key].add(target)
    return graph


def strongly_connected(graph: dict[str, set[str]]) -> list[list[str]]:
    """Return import cycles (SCCs with more than one module).

    Args:
        graph: Module dependency graph.

    Returns:
        Cycles sorted by size, largest first.
    """
    index: dict[str, int] = {}
    low: dict[str, int] = {}
    stack: list[str] = []
    on: set[str] = set()
    out: list[list[str]] = []
    counter = [0]

    def visit(v: str) -> None:
        """Tarjan visit for one vertex."""
        index[v] = low[v] = counter[0]
        counter[0] += 1
        stack.append(v)
        on.add(v)
        for w in graph.get(v, ()):
            if w not in index:
                visit(w)
                low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], index[w])
        if low[v] == index[v]:
            comp = []
            while True:
                w = stack.pop()
                on.discard(w)
                comp.append(w)
                if w == v:
                    break
            if len(comp) > 1:
                out.append(sorted(comp))

    sys.setrecursionlimit(max(10000, len(graph) * 4))
    for v in list(graph):
        if v not in index:
            visit(v)
    return sorted(out, key=len, reverse=True)


def pct(values: list[int], q: float) -> float:
    """Return the ``q`` percentile of ``values`` (nearest rank).

    Args:
        values: Numbers to rank.
        q: Percentile between 0 and 1.

    Returns:
        Percentile value, or 0 for an empty list.
    """
    if not values:
        return 0
    s = sorted(values)
    return s[min(len(s) - 1, int(q * len(s)))]


def short(name: str, prefix: str) -> str:
    """Drop a shared package prefix to save tokens.

    Args:
        name: Dotted module or function key.
        prefix: Prefix to remove.

    Returns:
        Shortened name.
    """
    return name[len(prefix) :] if prefix and name.startswith(prefix) else name


def report(mods: dict[str, Module], churn: Counter[str], cc: dict[str, int], top: int, days: int) -> None:
    """Print ranked fan-in/fan-out findings.

    Args:
        mods: Parsed modules.
        churn: Commit counts per resolved path.
        cc: Radon complexity per function key.
        top: Rows per section.
        days: Churn window, for the header.
    """
    deps = {m.name: m.imports for m in mods.values()}
    ca: Counter[str] = Counter()
    for targets in deps.values():
        for t in targets:
            ca[t] += 1
    ce = {n: len(t) for n, t in deps.items()}
    inst = {n: ce[n] / (ca[n] + ce[n]) if ca[n] + ce[n] else 0.0 for n in mods}
    ch = {n: churn.get(str(m.path.resolve()), 0) for n, m in mods.items()}
    tops = {n.split(".")[0] for n in mods}
    prefix = f"{next(iter(tops))}." if len(tops) == 1 else ""
    s = lambda n: short(n, prefix)  # noqa: E731

    print(f"# fan-in/fan-out report: {len(mods)} modules, churn window {days}d, prefix '{prefix}' stripped")
    print("# Ca=fan-in (importers) Ce=fan-out (imports) I=Ce/(Ca+Ce) 0=stable 1=volatile ch=commits loc=lines")
    is_init = {n for n, m in mods.items() if m.path.name == "__init__.py"}

    ca90, ce75, ca75 = pct(list(ca.values()), 0.9), pct(list(ce.values()), 0.75), pct(list(ca.values()), 0.75)
    ch75 = pct([v for v in ch.values() if v], 0.75)

    def row(n: str) -> str:
        """Format one module row."""
        return f"{s(n)}  Ca={ca[n]} Ce={ce[n]} I={inst[n]:.2f} ch={ch[n]} loc={mods[n].loc}"

    print(f"\n## 1. Unstable foundations (high fan-in AND high churn; Ca>={ca90:.0f}, ch>={ch75:.0f}) -> stabilize/split")
    rows = sorted(
        (n for n in mods if n not in is_init and ca[n] >= max(ca90, 3) and ch[n] >= max(ch75, 1)),
        key=lambda n: ca[n] * ch[n],
        reverse=True,
    )
    print("\n".join(row(n) for n in rows[:top]) or "(none)")

    print(f"\n## 2. Hub modules (high fan-in AND high fan-out; Ca>={ca75:.0f}, Ce>={ce75:.0f}) -> split stable core from orchestration")
    rows = sorted(
        (n for n in mods if n not in is_init and ca[n] >= max(ca75, 3) and ce[n] >= max(ce75, 3)),
        key=lambda n: ca[n] * ce[n],
        reverse=True,
    )
    print("\n".join(row(n) for n in rows[:top]) or "(none)")

    print("\n## 3. Stable-depends-on-volatile edges (I(src)+0.3 < I(dst), src Ca>=3) -> invert/move/Protocol")
    edges = [
        (src, dst)
        for src, targets in deps.items()
        for dst in targets
        if src not in is_init and dst not in is_init and ca[src] >= 3 and inst[src] + 0.3 < inst[dst]
    ]
    edges.sort(key=lambda e: ca[e[0]] * (inst[e[1]] - inst[e[0]]), reverse=True)
    print(
        "\n".join(
            f"{s(a)} (Ca={ca[a]} I={inst[a]:.2f}) -> {s(b)} (Ca={ca[b]} I={inst[b]:.2f})" for a, b in edges[:top]
        )
        or "(none)"
    )

    cycles = strongly_connected(deps)
    print(f"\n## 4. Import cycles: {len(cycles)} -> break with dependency inversion or by moving shared types down")
    for comp in cycles[: max(3, top // 3)]:
        names = ", ".join(s(n) for n in comp[:8])
        print(f"[{len(comp)}] {names}{' ...' if len(comp) > 8 else ''}")

    graph = function_graph(mods)
    fin_callers: dict[str, set[str]] = defaultdict(set)
    for caller, targets in graph.items():
        for t in targets:
            fin_callers[t].add(caller)
    fin_mods = {k: {c.split(":")[0] for c in v} for k, v in fin_callers.items()}
    keys = set(graph) | set(fin_callers)
    fout = {k: len(graph.get(k, ())) for k in keys}
    fin = {k: len(fin_callers.get(k, ())) for k in keys}

    def frow(k: str) -> str:
        """Format one function row."""
        c = cc.get(k)
        return (
            f"{s(k)}  in={fin[k]} in_mods={len(fin_mods.get(k, ()))} out={fout[k]}"
            + (f" cc={c}" if c is not None else "")
            + f" ch={ch.get(k.split(':')[0], 0)}"
        )

    fo75 = pct([v for v in fout.values() if v], 0.9)
    print(f"\n## 5. Hub functions (callers from >=2 modules AND out>={fo75:.0f}) -> extract pure core, keep orchestration on top")
    rows = sorted(
        (k for k in keys if len(fin_mods.get(k, ())) >= 2 and fout[k] >= max(fo75, 5)),
        key=lambda k: len(fin_mods.get(k, ())) * fout[k],
        reverse=True,
    )
    print("\n".join(frow(k) for k in rows[:top]) or "(none)")

    print("\n## 6. Risky leaves (in_mods>=3 AND cc>=11 [radon C+]; class cc = sum of methods) -> characterize, then simplify")
    if not cc:
        print("(radon not installed; run with a Python that has radon)")
    else:
        rows = sorted(
            (k for k in keys if len(fin_mods.get(k, ())) >= 3 and cc.get(k, 0) >= 11),
            key=lambda k: len(fin_mods[k]) * cc[k],
            reverse=True,
        )
        print("\n".join(frow(k) for k in rows[:top]) or "(none)")

    print("\n## 7. Top fan-out orchestrators (fine at the top; flag only if also imported widely)")
    rows = sorted((n for n in mods if n not in is_init), key=lambda n: ce[n], reverse=True)
    print("\n".join(row(n) for n in rows[: max(5, top // 2)]))


def main() -> int:
    """Parse arguments and print the report.

    Returns:
        Process exit code.
    """
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("paths", nargs="*", help="package dirs (default: auto-detect under cwd)")
    ap.add_argument("--top", type=int, default=10, help="rows per section (default 10)")
    ap.add_argument("--days", type=int, default=180, help="git churn window in days (default 180)")
    ap.add_argument("--include-tests", action="store_true", help="count test modules as dependents")
    args = ap.parse_args()

    root = Path.cwd()
    pkgs = [Path(p).resolve() for p in args.paths] or find_packages(root)
    if not pkgs:
        print("no Python packages found; pass a package directory", file=sys.stderr)
        return 1
    mods = load_modules(pkgs, args.include_tests)
    report(mods, git_churn(root, args.days), radon_cc(mods), args.top, args.days)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
