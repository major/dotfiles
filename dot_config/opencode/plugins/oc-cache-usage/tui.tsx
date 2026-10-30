/** @jsxImportSource @opentui/solid */
import type { BoxRenderable } from "@opentui/core";
import type { Plugin } from "@opencode-ai/plugin/tui";
import { createMemo, createSignal, Show } from "solid-js";

function barCellsForSidebar(width: number) {
  return Math.max(0, width - 7);
}

function formatUsageBar(percent: number, cells: number) {
  if (cells <= 0) return "";
  const filled = Math.round(
    (Math.max(0, Math.min(100, percent)) / 100) * cells,
  );
  return `[${"█".repeat(filled)}${"░".repeat(cells - filled)}]`;
}

function formatTokens(tokens: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(tokens);
}

// Tab switches remount this card (sidebar slots are per session tab), and a
// fresh mount starts with an unknown width, so the bar would vanish until
// the next onSizeChange fires. The sidebar width is the same in every tab,
// so seed each mount with the last measured width to render the bar instantly.
let lastSidebarWidth = 0;

function SidebarLine(props: { context: Plugin.Context; sessionID: string }) {
  const [sidebarWidth, setSidebarWidth] = createSignal(lastSidebarWidth);
  let container: BoxRenderable | undefined;
  const usage = createMemo(() => {
    const tokens = props.context.data.session.get(props.sessionID)?.tokens;
    if (!tokens) return;
    const input = tokens.input + tokens.cache.read;
    if (input <= 0) return;
    return {
      input: tokens.input,
      read: tokens.cache.read,
      write: tokens.cache.write,
      percent: (tokens.cache.read / input) * 100,
    };
  });

  return (
    <Show when={usage()} keyed>
      {(value) => {
        const cells = barCellsForSidebar(sidebarWidth());
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
            <text fg={props.context.theme.text.base}>
              <b>Prompt Cache</b>
            </text>
            <text wrapMode="none">
              <Show when={cells > 0}>
                <span style={{ fg: props.context.theme.text.subdued }}>
                  {formatUsageBar(value.percent, cells)}
                </span>
                <span style={{ fg: props.context.theme.text.subdued }}> </span>
              </Show>
              <span style={{ fg: props.context.theme.text.base }}>
                {Math.round(value.percent)}%
              </span>
            </text>
            <text fg={props.context.theme.text.subdued} wrapMode="none">
              {formatTokens(value.read)} read · {formatTokens(value.input)}{" "}
              input
            </text>
            <Show
              when={value.write > 0}
              fallback={
                <text fg={props.context.theme.text.subdued} wrapMode="none">
                  No cache writes reported
                </text>
              }
            >
              <text fg={props.context.theme.text.subdued} wrapMode="none">
                {formatTokens(value.write)} cache writes
              </text>
            </Show>
          </box>
        );
      }}
    </Show>
  );
}

const plugin: Plugin.Definition = {
  id: "oc-cache-usage",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: (props) => (
        <SidebarLine context={context} sessionID={props.sessionID} />
      ),
    });
  },
};

export default plugin;
