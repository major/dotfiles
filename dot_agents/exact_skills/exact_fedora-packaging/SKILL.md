---
name: fedora-packaging
description: |
  Use when maintaining Fedora RPM packages, especially Python packages, dist-git
  repos, Packit automation, or coupled package pairs (a CLI that pins an exact SDK
  version). Use when a Packit/Koji build fails and you need to find the root cause,
  when an upstream release adds an undeclared dependency, or when configuring
  .packit.yaml sidetag/koji_build/bodhi_update jobs.
  Triggers: "dist-git", "Packit", "Koji build failed", "rpmbuild", ".packit.yaml",
  "%pyproject_check_import", "ModuleNotFoundError in build", "sidetag",
  "bodhi update", "Bugzilla", "CLOSED RAWHIDE", "src.fedoraproject.org",
  "spec file", "BuildRequires".
---

# Fedora Packaging

## Overview

Maintaining Fedora RPM packages (Python especially) with Packit automation.
Core insight: Packit reliably handles the mechanical pull/build/update steps. The
recurring human work is diagnosing build failures, mostly caused by upstream
releases that change dependencies or import behavior without declaring it.

## Debugging a failed Packit/Koji build

The fastest path from "build failed" to root cause uses public APIs. No login
needed. Replace `PKG` and PR/task numbers.

1. **List dist-git PRs** (Packit opens "Update to X" PRs here):
   ```bash
   curl -s "https://src.fedoraproject.org/api/0/rpms/PKG/pull-requests?status=all&per_page=10" \
     | jq -r '.requests[] | "#\(.id) [\(.status)] \(.title) | by \(.user.name)"'
   ```

2. **Check CI flags on the PR** (this tells you build pass/fail without digging):
   ```bash
   curl -s "https://src.fedoraproject.org/api/0/rpms/PKG/pull-request/NN/flag" \
     | jq -r '.flags[]? | "[\(.status)] \(.username): \(.comment)"'
   ```
   Look for `[failure] ... scratch build ... RPM build failed`. The flag URL points
   at the Koji task.

3. **Walk the Koji task tree.** The parent task has children; the `buildArch`
   child holds the real `%build`/`%check` logs:
   ```bash
   curl -s "https://koji.fedoraproject.org/koji/taskinfo?taskID=PARENT" | grep -oE 'taskID=[0-9]+' | sort -u
   ```
   Identify which child is `buildArch` vs `buildSRPMFromSCM` by grepping its
   taskinfo page.

4. **Read the logs.** Koji logs live at a predictable path
   (`/work/tasks/<last4>/<taskid>/`):
   ```bash
   curl -s "https://kojipkgs.fedoraproject.org//work/tasks/2030/146162030/build.log" -o /tmp/build.log
   curl -s "https://kojipkgs.fedoraproject.org//work/tasks/2030/146162030/root.log" -o /tmp/root.log
   ```
   - `build.log`: compile/test/`%check` failures (import errors, pytest).
   - `root.log`: dependency resolution failures
     (`No match for argument: python3dist(...)`, `nothing provides ...`).

    Python build logs can be huge (700k+ lines from `%pyproject_check_import`
    walking every module). Grep for `ModuleNotFoundError`, `Failed to import`,
    `error: Bad exit status`, `nothing provides`, `No match for argument`.

## Triggering Packit manually

`fedpkg` stores Pagure tokens in `~/.config/rpkg/fedpkg.conf`. Use the
`[fedpkg.pagure] token` value for Pagure API comments; do not print it.

```bash
python3 - <<'PY'
import configparser, subprocess
from pathlib import Path

parser = configparser.ConfigParser()
parser.read(Path.home() / ".config/rpkg/fedpkg.conf")
token = parser.get("fedpkg.pagure", "token").strip()
subprocess.run([
    "curl", "-s", "-X", "POST",
    "-H", f"Authorization: token {token}",
    "-d", "comment=/packit koji-build",
    "https://src.fedoraproject.org/api/0/rpms/PKG/pull-request/NN/comment",
], check=False)
PY
```

The installed `pagure` CLI may not support pull-request comments, so direct API
calls are the reliable fallback.

For a completed sidetag that Packit owns, `/packit create-update` on the owning
dist-git PR can create the Bodhi side-tag update:

```bash
# Same endpoint/auth as above, different comment body:
comment=/packit create-update
```

## Closing release-monitoring Bugzilla tickets

For Anitya/release-monitoring bugs after the build is actually in Rawhide, close as `CLOSED` with resolution `RAWHIDE`. Verify the package first with Koji/Bodhi; do not close based only on a dist-git commit.

The `python-bugzilla` CLI can query public bugs, but authenticated modify calls may fail against Red Hat Bugzilla because the legacy XML-RPC path is rejected. Use the REST API with an API key in the `Authorization` header instead.

