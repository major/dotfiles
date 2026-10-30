/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode-ai/plugin/tui";
import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import path from "node:path";
import type { BoxRenderable } from "@opentui/core";
import { For, Show, createMemo, createSignal } from "solid-js";
import { loadUsageCache } from "./lib/usage-cache";

const DEFAULT_URL = "https://opencode.ai/zen/go/v1/usage";
const DEFAULT_INTERVAL_MS = 60_000;
const CACHE_POLL_INTERVAL_MS = 5_000;

type Bucket = {
  status: "ok" | "rate-limited";
  percent: number;
  resetsAt?: string;
};

type Usage = {
  rolling?: Bucket;
  weekly?: Bucket;
  monthly?: Bucket;
};

type State = {
  usage?: Usage;
  error?: string;
};

type AuthCandidate = {
  source: string;
  key: string;
};

/** Reads bearer tokens that can authorize the usage API, newest per source
 * first: the OpenCode Go API key and the signed-in OpenCode OAuth session
 * token. Static API keys expire, so the OAuth fallback keeps the card fresh
 * as long as the TUI stays signed in. */
async function readDatabaseAuthKeys(): Promise<AuthCandidate[]> {
  const file =
    process.env.OPENCODE_DB ??
    path.join(
      process.env.XDG_DATA_HOME ?? path.join(homedir(), ".local", "share"),
      "opencode",
      "opencode.db",
    );
  const candidates: AuthCandidate[] = [];
  try {
    const database = new Database(file, { readonly: true });
    try {
      const rows = database
        .query(
          "select integration_id, value from credential where integration_id in ('opencode-go', 'opencode') order by time_created desc",
        )
        .all() as { integration_id?: string; value?: string }[];
      const seen = new Set<string>();
      for (const row of rows) {
        // Only the newest credential per integration can be valid.
        if (!row.integration_id || seen.has(row.integration_id)) continue;
        seen.add(row.integration_id);
        if (!row.value) continue;
        try {
          const parsed = JSON.parse(row.value) as {
            type?: string;
            key?: string;
            access?: string;
          };
          if (parsed.type === "key" && typeof parsed.key === "string") {
            candidates.push({
              source: row.integration_id,
              key: parsed.key,
            });
          } else if (
            parsed.type === "oauth" &&
            typeof parsed.access === "string"
          ) {
            candidates.push({
              source: row.integration_id,
              key: parsed.access,
            });
          }
        } catch {}
      }
    } finally {
      database.close();
    }
  } catch {}
  return candidates;
}

