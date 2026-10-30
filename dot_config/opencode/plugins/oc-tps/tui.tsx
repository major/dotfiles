/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode-ai/plugin/tui";
import { createMemo, createSignal, onCleanup } from "solid-js";

type StreamSample = {
  at: number;
  tokens: number;
};

type StepTiming = {
  sessionID: string;
  requestStartAt?: number;
  firstTokenAt?: number;
};

type SessionAverage = {
  totalTokens: number;
  totalDurationMs: number;
  totalTtftMs: number;
  messageCount: number;
};

type TrackerState = {
  streamSamplesBySession: Record<string, StreamSample[]>;
  stepByMessage: Record<string, StepTiming>;
  sessionAverageByID: Record<string, SessionAverage>;
  requestStartBySession: Record<string, number>;
};

const STREAM_WINDOW_MS = 5_000;
const LIVE_STALE_MS = 1_500;
const SINGLE_SAMPLE_MS = 1_000;

function estimateStreamTokens(delta: string) {
  return Math.max(1, Math.ceil(new TextEncoder().encode(delta).length / 5));
}

function formatRate(value: number, label: "TPS" | "AVG") {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  if (value >= 100)
    return `${Math.round(value)}${label === "TPS" ? " TPS" : ""}`;
  if (value >= 10) return `${value.toFixed(1)}${label === "TPS" ? " TPS" : ""}`;
  return `${value.toFixed(2)}${label === "TPS" ? " TPS" : ""}`;
}

function formatTtft(value: number) {
  if (!Number.isFinite(value) || value < 0) return undefined;
  return `${value.toFixed(1)}s`;
}

function activeDurationMs(samples: StreamSample[], tailAt?: number) {
  if (samples.length === 0) return 0;
  if (samples.length === 1) {
    const tailDuration = tailAt
      ? Math.max(0, tailAt - samples[0].at)
      : SINGLE_SAMPLE_MS;
    return Math.min(Math.max(tailDuration, 250), SINGLE_SAMPLE_MS);
  }

  let duration = 0;
  for (let i = 1; i < samples.length; i++) {
    duration += Math.max(0, samples[i].at - samples[i - 1].at);
  }

  if (tailAt) {
    duration += Math.max(0, tailAt - samples[samples.length - 1].at);
  }

  return Math.max(duration, SINGLE_SAMPLE_MS);
}

function sessionAverage(
  context: Plugin.Context,
  sessionID: string,
  tracker: TrackerState,
) {
  const totals = tracker.sessionAverageByID[sessionID];
  if (!totals || totals.totalTokens <= 0 || totals.totalDurationMs <= 0)
    return undefined;
  return formatRate(
    totals.totalTokens / (totals.totalDurationMs / 1000),
    "AVG",
  );
}

function sessionTtft(
  context: Plugin.Context,
  sessionID: string,
  tracker: TrackerState,
) {
  const totals = tracker.sessionAverageByID[sessionID];
  if (!totals || totals.messageCount <= 0 || totals.totalTtftMs < 0)
    return undefined;
  return formatTtft(totals.totalTtftMs / totals.messageCount / 1000);
}

function liveTps(
  context: Plugin.Context,
  sessionID: string,
  tracker: TrackerState,
) {
  if (context.data.session.status(sessionID) !== "running") return undefined;
  const samples = tracker.streamSamplesBySession[sessionID] ?? [];
  if (samples.length === 0) return undefined;
  const now = Date.now();
  const relevant = samples.filter(
    (sample) => now - sample.at <= STREAM_WINDOW_MS,
  );
  if (relevant.length === 0) return undefined;
  const lastSample = relevant[relevant.length - 1];
  if (!lastSample || now - lastSample.at > LIVE_STALE_MS) return undefined;
  const total = relevant.reduce((sum, sample) => sum + sample.tokens, 0);
  const durationSeconds = activeDurationMs(relevant, now) / 1000;
  if (durationSeconds <= 0) return undefined;
  return formatRate(total / durationSeconds, "TPS");
}

function StatusLine(props: {
  context: Plugin.Context;
  sessionID: string;
  tracker: TrackerState;
  subscribe: (listener: () => void) => () => void;
}) {
  const [version, setVersion] = createSignal(0);
  const unsubscribe = props.subscribe(() => setVersion((value) => value + 1));
  onCleanup(unsubscribe);

  const status = createMemo(() => {
    version();
    const live = liveTps(props.context, props.sessionID, props.tracker) ?? "-";
    const avg =
      sessionAverage(props.context, props.sessionID, props.tracker) ?? "-";
    const ttft =
      sessionTtft(props.context, props.sessionID, props.tracker) ?? "-";
    return `TPS ${live} | AVG ${avg} | TTFT ${ttft}`;
  });

  return (
    <box width="100%" flexDirection="row" justifyContent="flex-end">
      <text fg={props.context.theme.text.subdued} wrapMode="none">
        {status()}
      </text>
    </box>
  );
}

