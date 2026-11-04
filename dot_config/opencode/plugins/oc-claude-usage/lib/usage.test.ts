import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  barCells,
  fetchUsage,
  formatBar,
  formatPercent,
  formatReset,
  readAuth,
} from "./usage";

const root = path.join(homedir(), ".cache", "opencode-tmp", "opencode");
await mkdir(root, { recursive: true });
const directory = await mkdtemp(path.join(root, "claude-test-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

describe("credentials", () => {
  test("reads a valid personal login", async () => {
    // Arrange
    await writeFile(path.join(directory, ".credentials.json"), JSON.stringify({
      claudeAiOauth: { accessToken: "fake-token", expiresAt: Date.now() + 60_000 },
    }));

    // Act
    const auth = await readAuth(directory);

    // Assert
    expect(auth).toEqual({ token: "fake-token" });
  });

  test.each(["missing", "malformed", "expired"])(
    "rejects %s login safely",
    async (kind) => {
      // Arrange
      const dir = await mkdtemp(path.join(directory, "auth-"));
      if (kind !== "missing") {
        const contents = kind === "malformed"
          ? "secret invalid"
          : JSON.stringify({ claudeAiOauth: { accessToken: "fake-token", expiresAt: 1 } });
        await writeFile(path.join(dir, ".credentials.json"), contents);
      }

      // Act and assert
      await expect(readAuth(dir)).rejects.toThrow(
        kind === "expired" ? "Claude login expired" : "Sign in to Claude Code",
      );
    },
  );

  test.each([
    {},
    { accessToken: 42 },
    { accessToken: "" },
    { accessToken: "fake-token", expiresAt: "invalid" },
    { accessToken: "fake-token", expiresAt: 1e999 },
  ])("rejects invalid credential fields", async (oauth) => {
    // Arrange
    const dir = await mkdtemp(path.join(directory, "auth-"));
    await writeFile(path.join(dir, ".credentials.json"), JSON.stringify({ claudeAiOauth: oauth }));

    // Act and assert
    await expect(readAuth(dir)).rejects.toThrow("Sign in to Claude Code");
  });
});

describe("usage endpoint", () => {
  test("sends headers and normalizes only supported windows", async () => {
    // Arrange
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        expect(request.headers.get("authorization")).toBe("Bearer fake-token");
        expect(request.headers.get("anthropic-beta")).toBe("oauth-2025-04-20");
        return Response.json({
          five_hour: { utilization: 22, resets_at: "2030-01-01T00:00:00Z" },
          seven_day: { utilization: 7 },
          seven_day_breakdown: { secret: "ignored" },
        });
      },
    });
    try {
      // Act
      const usage = await fetchUsage({ token: "fake-token" }, server.url.href);

      // Assert
      expect(usage).toEqual({
        rolling: { percent: 22, resetsAt: "2030-01-01T00:00:00Z" },
        weekly: { percent: 7 },
      });
    } finally {
      server.stop(true);
    }
  });

  test.each([
    [{ five_hour: { utilization: 0 }, seven_day: null }, { rolling: { percent: 0 } }],
    [{ five_hour: null, seven_day: { utilization: 7, resets_at: "bad" } }, { weekly: { percent: 7 } }],
  ])("preserves zero and omits absent data", async (body, expected) => {
    // Arrange
    const server = Bun.serve({ port: 0, fetch: () => Response.json(body) });
    try {
      // Act
      const usage = await fetchUsage({ token: "fake-token" }, server.url.href);

      // Assert
      expect(usage).toEqual(expected);
    } finally {
      server.stop(true);
    }
  });

  test.each([{}, { five_hour: { utilization: "secret" } }, { seven_day: {} }])(
    "rejects malformed windows",
    async (body) => {
      // Arrange
      const server = Bun.serve({ port: 0, fetch: () => Response.json(body) });
      try {
        // Act and assert
        await expect(fetchUsage({ token: "fake-token" }, server.url.href))
          .rejects.toThrow("Invalid Claude usage response");
      } finally {
        server.stop(true);
      }
    },
  );

  test.each([401, 403, 429, 500])("sanitizes HTTP %i", async (status) => {
    // Arrange
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response("secret body", { status }),
    });
    try {
      // Act and assert
      await expect(fetchUsage({ token: "fake-token" }, server.url.href)).rejects.toThrow(
        status === 429 ? "retry later" : status >= 500 ? "500" : "Claude login",
      );
    } finally {
      server.stop(true);
    }
  });

  test.each(["json", "redirect", "transport"])(
    "sanitizes %s errors",
    async (kind) => {
      // Arrange
      let redirected = false;
      const server = Bun.serve({
        port: 0,
        fetch(request) {
          if (new URL(request.url).pathname === "/redirected") {
            redirected = true;
            return Response.json({ five_hour: { utilization: 22 } });
          }
          if (kind === "redirect") {
            return Response.redirect(new URL("/redirected", request.url).href);
          }
          return new Response("secret body");
        },
      });
      const url = kind === "transport" ? "http://127.0.0.1:1/secret" : server.url.href;
      try {
        // Act and assert
        await expect(fetchUsage({ token: "fake-token" }, url)).rejects.toThrow(
          kind === "json" ? "Invalid Claude usage response" : "Claude usage request failed",
        );
        expect(redirected).toBe(false);
      } finally {
        server.stop(true);
      }
    },
  );
});

test("formats percentages, bars and absolute resets", () => {
  // Arrange
  const now = Date.parse("2030-01-01T00:00:00Z");

  // Act and assert
  expect(formatPercent(99.6)).toBe("100%");
  expect(formatBar(-10, 4)).toBe("[░░░░]");
  expect(formatBar(120, 4)).toBe("[████]");
  expect(formatBar(50, 2)).toBe("");
  expect(barCells(20, " resets ?".length)).toBe(1);
  expect(formatReset("2030-01-02T01:01:00Z", now)).toBe("1d1h1m");
  expect(formatReset("2029-01-01T00:00:00Z", now)).toBe("0m");
  expect(formatReset(undefined, now)).toBe("?");
});
