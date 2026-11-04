import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { loadUsageCache } from "../../oc-codex-usage/lib/usage-cache";

export type Auth = { token: string };
export type Window = { percent: number; resetsAt?: string };
export type Usage = { rolling?: Window; weekly?: Window };

const LOGIN = "Sign in to Claude Code to enable Claude usage.";
const INVALID = "Invalid Claude usage response.";

/** Returns the absolute personal Claude configuration directory. */
export function configDirectory() {
  return path.resolve(
    process.env.CLAUDE_CONFIG_DIR ?? path.join(homedir(), ".claude"),
  );
}

/** Reads Claude Code's login without changing or refreshing credentials. */
export async function readAuth(directory = configDirectory()): Promise<Auth> {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path.join(directory, ".credentials.json"), "utf8"));
  } catch {
    throw new Error(LOGIN);
  }
  if (!value || typeof value !== "object" || !("claudeAiOauth" in value)) {
    throw new Error(LOGIN);
  }
  const oauth = value.claudeAiOauth;
  if (
    !oauth || typeof oauth !== "object" || !("accessToken" in oauth) ||
    typeof oauth.accessToken !== "string" || !oauth.accessToken.trim()
  ) {
    throw new Error(LOGIN);
  }
  if ("expiresAt" in oauth) {
    if (typeof oauth.expiresAt !== "number" || !Number.isFinite(oauth.expiresAt)) {
      throw new Error(LOGIN);
    }
    if (oauth.expiresAt <= Date.now()) {
      throw new Error("Claude login expired. Open Claude Code to refresh it.");
    }
  }
  return { token: oauth.accessToken };
}

/** Fetches and validates the two supported Claude usage windows. */
export async function fetchUsage(
  auth: Auth,
  url = "https://api.anthropic.com/api/oauth/usage",
): Promise<Usage> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        authorization: `Bearer ${auth.token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Claude usage request failed. Try again later.");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Claude login or profile unavailable. Open Claude Code to sign in.");
    }
    if (response.status === 429) {
      throw new Error("Claude usage rate limited. Please retry later.");
    }
    throw new Error(`Claude usage request failed (${response.status}).`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(INVALID);
  }
  if (!body || typeof body !== "object") throw new Error(INVALID);
  const data = body as Record<string, unknown>;
  const rolling = parseWindow(data.five_hour);
  const weekly = parseWindow(data.seven_day);
  if (!rolling && !weekly) throw new Error(INVALID);
  return { ...(rolling ? { rolling } : {}), ...(weekly ? { weekly } : {}) };
}

/** Validates a single optional API window. */
function parseWindow(value: unknown): Window | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "object" || !("utilization" in value) ||
    typeof value.utilization !== "number" || !Number.isFinite(value.utilization)
  ) {
    throw new Error(INVALID);
  }
  const resetsAt =
    "resets_at" in value && typeof value.resets_at === "string" &&
    Number.isFinite(Date.parse(value.resets_at))
      ? value.resets_at
      : undefined;
  return { percent: value.utilization, ...(resetsAt ? { resetsAt } : {}) };
}

/** Loads a shared cache partitioned by the non-secret configuration directory. */
export async function loadUsage(
  interval: number,
): Promise<{ value?: Usage; error?: string } | undefined> {
  const directory = configDirectory();
  const hash = createHash("sha256").update(directory).digest("hex").slice(0, 16);
  const name = `claude-${hash}`;
  try {
    return await loadUsageCache(name, interval, async () =>
      fetchUsage(await readAuth(directory)),
    );
  } catch {
    return { error: "Claude usage cache unavailable. Try again later." };
  }
}

/** Formats a raw usage percentage. */
export function formatPercent(percent: number) {
  return `${Math.round(percent)}%`.padStart(4, " ");
}

/** Renders a clamped bar when enough cells are available. */
export function formatBar(percent: number, cells: number) {
  if (cells < 3) return "";
  const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * cells);
  return `[${"█".repeat(filled)}${"░".repeat(cells - filled)}]`;
}

/** Calculates bar space after reserving the widest suffix. */
export function barCells(width: number, suffixWidth: number) {
  return Math.max(0, width - 10 - suffixWidth);
}

/** Formats a reset timestamp relative to the supplied clock. */
export function formatReset(resetsAt: string | undefined, now: number) {
  const timestamp = resetsAt ? Date.parse(resetsAt) : NaN;
  if (!Number.isFinite(timestamp)) return "?";
  const total = Math.ceil(Math.max(0, timestamp - now) / 60_000);
  const days = Math.floor(total / 1440);
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const duration = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
  ].join("");
  return duration || "0m";
}
