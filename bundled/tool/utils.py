# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""Utility functions and classes for use with running tools over LSP."""

from __future__ import annotations

import os
import os.path
import site
import subprocess
import sys
import threading
from typing import Any, Sequence

# Save the working directory used when loading this module
SERVER_CWD = os.getcwd()
CWD_LOCK = threading.Lock()


def as_list(content: Any | list[Any] | tuple[Any, ...]) -> list[Any]:
    """Ensures we always get a list"""
    if isinstance(content, (list, tuple)):
        return list(content)
    return [content]


_site_paths = tuple(
    [
        os.path.normcase(os.path.normpath(p))
        for p in (as_list(site.getsitepackages()) + as_list(site.getusersitepackages()))
    ]
)


def is_same_path(file_path1: str, file_path2: str) -> bool:
    """Returns true if two paths are the same."""
    return os.path.normcase(os.path.normpath(file_path1)) == os.path.normcase(
        os.path.normpath(file_path2)
    )


def is_current_interpreter(executable: str) -> bool:
    """Returns true if the executable path is same as the current interpreter."""
    return is_same_path(executable, sys.executable)


def is_stdlib_file(file_path: str) -> bool:
    """Return True if the file belongs to standard library."""
    return os.path.normcase(os.path.normpath(file_path)).startswith(_site_paths)


def scripts(interpreter: str) -> str:
    """Returns the absolute path to an interpreter's scripts directory."""
    return (
        subprocess.check_output(
            [
                interpreter,
                "-c",
                "import sysconfig; print(sysconfig.get_path('scripts'))",
            ]
        )
        .decode()
        .strip()
    )


class RunResult:
    """Object to hold result from running tool."""

    def __init__(self, stdout: str, stderr: str):
        self.stdout: str = stdout
        self.stderr: str = stderr


def run_path(
    argv: Sequence[str],
    use_stdin: bool,
    cwd: str,
    source: str | None = None,
) -> RunResult:
    """Runs as an executable."""
    if use_stdin:
        with subprocess.Popen(
            argv,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            cwd=cwd,
        ) as process:
            return RunResult(*process.communicate(input=source))
    else:
        result = subprocess.run(
            argv,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            cwd=cwd,
        )
        return RunResult(result.stdout, result.stderr)
