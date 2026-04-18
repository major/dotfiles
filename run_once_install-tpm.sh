#!/bin/sh
# Install Tmux Plugin Manager (TPM) and plugins.

TPM_DIR="${HOME}/.tmux/plugins/tpm"

if [ ! -d "${TPM_DIR}" ]; then
    echo "Installing TPM..."
    git clone https://github.com/tmux-plugins/tpm "${TPM_DIR}"
fi

# Install plugins non-interactively.
if [ -x "${TPM_DIR}/bin/install_plugins" ]; then
    echo "Installing tmux plugins..."
    "${TPM_DIR}/bin/install_plugins"
fi
