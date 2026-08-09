import { type Plugin, tool } from "@opencode-ai/plugin"

const DEFAULT_SPACE = "RSPEED"

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`missing ${name}`)
  return value
}

function token() {
  return process.env.JIRA_API_KEY ?? process.env.JIRA_API_TOKEN ?? process.env.CONFLUENCE_API_TOKEN ?? env("JIRA_API_KEY")
}

function auth() {
  const email = process.env.CONFLUENCE_EMAIL ?? process.env.JIRA_AUTH?.split(":", 1)[0]
  if (!email) throw new Error("missing CONFLUENCE_EMAIL or JIRA_AUTH email")
  return `Basic ${Buffer.from(`${email}:${token()}`).toString("base64")}`
}

function baseUrl() {
  return `https://${env("JIRA_HOST")}/wiki`
}

async function confluenceFetch<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    signal,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: auth(), ...(init.headers ?? {}) },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Confluence API failed: ${response.status} ${response.statusText}\n${text.slice(0, 2000)}`)
  return (text ? JSON.parse(text) : {}) as T
}

function escapeStorageText(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function textToStorageParagraphs(text: string) {
  return text.split(/\n{2,}/).map((paragraph) => `<p>${escapeStorageText(paragraph).replace(/\n/g, "<br />")}</p>`).join("")
}

function textFromStorage(html?: string) {
  return (html ?? "")
    .replace(/<ac:structured-macro[\s\S]*?<\/ac:structured-macro>/g, "")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export const PiConfluenceTools: Plugin = async () => ({
  tool: {
    confluence_search: tool({
      description: "Search pages in work Confluence, defaulting to the RSPEED space.",
      args: {
        query: tool.schema.string().describe("Search text, title text, or raw CQL when mode is cql."),
        mode: tool.schema.enum(["text", "title", "cql"]).optional().describe("Default: text."),
        space: tool.schema.string().optional().describe("Confluence space key. Default: RSPEED."),
        limit: tool.schema.number().optional().describe("Maximum results, 1-50. Default: 10."),
      },
      async execute(args, context) {
        const mode = args.mode ?? "text"
        const space = (args.space || DEFAULT_SPACE).trim()
        const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 10)))
        const cql = mode === "cql" ? args.query : `space = "${space}" AND type = "page" AND ${mode} ~ "${args.query.replace(/"/g, '\\"')}"`
        const qs = new URLSearchParams({ cql, limit: String(limit) })
        const data = await confluenceFetch<{ results?: Array<{ id: string; title: string; type: string; _links?: { webui?: string } }> }>(`/rest/api/content/search?${qs}`, {}, context.abort)
        const rows = (data.results ?? []).map((page) => `${page.id}\t${page.title}\t${baseUrl()}${page._links?.webui ?? ""}`)
        return { output: rows.length ? ["ID\tTITLE\tURL", ...rows].join("\n") : "No Confluence pages found", metadata: { cql, results: data.results ?? [] } }
      },
    }),
    confluence_read: tool({
      description: "Read a work Confluence page by page ID, returning title, URL, version, and readable text.",
      args: { pageId: tool.schema.string().describe("Confluence page ID."), format: tool.schema.enum(["text", "storage"]).optional().describe("Default: text.") },
      async execute(args, context) {
        const page = await confluenceFetch<{ id: string; title: string; version?: { number?: number }; _links?: { webui?: string }; body?: { storage?: { value?: string } } }>(`/api/v2/pages/${encodeURIComponent(args.pageId)}?body-format=storage`, {}, context.abort)
        const storage = page.body?.storage?.value ?? ""
        const body = args.format === "storage" ? storage : textFromStorage(storage)
        return { output: [`# ${page.title}`, `${baseUrl()}${page._links?.webui ?? ""}`, `Version: ${page.version?.number ?? "unknown"}`, "", body].join("\n"), metadata: { id: page.id, title: page.title, version: page.version?.number, url: `${baseUrl()}${page._links?.webui ?? ""}` } }
      },
    }),
    confluence_edit: tool({
      description: "Edit a work Confluence page by page ID using Confluence storage format; can append text or storage XHTML.",
      args: { pageId: tool.schema.string(), content: tool.schema.string(), operation: tool.schema.enum(["append", "replace"]).optional(), format: tool.schema.enum(["text", "storage"]).optional(), message: tool.schema.string().optional() },
      async execute(args, context) {
        const page = await confluenceFetch<{ id: string; title: string; status?: string; version?: { number?: number }; _links?: { webui?: string }; body?: { storage?: { value?: string } } }>(`/api/v2/pages/${encodeURIComponent(args.pageId)}?body-format=storage`, {}, context.abort)
        const addition = args.format === "storage" ? args.content : textToStorageParagraphs(args.content)
        const oldStorage = page.body?.storage?.value ?? ""
        const newStorage = (args.operation ?? "append") === "replace" ? addition : `${oldStorage}${addition}`
        const updated = await confluenceFetch<{ id: string; title: string; version?: { number?: number }; _links?: { webui?: string } }>(`/api/v2/pages/${encodeURIComponent(args.pageId)}`, { method: "PUT", body: JSON.stringify({ id: page.id, status: page.status ?? "current", title: page.title, body: { representation: "storage", value: newStorage }, version: { number: (page.version?.number ?? 0) + 1, message: args.message ?? "Updated by opencode" } }) }, context.abort)
        const url = `${baseUrl()}${updated._links?.webui ?? ""}`
        return { output: `Updated ${updated.title}\n${url}\nVersion: ${updated.version?.number ?? "unknown"}`, metadata: { id: updated.id, title: updated.title, version: updated.version?.number, url } }
      },
    }),
    confluence_new_page: tool({
      description: "Create a work Confluence page as a child of an existing page using Confluence storage format.",
      args: { parentPageId: tool.schema.string(), title: tool.schema.string(), content: tool.schema.string(), format: tool.schema.enum(["text", "storage"]).optional(), message: tool.schema.string().optional() },
      async execute(args, context) {
        const parent = await confluenceFetch<{ id: string; spaceId: string }>(`/api/v2/pages/${encodeURIComponent(args.parentPageId)}`, {}, context.abort)
        const body = args.format === "storage" ? args.content : textToStorageParagraphs(args.content)
        const page = await confluenceFetch<{ id: string; title: string; version?: { number?: number }; _links?: { webui?: string } }>("/api/v2/pages", { method: "POST", body: JSON.stringify({ spaceId: parent.spaceId, status: "current", title: args.title, parentId: parent.id, body: { representation: "storage", value: body }, version: { message: args.message ?? "Created by opencode" } }) }, context.abort)
        const url = `${baseUrl()}${page._links?.webui ?? `/spaces/${DEFAULT_SPACE}/pages/${page.id}`}`
        return { output: `Created ${page.title}\n${url}\nVersion: ${page.version?.number ?? "unknown"}`, metadata: { id: page.id, title: page.title, version: page.version?.number, url } }
      },
    }),
    confluence_delete_page: tool({
      description: "Delete a work Confluence page by page ID. Confluence moves pages to trash.",
      args: { pageId: tool.schema.string() },
      async execute(args, context) {
        const page = await confluenceFetch<{ id: string; title: string }>(`/api/v2/pages/${encodeURIComponent(args.pageId)}`, {}, context.abort)
        await confluenceFetch<Record<string, never>>(`/api/v2/pages/${encodeURIComponent(args.pageId)}`, { method: "DELETE" }, context.abort)
        return { output: `Deleted ${page.title}\n${baseUrl()}/pages/${page.id}\nStatus: trashed`, metadata: { id: page.id, title: page.title, status: "trashed" } }
      },
    }),
  },
})
