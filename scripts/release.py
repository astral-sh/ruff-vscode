"""
Script for automating changes necessary for `ruff-vscode` releases.

This script does the following things:
- Bumps the version of this project in `pyproject.toml` and `package.json`
- Bumps the `ruff` and `ruff-lsp` dependency pins in `pyproject.toml`
- Updates the changelog and README
- Updates the package's lockfiles
"""

# /// script
# requires-python = "==3.7.*"
# dependencies = ["packaging", "requests", "rich-argparse", "tomli", "tomlkit"]
#
# [tool.uv]
# exclude-newer = "2024-11-27T00:00:00Z"
# ///
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import textwrap
from dataclasses import dataclass
from pathlib import Path

import requests
import tomli
import tomlkit
import tomlkit.items
from packaging.requirements import Requirement
from packaging.specifiers import SpecifierSet
from packaging.version import Version
from rich_argparse import RawDescriptionRichHelpFormatter

PYPROJECT_TOML_PATH = Path("pyproject.toml")
PACKAGE_JSON_PATH = Path("package.json")
README_PATH = Path("README.md")
CHANGELOG_PATH = Path("CHANGELOG.md")


@dataclass(frozen=True)
class RuffVersions:
    existing_vscode_version: Version
    new_vscode_version: Version
    existing_ruff_pin: Version
    latest_ruff: Version
    existing_ruff_lsp_pin: Version
    latest_ruff_lsp: Version


def existing_dependency_pin(
    dependencies: dict[str, SpecifierSet], dependency: str
) -> Version:
    """Return the version that `dependency` is currently pinned to in pyproject.toml."""
    specifiers = dependencies[dependency]
    assert len(specifiers) == 1
    single_specifier = next(iter(specifiers))
    assert single_specifier.operator == "=="
    return Version(single_specifier.version)


def latest_pypi_version(project_name: str) -> Version:
    """Determine the latest version of `project_name` that has been uploaded to PyPI."""
    pypi_json = requests.get(f"https://pypi.org/pypi/{project_name}/json")
    pypi_json.raise_for_status()
    return Version(pypi_json.json()["info"]["version"])


def get_ruff_versions(
    *,
    new_ruff_vscode_version: Version | None,
    new_ruff_version: Version | None,
    new_ruff_lsp_version: Version | None,
) -> RuffVersions:
    """
    Obtain metadata about the project; figure out what the new metadata should be.
    """
    with PYPROJECT_TOML_PATH.open("rb") as pyproject_file:
        pyproject_toml = tomli.load(pyproject_file)

    existing_ruff_vscode_version = Version(pyproject_toml["project"]["version"])

    if new_ruff_vscode_version is None:
        major = dt.datetime.now(dt.timezone.utc).year
        minor = existing_ruff_vscode_version.minor + 2
        new_ruff_vscode_version = Version(f"{major}.{minor}.0")

    dependencies = {
        requirement.name: requirement.specifier
        for requirement in map(Requirement, pyproject_toml["project"]["dependencies"])
    }

    return RuffVersions(
        existing_vscode_version=existing_ruff_vscode_version,
        new_vscode_version=new_ruff_vscode_version,
        existing_ruff_pin=existing_dependency_pin(dependencies, "ruff"),
        latest_ruff=(new_ruff_version or latest_pypi_version("ruff")),
        existing_ruff_lsp_pin=existing_dependency_pin(dependencies, "ruff-lsp"),
        latest_ruff_lsp=(new_ruff_lsp_version or latest_pypi_version("ruff-lsp")),
    )


def update_pyproject_toml(versions: RuffVersions) -> None:
    """Update metadata in `pyproject.toml`.

    Specifically, we update:
    - The version of this project itself
    - The `ruff` version we pin to in our dependencies list
    - The `ruff-lsp` version we pin to in our dependencies list
    """
    with PYPROJECT_TOML_PATH.open("rb") as pyproject_file:
        pyproject_toml = tomlkit.load(pyproject_file)

    project_table = pyproject_toml["project"]
    assert isinstance(project_table, tomlkit.items.Table)

    project_table["version"] = tomlkit.string(str(versions.new_vscode_version))

    existing_dependencies = project_table["dependencies"]
    assert isinstance(existing_dependencies, tomlkit.items.Array)
    assert len(existing_dependencies) == 3
    existing_dependencies[1] = tomlkit.string(f"ruff-lsp=={versions.latest_ruff_lsp}")
    existing_dependencies[2] = tomlkit.string(f"ruff=={versions.latest_ruff}")

    with PYPROJECT_TOML_PATH.open("w") as pyproject_file:
        tomlkit.dump(pyproject_toml, pyproject_file)


def bump_package_json_version(new_version: Version) -> None:
    """Update the version of this package in `package.json`."""
    with PACKAGE_JSON_PATH.open("rb") as package_json_file:
        package_json = json.load(package_json_file)
    package_json["version"] = str(new_version)
    with PACKAGE_JSON_PATH.open("w") as package_json_file:
        json.dump(package_json, package_json_file, indent=2)
        package_json_file.write("\n")


README_DESCRIPTION_REGEX = re.compile(
    r"The extension ships with `ruff==\d+\.\d+\.\d+`\."
)
README_SVG_REGEX = re.compile(r"ruff/\d+\.\d+\.\d+\.svg")


