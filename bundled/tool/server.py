"""Implementation of tool support over LSP."""

from __future__ import annotations

import os
import pathlib
import sys

BUNDLE_DIR = pathlib.Path(__file__).parent.parent

# Update sys.path before importing any bundled libraries.
def update_sys_path(path_to_add: str) -> None:
    """Add given path to `sys.path`."""
    if path_to_add not in sys.path and os.path.isdir(path_to_add):
        sys.path.append(path_to_add)


# Ensure that we can import LSP libraries, and other bundled libraries.
update_sys_path(os.fspath(BUNDLE_DIR / "libs"))


# Start the server.
if __name__ == "__main__":
    from ruff_lsp import server

    server.set_bundle(os.fspath(BUNDLE_DIR / "libs" / "bin" / server.TOOL_MODULE))
    server.start()
