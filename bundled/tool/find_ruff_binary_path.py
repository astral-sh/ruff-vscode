import os
import sys
import sysconfig
from pathlib import Path
from typing import Optional

RUFF_EXE = "ruff.exe" if sys.platform == "win32" else "ruff"


def find_ruff_binary_path() -> Optional[Path]:
    """Return the ruff binary path if it exists, `None` otherwise."""
    bin_path = Path(sysconfig.get_path("scripts")) / RUFF_EXE
    if bin_path.is_file():
        return bin_path

    if sys.version_info >= (3, 10):
        user_scheme = sysconfig.get_preferred_scheme("user")
    elif os.name == "nt":
        user_scheme = "nt_user"
    elif sys.platform == "darwin" and sys._framework:
        user_scheme = "osx_framework_user"
    else:
        user_scheme = "posix_user"

    scripts_path = Path(sysconfig.get_path("scripts", scheme=user_scheme)) / RUFF_EXE
    if scripts_path.is_file():
        return scripts_path

    return None


if __name__ == "__main__":
    # Python defaults to the system's local encoding for stdout on Windows.
    # source: https://docs.python.org/3/library/sys.html#sys.stdout
    #
    # But not all paths are representable by the local encoding.
    # The node process calling this script defaults to UTF8, so let's do the same here.
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore [attr-defined] # We never reconfigure stdout, thus it is guaranteed to not be Any

    ruff_binary_path = find_ruff_binary_path()
    if ruff_binary_path:
        print(ruff_binary_path, flush=True)
