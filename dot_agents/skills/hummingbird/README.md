# Hummingbird AI Skills

[Project Hummingbird](https://gitlab.com/redhat/hummingbird)
builds and publishes minimal, distroless OCI container images.
This repository hosts **AI skills** — installable agent extensions
that let your AI assistant navigate and use those images without
any manual setup. Each skill instructs the agent to query the live
[catalog API](https://api-hummingbird.hummingbird-project.io)
rather than relying on stale embedded data, so answers are always
current. Works with Claude Code, Cursor, Windsurf, Copilot, Goose,
Gemini CLI, and [18+ other agents](https://skills.sh).

![Hummingbird skill in Claude Code](docs/hummingbird-skill.png)

## Installation

Install once. Works in every session after that.

| Agent | Command |
| ----- | ------- |
| **Claude Code** | `npx skills add gitlab.com/redhat/hummingbird/skills -a claude-code` |
| **Cursor** | `npx skills add gitlab.com/redhat/hummingbird/skills -a cursor` |
| **Windsurf** | `npx skills add gitlab.com/redhat/hummingbird/skills -a windsurf` |
| **Copilot** | `npx skills add gitlab.com/redhat/hummingbird/skills -a copilot` |
| **Goose / Gemini CLI** | `git clone https://gitlab.com/redhat/hummingbird/skills.git` |

Auto-detect also works: `npx skills add gitlab.com/redhat/hummingbird/skills`.
[18+ agents supported.](https://skills.sh)

Goose and Gemini CLI read `AGENTS.md` natively — cloning is enough.

## Usage

Once installed, ask your agent questions about Hummingbird images in plain language.
The agent will query the live catalog API and return current data.

### Discover images

> "What Hummingbird images are available for running Python applications?"

### Get usage instructions

> "How do I use the Node.js 24 image? What environment variables does it support?"

### Find the right tag

> "What is the pull URL for the latest Python 3.14 production image?"

### Write a Containerfile

> "Write a multi-stage Containerfile for a Go application using Hummingbird images."

### Check security

> "Does the Python image have any critical or high CVEs?"

### Inspect contents

> "What packages are included in the latest Node.js 24 image?"

### Verify provenance

> "Where was the Python image built and what SLSA level does it achieve?"

## Roadmap

- **MCP server (experiment)** — Expose the catalog API as
  native MCP tools so agents can query images without any
  shell or permission prompts. Technically elegant, but
  running a sidecar server adds friction for users. Evaluate
  whether the UX cost is worth the gain over a simple curl
  allowlist.

- **Allowlist for `curl`** — Ship a `.claude/settings.json` that pre-approves `curl`
  calls against the catalog API host, eliminating permission prompts for the current
  curl-based workflow.

- **Example agent scripts** — Canned scripts for common tasks
  (find image for a given language, generate a multi-stage
  Containerfile, summarise CVEs for a set of images).

- **CI integration guide** — Document how to use the catalog API from CI pipelines
  (GitHub Actions, Konflux, GitLab CI) to automatically pick the latest Hummingbird
  base image.

- **Multi-agent testing** — Validate `AGENTS.md` with agents
  beyond Claude: Cursor, Goose, Gemini CLI, GitHub Copilot,
  and others. Each tool has its own conventions for loading
  agent context (e.g. `.cursorrules`, `GEMINI.md`) — document
  what works and what needs tool-specific additions.
