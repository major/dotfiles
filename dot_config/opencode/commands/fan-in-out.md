---
description: Rank the best fan-in/fan-out refactors (Robust Python ch. 16) with a cheap static report
---

Find the best fan-in/fan-out improvements in this Python repository. Read-only: do not modify files.

Principle (Viafore, Robust Python ch. 16):
- High fan-in code (many dependents) should be a stable leaf: few outgoing deps, low churn, well tested.
- High fan-out code (many deps) belongs at the top (orchestration, business logic) where change is cheap.
- Problems are code that breaks this: busy foundations, hubs that are both, stable code importing volatile code, and cycles.

Token budget rules:
- Do not explore the repo broadly and do not spawn subagents. The script below is the map.
- Run it once. Pick at most 5 candidates from its output, then verify each with at most 2 targeted reads
  (`grep -c`/`grep -l` for importers, `read` with `offset`/`limit` around the definition). No full-file reads over 300 lines.
- Skip false positives without reading code: `__init__` re-exports, pure dataclass/constant modules whose churn is only added fields,
  and section 7 orchestrators that nobody imports.

Step 1. Run the report (extra args such as package paths or `--top 15 --days 90` come from: `$ARGUMENTS`):

```bash
PY=python3; [ -x .venv/bin/python ] && PY=.venv/bin/python
$PY ~/.config/opencode/scripts/fan_analysis.py $ARGUMENTS
```

Step 2. Rank candidates by value = blast radius (Ca or in_mods) x change pressure (churn, cc, fan-out), discounted by fix risk.
Prefer fixes that are small, mechanical, and land in one MR:
- Unstable foundation: split the volatile part (often one class or section) into its own module so most importers stop depending on it;
  freeze the stable part's interface.
- Hub module/function: extract a pure, dependency-free core (stable leaf) and leave orchestration in a higher module.
- Stable -> volatile edge: invert with a `Protocol` or a parameter, or move the shared type down into the stable module.
- Cycle: move shared types/constants into a lower module, or import lazily only as a last resort.
- Risky leaf (high fan-in + high complexity): characterization tests first, then simplify. Do not change its signature.

Step 3. Reply with:
1. A table: rank, target, signal (numbers from the report), fix, first safe step, est. size (S/M/L).
2. For the top pick only: a short stacked-commit plan (test commit first) and the importer count it protects.
3. One line on what the static analysis cannot see (dynamic dispatch, `obj.method()` calls) if it affects a pick.

Keep the whole answer under 40 lines. Ask before starting any refactor.
