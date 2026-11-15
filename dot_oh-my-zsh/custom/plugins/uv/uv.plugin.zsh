# Generate completions without loading the current project's uv configuration.
# Scope the override to plugin loading so normal uv commands keep their config.
() {
  local -x UV_NO_CONFIG=1
  source "$ZSH/plugins/uv/uv.plugin.zsh"
}
