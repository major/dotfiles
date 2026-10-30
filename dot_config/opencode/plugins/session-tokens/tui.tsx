/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode-ai/plugin/tui";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";

const MAX_ROWS = 10;
const UNKNOWN_AGENT = "unknown";

type AssistantMessage = Extract<
  ReturnType<Plugin.Context["data"]["session"]["message"]["list"]>[number],
  { type: "assistant" }
>;

function spentTokens(tokens: AssistantMessage["tokens"] | undefined) {
  if (!tokens) return 0;
  return (
    tokens.input +
    tokens.output +
    tokens.reasoning +
    tokens.cache.read +
    tokens.cache.write
  );
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatModel(modelID: string) {
  return modelID.split("@")[0];
}

type Usage = { tokens: number; cost: number };
type UsageRow = Usage & { name: string };

/** Add tokens and cost to the row for `key`, creating the row if needed. */
function addUsage(
  rows: Map<string, Usage>,
  key: string,
  tokens: number,
  cost = 0,
) {
  const row = rows.get(key) ?? { tokens: 0, cost: 0 };
  row.tokens += tokens;
  row.cost += cost;
  rows.set(key, row);
}

/**
 * Give any cost not yet assigned to a row to `fallback`, so the rows always
 * add up to the header total.
 */
function addCostRemainder(
  rows: Map<string, Usage>,
  total: number,
  fallback: string | undefined,
) {
  const assigned = [...rows.values()].reduce((sum, row) => sum + row.cost, 0);
  const remainder = total - assigned;
  if (remainder > 0 && fallback) addUsage(rows, fallback, 0, remainder);
}

/** Turn a usage map into rows sorted by token count, largest first. */
function toRows(rows: Map<string, Usage>): UsageRow[] {
  return [...rows.entries()]
    .map(([name, row]) => ({ name, ...row }))
    .sort((a, b) => b.tokens - a.tokens);
}

/** One collapsible sidebar section with a header line and per-key rows. */
function UsageSection(props: {
  context: Plugin.Context;
  title: string;
  rows: UsageRow[];
  tokenTotal: number;
  cost?: number;
}) {
  const [open, setOpen] = createSignal(true);
  const theme = props.context.theme;

  return (
    <box>
      <box
        flexDirection="row"
        gap={1}
        onMouseUp={() => props.rows.length > 0 && setOpen((value) => !value)}
      >
        <text fg={theme.text.base}>
          {props.rows.length > 0 ? (open() ? "▼" : "▶") : " "}
        </text>
        <text fg={theme.text.base}>{props.title}</text>
        <Show when={props.cost !== undefined}>
          <text fg={theme.text.base}>{formatTokens(props.tokenTotal)}</text>
          <Show when={(props.cost ?? 0) > 0}>
            <text fg={theme.text.subdued}>({formatCost(props.cost ?? 0)})</text>
          </Show>
        </Show>
      </box>
      <Show when={open()}>
        <For each={props.rows.slice(0, MAX_ROWS)}>
          {(row) => (
            <box flexDirection="row">
              <text fg={theme.text.subdued} wrapMode="none">
                {row.name}
              </text>
              <box flexGrow={1} />
              <text fg={theme.text.base}>
                {formatPercentage(row.tokens / props.tokenTotal)}{" "}
                {row.cost > 0 ? formatCost(row.cost) : "—"}
              </text>
            </box>
          )}
        </For>
        <Show when={props.rows.length > MAX_ROWS}>
          <text fg={theme.text.subdued}>
            +{props.rows.length - MAX_ROWS} more
          </text>
        </Show>
      </Show>
    </box>
  );
}

function SidebarLine(props: { context: Plugin.Context; sessionID: string }) {
  const rootID = createMemo(() =>
    props.context.data.session.root(props.sessionID),
  );
  const sessionIDs = createMemo(() => {
    const ids = new Set([
      props.sessionID,
      ...props.context.data.session.family(props.sessionID),
    ]);
    let current = props.sessionID;
    const visited = new Set<string>();

    // A selected child can be mounted before its parent is hydrated. Include
    // known ancestors so syncing the child can hydrate the whole family.
    while (!visited.has(current)) {
      visited.add(current);
      const parentID = props.context.data.session.get(current)?.parentID;
      if (!parentID) break;
      ids.add(parentID);
      current = parentID;
    }

    for (const id of props.context.data.session.family(rootID())) ids.add(id);
    return [...ids];
  });

  const syncSession = async (sessionID: string) => {
    await props.context.data.session.sync(sessionID, { children: true });
    await props.context.data.session.message.sync(sessionID);
    await props.context.data.session.message.loadMore(sessionID, { all: true });
  };

  createEffect(() => {
    for (const sessionID of sessionIDs()) {
      void syncSession(sessionID).catch((error) =>
        console.error(
          `Failed to sync messages for session ${sessionID}`,
          error,
        ),
      );
    }
  });

  const [eventRevision, setEventRevision] = createSignal(0);
  const related = (sessionID: string, parentID?: string) => {
    if (
      sessionIDs().includes(sessionID) ||
      (parentID && sessionIDs().includes(parentID))
    )
      return true;

    let current = sessionID;
    const visited = new Set<string>();
    while (!visited.has(current)) {
      visited.add(current);
      const parent = props.context.data.session.get(current)?.parentID;
      if (!parent) return false;
      if (sessionIDs().includes(parent)) return true;
      current = parent;
    }
    return false;
  };
  const refresh = (sessionID: string, parentID?: string, resync = true) => {
    if (!related(sessionID, parentID)) return;
    setEventRevision((value) => value + 1);
    if (!resync) return;
    props.context.data.session.invalidate(sessionID);
    props.context.data.session.message.invalidate(sessionID);
    void syncSession(sessionID).catch((error) =>
      console.error(`Failed to refresh session ${sessionID}`, error),
    );
  };
  const eventCleanups = [
    props.context.data.on("session.created", (event) =>
      refresh(event.data.sessionID, event.data.parentID),
    ),
    props.context.data.on("session.forked", (event) =>
      refresh(event.data.sessionID, event.data.parentID),
    ),
    props.context.data.on("session.deleted", (event) =>
      refresh(event.data.sessionID, undefined, false),
    ),
    props.context.data.on("session.model.selected", (event) =>
      refresh(event.data.sessionID),
    ),
    props.context.data.on("session.agent.selected", (event) =>
      refresh(event.data.sessionID),
    ),
    props.context.data.on("session.usage.updated", (event) =>
      refresh(event.data.sessionID),
    ),
    props.context.data.on("session.usage.recorded", (event) =>
      refresh(event.data.sessionID),
    ),
    props.context.data.on("session.step.ended", (event) =>
      refresh(event.data.sessionID),
    ),
    props.context.data.on("session.step.failed", (event) =>
      refresh(event.data.sessionID),
    ),
    props.context.data.on("session.message.content.updated", (event) =>
      refresh(event.data.sessionID, undefined, false),
    ),
  ];
  onCleanup(() => eventCleanups.forEach((cleanup) => cleanup()));

  const data = createMemo(() => {
    eventRevision();
    const models = new Map<string, Usage>();
    const agents = new Map<string, Usage>();
    const seen = new Set<string>();
    let tokenTotal = 0;
    let messageCostTotal = 0;

    for (const sessionID of sessionIDs()) {
      let messageTokens = 0;
      for (const message of props.context.data.session.message.list(
        sessionID,
      )) {
        if (message.type !== "assistant" || seen.has(message.id)) continue;
        seen.add(message.id);

        const cost =
          typeof message.cost === "number" && Number.isFinite(message.cost)
            ? message.cost
            : 0;
        const tokens = Math.max(0, spentTokens(message.tokens));
        messageCostTotal += cost;
        messageTokens += tokens;
        addUsage(models, formatModel(message.model.id), tokens, cost);
        addUsage(agents, message.agent ?? UNKNOWN_AGENT, tokens, cost);
      }

      // Session totals can include tokens that no loaded message accounts
      // for. Give them to the session's current model and agent.
      const current = props.context.data.session.get(sessionID);
      const tokenRemainder = Math.max(
        0,
        spentTokens(current?.tokens) - messageTokens,
      );
      tokenTotal += messageTokens + tokenRemainder;
      if (tokenRemainder > 0) {
        if (current?.model)
          addUsage(models, formatModel(current.model.id), tokenRemainder);
        addUsage(agents, current?.agent ?? UNKNOWN_AGENT, tokenRemainder);
      }
    }

    // The session cost API includes family-wide usage and non-assistant work.
    // Attribute any such remainder to the family root so the header and rows
    // always show the same aggregate.
    const aggregateCost = props.context.data.session.cost(rootID());
    const costTotal = Math.max(
      messageCostTotal,
      Number.isFinite(aggregateCost) ? aggregateCost : 0,
    );
    const root = props.context.data.session.get(rootID());
    const fallbackModel =
      root?.model ?? props.context.data.session.get(props.sessionID)?.model;
    addCostRemainder(
      models,
      costTotal,
      fallbackModel && formatModel(fallbackModel.id),
    );
    addCostRemainder(agents, costTotal, root?.agent ?? UNKNOWN_AGENT);

    return {
      tokenTotal,
      models: toRows(models),
      agents: toRows(agents),
      cost: costTotal,
    };
  });

  return (
    <Show when={data().tokenTotal > 0}>
      <box>
        <UsageSection
          context={props.context}
          title="Session Tokens"
          rows={data().models}
          tokenTotal={data().tokenTotal}
          cost={data().cost}
        />
        <UsageSection
          context={props.context}
          title="Agent Tokens"
          rows={data().agents}
          tokenTotal={data().tokenTotal}
        />
      </box>
    </Show>
  );
}

export default {
  id: "session-tokens",
  setup(context: Plugin.Context) {
    context.ui.slot({
      append: "sidebar.content",
      render: (props) => (
        <SidebarLine context={context} sessionID={props.sessionID} />
      ),
    });
  },
};
