/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode-ai/plugin/tui";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { BoxRenderable } from "@opentui/core";
import { Show, createMemo, createSignal } from "solid-js";
import { loadUsageCache } from "./lib/usage-cache";

const execFileAsync = promisify(execFile);

const DEFAULT_URL = "https://chatgpt.com/backend-api/wham/usage";
const DEFAULT_INTERVAL_MS = 60_000;
const CACHE_POLL_INTERVAL_MS = 5_000;
// Matches Codex CLI's own CHATGPT_ACCESS_TOKEN_REFRESH_WINDOW_MINUTES so a `codex doctor`
// call is guaranteed to trigger the CLI's built-in refresh, not just a cache hit.
const REFRESH_WINDOW_MS = 5 * 60_000;
// Avoid hammering `codex doctor` every tick when refresh keeps failing (e.g. the refresh
// token itself is dead and needs a real `codex login`).
const REFRESH_RETRY_COOLDOWN_MS = 5 * 60_000;

type Window = {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
};

type Usage = {
  weekly?: Window;
};

type State = {
  usage?: Usage;
  error?: string;
};

type Auth = {
  token: string;
  account?: string;
  expiresAt?: number;
};

function authFilePath() {
  const root = process.env.CODEX_HOME ?? path.join(homedir(), ".codex");
  return path.join(root, "auth.json");
}

function decodeAccessTokenExpiry(token: string): number | undefined {
  const payload = token.split(".")[1];
  if (!payload) return undefined;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };
    return typeof claims.exp === "number" ? claims.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

async function readAuth(): Promise<Auth | undefined> {
  const text = await readFile(authFilePath(), "utf8").catch(() => undefined);
  if (!text) return undefined;
  try {
    const value = JSON.parse(text) as {
      tokens?: { access_token?: string; account_id?: string };
      account_id?: string;
    };
    const token = value.tokens?.access_token;
    if (!token) return undefined;
    return {
      token,
      account: value.tokens?.account_id ?? value.account_id,
      expiresAt: decodeAccessTokenExpiry(token),
    };
  } catch {
    return undefined;
  }
}

function isStale(auth: Auth) {
  return (
    auth.expiresAt !== undefined &&
    auth.expiresAt - Date.now() < REFRESH_WINDOW_MS
  );
}

// Codex CLI owns `auth.json` and the (single-use, rotating) refresh_token. Reimplementing
// the OAuth refresh here would race a real `codex` session's own refresh and could get the
// refresh_token invalidated, forcing a full re-login. Instead, shell out to a real Codex CLI
// call so its `AuthManager` performs and persists the refresh the same way it always does.
async function refreshViaCli(): Promise<void> {
  await execFileAsync("codex", ["doctor"], { timeout: 30_000 });
}

