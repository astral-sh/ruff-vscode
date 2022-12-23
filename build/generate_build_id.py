"""Generate a build ID for a release or pre-release version."""

import argparse
import datetime
import json
import pathlib
from typing import Tuple, Union

EXT_ROOT = pathlib.Path(__file__).parent.parent
PACKAGE_JSON_PATH = EXT_ROOT / "package.json"


def is_even(v: Union[int, str]) -> bool:
    """Returns `True` if `v` is even."""
    return not int(v) % 2


def micro_build_number() -> str:
    """Generates the micro build number.

    The format is `1<Julian day><hour><minute>`.
    """
    return f"1{datetime.datetime.now(tz=datetime.timezone.utc).strftime('%j%H%M')}"


def parse_version(version: str) -> Tuple[str, str, str, str]:
    """Parse a version string into a tuple of version parts."""
    major, minor, parts = version.split(".", maxsplit=2)
    try:
        micro, suffix = parts.split("-", maxsplit=1)
    except ValueError:
        micro = parts
        suffix = ""
    return major, minor, micro, suffix


def main(package_json: pathlib.Path, *, pre_release: bool) -> None:
    package = json.loads(package_json.read_text(encoding="utf-8"))

    major, minor, micro, suffix = parse_version(package["version"])

    if pre_release and is_even(minor):
        raise ValueError(
            f"Pre-Release version should have ODD numbered minor version: "
            f"{package['version']}"
        )

    if not pre_release and not is_even(minor):
        raise ValueError(
            f"Release version should have EVEN numbered minor version: "
            f"{package['version']}"
        )

    if pre_release:
        print(micro_build_number())
    else:
        print(micro)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate a build ID for a release or pre-release version."
    )
    parser.add_argument(
        "--pre-release",
        action="store_true",
        help="Treats the current build as a pre-release build.",
    )
    args = parser.parse_args()

    main(PACKAGE_JSON_PATH, pre_release=args.pre_release)
