/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode/plugin/tui";
import type { BoxRenderable } from "@opentui/core";
import { For, Show, createMemo, createSignal } from "solid-js";
import {
  barCells,
  formatBalance,
  formatBar,
  formatPercent,
  formatReset,
  loadUsage,
} from "./lib/usage";
import type { Balance, Usage, Window } from "./lib/usage";

type State = { usage?: Usage; error?: string };
type Row = {
  label: string;
  bucket?: Window; // 📊 Missing for amount-only rows, which show their text instead of a bar.
  suffix: string;
  alert?: boolean; // 🚨 Alert rows use the error color even when their percent is low.
};
let lastSidebarWidth = 0;

/** Selects the feedback color for a row; an alert row is always an error. */
function bucketColor(theme: Plugin.Context["theme"], bucket?: Window, alert = false) {
  // 🪙 Amount-only rows have no percent, so they stay green unless they raise an alert.
  const percent = bucket?.percent ?? 0;
  // 🚨 An empty balance stays red even when its percent is below 90.
  if (alert || percent >= 90) return theme.text.feedback.error.muted;
  if (percent >= 70) return theme.text.feedback.warning.muted;
  return theme.text.feedback.success.muted;
}

/** Builds the prepaid balance row, which is an alert when nothing is left. */
function balanceRow(balance: Balance): Row {
  return { label: "Bal", suffix: formatBalance(balance), alert: balance.amount === 0 };
}

/** Lists the visible rows in display order: 5h, W, model-scoped weeks, then balance. */
function buildRows(usage: Usage | undefined, now: number): Row[] {
  const windows = [
    { label: "5h", bucket: usage?.rolling },
    { label: "W", bucket: usage?.weekly },
    ...(usage?.scoped ?? []).map((scoped) => ({ label: scoped.name, bucket: scoped })),
  ];
  const rows: Row[] = windows.flatMap((row) =>
    row.bucket
      ? [{
          label: row.label,
          bucket: row.bucket,
          suffix: ` resets ${formatReset(row.bucket.resetsAt, now)}`,
        }]
      : [],
  );
  if (usage?.balance) rows.push(balanceRow(usage.balance));
  return rows;
}

/** Formats a bar with its percent, or only the percent when the bar has no room. */
function formatValue(bucket: Window, cells: number) {
  const bar = formatBar(bucket.percent, cells);
  return `${bar ? `${bar} ` : ""}${formatPercent(bucket.percent)}`;
}

/** Renders the available Claude usage windows and any stale warning. */
function SidebarCard(props: {
  context: Plugin.Context;
  state: () => State;
  now: () => number;
}) {
  const [width, setWidth] = createSignal(lastSidebarWidth);
  let container: BoxRenderable | undefined;
  const rows = createMemo(() => buildRows(props.state().usage, props.now()));
  const labelWidth = createMemo(() => Math.max(2, ...rows().map((row) => row.label.length)));
  // 📐 Rows without a bar do not shrink the bars of the other rows.
  const cells = createMemo(() =>
    barCells(
      width(),
      Math.max(0, ...rows().filter((row) => row.bucket).map((row) => row.suffix.length)),
      labelWidth(),
    ),
  );

  return (
    <box
      width="100%"
      ref={(element) => {
        container = element;
      }}
      onSizeChange={() => {
        const next = container?.width ?? 0;
        if (next <= 0) return;
        lastSidebarWidth = next;
        setWidth(next);
      }}
    >
      <Show when={props.state().usage}>
        <text fg={props.context.theme.text.base} wrapMode="none">
          <b>Claude</b>
        </text>
        <For each={rows()}>
          {(row) => (
            <text wrapMode="none">
              <span style={{ fg: props.context.theme.text.muted }}>
                {`${row.label.padStart(labelWidth())} `}
              </span>
              <span style={{ fg: bucketColor(props.context.theme, row.bucket, row.alert) }}>
                {row.bucket ? formatValue(row.bucket, cells()) : row.suffix}
              </span>
              <span style={{ fg: props.context.theme.text.muted }}>
                {row.bucket ? row.suffix : ""}
              </span>
            </text>
          )}
        </For>
      </Show>
      <Show when={props.state().error}>
        <text fg={props.context.theme.text.muted} wrapMode="word">
          {props.state().usage
            ? `Stale: ${props.state().error}`
            : `Claude: ${props.state().error}`}
        </text>
      </Show>
    </box>
  );
}

const plugin: Plugin.Definition = {
  id: "oc-claude-usage",
  /** Starts shared-cache polling and registers the sidebar. */
  setup(context) {
    const [state, setState] = createSignal<State>({});
    const [now, setNow] = createSignal(Date.now());
    const option = context.options.interval;
    const interval =
      typeof option === "number" && Number.isFinite(option) && option >= 60_000
        ? option
        : 300_000;
    let active = true;
    /** Refreshes the cache while keeping any previously visible data. */
    const refresh = async () => {
      const cached = await loadUsage(interval);
      if (!active || !cached) return;
      setState((previous) => ({
        usage: cached.value ?? previous.usage,
        error: cached.error,
      }));
    };
    void refresh();
    const timer = setInterval(() => {
      setNow(Date.now());
      void refresh();
    }, Math.min(interval, 5_000));
    context.ui.slot({
      append: "sidebar.content",
      render: () => <SidebarCard context={context} state={state} now={now} />,
    });
    return () => {
      active = false;
      clearInterval(timer);
    };
  },
};

export default plugin;
