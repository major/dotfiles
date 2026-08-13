---
name: hyprland
description: Control and inspect a running Hyprland session, and edit Hyprland config files (hyprland.lua.tmpl, hypridle.conf, hyprlock.conf, hyprpaper.conf). Use when asked to manage displays, windows, workspaces, keybinds, DPMS, or other Hyprland state or config.
user-invocable: true
---

# Hyprland

Hyprland 0.56 runs a Lua config (`hl.*` API) instead of the legacy key/value syntax.
Operate the current session with `hyprctl`, and write config changes in the Lua dispatcher form.

## Config files

Config lives in `~/.config/hypr/`, managed by chezmoi as `dot_config/hypr/`:

- `hyprland.lua.tmpl` — main config; a chezmoi Go template using the `hl.*` Lua API.
- `hypridle.conf` — idle daemon; classic `key = value` config, not Lua.
- `hyprlock.conf` — lock screen.
- `hyprpaper.conf` — wallpaper daemon.

Edit the chezmoi source files, never the deployed copies directly.
Apply with `chezmoi apply`, then reload.

### Lua dispatcher form

Use `hl.dsp.*` expressions in keybinds and commands.
Legacy `hyprctl dispatch <action>` forms do not apply inside the Lua config.

```lua
hl.bind(mainMod .. " + return", hl.dsp.exec_cmd(terminal))
hl.bind(mainMod .. " + SHIFT + Q", hl.dsp.window.close())
hl.bind(mainMod .. " + left", hl.dsp.focus({ direction = "left" }))
```

Autostart programs in the `hyprland.start` handler via `uwsm`:

```lua
hl.on("hyprland.start", function()
    hl.exec_cmd("uwsm app -- waybar")
    hl.exec_cmd("uwsm app -- hyprpaper")
    hl.exec_cmd("uwsm app -s b -- /usr/libexec/polkit-gnome-authentication-agent-1")
end)
```

To shell out to `hyprctl` from a keybind, wrap it in `hl.dsp.exec_cmd(...)` and escape inner quotes with `\"`:

```lua
hl.bind(mainMod .. " + SHIFT + D", hl.dsp.exec_cmd("hyprctl dispatch 'hl.dsp.dpms({ action = \"off\" })' && sleep 1 && hyprctl dispatch 'hl.dsp.dpms({ action = \"on\" })'"), { locked = true })
```

### hypridle

`hypridle.conf` runs shell commands, so dispatchers there are still `hyprctl dispatch '<lua form>'`:

```ini
listener {
    timeout = 930
    on-timeout = hyprctl dispatch 'hl.dsp.dpms({ action = "off" })'
    on-resume = hyprctl dispatch 'hl.dsp.dpms({ action = "on" })' && brightnessctl -r
}
```

Chain commands with `&&` inside `on-resume` and `on-timeout`.

### Verification

After editing, check for parse errors and reload:

```bash
chezmoi apply
hyprctl configerrors
hyprctl reload
```

## Progressive Flow (live session)

1. Identify the requested resource and action.
2. Try the direct `hyprctl` command without broad discovery.
3. Use the Lua dispatcher form used by current Hyprland releases.
4. Query only the relevant state to verify the result.
5. Report the result briefly, including output names or window/workspace identifiers when useful.

Do not search documentation or dump full configuration unless the local command and version information are insufficient.

## Display DPMS

Use a Lua dispatcher expression:

```bash
hyprctl dispatch 'hl.dsp.dpms({ action = "off" })'
hyprctl dispatch 'hl.dsp.dpms({ action = "on" })'
hyprctl dispatch 'hl.dsp.dpms({ action = "toggle" })'
```

Verify all displays concisely:

```bash
hyprctl monitors -j | jq -r '.[] | "\(.name): dpmsStatus=\(.dpmsStatus), disabled=\(.disabled)"'
```

`dpmsStatus=false` means the display is off; `disabled=false` means the monitor remains configured rather than removed.

## Safety

Turning off all displays can make the session appear unresponsive.
Do not disable or remove monitors when the user only asked to turn off their panels.
For destructive actions such as closing windows or removing outputs, confirm scope when it is not explicit.
