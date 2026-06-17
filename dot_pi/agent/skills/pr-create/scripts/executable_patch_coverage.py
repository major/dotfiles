#!/usr/bin/env python3
"""Local Codecov-style project and patch coverage check from LCOV + git diff.

This intentionally implements the small subset needed before opening a PR:
- read project/patch targets from codecov.yml when present
- honor simple Codecov `ignore:` path globs
- compute project coverage from LCOV `DA:<line>,<hits>` records
- compute patch coverage over added/modified lines in `git diff <base>...HEAD`

It is not a full Codecov reimplementation, but it catches the embarrassing
class of failures: changed coverable lines below the patch coverage target.
"""
from __future__ import annotations

import argparse
import fnmatch
import os
import re
import subprocess
import sys
from pathlib import Path


def run(args: list[str], cwd: Path) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True, stderr=subprocess.DEVNULL)


def pct(text: str, default: float) -> float:
    m = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%?", text)
    return float(m.group(1)) if m else default


def parse_codecov_config(path: Path) -> tuple[float, float, list[str]]:
    project_target = 0.0
    patch_target = 0.0
    ignores: list[str] = []
    if not path.exists():
        return project_target, patch_target, ignores

    lines = path.read_text(encoding="utf-8").splitlines()
    section: str | None = None
    in_ignore = False
    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if re.match(r"^\s{4}project:\s*$", line):
            section = "project"
            in_ignore = False
            continue
        if re.match(r"^\s{4}patch:\s*$", line):
            section = "patch"
            in_ignore = False
            continue
        if re.match(r"^ignore:\s*$", line):
            in_ignore = True
            section = None
            continue
        if in_ignore:
            m = re.match(r"^\s*-\s*[\"']?([^\"']+?)[\"']?\s*$", line)
            if m:
                ignores.append(m.group(1))
            continue
        m = re.match(r"^\s{8,}target:\s*(.+)$", line)
        if m and section == "project":
            project_target = pct(m.group(1), project_target)
        elif m and section == "patch":
            patch_target = pct(m.group(1), patch_target)
    return project_target, patch_target, ignores


def ignored(path: str, patterns: list[str]) -> bool:
    p = path.replace(os.sep, "/")
    for pat in patterns:
        pat = pat.replace(os.sep, "/")
        if pat.endswith("/") and p.startswith(pat):
            return True
        if fnmatch.fnmatch(p, pat) or fnmatch.fnmatch(p, pat.rstrip("/") + "/**"):
            return True
    return False


def parse_lcov(path: Path, repo: Path, ignores: list[str]) -> dict[str, dict[int, int]]:
    coverage: dict[str, dict[int, int]] = {}
    current: str | None = None
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if raw.startswith("SF:"):
            sf = raw[3:]
            file_path = Path(sf)
            if file_path.is_absolute():
                try:
                    rel = file_path.relative_to(repo).as_posix()
                except ValueError:
                    rel = file_path.name
            else:
                rel = file_path.as_posix()
            current = None if ignored(rel, ignores) else rel
            if current is not None:
                coverage.setdefault(current, {})
        elif current and raw.startswith("DA:"):
            fields = raw[3:].split(",")
            if len(fields) >= 2:
                try:
                    line_no = int(fields[0])
                    hits = int(float(fields[1]))
                except ValueError:
                    continue
                coverage[current][line_no] = hits
        elif raw == "end_of_record":
            current = None
    return coverage


def changed_lines(repo: Path, base: str, ignores: list[str]) -> dict[str, set[int]]:
    try:
        merge_base = run(["git", "merge-base", base, "HEAD"], repo).strip()
    except subprocess.CalledProcessError:
        merge_base = base
    diff = run(["git", "diff", "--unified=0", "--diff-filter=AM", merge_base, "HEAD"], repo)
    out: dict[str, set[int]] = {}
    current: str | None = None
    new_line = 0
    for raw in diff.splitlines():
        if raw.startswith("+++ b/"):
            path = raw[6:]
            current = None if ignored(path, ignores) else path
            if current is not None:
                out.setdefault(current, set())
            continue
        if raw.startswith("@@"):
            m = re.search(r"\+(\d+)(?:,(\d+))?", raw)
            new_line = int(m.group(1)) if m else 0
            continue
        if current is None or not raw or raw.startswith("---") or raw.startswith("diff "):
            continue
        prefix = raw[0]
        if prefix == "+":
            out[current].add(new_line)
            new_line += 1
        elif prefix == "-":
            # Deletions do not consume a line in the new file.
            continue
        else:
            new_line += 1
    return out


def ratio(hit: int, total: int) -> float:
    return 100.0 if total == 0 else (hit * 100.0 / total)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="origin/main")
    parser.add_argument("--lcov", default="lcov.info")
    parser.add_argument("--config", default="codecov.yml")
    parser.add_argument("--project-target", type=float)
    parser.add_argument("--patch-target", type=float)
    parser.add_argument(
        "--fail-on-missing-patch",
        action="store_true",
        help="fail when any changed coverable line is uncovered, even if the numeric patch target passes",
    )
    args = parser.parse_args()

    repo = Path(run(["git", "rev-parse", "--show-toplevel"], Path.cwd()).strip())
    config = repo / args.config
    lcov = repo / args.lcov
    if not lcov.exists():
        print(f"coverage: missing {args.lcov}; run the coverage generator first", file=sys.stderr)
        return 2

    project_target, patch_target, ignores = parse_codecov_config(config)
    if args.project_target is not None:
        project_target = args.project_target
    if args.patch_target is not None:
        patch_target = args.patch_target

    cov = parse_lcov(lcov, repo, ignores)
    project_total = sum(len(lines) for lines in cov.values())
    project_hit = sum(1 for lines in cov.values() for hits in lines.values() if hits > 0)
    project_pct = ratio(project_hit, project_total)

    changed = changed_lines(repo, args.base, ignores)
    patch_total = 0
    patch_hit = 0
    missing: list[tuple[str, int]] = []
    uncovered_non_coverable = 0
    for file, lines in sorted(changed.items()):
        file_cov = cov.get(file, {})
        for line in sorted(lines):
            if line not in file_cov:
                uncovered_non_coverable += 1
                continue
            patch_total += 1
            if file_cov[line] > 0:
                patch_hit += 1
            else:
                missing.append((file, line))
    patch_pct = ratio(patch_hit, patch_total)

    print(f"project coverage: {project_hit}/{project_total} ({project_pct:.2f}%), target {project_target:.2f}%")
    print(f"patch coverage:   {patch_hit}/{patch_total} ({patch_pct:.2f}%), target {patch_target:.2f}%")
    if uncovered_non_coverable:
        print(f"patch non-coverable changed lines ignored: {uncovered_non_coverable}")
    if missing:
        print("missing patch coverage:")
        for file, line in missing[:50]:
            print(f"  {file}:{line}")
        if len(missing) > 50:
            print(f"  ... {len(missing) - 50} more")

    ok = True
    if project_target and project_pct + 1e-9 < project_target:
        ok = False
        print("coverage: project target failed", file=sys.stderr)
    if patch_target and patch_pct + 1e-9 < patch_target:
        ok = False
        print("coverage: patch target failed", file=sys.stderr)
    if args.fail_on_missing_patch and missing:
        ok = False
        print("coverage: changed lines are missing coverage", file=sys.stderr)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