const plugin: Plugin.Definition = {
  id: "oc-tps",
  setup(context) {
    const tracker: TrackerState = {
      streamSamplesBySession: {},
      stepByMessage: {},
      sessionAverageByID: {},
      requestStartBySession: {},
    };
    const listeners = new Set<() => void>();

    const bump = () => {
      for (const listener of listeners) listener();
    };

    const pruneSamples = () => {
      const now = Date.now();
      for (const [sessionID, samples] of Object.entries(
        tracker.streamSamplesBySession,
      )) {
        const next = samples.filter(
          (sample) => now - sample.at <= STREAM_WINDOW_MS,
        );
        if (next.length === samples.length) continue;
        if (next.length > 0) tracker.streamSamplesBySession[sessionID] = next;
        else delete tracker.streamSamplesBySession[sessionID];
      }
    };

    const clearLiveSamples = (sessionID: string) => {
      if (!tracker.streamSamplesBySession[sessionID]?.length) return;
      delete tracker.streamSamplesBySession[sessionID];
    };

    const appendSample = (
      sessionID: string,
      assistantMessageID: string,
      sample: StreamSample,
    ) => {
      tracker.streamSamplesBySession[sessionID] = [
        ...(tracker.streamSamplesBySession[sessionID] ?? []).filter(
          (item) => sample.at - item.at <= STREAM_WINDOW_MS,
        ),
        sample,
      ];
      const timing = tracker.stepByMessage[assistantMessageID];
      if (
        timing?.sessionID === sessionID &&
        timing.firstTokenAt === undefined
      ) {
        tracker.stepByMessage[assistantMessageID] = {
          ...timing,
          firstTokenAt: sample.at,
        };
      }
      bump();
    };

    const onTextDelta = context.data.on("session.text.delta", (event) => {
      appendSample(event.data.sessionID, event.data.assistantMessageID, {
        at: Date.now(),
        tokens: estimateStreamTokens(event.data.delta),
      });
    });

    const onReasoningDelta = context.data.on(
      "session.reasoning.delta",
      (event) => {
        appendSample(event.data.sessionID, event.data.assistantMessageID, {
          at: Date.now(),
          tokens: estimateStreamTokens(event.data.delta),
        });
      },
    );

    const onInboxDelivered = context.data.on(
      "session.inbox.delivered",
      (event) => {
        tracker.requestStartBySession[event.data.sessionID] = event.created;
      },
    );

    const onStepStarted = context.data.on("session.step.started", (event) => {
      const requestStartAt =
        tracker.requestStartBySession[event.data.sessionID];
      if (requestStartAt !== undefined)
        delete tracker.requestStartBySession[event.data.sessionID];
      tracker.stepByMessage[event.data.assistantMessageID] = {
        sessionID: event.data.sessionID,
        requestStartAt,
      };
    });

    const onStepEnded = context.data.on("session.step.ended", (event) => {
      const { sessionID, assistantMessageID, tokens } = event.data;
      const timing = tracker.stepByMessage[assistantMessageID];
      if (!timing || timing.sessionID !== sessionID) return;
      delete tracker.stepByMessage[assistantMessageID];

      const totalTokens = tokens.output + tokens.reasoning;
      const firstTokenAt = timing.firstTokenAt;
      if (totalTokens > 0 && firstTokenAt !== undefined) {
        const durationMs = Math.max(event.created - firstTokenAt, 1);
        const ttftMs =
          timing.requestStartAt === undefined
            ? 0
            : Math.max(firstTokenAt - timing.requestStartAt, 0);
        const totals = tracker.sessionAverageByID[sessionID] ?? {
          totalTokens: 0,
          totalDurationMs: 0,
          totalTtftMs: 0,
          messageCount: 0,
        };
        tracker.sessionAverageByID[sessionID] = {
          totalTokens: totals.totalTokens + totalTokens,
          totalDurationMs: totals.totalDurationMs + durationMs,
          totalTtftMs: totals.totalTtftMs + ttftMs,
          messageCount:
            totals.messageCount + (timing.requestStartAt === undefined ? 0 : 1),
        };
      }

      pruneSamples();
      bump();
    });

    const onToolCalled = context.data.on("session.tool.called", (event) => {
      clearLiveSamples(event.data.sessionID);
      bump();
    });

    const timer = setInterval(() => {
      pruneSamples();
      bump();
    }, 1000);

    context.ui.slot({
      prepend: "session.composer.top",
      render: ({ sessionID }) => (
        <StatusLine
          context={context}
          sessionID={sessionID}
          tracker={tracker}
          subscribe={(listener) => {
            listeners.add(listener);
            return () => {
              listeners.delete(listener);
            };
          }}
        />
      ),
    });

    return () => {
      onTextDelta();
      onReasoningDelta();
      onInboxDelivered();
      onStepStarted();
      onStepEnded();
      onToolCalled();
      clearInterval(timer);
    };
  },
};

export default plugin;
