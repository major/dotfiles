-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
--
-- Add any additional autocmds here
-- with `vim.api.nvim_create_autocmd`
--
-- Or remove existing autocmds by their group name (which is prefixed with `lazyvim_` for the defaults)
-- e.g. vim.api.nvim_del_augroup_by_name("lazyvim_wrap_spell")

-- Open Snacks Explorer on startup and keep it as a persistent sidebar.
-- The explorer itself never auto-closes on file open or window focus
-- (auto_close = false, jump.close = false are LazyVim's own defaults).
-- This module loads on the VeryLazy event, which always fires after
-- VimEnter, so it's safe to open the explorer directly here.
Snacks.explorer()