Store the token as an INI file, not as a raw one-line token. A raw token file can be echoed in a `python-bugzilla` traceback if parsing fails.

```ini
[bugzilla.redhat.com]
token = BUGZILLA_API_TOKEN
```

Keep this file out of dotfile sync. Recommended path:

```bash
~/.config/bugzilla/redhat-token
```

Close and verify with REST:

```bash
token=$(awk -F'= *' '/^token[[:space:]]*=/{print $2}' ~/.config/bugzilla/redhat-token)

curl --silent --show-error --fail --request PUT \
  --header "Authorization: Bearer $token" \
  --header "Content-Type: application/json" \
  --data '{"status":"CLOSED","resolution":"RAWHIDE","comment":{"body":"Fixed in Rawhide with PKG-NVR.\n\nKoji: KOJI_BUILD_URL\nBodhi: BODHI_UPDATE_URL"}}' \
  "https://bugzilla.redhat.com/rest/bug/BUGID" | jq .

curl --silent --show-error --fail \
  --header "Authorization: Bearer $token" \
  "https://bugzilla.redhat.com/rest/bug?id=BUGID&include_fields=id,status,resolution,summary,last_change_time" \
  | jq -r '.bugs[] | [.id, .status, .resolution, .summary, .last_change_time] | @tsv'
```

Expected verification output includes `CLOSED` and `RAWHIDE`.

## Rawhide-only Packit release automation

For a package that should only auto-update Rawhide, keep `.packit.yaml` explicit. Do not rely on Packit inferring the package name from the checkout directory, especially inside worktrees or temporary clones.

```yaml
upstream_project_url: https://github.com/ORG/PROJECT
downstream_package_name: PKG
upstream_tag_template: v{version}

jobs:
  - job: pull_from_upstream
    trigger: release
    dist_git_branches:
      - fedora-rawhide

  - job: koji_build
    trigger: commit
    dist_git_branches:
      - fedora-rawhide
    allowed_pr_authors:
      - packit
      - FAS_ID
    allowed_committers:
      - packit
      - FAS_ID
```

Use `fedora-rawhide`, not `fedora-all`, when the goal is Rawhide-only automation. `fedora-all` can open release PRs for active stable/branched releases too. `propose_downstream` is redundant for a dist-git package using `pull_from_upstream`, and `bodhi_update` is not needed for Rawhide.

Release-monitoring events can create Packit PRs before you finish tuning the config. Always list current PRs first before trying to retrigger Packit or create a new PR:

```bash
curl -s "https://src.fedoraproject.org/api/0/rpms/PKG/pull-requests?status=Open&per_page=10" \
  | jq -r '.requests[] | "#\(.id) [\(.status)] \(.title) from \(.repo_from.fullname) branch \(.branch_from) -> \(.branch)"'
```

Packit PRs can be inspected without a browser, even when src.fedoraproject.org's web UI is behind Anubis:

```bash
curl -s "https://src.fedoraproject.org/api/0/rpms/PKG/pull-request/NN" | jq .
curl -s "https://src.fedoraproject.org/api/0/rpms/PKG/pull-request/NN/flag" \
  | jq -r '.flags[]? | "[\(.status)] \(.username): \(.comment) \(.url // "")"'
git fetch origin refs/pull/NN/head:refs/remotes/origin/pr/NN
git diff origin/rawhide..origin/pr/NN
```

If Packit opened the release PR but the PR needs config or spec fixes, prefer updating Packit's PR branch instead of creating a duplicate maintainer PR. Packit's initial PR comment gives the exact remote and branch. The generic pattern is:

```bash
git remote add packit "ssh://$USER@pkgs.fedoraproject.org/forks/packit/rpms/PKG.git"
git fetch packit refs/heads/BRANCH:refs/remotes/packit/BRANCH
git switch -c packit-pr-NN packit/BRANCH
# commit fixes
git push packit packit-pr-NN:BRANCH
```

Local `packit pull-from-upstream` is useful as a simulation: it can prove upstream tag detection, spec version detection, tarball naming, and source download. It may fail at lookaside upload without the same credentials/context that Packit service has. In a linked worktree, it can also fail switching to `rawhide` if another worktree already has that branch checked out.

`packit validate` can hang after printing the config path in some environments. Treat its early warnings as useful, but do not block forever waiting for it. Validate YAML syntax separately with `yq '.' .packit.yaml >/dev/null`.

## Packit dashboard API

The Packit dashboard is a JS app, but its API is simple and better for agents:

```bash
curl -s 'https://prod.packit.dev/api/koji-builds?page=1&per_page=30&scratch=false' \
  | jq -r '.[] | [.packit_id, .repo_name, .chroot, .status, (.task_id // "")] | @tsv'
curl -s 'https://prod.packit.dev/api/koji-builds/PACKIT_ID' | jq .
```

