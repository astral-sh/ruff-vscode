import os
import shutil
import site
import subprocess
import sys
import sysconfig
from pathlib import Path

RUFF_EXE = "ruff.exe" if sys.platform == "win32" else "ruff"

BUNDLE_DIR = Path(__file__).parent.parent


def update_sys_path(path_to_add: str) -> None:
    """Add given path to `sys.path`."""
    if os.path.isdir(path_to_add):
        # The `site` module adds the directory at the end, if not yet present; we want
        # it to be at the beginning, so that it takes precedence over any other
        # installed versions.
        sys.path.insert(0, path_to_add)

        # Allow development versions of libraries to be imported.
        site.addsitedir(path_to_add)


# This is separate from the 'main' entrypoint because we need
# to update the system path _before_ importing `pacakging`
if __name__ == "__main__":
    # Ensure that we can import bundled libraries like `packaging`
    update_sys_path(os.fspath(BUNDLE_DIR / "libs"))


from packaging.specifiers import SpecifierSet  # noqa: E402
from packaging.version import Version  # noqa: E402

# This is subject to change in the future
RUFF_VERSION_REQUIREMENT = SpecifierSet(">=0.3.5")


def executable_version(executable: str) -> Version:
    """Return the version of the executable at the given path."""
    output = subprocess.check_output([executable, "--version"]).decode().strip()
    version = output.replace("ruff ", "")
    return Version(version)


def check_compatibility(
    executable: str,
    requirement: SpecifierSet,
) -> None:
    """Check the executable for compatibility against various version specifiers."""
    version = executable_version(executable)
    if not requirement.contains(version, prereleases=True):
        message = f"Ruff {requirement} required, but found {version} at {executable}"
        raise RuntimeError(message)


def find_ruff_bin(fallback: Path) -> Path:
    """Return the ruff binary path."""
    path = Path(sysconfig.get_path("scripts")) / RUFF_EXE
    if path.is_file():
        return path

    if sys.version_info >= (3, 10):
        user_scheme = sysconfig.get_preferred_scheme("user")
    elif os.name == "nt":
        user_scheme = "nt_user"
    elif sys.platform == "darwin" and sys._framework:
        user_scheme = "osx_framework_user"
    else:
        user_scheme = "posix_user"

    path = Path(sysconfig.get_path("scripts", scheme=user_scheme)) / RUFF_EXE
    if path.is_file():
        return path

    path = shutil.which("ruff")
    if path:
        return path

    return fallback


if __name__ == "__main__":
    ruff = os.fsdecode(
        find_ruff_bin(
            Path(BUNDLE_DIR / "libs" / "bin" / RUFF_EXE),
        ),
    )
    check_compatibility(ruff, RUFF_VERSION_REQUIREMENT)
    completed_process = subprocess.run([ruff, *sys.argv[1:]], check=False)
    sys.exit(completed_process.returncode)
