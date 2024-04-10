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


if __name__ == "__main__":
    # Ensure that we can import bundled libraries like `packaging`
    update_sys_path(os.fspath(BUNDLE_DIR / "libs"))


from packaging.specifiers import SpecifierSet
from packaging.version import Version

# This is the first release that included `ruff server`.
# The minimum version may change in the future.
RUFF_VERSION_REQUIREMENT = SpecifierSet(">=0.3.3")
# These versions have major bugs or broken integration, and should be avoided.
FORBIDDEN_RUFF_VERSIONS = [Version("0.3.4")]


def executable_version(executable: str) -> Version:
    """Return the version of the executable at the given path."""
    output = subprocess.check_output([executable, "--version"]).decode().strip()
    version = output.replace("ruff ", "")
    return Version(version)


def check_compatibility(
    executable: str,
    requirement: SpecifierSet,
    forbidden_requirements: SpecifierSet,
) -> None:
    """Check the executable for compatibility against various version specifiers."""
    version = executable_version(executable)
    if not requirement.contains(version, prereleases=True):
        message = f"Ruff {requirement} required, but found {version} at {executable}"
        raise RuntimeError(message)
    for forbidden in forbidden_requirements:
        if version == forbidden:
            message = (
                f"Tried to use Ruff version {version} at {executable}, which is not allowed.\n"
                "This version of the server has incompatibilities and/or integration-breaking bugs.\n"
                "Please upgrade to the latest version and try again."
            )
            raise RuntimeError(message)


def find_ruff_bin(fallback: Path) -> Path:
    """Return the ruff binary path."""
    path = Path(sysconfig.get_path("scripts")) / RUFF_EXE
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
    check_compatibility(ruff, RUFF_VERSION_REQUIREMENT, FORBIDDEN_RUFF_VERSIONS)
    completed_process = subprocess.run([ruff, *sys.argv[1:]], check=False)
    sys.exit(completed_process.returncode)
