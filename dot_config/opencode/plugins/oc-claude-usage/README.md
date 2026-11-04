# Claude usage

This automatically discovered local plugin shows personal Claude usage in the sidebar. It reads Claude Code's personal credential store, not Anthropic API, Mythos, or Vertex credentials. The usage endpoint is unofficial and may change.

`CLAUDE_CONFIG_DIR` selects the credential directory and defaults to `~/.claude`. The five-hour and weekly windows show used percentages and reset countdowns.

Open Claude Code and sign in if the login is missing or expired. The plugin never refreshes credentials itself. It refreshes usage every five minutes by default; the optional `interval` plugin option accepts milliseconds of at least 60,000. The shared cache is checked every five seconds, and failures are cached for the same interval as successes.

The cache uses the sibling helper in `oc-codex-usage/lib/usage-cache.ts`, so copying only the Claude directory is insufficient. It contains normalized usage or safe errors, not credentials. Switching accounts within the same Claude config directory can show the previous account's cached usage for up to five minutes by default. When a refresh fails, the last available usage remains visible with a stale warning until a later refresh succeeds.

Run tests from this directory:

```sh
bun test .
```