def update_readme(latest_ruff: Version) -> None:
    """Ensure the README is up to date with respect to our pinned Ruff version."""
    readme_text = README_PATH.read_text()

    description_matches = list(README_DESCRIPTION_REGEX.finditer(readme_text))
    assert len(description_matches) == 1, (
        f"Unexpected number of matches for `README_DESCRIPTION_REGEX` "
        f"found in README.md ({len(description_matches)}). Perhaps the release script "
        f"is out of date?"
    )
    readme_text = "".join(
        [
            readme_text[: description_matches[0].start()],
            f"The extension ships with `ruff=={latest_ruff}`.",
            readme_text[description_matches[0].end() :],
        ]
    )

    assert README_SVG_REGEX.search(readme_text), (
        "No matches found for `README_SVG_REGEX` in README.md. "
        "Perhaps the release script is out of date?"
    )
    readme_text = README_SVG_REGEX.sub(f"ruff/{latest_ruff}.svg", readme_text)

    README_PATH.write_text(readme_text)


def update_changelog(versions: RuffVersions) -> None:
    """Add a changelog entry describing the updated dependency pins."""
    with CHANGELOG_PATH.open() as changelog_file:
        changelog_lines = list(changelog_file)

    assert changelog_lines[4] == f"## {versions.existing_vscode_version}\n", (
        f"Unexpected content in CHANGELOG.md ({changelog_lines[4]!r}) "
        f"-- perhaps the release script is out of date?"
    )

    if (
        versions.latest_ruff != versions.existing_ruff_pin
        and versions.latest_ruff_lsp != versions.existing_ruff_lsp_pin
    ):
        changelog_entry_middle = (
            f"This release upgrades the bundled Ruff version "
            f"to `v{versions.latest_ruff}`, and the bundled `ruff-lsp` version "
            f"to `{versions.latest_ruff_lsp}`."
        )
    elif versions.latest_ruff != versions.existing_ruff_pin:
        changelog_entry_middle = (
            f"This release upgrades the bundled Ruff version "
            f"to `v{versions.latest_ruff}`."
        )
    elif versions.latest_ruff_lsp != versions.existing_ruff_lsp_pin:
        changelog_entry_middle = (
            f"This release upgrades the bundled `ruff-lsp` version "
            f"to `v{versions.latest_ruff_lsp}`."
        )
    else:
        changelog_entry_middle = ""

    changelog_entry = textwrap.dedent(f"""\

        ## {versions.new_vscode_version}

        {changelog_entry_middle}

        **Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/{versions.existing_vscode_version}...{versions.new_vscode_version}
        """)

    changelog_lines[3:3] = changelog_entry.splitlines(keepends=True)
    CHANGELOG_PATH.write_text("".join(changelog_lines))


def lock_requirements() -> None:
    """Update this package's lockfiles."""
    for path in "requirements-dev.txt", "requirements.txt":
        Path(path).unlink()
    subprocess.run(["just", "lock"], check=True)


def commit_changes(versions: RuffVersions) -> None:
    """Create a new `git` branch, check it out, and commit the changes."""
    original_branch = subprocess.run(
        ["git", "branch", "--show-current"], text=True, check=True, capture_output=True
    ).stdout.strip()

    new_branch = f"release-{versions.new_vscode_version}"

    commit_body = (
        f"Bump ruff to {versions.latest_ruff} "
        f"and ruff-lsp to {versions.latest_ruff_lsp}"
    )
    commit_command = [
        "git",
        "commit",
        "-a",
        "-m",
        f"Release {versions.new_vscode_version}",
        "-m",
        commit_body,
    ]

    try:
        subprocess.run(["git", "switch", "-c", new_branch], check=True)
        subprocess.run(commit_command, check=True)
    except:
        subprocess.run(["git", "switch", original_branch], check=True)
        raise


def prepare_release(versions: RuffVersions, *, prepare_pr: bool) -> None:
    """Make all necessary changes for a new `ruff-vscode` release."""
    update_pyproject_toml(versions)
    bump_package_json_version(versions.new_vscode_version)
    update_readme(versions.latest_ruff)
    update_changelog(versions)
    lock_requirements()
    if prepare_pr:
        commit_changes(versions)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=RawDescriptionRichHelpFormatter
    )
    parser.add_argument(
        "--prepare-pr",
        action="store_true",
        help="After preparing the release, commit the results to a new branch",
    )
    parser.add_argument(
        "--new-version",
        type=Version,
        help=(
            "The version to set for this release. "
            "Defaults to `${CURRENT_MAJOR}.${CURRENT_MINOR + 2}.0`"
        ),
    )
    parser.add_argument(
        "--new-ruff",
        type=Version,
        help=(
            "Which version to bump the `ruff` dependency pin to. "
            "Defaults to the latest version available on PyPI."
        ),
    )
    parser.add_argument(
        "--new-ruff-lsp",
        type=Version,
        help=(
            "Which version to bump the `ruff-lsp` dependency pin to. "
            "Defaults to the latest version available on PyPI."
        ),
    )
    args = parser.parse_args()
    versions = get_ruff_versions(
        new_ruff_vscode_version=args.new_version,
        new_ruff_version=args.new_ruff,
        new_ruff_lsp_version=args.new_ruff_lsp,
    )
    prepare_release(versions, prepare_pr=args.prepare_pr)


if __name__ == "__main__":
    main()
