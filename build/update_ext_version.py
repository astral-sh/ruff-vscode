"""Update the Python extension micro version based on a build ID."""

import argparse
import json
import pathlib
from typing import Tuple, Union

EXT_ROOT = pathlib.Path(__file__).parent.parent
PACKAGE_JSON_PATH = EXT_ROOT / "package.json"


def is_even(v: Union[int, str]) -> bool:
    """Returns True if `v` is even."""
    return not int(v) % 2


def parse_version(version: str) -> Tuple[str, str, str, str]:
    """Parse a version string into a tuple of version parts."""
    major, minor, parts = version.split(".", maxsplit=2)
    try:
        micro, suffix = parts.split("-", maxsplit=1)
    except ValueError:
        micro = parts
        suffix = ""
    return major, minor, micro, suffix


def main(
    package_json: pathlib.Path, *, release: bool, build_id: int, for_publishing: bool
) -> None:
    package = json.loads(package_json.read_text(encoding="utf-8"))

    major, minor, micro, suffix = parse_version(package["version"])

    if release and not is_even(minor):
        raise ValueError(
            f"Release version should have EVEN numbered minor version: "
            f"{package['version']}"
        )
    elif not release and is_even(minor):
        raise ValueError(
            f"Pre-Release version should have ODD numbered minor version: "
            f"{package['version']}"
        )

    # The build ID should fall within the 0-INT32 max range allowed by the Marketplace.
    if build_id < 0 or (for_publishing and build_id > ((2**32) - 1)):
        raise ValueError(f"Build ID must be within [0, {(2**32) - 1}]")

    print(f"Updating build FROM: {package['version']}")
    package["version"] = ".".join((major, minor, str(build_id)))
    if not for_publishing and not release and len(suffix):
        package["version"] += "-" + suffix
    print(f"Updating build TO: {package['version']}")

    # Overwrite package.json with new data.
    package_json.write_text(
        json.dumps(package, indent=4, ensure_ascii=False) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Update the Python extension micro version based on a build ID."
    )
    parser.add_argument(
        "--release",
        action="store_true",
        help="Treats the current build as a release build.",
    )
    parser.add_argument(
        "--build-id",
        action="store",
        type=int,
        help="Micro version to use.",
        required=True,
    )
    parser.add_argument(
        "--for-publishing",
        action="store_true",
        help="Removes `-dev` or `-rc` suffix.",
    )
    args = parser.parse_args()

    main(
        PACKAGE_JSON_PATH,
        release=args.release,
        build_id=args.build_id,
        for_publishing=args.for_publishing,
    )