Useful fields: `status` (`pending`, `running`, `success`, `skipped`), `task_id`,
`run_ids`, `commit_sha`, and `web_url`. Skipped jobs may not include a reason in
the public API; correlate with concurrent jobs and PR comments.

## The "undeclared upstream dependency" pattern

The most common Python build break. Symptom in `build.log`:

```text
File ".../somepkg/foo.py", line 9, in <module>
    import newdep
ModuleNotFoundError: No module named 'newdep'
```

Root cause: upstream added `import newdep` in code but did NOT add it to
`pyproject.toml`/`setup.py`. Therefore:
- `%pyproject_buildrequires` does not pull it (it reads metadata).
- The auto-generated runtime `Requires` does not include it (also metadata-based).
- `%pyproject_check_import` fails because the import is real.

Diagnosis steps:
1. Confirm the import is unconditional and undeclared:
   ```bash
   curl -sL "https://raw.githubusercontent.com/ORG/REPO/vVERSION/pyproject.toml" | grep -iE "dependencies|newdep"
   curl -sL "https://raw.githubusercontent.com/ORG/REPO/vVERSION/src/.../foo.py" | grep -n "import newdep"
   ```
2. Confirm the dep is packaged in Fedora and provides the right virtual provide:
   ```bash
   curl -s "https://mdapi.fedoraproject.org/rawhide/pkg/python3-newdep" \
     | jq -r '.provides[]? | "\(.name) \(.version)"' | grep dist
   ```
   You want to see `python3dist(newdep)`.

Fix: add BOTH (build-time for the import check, runtime for actual use), with a
comment explaining why it is manual:
```spec
# Upstream imports newdep unconditionally but does not declare it in
# pyproject.toml, so it is neither pulled by %%pyproject_buildrequires nor
# auto-generated as a runtime dependency.
BuildRequires:  python3dist(newdep)
...
Requires:       python3dist(newdep)
```

Also report it upstream (missing dependency declaration is an upstream bug).

## Coupled package pairs (CLI pins exact SDK)

Some CLIs pin their SDK exactly, e.g. oci-cli `setup.py` has `oci==2.177.0`. Each
CLI release dictates a specific SDK version.

- The spec usually relaxes the pin in `%prep`
  (`sed -i -e 's/==/>=/' setup.py`), so a newer SDK is acceptable at build time.
- Verdict logic when deciding whether to update the pair:
  - SDK version == pin: ideal, update together.
  - SDK version > pin: allowed (spec relaxes to `>=`); proceed.
  - SDK version < pin: blocked; build the SDK first.
- Find the pin for a target CLI version without cloning:
  ```bash
  curl -sL "https://raw.githubusercontent.com/ORG/cli/vVERSION/setup.py" | grep "'sdk=="
  ```

## Packit sidetag coordination (coupled builds)

When package B build-requires package A and they ship together, use a sidetag
group so A builds and lands before B. Verified rules:

- **Dependency A** (`python-oci`): `koji_build` `trigger: commit`, `dependents: [B]`.
- **Dependent B** (`oci-cli`): `koji_build` `trigger: commit | koji_build` (NOT
  just `koji_build`), `dependencies: [A]`. The `| koji_build` half is required so
  B builds both on its own update AND when A lands in the sidetag. Omitting it
  means B only builds when A updates, forcing manual rebuild commits.
- **One** `bodhi_update` job (on B), `trigger: koji_build`,
  `dependencies: [A]`, `dist_git_branches: [fedora-branched]`.
- Rawhide does NOT use Bodhi: rawhide updates are created automatically. So
  `bodhi_update` targets `fedora-branched`, never `fedora-rawhide`.
- The sidetag is removed when the grouped Bodhi update is created.

