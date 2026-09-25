---
name: podman-maven-verify
description: >-
  Load BEFORE running any Podman or Maven command. Build, test, and run reproducers for a Maven Java project inside rootless Podman with a known-good command, fixed paths, and no flag guessing. Use when verifying, rebasing, or backporting a patch to a Maven library (for example httpcore/httpclient LTWL CVE fixes), running `mvn test` or `mvn package` in a container, building or testing a shipped JAR, counting test results, or running a JAR-based probe or reproducer. Triggers: "Podman Maven", "verify patch", "patch rebase", "shipped JAR", "reproducer", "probe", "test counts", "verification evidence".
---

# Podman Maven verification

Use the commands below as written.
Do not experiment with SELinux, user-namespace, or network flags; these combinations are known to work on this host.

## 1. Fixed layout

Keep all work under one root and pass absolute paths between lanes:

```text
WORKTREE = <repo>/.worktrees/<branch>        # source under test
SANDBOX  = ~/.cache/opencode-tmp/opencode/<ticket>/sandbox   # logs, JARs, probe output
```

- Never use `/tmp/opencode` or any other scratch root.
- Write every artifact path you create into your final response, so the next lane does not have to search for it.
- If a path is missing from your instructions, ask the parent instead of running `find` or `grep -r` across temp directories.

```sh
mkdir -p "$SANDBOX"
```

## 2. Warm the Maven cache once (online)

Offline builds fail if `~/.m2` lacks dependencies.
Run this once per worktree, before any `--network=none` build:

```sh
podman run --rm --security-opt label=disable \
  --userns=keep-id:uid=0,gid=0 \
  -v "$HOME/.m2/repository:/root/.m2/repository" \
  -v "$WORKTREE:/build" -w /build \
  docker.io/library/maven:3.9.9-eclipse-temurin-8 \
  mvn -q dependency:go-offline -pl <module>
```

## 3. Build and test (offline)

```sh
podman run --rm --network=none --security-opt label=disable \
  --userns=keep-id:uid=0,gid=0 \
  -v "$HOME/.m2/repository:/root/.m2/repository" \
  -v "$WORKTREE:/build" -w /build \
  docker.io/library/maven:3.9.9-eclipse-temurin-8 \
  mvn clean package -pl <module> -Dmaven.javadoc.skip=true \
  2>&1 | tee "$SANDBOX/build.log"
```

- Add `-DskipTests` only when you only need the JAR; run the full suite once and reuse its log.
- Get test counts from the log instead of rerunning: `grep -E 'Tests run:|BUILD (SUCCESS|FAILURE)' "$SANDBOX/build.log" | tail -5`.
- Copy the built JAR into the sandbox and record its hash: `cp "$WORKTREE/<module>/target/"*.jar "$SANDBOX/" && sha256sum "$SANDBOX/"*.jar`.
- Use a JDK image that matches the project's target release (`eclipse-temurin-8` for Java 8 projects such as httpcore 4.4.x).

## 4. Run a probe or reproducer against a JAR

```sh
podman run --rm --network=none --security-opt label=disable \
  -v "$SANDBOX:/sandbox" -w /sandbox \
  docker.io/library/maven:3.9.9-eclipse-temurin-8 \
  java -cp "/sandbox/<probe-classes>:/sandbox/<lib>.jar" <MainClass> \
  > "$SANDBOX/<label>.jsonl"
```

- Run baseline and patched JARs with the same command, changing only the JAR path and the output file name.
- Keep `--network=none` so results cannot depend on external services.

## 5. Work efficiently

- Batch independent commands (hashes, log greps, `ls` of known paths) into one shell call.
- If a command fails, read the error first; do not retry with different flags unless the error names the flag.
- Artifact verification proves the code compiles and the listed tests pass; do not claim more than the logs show.
