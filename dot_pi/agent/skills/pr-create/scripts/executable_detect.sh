#!/usr/bin/env bash
# Detect forge, branches, PR/MR templates, project commands, and tooling.
# Pure read-only probing. Prints a KEY=VALUE report plus discovered file paths.
# Never fails the caller: best-effort detection, missing pieces print "unknown".
set -u

say() { printf '%s\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1 && echo yes || echo no; }

# --- Repo / branch ---------------------------------------------------------
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  say "ERROR=not-a-git-repo"
  exit 0
fi

remote_url="$(git remote get-url origin 2>/dev/null || echo '')"
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

default_branch="$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')"
if [ -z "$default_branch" ]; then
  for b in main master trunk develop; do
    if git show-ref --verify --quiet "refs/remotes/origin/$b"; then default_branch="$b"; break; fi
  done
fi
[ -z "$default_branch" ] && default_branch="main"

# --- Forge -----------------------------------------------------------------
forge="unknown"
case "$remote_url" in
  *github.com*) forge="github" ;;
  *gitlab*)     forge="gitlab" ;;
esac

say "FORGE=$forge"
say "REMOTE_URL=${remote_url:-none}"
say "CURRENT_BRANCH=$current_branch"
say "DEFAULT_BRANCH=$default_branch"
say "ON_DEFAULT_BRANCH=$([ "$current_branch" = "$default_branch" ] && echo yes || echo no)"

# --- Tooling ---------------------------------------------------------------
say "HAS_GH=$(have gh)"
say "HAS_GLAB=$(have glab)"
say "HAS_CODERABBIT=$(have coderabbit)"
say "HAS_MAKE=$(have make)"

# --- Remotes & write access ------------------------------------------------
# Default intent: push the PR/MR source branch to the MAIN repo (origin).
# Only fall back to a fork when we lack write access to origin.
remotes="$(git remote 2>/dev/null | tr '\n' ' ')"
say "REMOTES=${remotes:-none}"
say "HAS_FORK_REMOTE=$(git remote | grep -qiE '^(fork|upstream)$' && echo yes || echo no)"

write_access="unknown"
if [ "$forge" = "github" ] && command -v gh >/dev/null 2>&1; then
  perm="$(gh repo view --json viewerPermission -q .viewerPermission 2>/dev/null || echo '')"
  case "$perm" in
    ADMIN|MAINTAIN|WRITE) write_access="yes" ;;
    READ|TRIAGE)          write_access="no" ;;
    *)                    write_access="unknown" ;;
  esac
  say "VIEWER_PERMISSION=${perm:-unknown}"
fi
say "WRITE_ACCESS_ORIGIN=$write_access"

# --- CodeRabbit config -----------------------------------------------------
cr_cfg="none"
for f in .coderabbit.yaml .coderabbit.yml coderabbit.yaml coderabbit.yml; do
  [ -f "$f" ] && { cr_cfg="$f"; break; }
done
say "CODERABBIT_CONFIG=$cr_cfg"

# --- PR / MR templates -----------------------------------------------------
# GitHub: single or multiple templates in several conventional locations.
gh_templates=""
for p in \
  .github/PULL_REQUEST_TEMPLATE.md \
  .github/pull_request_template.md \
  docs/PULL_REQUEST_TEMPLATE.md \
  PULL_REQUEST_TEMPLATE.md; do
  [ -f "$p" ] && gh_templates="$gh_templates $p"
done
if [ -d .github/PULL_REQUEST_TEMPLATE ]; then
  for p in .github/PULL_REQUEST_TEMPLATE/*.md; do
    [ -f "$p" ] && gh_templates="$gh_templates $p"
  done
fi

# GitLab: description templates live under merge_request_templates.
gl_templates=""
if [ -d .gitlab/merge_request_templates ]; then
  for p in .gitlab/merge_request_templates/*.md; do
    [ -f "$p" ] && gl_templates="$gl_templates $p"
  done
fi

say "GITHUB_PR_TEMPLATES=${gh_templates:-none}"
say "GITLAB_MR_TEMPLATES=${gl_templates:-none}"

# --- Project command hints -------------------------------------------------
# Surface likely test/coverage/lint entry points; the skill picks per project.
hints=""
[ -f Makefile ]       && hints="$hints Makefile"
[ -f Cargo.toml ]     && hints="$hints Cargo.toml"
[ -f package.json ]   && hints="$hints package.json"
[ -f pyproject.toml ] && hints="$hints pyproject.toml"
[ -f go.mod ]         && hints="$hints go.mod"
[ -f AGENTS.md ]      && hints="$hints AGENTS.md"
[ -f CONTRIBUTING.md ] && hints="$hints CONTRIBUTING.md"
say "PROJECT_FILES=${hints:-none}"

if [ -f Makefile ]; then
  targets="$(grep -oE '^[a-zA-Z0-9_-]+:' Makefile | sed 's/:.*//' | tr '\n' ' ')"
  say "MAKE_TARGETS=${targets:-none}"

  # Umbrella gate: a single make target that composes the individual quality
  # gates. Prefer the target named by .DEFAULT_GOAL if it has phony deps;
  # fall back to 'check' if it exists as a target.
  umbrella="none"
  default_goal="$(grep -oP '^\.DEFAULT_GOAL\s*:=\s*\K\S+' Makefile 2>/dev/null || echo '')"
  if [ -n "$default_goal" ] && printf '%s\n' "$targets" | grep -qw "$default_goal"; then
    umbrella="make $default_goal"
  elif printf '%s\n' "$targets" | grep -qw check; then
    umbrella="make check"
  fi
  say "UMBRELLA_GATE=$umbrella"
fi
if [ -f package.json ] && command -v node >/dev/null 2>&1; then
  scripts="$(node -e 'try{const s=require("./package.json").scripts||{};console.log(Object.keys(s).join(" "))}catch(e){console.log("")}' 2>/dev/null)"
  say "NPM_SCRIPTS=${scripts:-none}"
fi