Since Koji 1.35, sidetag buildroot repos no longer auto-regenerate; a dependent
build may need the repo recreated (`koji wait-repo <tag> --build=<nvr> --request`).
If a coupled build races (B can't see freshly-built A), this is the likely cause.

Observed Packit behavior: for a sidetag group, Packit created a `waitrepo` child
before `buildSRPMFromSCM`, built A in the side tag, tagged A, then queued B. So
Packit can handle the sidetag repo wait in this path. However, successful sidetag
builds are not the same as release completion: verify that the builds leave the
side tag and land in the target tag (e.g. `f45`) or that a Bodhi/update step is
created. A sidetag containing the new builds while the target tag still has old
NVRs means the release is not finished.

Important caveat: a `dependents:` trigger builds the dependent package's dist-git
HEAD, not necessarily an open Packit release PR for that dependent. If A and B
both have release PRs, triggering A proves the sidetag workflow but may build B's
current rawhide version. Trigger and verify B's PR separately.

Direct-push gotcha: Packit `koji_build` triggers for direct pushes require the
committer in `allowed_committers`, and Packit only submits builds for commits
that touch the spec file. Config-only commits do not retroactively trigger Koji.

## Spec conventions seen in these packages

- `%autorelease` + `%autochangelog` (rpmautospec): do not hand-edit Release or
  changelog. Packit and `%autochangelog` handle them.
- `%prep` dependency relaxing: `sed -i -e 's/,[<=]\+[0-9\.]\+//' -e 's/==/>=/'`
  strips upper bounds and pins. After an upstream release, verify these sed
  expressions still match (upstream may change the file format).
- `%pyproject_check_import -e 'pattern'` excludes modules from the import check.
  Do not exclude a core module to mask a real missing dependency; add the dep.

## Quick reference

| Need | Command |
|------|---------|
| List dist-git PRs | `curl .../api/0/rpms/PKG/pull-requests?status=all` |
| PR build status | `curl .../api/0/rpms/PKG/pull-request/NN/flag` |
| Fetch a PR branch | `git fetch origin refs/pull/NN/head` |
| Fetch Packit PR branch | `git fetch packit refs/heads/BRANCH:refs/remotes/packit/BRANCH` |
| Update Packit PR branch | `git push packit LOCAL_BRANCH:BRANCH` |
| Koji task children | `curl ".../taskinfo?taskID=ID" \| grep -oE 'taskID=[0-9]+'` |
| Koji task tree | `koji taskinfo -r TASK_ID` |
| Koji build log | `curl .../work/tasks/<last4>/<id>/build.log` |
| Builds in target tag | `koji list-tagged f45 PKG` |
| Builds in sidetag | `koji list-tagged f45-build-side-NNNNNN` |
| Packit Koji jobs | `curl 'https://prod.packit.dev/api/koji-builds?page=1&per_page=30&scratch=false'` |
| Trigger Packit PR build | `POST .../api/0/rpms/PKG/pull-request/NN/comment comment=/packit koji-build` |
| Trigger pull from upstream with PR config | `POST .../api/0/rpms/PKG/pull-request/NN/comment comment=/packit pull-from-upstream --with-pr-config` |
| Create Packit side-tag update | `POST .../api/0/rpms/PKG/pull-request/NN/comment comment=/packit create-update` |
| Close release-monitoring bug | `PUT https://bugzilla.redhat.com/rest/bug/BUGID status=CLOSED resolution=RAWHIDE` |
| Is dep in Fedora? | `curl mdapi.fedoraproject.org/rawhide/pkg/python3-DEP` |
| Upstream pin | `curl raw.githubusercontent.com/ORG/REPO/vVER/setup.py` |

## Common mistakes

- Excluding a failing module from `%pyproject_check_import` instead of adding its
  missing dependency. Masks the bug; package breaks at runtime.
- Putting `bodhi_update` on `fedora-rawhide`. Rawhide auto-creates updates; the
  job never fires there.
- Using `fedora-all` when the desired automation scope is Rawhide only. It can
  create PRs for branched/stable releases too.
- Assuming Packit did nothing before checking open dist-git PRs. Release
  monitoring may already have opened the update PR.
- Creating a duplicate maintainer PR when Packit's PR branch can be updated
  directly. Fetch/push the branch in `forks/packit/rpms/PKG` when the PR comment
  says maintainers can do so.
- Dependent package using `trigger: koji_build` alone. Use `commit | koji_build`.
- Hand-editing Release/changelog when `%autorelease`/`%autochangelog` are used.
- Reading only `build.log` for a dep-resolution failure. Check `root.log` for
  `nothing provides` / `No match for argument`.
- Assuming a dependent Packit build validates the dependent's open release PR.
  It may build dist-git HEAD instead; check the NVR in `koji taskinfo -r`.
- Treating a successful sidetag build as complete. Check the target tag or Bodhi;
  builds can sit in the sidetag while rawhide still has the old NVRs.
- Expecting config-only `.packit.yaml` commits to trigger Koji. Direct-push Koji
  jobs need `allowed_committers` and a spec-file change.
- Using `bugzilla --tokenfile` for authenticated Red Hat Bugzilla changes. The
  CLI still uses XML-RPC for modify operations; use REST with `Authorization:
  Bearer ...` instead.
- Storing a Bugzilla token as a raw one-line `--tokenfile`. Use INI format and
  never let token parse errors print the token into logs.
- Blocking on slow Koji architecture scheduling when PR flags and `koji taskinfo`
  show the task is merely pending/running. Report the live task URL and re-check
  later instead of treating capacity delays as package failures.
