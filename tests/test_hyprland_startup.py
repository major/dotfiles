"""Check that the local watcher starts without an interactive shell's PATH."""

import shlex
import unittest
from pathlib import Path


class StartupTests(unittest.TestCase):
    """Keep the watcher startup independent of shell configuration."""

    def test_watcher_uses_absolute_executable_path(self):
        """Require an absolute script path in the UWSM startup command."""
        # Arrange: substitute a sample home without requiring a live desktop.
        template = (
            Path(__file__).resolve().parents[1] / "dot_config/hypr/hyprland.lua.tmpl"
        ).read_text()
        startup = next(
            line
            for line in template.splitlines()
            if 'hl.exec_cmd("uwsm app ' in line
            and "-u hyprland-input-watch.service " in line
        )
        command = startup.split('"', 2)[1].replace(
            "{{ .chezmoi.homeDir }}", "/home/example"
        )

        # Act: extract the executable UWSM must resolve at desktop startup.
        args = shlex.split(command)
        executable = Path(args[args.index("--") + 1])

        # Assert: a bare executable name would depend on the desktop's PATH.
        self.assertTrue(executable.is_absolute(), command)
        self.assertEqual(executable, Path("/home/example/bin/hyprland-input-watch"))