async function fetchUsage(key: string, url: string): Promise<Usage> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${key}` },
  });
  if (response.ok) {
    const body = (await response.json()) as { usage?: Usage };
    return body.usage ?? {};
  }
  const text = await response.text().catch(() => "");
  let message = `usage request failed (${response.status})`;
  try {
    const body = JSON.parse(text) as {
      detail?: { message?: string };
      error?: { message?: string };
      message?: string;
    };
    if (body.detail?.message) message = body.detail.message;
    else if (body.error?.message) message = body.error.message;
    else if (body.message) message = body.message;
  } catch {}
  throw new Error(message);
}

// Sidebar rows in display order. Labels are two characters so the bars align.
const BUCKETS = [
  { key: "rolling", label: "5h" },
  { key: "weekly", label: " W" },
  { key: "monthly", label: " M" },
] as const;

function bucketColor(
  theme: Plugin.Context["theme"],
  bucket: Bucket | undefined,
) {
  if (bucket?.status === "rate-limited")
    return theme.text.feedback.error.base;
  if ((bucket?.percent ?? 0) >= 90) return theme.text.feedback.error.subdued;
  if ((bucket?.percent ?? 0) >= 70) return theme.text.feedback.warning.subdued;
  return theme.text.feedback.success.subdued;
}

/** Right-aligns percents inside four columns so the rows line up. */
function formatPercent(percent: number) {
  return `${Math.round(percent)}%`.padStart(4, " ");
}

/** Renders a bracketed usage bar with filled and empty cells. */
function formatBar(percent: number, cells: number) {
  if (cells <= 0) return "";
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * cells);
  return `[${"█".repeat(filled)}${"░".repeat(cells - filled)}]`;
}

/** Compresses the time until a reset into a short hint like "42m" or "2h 12m". */
function formatCountdown(resetsAt: string | undefined) {
  if (!resetsAt) return "soon";
  const ms = Date.parse(resetsAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "soon";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 48) return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type Row = {
  label: string;
  bucket: Bucket;
  suffix: string;
};

// Tab switches remount this card (sidebar slots are per session tab), and a
// fresh mount starts with an unknown width, so the bars would vanish until
// the next onSizeChange fires. The sidebar width is the same in every tab,
// so seed each mount with the last measured width to render bars instantly.
let lastSidebarWidth = 0;

/** Renders the Go usage card: one bar row per quota bucket plus a reset hint
 * for any bucket that is currently rate-limited. Bars stretch to the sidebar
 * width and all rows share the widest suffix so the columns stay aligned. */
function SidebarCard(props: { context: Plugin.Context; state: () => State }) {
  const [sidebarWidth, setSidebarWidth] = createSignal(lastSidebarWidth);
  let container: BoxRenderable | undefined;

  const rows = createMemo(() => {
    const usage = props.state().usage;
    if (!usage) return [];
    return BUCKETS.flatMap(({ key, label }) => {
      const bucket = usage[key];
      if (!bucket) return [];
      const suffix =
        bucket.status === "rate-limited"
          ? ` resets ${formatCountdown(bucket.resetsAt)}`
          : "";
      return [{ label, bucket, suffix }] satisfies Row[];
    });
  });

  const limited = createMemo(() =>
    rows().some((row) => row.bucket.status === "rate-limited"),
  );

  // Width budget: label (2) + two spaces + bar brackets (2) + percent (4)
  // plus the widest reset suffix, applied to every row for aligned bars.
  const cells = createMemo(() => {
    const suffixWidth = Math.max(0, ...rows().map((row) => row.suffix.length));
    return Math.max(0, sidebarWidth() - 10 - suffixWidth);
  });

  return (
    <box
      width="100%"
      ref={(element) => {
        container = element;
      }}
      onSizeChange={() => {
        // Ignore zero widths (a hidden or not-yet-laid-out box) so a
        // transitional measure cannot poison the cache for the next mount.
        const width = container?.width ?? 0;
        if (width <= 0) return;
        lastSidebarWidth = width;
        setSidebarWidth(width);
      }}
    >
      <Show when={rows().length > 0}>
        <box width="100%">
          <text wrapMode="none">
            <span style={{ fg: props.context.theme.text.base }}>
              <b>OpenCode Go</b>
            </span>
            <Show when={limited()}>
              <span
                style={{ fg: props.context.theme.text.feedback.error.base }}
              >
                {" LIMIT"}
              </span>
            </Show>
          </text>
          <For each={rows()}>
            {(row) => {
              const color = bucketColor(props.context.theme, row.bucket);
              const bar =
                cells() >= 3 ? `${formatBar(row.bucket.percent, cells())} ` : "";
              return (
                <text wrapMode="none">
                  <span style={{ fg: props.context.theme.text.subdued }}>
                    {`${row.label} `}
                  </span>
                  <span style={{ fg: color }}>{bar}</span>
                  <span style={{ fg: color }}>
                    {formatPercent(row.bucket.percent)}
                  </span>
                  <span style={{ fg: props.context.theme.text.subdued }}>
                    {row.suffix}
                  </span>
                </text>
              );
            }}
          </For>
        </box>
      </Show>
      <Show when={props.state().error}>
        <text fg={props.context.theme.text.subdued} wrapMode="word">
          {props.state().error}
        </text>
      </Show>
    </box>
  );
}

const plugin: Plugin.Definition = {
  id: "oc-opencode-go",
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
    const configuredKey =
      typeof context.options.apiKey === "string" && context.options.apiKey
        ? context.options.apiKey
        : process.env.OPENCODE_GO_API_KEY;
    // Remembers which credential last worked so later refreshes try it
    // first instead of burning a request on a known-dead key.
    let preferredSource: string | undefined;

    const refresh = async () => {
      const cached = await loadUsageCache("go", intervalMs, async () => {
        // Re-read candidates on every attempt so OAuth tokens rotated by the
        // TUI are picked up without a plugin restart.
        const candidates: AuthCandidate[] = configuredKey
          ? [{ source: "configured", key: configuredKey }]
          : await readDatabaseAuthKeys();
        if (candidates.length === 0)
          throw new Error("OpenCode Go credentials not found");
        const ordered = preferredSource
          ? [
              ...candidates.filter((c) => c.source === preferredSource),
              ...candidates.filter((c) => c.source !== preferredSource),
            ]
          : candidates;
        let lastError: unknown;
        for (const candidate of ordered) {
          try {
            const usage = await fetchUsage(candidate.key, url);
            preferredSource = candidate.source;
            return usage;
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError instanceof Error
          ? lastError
          : new Error("usage request failed");
      });
      // Keep both: a stale value still renders bars while the error line
      // tells the user the data is not fresh.
      setState({ usage: cached?.value, error: cached?.error });
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
