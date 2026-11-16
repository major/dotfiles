import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { loadUsageCache } from "../../oc-codex-usage/lib/usage-cache";

export type Auth = { token: string };
export type Window = { percent: number; resetsAt?: string };
export type ScopedWindow = Window & { name: string };
export type Credits = {
  used: number; // minor units
  limit?: number; // 📉 minor units; absent when the monthly spend is uncapped
  percent?: number; // 📈 used / limit * 100, not clamped; present exactly when limit is
  currency: string;
  decimals: number;
  limitReached: boolean;
};
export type Balance = { amount: number; currency: string; decimals: number }; // 💰 minor units
export type Usage = {
  rolling?: Window;
  weekly?: Window;
  scoped?: ScopedWindow[];
  credits?: Credits;
  balance?: Balance;
};
type Money = { currency: string; decimals: number };

const LOGIN = "Sign in to Claude Code to enable Claude usage.";
const INVALID = "Invalid Claude usage response.";
const ORG_ID = /^[0-9a-f-]{36}$/i;

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

/** Builds the shared request options: bearer auth, no redirects, and a 10 second timeout. */
function requestInit(auth: Auth): RequestInit {
  return {
    headers: {
      authorization: `Bearer ${auth.token}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  };
}

/** Fetches Claude usage. The two windows stay strict; credits and scoped limits fail soft. */
export async function fetchUsage(
  auth: Auth,
  url = "https://api.anthropic.com/api/oauth/usage",
): Promise<Usage> {
  let response: Response;
  try {
    response = await fetch(url, requestInit(auth));
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
  const scoped = parseScoped(data.limits);
  const credits = parseCredits(data.extra_usage);
  return {
    ...(rolling ? { rolling } : {}),
    ...(weekly ? { weekly } : {}),
    ...(scoped ? { scoped } : {}),
    ...(credits ? { credits } : {}),
  };
}

/** Reads the organization UUID from Claude Code's global config, or undefined when missing or malformed. */
export async function readOrgId(
  file = process.env.CLAUDE_CONFIG_DIR
    ? path.join(process.env.CLAUDE_CONFIG_DIR, ".claude.json")
    : path.join(homedir(), ".claude.json"),
): Promise<string | undefined> {
  try {
    const config = asRecord(JSON.parse(await readFile(file, "utf8")));
    const orgId = asRecord(config?.oauthAccount)?.organizationUuid;
    return typeof orgId === "string" && ORG_ID.test(orgId) ? orgId : undefined;
  } catch {
    return undefined;
  }
}

/** Fetches the prepaid credit balance. Any failure yields undefined so usage still shows. */
export async function fetchBalance(
  auth: Auth,
  orgId: string,
  baseUrl = "https://api.anthropic.com",
): Promise<Balance | undefined> {
  const url = `${baseUrl}/api/oauth/organizations/${encodeURIComponent(orgId)}/prepaid/credits`;
  try {
    const response = await fetch(url, requestInit(auth));
    if (!response.ok) return undefined;
    return parseBalance(await response.json());
  } catch {
    return undefined;
  }
}

/** Reads the prepaid amount in minor units, or undefined when the shape is unusable. */
function parseBalance(body: unknown): Balance | undefined {
  const data = asRecord(body);
  const credits = asRecord(asRecord(data?.balance)?.credits);
  const amount = credits?.amount_minor;
  if (!isFiniteNumber(amount) || amount < 0) return undefined;
  return {
    amount,
    currency: parseCurrency(data?.currency),
    decimals: parseDecimals(credits?.exponent),
  };
}

/** Keeps only whole decimal places from 0 to 4; any other value means two. */
function parseDecimals(value: unknown): number {
  // 🔢 Only whole decimal places from 0 to 4 are trusted; any other value means two.
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0 && value <= 4 ? value : 2;
}

/** Keeps a three-letter uppercase currency code; any other value means USD. */
function parseCurrency(value: unknown): string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : "USD";
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
  const resetsAt = "resets_at" in value ? parseResetsAt(value.resets_at) : undefined;
  return { percent: value.utilization, ...(resetsAt ? { resetsAt } : {}) };
}

/** Keeps a reset time only when Date.parse accepts it, so a bad time never hides the row. */
function parseResetsAt(value: unknown): string | undefined {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : undefined;
}

/** Checks for a finite number without coercing strings or other values. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Narrows untrusted JSON to an object, or undefined for anything else. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

/** Reads the extra-usage block as a credit meter; disabled or invalid blocks yield undefined. */
function parseCredits(value: unknown): Credits | undefined {
  const extra = asRecord(value);
  if (!extra || extra.is_enabled !== true) return undefined;
  const { monthly_limit: limit, used_credits: used } = extra;
  if (!isFiniteNumber(used) || used < 0) return undefined;
  const meter = {
    used,
    currency: parseCurrency(extra.currency),
    decimals: parseDecimals(extra.decimal_places),
    limitReached: extra.spend_limit_reached === true,
  };
  // ♾️ A null or missing limit is an uncapped meter, so it has no limit or percent keys.
  if (limit === undefined || limit === null) return meter;
  if (!isFiniteNumber(limit) || limit <= 0) return undefined;
  return {
    ...meter,
    // 💳 The real API sends utilization as null, so the percent comes from used and limit.
    percent: (used / limit) * 100,
    limit,
  };
}

/** Reads model-scoped weekly limits in API order, or undefined when none are usable. */
function parseScoped(value: unknown): ScopedWindow[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value.map(parseScopedRow).filter((row): row is ScopedWindow => row !== undefined);
  return rows.length ? rows : undefined;
}

/** Reads one weekly_scoped limit with a finite percent and a model name, or undefined. */
function parseScopedRow(entry: unknown): ScopedWindow | undefined {
  const row = asRecord(entry);
  if (!row || row.kind !== "weekly_scoped") return undefined;
  const { percent } = row;
  // ✂️ The name is trimmed, and a blank name skips the whole row.
  const model = asRecord(asRecord(row.scope)?.model);
  const displayName = model?.display_name;
  const name = typeof displayName === "string" ? displayName.trim() : "";
  if (!isFiniteNumber(percent) || !name) return undefined;
  const resetsAt = parseResetsAt(row.resets_at);
  return { name, percent, ...(resetsAt ? { resetsAt } : {}) };
}

/** Loads a shared cache partitioned by the non-secret configuration directory. */
export async function loadUsage(
  interval: number,
): Promise<{ value?: Usage; error?: string } | undefined> {
  const directory = configDirectory();
  const hash = createHash("sha256").update(directory).digest("hex").slice(0, 16);
  const name = `claude-${hash}`;
  try {
    return await loadUsageCache(name, interval, async () => {
      const auth = await readAuth(directory);
      const [usage, balance] = await Promise.all([fetchUsage(auth), fetchOptionalBalance(auth)]);
      return { ...usage, ...(balance ? { balance } : {}) };
    });
  } catch {
    return { error: "Claude usage cache unavailable. Try again later." };
  }
}

/** Looks up the prepaid balance, or undefined when there is no org id or the lookup fails. */
async function fetchOptionalBalance(auth: Auth): Promise<Balance | undefined> {
  const orgId = await readOrgId();
  return orgId ? fetchBalance(auth, orgId) : undefined;
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

/** Calculates bar space after reserving the label, decoration, and widest suffix. */
export function barCells(width: number, suffixWidth: number, labelWidth = 2) {
  return Math.max(0, width - 8 - labelWidth - suffixWidth);
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

/** Renders a minor-unit amount as "$12.50" for USD or "12.50" for other currencies. */
function formatAmount(minor: number, money: Money) {
  // 🪙 Minor units divide by 10 ** decimals, so JPY (0 decimals) has no fraction.
  const value = (minor / 10 ** money.decimals).toFixed(money.decimals);
  return money.currency === "USD" ? `$${value}` : value;
}

/** Returns the trailing currency code for non-USD money; USD already has its $ prefix. */
function currencySuffix(money: Money) {
  return money.currency === "USD" ? "" : ` ${money.currency}`;
}

/** Formats used and limit amounts, such as "$12.50/$20.00", or only the amount used when uncapped. */
export function formatCredits(credits: Credits) {
  const used = formatAmount(credits.used, credits);
  const unit = currencySuffix(credits);
  if (credits.limit === undefined) return `${used}${unit} used, no cap`;
  return `${used}/${formatAmount(credits.limit, credits)}${unit}`;
}

/** Formats the remaining prepaid balance, such as "$100.00 left". */
export function formatBalance(balance: Balance) {
  return `${formatAmount(balance.amount, balance)}${currencySuffix(balance)} left`;
}
