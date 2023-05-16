"""Implementation of tool support over LSP."""

from __future__ import annotations

import logging
import logging.config
import os
import pathlib
import site
import sys

BUNDLE_DIR = pathlib.Path(__file__).parent.parent
logger = logging.getLogger(__name__)


# Update sys.path before importing any bundled libraries.
def update_sys_path(path_to_add: str) -> None:
    """Add given path to `sys.path`."""
    if path_to_add not in sys.path and os.path.isdir(path_to_add):
        # site adds the directory at the end if it is not yet present, we want it to
        # be front
        sys.path.insert(0, path_to_add)
        # Allow dev installs into bundled/libs
        site.addsitedir(path_to_add)


def main():
    import ruff_lsp
    from ruff_lsp import server

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "simple": {"format": "%(asctime)s %(levelname)-4s %(message)s"}
            },
            "handlers": {
                "stderr": {
                    "class": "logging.StreamHandler",
                    "formatter": "simple",
                },
            },
            "root": {"level": "INFO", "handlers": ["stderr"]},
            "loggers": {
                # Don't repeat every message
                "pygls.protocol": {
                    "level": "WARN",
                    "handlers": ["stderr"],
                    "propagate": False,
                },
            },
        }
    )

    logger.info(f"ruff path: {ruff_lsp.__file__}, sys.path: {sys.path}")

    if not hasattr(server, "set_bundle"):
        raise RuntimeError("ruff-vscode needs at least ruff-lsp v0.0.6")

    server.set_bundle(os.fspath(BUNDLE_DIR / "libs" / "bin" / server.TOOL_MODULE))
    server.start()


# Start the server.
if __name__ == "__main__":
    # Ensure that we can import LSP libraries, and other bundled libraries.
    update_sys_path(os.fspath(BUNDLE_DIR / "libs"))
    main()
