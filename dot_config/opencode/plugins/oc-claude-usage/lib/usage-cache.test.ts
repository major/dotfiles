import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { loadUsageCache } from "../../oc-codex-usage/lib/usage-cache";

let directory: string;
let previousDataHome: string | undefined;

beforeEach(async () => {
  const root = path.join(homedir(), ".cache", "opencode-tmp", "opencode");
  await mkdir(root, { recursive: true });
  directory = await mkdtemp(path.join(root, "claude-cache-test-"));
  previousDataHome = process.env.XDG_DATA_HOME;
  process.env.XDG_DATA_HOME = directory;
});

afterEach(async () => {
  if (previousDataHome === undefined) delete process.env.XDG_DATA_HOME;
  else process.env.XDG_DATA_HOME = previousDataHome;
  await rm(directory, { recursive: true, force: true });
});

describe("existing quota cache", () => {
  test("reuses a fresh response without calling the refresh again", async () => {
    // Arrange
    let calls = 0;
    const refresh = async () => {
      calls++;
      return { percent: 22 };
    };

    // Act
    const first = await loadUsageCache("fixture", 60_000, refresh);
    const second = await loadUsageCache("fixture", 60_000, refresh);

    // Assert
    expect(second).toEqual(first);
    expect(second?.value).toEqual({ percent: 22 });
    expect(calls).toBe(1);
  });

  test("a competing reader leaves the refresh to the lock owner", async () => {
    // Arrange
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    const first = loadUsageCache("fixture", 60_000, async () => {
      started.resolve();
      await finish.promise;
      return { percent: 22 };
    });
    await started.promise;

    // Act
    const competing = await loadUsageCache("fixture", 60_000, async () => {
      throw new Error("must not refresh while locked");
    }).finally(() => finish.resolve());
    await first;
    const next = await loadUsageCache("fixture", 60_000, async () => {
      throw new Error("must read the fresh cache");
    });

    // Assert
    expect(competing).toBeUndefined();
    expect(next?.value).toEqual({ percent: 22 });
    expect(next?.error).toBeUndefined();
  });

  test("keeps stale usage and caches refresh failures", async () => {
    // Arrange
    await loadUsageCache("fixture", 60_000, async () => ({ percent: 22 }));
    await Bun.write(
      path.join(directory, "opencode", "usage", "fixture.json"),
      JSON.stringify({ checkedAt: 0, value: { percent: 22 } }),
    );
    let calls = 0;
    const refresh = async () => {
      calls++;
      throw new Error("usage unavailable");
    };

    // Act
    const failed = await loadUsageCache("fixture", 60_000, refresh);
    const cached = await loadUsageCache("fixture", 60_000, refresh);

    // Assert
    expect(failed?.value).toEqual({ percent: 22 });
    expect(failed?.error).toBe("usage unavailable");
    expect(cached).toEqual(failed);
    expect(calls).toBe(1);
  });
});
