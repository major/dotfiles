/** @jsxImportSource @opentui/solid */
import type { Plugin } from "@opencode-ai/plugin/tui";
import { spawn } from "node:child_process";
import { createMemo, createSignal, Show } from "solid-js";

async function copyToClipboard(text: string): Promise<void> {
  try {
    const base64 = Buffer.from(text, "utf8").toString("base64");
    process.stdout.write(`\x1b]52;c;${base64}\x07`);
  } catch {}

  const tools = [
    { cmd: "wl-copy", args: [] },
    { cmd: "xclip", args: ["-selection", "clipboard"] },
    { cmd: "xsel", args: ["--clipboard", "--input"] },
    { cmd: "pbcopy", args: [] },
  ];

  for (const { cmd, args } of tools) {
    try {
      const child = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
      child.stdin.write(text);
      child.stdin.end();
      await new Promise<void>((resolve, reject) => {
        child.on("error", reject);
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`exit ${code}`));
        });
      });
      return;
    } catch {}
  }
}

function SidebarSessionId(props: {
  context: Plugin.Context;
  sessionID: string;
}) {
  const [hovered, setHovered] = createSignal(false);

  const handleCopy = async () => {
    await copyToClipboard(props.sessionID);
    props.context.ui.toast.show({
      title: "Session ID",
      message: "Copied to clipboard 📋",
      variant: "info",
    });
  };

  props.context.keymap.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "session.id.copy",
        title: "Copy Session ID",
        description: "Copy current active session ID to clipboard",
        palette: true,
        slash: {
          name: "session-id",
        },
        run: async () => {
          await handleCopy();
        },
      },
    ],
  }));

  const isFooter = props.context.options.slot === "sidebar.footer";

  return (
    <Show
      when={!isFooter}
      fallback={
        <box
          id="sidebar.footer.session-id"
          onMouseOver={() => setHovered(true)}
          onMouseOut={() => setHovered(false)}
          onMouseUp={() => void handleCopy()}
        >
          <text wrapMode="none">
            <span style={{ fg: props.context.theme.text.subdued }}>ID </span>
            <span
              style={{
                fg: hovered()
                  ? props.context.theme.text.base
                  : props.context.theme.text.subdued,
              }}
            >
              {props.sessionID}
            </span>
          </text>
        </box>
      }
    >
      <box
        id="sidebar.content.session-id"
        onMouseOver={() => setHovered(true)}
        onMouseOut={() => setHovered(false)}
        onMouseUp={() => void handleCopy()}
      >
        <box flexDirection="row" gap={1}>
          <text fg={props.context.theme.text.base}>
            <b>Session ID</b>
          </text>
          <Show when={hovered()}>
            <text fg={props.context.theme.text.subdued}>(click to copy)</text>
          </Show>
        </box>
        <text
          fg={
            hovered()
              ? props.context.theme.text.base
              : props.context.theme.text.subdued
          }
          wrapMode="word"
        >
          {props.sessionID}
        </text>
      </box>
    </Show>
  );
}

const plugin: Plugin.Definition = {
  id: "oc-session-id",
  setup(context) {
    const slotTarget =
      context.options.slot === "sidebar.footer"
        ? "sidebar.footer"
        : "sidebar.content";

    if (slotTarget === "sidebar.footer") {
      context.ui.slot({
        append: "sidebar.footer",
        render: (props) => (
          <SidebarSessionId context={context} sessionID={props.sessionID} />
        ),
      });
    } else {
      context.ui.slot({
        prepend: "sidebar.content",
        render: (props) => (
          <SidebarSessionId context={context} sessionID={props.sessionID} />
        ),
      });
    }
  },
};

export default plugin;
