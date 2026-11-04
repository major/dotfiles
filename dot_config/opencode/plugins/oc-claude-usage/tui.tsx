/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode/plugin/tui";
import type { BoxRenderable } from "@opentui/core";
import { For, Show, createMemo, createSignal } from "solid-js";
import {
  barCells,
  formatBar,
  formatPercent,
  formatReset,
  loadUsage,
} from "./lib/usage";
import type { Usage, Window } from "./lib/usage";

type State = { usage?: Usage; error?: string };
let lastSidebarWidth = 0;

/** Selects the feedback color for the usage threshold. */
function bucketColor(theme: Plugin.Context["theme"], bucket: Window) {
  if (bucket.percent >= 90) return theme.text.feedback.error.muted;
  if (bucket.percent >= 70) return theme.text.feedback.warning.muted;
  return theme.text.feedback.success.muted;
}

/** Renders the available Claude usage windows and any stale warning. */
function SidebarCard(props: {
  context: Plugin.Context;
  state: () => State;
  now: () => number;
}) {
  const [width, setWidth] = createSignal(lastSidebarWidth);
  let container: BoxRenderable | undefined;
  const rows = createMemo(() => {
    const usage = props.state().usage;
    return [
      { label: "5h", bucket: usage?.rolling },
      { label: " W", bucket: usage?.weekly },
    ].flatMap((row) =>
      row.bucket
        ? [{
            label: row.label,
            bucket: row.bucket,
            suffix: ` resets ${formatReset(row.bucket.resetsAt, props.now())}`,
          }]
        : [],
    );
  });
  const cells = createMemo(() =>
    barCells(width(), Math.max(0, ...rows().map((row) => row.suffix.length))),
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
                {`${row.label} `}
              </span>
              <span style={{ fg: bucketColor(props.context.theme, row.bucket) }}>
                {formatBar(row.bucket.percent, cells())
                  ? `${formatBar(row.bucket.percent, cells())} `
                  : ""}
                {formatPercent(row.bucket.percent)}
              </span>
              <span style={{ fg: props.context.theme.text.muted }}>
                {row.suffix}
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
