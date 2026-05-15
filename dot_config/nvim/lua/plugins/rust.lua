return {
  {
    "mrcjkb/rustaceanvim",
    opts = {
      server = {
        default_settings = {
          ["rust-analyzer"] = {
            lru = { capacity = 32 },
            cargo = {
              allTargets = false,
            },
          },
        },
      },
    },
  },
}
