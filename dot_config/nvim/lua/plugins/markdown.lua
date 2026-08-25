return {
  {
    "mfussenegger/nvim-lint",
    opts = function(_, opts)
      vim.diagnostic.config({ virtual_text = false }, require("lint").get_namespace("markdownlint-cli2"))
      return opts
    end,
  },
}