async function fetchUsage(auth: Auth, url: string): Promise<Usage> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${auth.token}`,
  };
  if (auth.account) headers["ChatGPT-Account-Id"] = auth.account;
  const response = await fetch(url, { headers });
  if (response.ok) {
    const body = (await response.json()) as {
      rate_limit?: { primary_window?: Window };
    };
    return {
      weekly: body.rate_limit?.primary_window,
    };
  }
  const text = await response.text().catch(() => "");
  let message = `usage request failed (${response.status})`;
  try {
    const body = JSON.parse(text) as {
      detail?: { message?: string };
      error?: { message?: string };
    };
    if (body.detail?.message) message = body.detail.message;
    if (body.error?.message) message = body.error.message;
  } catch {}
  throw new Error(message);
}

function bucketColor(
  theme: Plugin.Context["theme"],
  bucket: Window | undefined,
) {
  if (!bucket || bucket.used_percent >= 90)
    return theme.text.feedback.error.subdued;
  if (bucket.used_percent >= 70) return theme.text.feedback.warning.subdued;
  return theme.text.feedback.success.subdued;
}

/** Right-aligns percentages in four columns to match the Go quota card. */
function formatPercent(bucket: Window | undefined) {
  return (bucket ? `${Math.round(bucket.used_percent)}%` : "?").padStart(4, " ");
}

/** Renders a clamped usage bar, omitting unknown quotas and narrow bars. */
function formatBar(bucket: Window | undefined, cells: number) {
  if (!bucket || !Number.isFinite(bucket.used_percent) || cells < 3) return "";
  const percent = Math.max(0, Math.min(100, bucket.used_percent));
  const filled = Math.round((percent / 100) * cells);
  return `[${"█".repeat(filled)}${"░".repeat(cells - filled)}]`;
}

/** Reserves the label, spaces, brackets, percentage, and reset hint. */
function barCells(width: number, suffix: string) {
  return Math.max(0, width - 10 - suffix.length);
}

/** Formats the remaining quota reset duration as compact nonzero units. */
function formatReset(bucket: Window | undefined) {
  if (!bucket || !Number.isFinite(bucket.reset_after_seconds)) return "?";
  const totalMinutes = Math.ceil(Math.max(0, bucket.reset_after_seconds) / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const duration = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
  ].join("");
  return duration || "0m";
}

// Seed remounted session tabs with the last visible width, just like Go.
let lastSidebarWidth = 0;

/** Renders the Codex quota with the same responsive bar layout as Go. */
function SidebarCard(props: { context: Plugin.Context; state: () => State }) {
  const [sidebarWidth, setSidebarWidth] = createSignal(lastSidebarWidth);
  let container: BoxRenderable | undefined;
  const bucket = () => props.state().usage?.weekly;
  const suffix = createMemo(() => ` resets ${formatReset(bucket())}`);
  const bar = createMemo(() =>
    formatBar(bucket(), barCells(sidebarWidth(), suffix())),
  );

  return (
    <box
      width="100%"
      ref={(element) => {
        container = element;
      }}
      onSizeChange={() => {
        // Hidden boxes must not replace the last usable width with zero.
        const width = container?.width ?? 0;
        if (width <= 0) return;
        lastSidebarWidth = width;
        setSidebarWidth(width);
      }}
    >
      <Show when={props.state().usage}>
        <box width="100%">
          <text fg={props.context.theme.text.base} wrapMode="none">
            <b>Codex</b>
          </text>
          <text wrapMode="none">
            <span style={{ fg: props.context.theme.text.subdued }}>
              {" W "}
            </span>
            <span style={{ fg: bucketColor(props.context.theme, bucket()) }}>
              {bar() ? `${bar()} ` : ""}
              {formatPercent(bucket())}
            </span>
            <span style={{ fg: props.context.theme.text.subdued }}>
              {suffix()}
            </span>
          </text>
        </box>
      </Show>
      <Show when={!props.state().usage && props.state().error}>
        <text fg={props.context.theme.text.subdued} wrapMode="word">
          {props.state().error}
        </text>
      </Show>
    </box>
  );
}

const plugin: Plugin.Definition = {
  id: "oc-codex-usage",
  setup(context) {
    const [state, setState] = createSignal<State>({});
    const url =
      typeof context.options.url === "string" && context.options.url
        ? context.options.url
        : DEFAULT_URL;
    const intervalMs =
      typeof context.options.interval === "number" &&
      context.options.interval > 0
        ? context.options.interval
        : DEFAULT_INTERVAL_MS;

    let refreshingAuth: Promise<void> | undefined;
    let lastRefreshAttempt = 0;

    const ensureFreshAuth = async (): Promise<Auth | undefined> => {
      const auth = await readAuth();
      if (!auth || !isStale(auth)) return auth;

      const now = Date.now();
      if (
        !refreshingAuth &&
        now - lastRefreshAttempt > REFRESH_RETRY_COOLDOWN_MS
      ) {
        lastRefreshAttempt = now;
        refreshingAuth = refreshViaCli()
          .catch(() => undefined)
          .finally(() => {
            refreshingAuth = undefined;
          });
      }
      if (refreshingAuth) await refreshingAuth;
      return (await readAuth()) ?? auth;
    };

    const refresh = async () => {
      const cached = await loadUsageCache("codex", intervalMs, async () => {
        const auth = await ensureFreshAuth();
        if (!auth) throw new Error("Codex auth.json not found");
        return fetchUsage(auth, url);
      });
      if (cached?.value) {
        setState({ usage: cached.value });
        return;
      }
      if (cached?.error) setState({ error: cached.error });
    };

    void refresh();
    const timer = setInterval(
      () => void refresh(),
      Math.min(intervalMs, CACHE_POLL_INTERVAL_MS),
    );

    context.ui.slot({
      append: "sidebar.content",
      render: () => <SidebarCard context={context} state={state} />,
    });

    return () => clearInterval(timer);
  },
};

export default plugin;
