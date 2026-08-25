return {
  {
    "dmtrKovalenko/fff",
    build = function()
      require("fff.download").download_or_build_binary()
    end,
    lazy = false,
    keys = {
      {
        "<leader>ff",
        function()
          require("fff").find_files()
        end,
        desc = "FFF files",
      },
      {
        "<leader>fg",
        function()
          require("fff").live_grep()
        end,
        desc = "FFF grep",
      },
      {
        "<leader>fG",
        function()
          require("fff").live_grep({ grep = { modes = { "fuzzy", "plain" } } })
        end,
        desc = "FFF fuzzy grep",
      },
      {
        "<leader>fw",
        function()
          require("fff").live_grep_under_cursor()
        end,
        mode = { "n", "x" },
        desc = "FFF word or selection",
      },
    },
  },
}
