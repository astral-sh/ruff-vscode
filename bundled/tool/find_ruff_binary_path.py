import os
import sys
import sysconfig
from pathlib import Path
from typing import Optional

RUFF_EXE = "ruff.exe" if sys.platform == "win32" else "ruff"


def find_ruff_binary_path() -> Optional[Path]:
    """Return the ruff binary path, `None` if unable to find."""
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
    ruff_binary_path = find_ruff_binary_path()
    if ruff_binary_path:
        print(os.fsdecode(str(ruff_binary_path)), flush=True)
