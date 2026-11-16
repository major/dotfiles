import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
  barCells,
  fetchUsage,
  formatBar,
  formatCredits,
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
  /** 🌐 Serves one JSON body on a local port and returns the normalized usage. */
  async function fetchUsageFrom(body: unknown) {
    const server = Bun.serve({ port: 0, fetch: () => Response.json(body) });
    try {
      return await fetchUsage({ token: "fake-token" }, server.url.href);
    } finally {
      server.stop(true);
    }
  }

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

  test.each([
    // 🧾 Real API sample: utilization is null, so percent comes from used and limit.
    [
      "the real USD sample",
      {
        is_enabled: true,
        monthly_limit: 2000,
        used_credits: 0,
        utilization: null,
        currency: "USD",
        decimal_places: 2,
        spend_limit_reached: false,
      },
      { percent: 0, used: 0, limit: 2000, currency: "USD", decimals: 2, limitReached: false },
    ],
    [
      "a JPY sample with no decimals",
      {
        is_enabled: true,
        monthly_limit: 20000,
        used_credits: 5000,
        currency: "JPY",
        decimal_places: 0,
        spend_limit_reached: false,
      },
      { percent: 25, used: 5000, limit: 20000, currency: "JPY", decimals: 0, limitReached: false },
    ],
    [
      "a reached spend limit above its cap",
      {
        is_enabled: true,
        monthly_limit: 2000,
        used_credits: 2500,
        currency: "USD",
        decimal_places: 2,
        spend_limit_reached: true,
      },
      // 📈 Percent is not clamped, so usage above the cap stays above 100.
      { percent: 125, used: 2500, limit: 2000, currency: "USD", decimals: 2, limitReached: true },
    ],
    // ♾️ A null or missing monthly_limit means no cap, so credits omit limit and percent.
    [
      "a null monthly limit",
      {
        is_enabled: true,
        monthly_limit: null,
        used_credits: 0,
        currency: "USD",
        decimal_places: 2,
        spend_limit_reached: false,
      },
      { used: 0, currency: "USD", decimals: 2, limitReached: false },
    ],
    [
      "a missing monthly limit",
      { is_enabled: true, used_credits: 1234, currency: "USD", decimal_places: 2, spend_limit_reached: false },
      { used: 1234, currency: "USD", decimals: 2, limitReached: false },
    ],
  ])("parses extra usage for %s", async (_label, extraUsage, credits) => {
    // Arrange
    const body = { five_hour: { utilization: 24 }, extra_usage: extraUsage };

    // Act
    const usage = await fetchUsageFrom(body);

    // Assert
    expect(usage).toEqual({ rolling: { percent: 24 }, credits });
  });

  test.each([
    ["a lowercase currency and out-of-range decimals", { currency: "usd", decimal_places: 9 }],
    ["a four-letter currency and fractional decimals", { currency: "EURO", decimal_places: 1.5 }],
  ])("uses USD and two decimals for %s", async (_label, fields) => {
    // Arrange
    const body = {
      five_hour: { utilization: 24 },
      extra_usage: { is_enabled: true, monthly_limit: 2000, used_credits: 0, ...fields },
    };

    // Act
    const usage = await fetchUsageFrom(body);

    // Assert
    expect(usage).toEqual({
      rolling: { percent: 24 },
      credits: { percent: 0, used: 0, limit: 2000, currency: "USD", decimals: 2, limitReached: false },
    });
  });

  test.each([
    ["is_enabled is false", { is_enabled: false, monthly_limit: 2000, used_credits: 0 }],
    ["extra_usage is null", null],
    ["monthly_limit is 0", { is_enabled: true, monthly_limit: 0, used_credits: 0 }],
    ["used_credits is negative", { is_enabled: true, monthly_limit: 2000, used_credits: -1 }],
    ["used_credits is not a number", { is_enabled: true, monthly_limit: 2000, used_credits: "secret" }],
    ["monthly_limit is negative", { is_enabled: true, monthly_limit: -2000, used_credits: 0 }],
    ["monthly_limit is a numeric string", { is_enabled: true, monthly_limit: "2000", used_credits: 0 }],
    // ♾️ A null limit is uncapped only when is_enabled is true and used_credits is valid.
    ["is_enabled is false and monthly_limit is null", { is_enabled: false, monthly_limit: null, used_credits: 0 }],
    ["used_credits is negative and monthly_limit is null", { is_enabled: true, monthly_limit: null, used_credits: -1 }],
  ])("omits credits without failing when %s", async (_label, extraUsage) => {
    // Arrange
    const body = { five_hour: { utilization: 24 }, extra_usage: extraUsage };

    // Act
    const usage = await fetchUsageFrom(body);

    // Assert
    expect(usage).toEqual({ rolling: { percent: 24 } });
  });

  test("keeps valid weekly_scoped rows in API order with trimmed names", async () => {
    // Arrange
    const body = {
      five_hour: { utilization: 24 },
      limits: [
        // 🧹 Skipped: wrong kind, even though its scope is valid.
        { kind: "session", percent: 24, scope: { model: { id: null, display_name: "Fable" }, surface: null } },
        // 🧹 Skipped: not an object.
        null,
        // 🧹 Skipped: percent is a string.
        { kind: "weekly_scoped", percent: "4", scope: { model: { id: null, display_name: "Sonnet" }, surface: null } },
        // 🧹 Skipped: no model scope.
        { kind: "weekly_scoped", percent: 4, scope: null },
        // 🧹 Skipped: blank display name.
        { kind: "weekly_scoped", percent: 6, scope: { model: { id: null, display_name: "   " }, surface: null } },
        // ✅ Kept: name is trimmed, and the unparseable resets_at is dropped.
        {
          kind: "weekly_scoped",
          percent: 9,
          resets_at: "not a date",
          scope: { model: { id: null, display_name: "  Opus  " }, surface: null },
        },
        // ✅ Kept: a later valid row, so the output keeps API order.
        {
          kind: "weekly_scoped",
          percent: 4,
          resets_at: "2026-11-18T21:59:59.880666+00:00",
          scope: { model: { id: null, display_name: "Fable" }, surface: null },
        },
      ],
    };

    // Act
    const usage = await fetchUsageFrom(body);

    // Assert
    expect(usage).toEqual({
      rolling: { percent: 24 },
      scoped: [
        { name: "Opus", percent: 9 },
        { name: "Fable", percent: 4, resetsAt: "2026-11-18T21:59:59.880666+00:00" },
      ],
    });
  });

  test.each([
    ["limits is a string", "secret"],
    ["limits is an object", { kind: "weekly_scoped", percent: 4, scope: { model: { display_name: "Fable" } } }],
    [
      "every entry is malformed",
      [null, "secret", { kind: "weekly_scoped", percent: "4", scope: { model: { display_name: "Sonnet" } } }],
    ],
    ["no entry is weekly_scoped", [{ kind: "session", percent: 24, scope: { model: { display_name: "Fable" } } }]],
  ])("omits scoped rows when %s", async (_label, limits) => {
    // Arrange
    const body = { five_hour: { utilization: 24 }, limits };

    // Act
    const usage = await fetchUsageFrom(body);

    // Assert
    expect(usage).toEqual({ rolling: { percent: 24 } });
  });

  test("rejects credits and scoped rows without a Claude window", async () => {
    // Arrange
    const body = {
      extra_usage: { is_enabled: true, monthly_limit: 2000, used_credits: 0, currency: "USD", decimal_places: 2 },
      limits: [{ kind: "weekly_scoped", percent: 4, scope: { model: { display_name: "Fable" } } }],
    };

    // Act and assert
    await expect(fetchUsageFrom(body)).rejects.toThrow("Invalid Claude usage response");
  });
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

