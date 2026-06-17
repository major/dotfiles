/**
 * Desktop Notification Extension
 *
 * Sends a native desktop notification when the agent finishes and is waiting for input.
 * Tries OSC 777 first (Ghostty, iTerm2, WezTerm, rxvt-unicode), falls back to
 * `notify-send` for Linux desktops (Alacritty, Kitty, etc.).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Markdown, type MarkdownTheme } from "@earendil-works/pi-tui";
import { execSync, spawnSync } from "child_process";

/**
 * Check if the current terminal is likely to support OSC 777.
 */
const supportsOsc777 = (): boolean => {
	const term = process.env.TERM_PROGRAM || "";
	const supported = ["ghostty", "iterm2", "wezterm", "rxvt-unicode", "rxvt"];
	return supported.some((t) => term.toLowerCase().includes(t));
};

/**
 * Send a desktop notification via OSC 777 escape sequence.
 */
const notifyOsc777 = (title: string, body: string): void => {
	// OSC 777 format: ESC ] 777 ; notify ; title ; body BEL
	process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
};

/**
 * Send a desktop notification via notify-send (Linux D-Bus).
 */
const notifySend = (title: string, body: string): void => {
	try {
		spawnSync("notify-send", [title, body || " "], {
			stdio: "ignore",
			timeout: 3000,
		});
	} catch {
		// silently ignore if notify-send is unavailable
	}
};

/**
 * Send notification using the best available method.
 */
const notify = (title: string, body: string): void => {
	if (supportsOsc777()) {
		notifyOsc777(title, body);
	} else {
		notifySend(title, body);
	}
};

const isTextPart = (part: unknown): part is { type: "text"; text: string } =>
	Boolean(part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part);

const extractLastAssistantText = (messages: Array<{ role?: string; content?: unknown }>): string | null => {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message?.role !== "assistant") {
			continue;
		}

		const content = message.content;
		if (typeof content === "string") {
			return content.trim() || null;
		}

		if (Array.isArray(content)) {
			const text = content.filter(isTextPart).map((part) => part.text).join("\n").trim();
			return text || null;
		}

		return null;
	}

	return null;
};

const plainMarkdownTheme: MarkdownTheme = {
	heading: (text) => text,
	link: (text) => text,
	linkUrl: () => "",
	code: (text) => text,
	codeBlock: (text) => text,
	codeBlockBorder: () => "",
	quote: (text) => text,
	quoteBorder: () => "",
	hr: () => "",
	listBullet: () => "",
	bold: (text) => text,
	italic: (text) => text,
	strikethrough: (text) => text,
	underline: (text) => text,
};

const simpleMarkdown = (text: string, width = 80): string => {
	const markdown = new Markdown(text, 0, 0, plainMarkdownTheme);
	return markdown.render(width).join("\n");
};

const formatNotification = (text: string | null): { title: string; body: string } => {
	const simplified = text ? simpleMarkdown(text) : "";
	const normalized = simplified.replace(/\s+/g, " ").trim();
	if (!normalized) {
		return { title: "Ready for input", body: "" };
	}

	const maxBody = 200;
	const body = normalized.length > maxBody ? `${normalized.slice(0, maxBody - 1)}…` : normalized;
	return { title: "π", body };
};

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async (event) => {
		const lastText = extractLastAssistantText(event.messages ?? []);
		const { title, body } = formatNotification(lastText);
		notify(title, body);
	});
}