test.each([
  ["USD", { percent: 62.5, used: 1250, limit: 2000, currency: "USD", decimals: 2, limitReached: false }, "$12.50/$20.00"],
  ["EUR", { percent: 62.5, used: 1250, limit: 2000, currency: "EUR", decimals: 2, limitReached: false }, "12.50/20.00 EUR"],
  // 🪙 Zero decimals proves amounts divide by 10 ** decimals, not a fixed 100.
  ["JPY", { percent: 25, used: 5000, limit: 20000, currency: "JPY", decimals: 0, limitReached: false }, "5000/20000 JPY"],
  // ♾️ Uncapped credits show the amount used, with no cap and no percent.
  ["uncapped USD", { used: 0, currency: "USD", decimals: 2, limitReached: false }, "$0.00 used, no cap"],
  ["uncapped USD with an amount", { used: 1234, currency: "USD", decimals: 2, limitReached: false }, "$12.34 used, no cap"],
  ["uncapped EUR", { used: 1234, currency: "EUR", decimals: 2, limitReached: false }, "12.34 EUR used, no cap"],
])("formats credits for %s", (_label, credits, expected) => {
  // Act and assert
  expect(formatCredits(credits)).toBe(expected);
});

test.each([
  ["the default label width", 30, 4, undefined, 16],
  ["a three-cell label", 30, 4, 3, 15],
  ["a bar with no room left", 5, 9, 3, 0],
])("sizes bar cells for %s", (_label, width, suffixWidth, labelWidth, expected) => {
  // 📐 Cells shrink by the label width and never drop below zero.
  // Act and assert
  expect(barCells(width, suffixWidth, labelWidth)).toBe(expected);
});
