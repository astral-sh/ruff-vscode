# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import json
import pathlib
import urllib.request as url_lib

import nox


def _install_bundle(session: nox.Session) -> None:
    session.install(
        "-t",
        "./bundled/libs",
        "--no-cache-dir",
        "--implementation",
        "py",
        "--no-deps",
        "--upgrade",
        "-r",
        "./requirements.txt",
    )


def _update_pip_packages(session: nox.Session) -> None:
    session.run(
        "pip-compile",
        "--generate-hashes",
        "--resolver",
        "backtracking",
        "--upgrade",
        "./requirements.in",
    )
    session.run(
        "pip-compile",
        "--generate-hashes",
        "--resolver",
        "backtracking",
        "--upgrade",
        "./requirements-dev.in",
    )


def _get_package_data(package):
    json_uri = f"https://registry.npmjs.org/{package}"
    with url_lib.urlopen(json_uri) as response:
        return json.loads(response.read())


def _update_npm_packages(session: nox.Session) -> None:
    pinned = {
        "vscode-languageclient",
        "@types/vscode",
        "@types/node",
    }
    package_json_path = pathlib.Path(__file__).parent / "package.json"
    package_json = json.loads(package_json_path.read_text(encoding="utf-8"))

    for package in package_json["dependencies"]:
        if package not in pinned:
            data = _get_package_data(package)
            latest = "^" + data["dist-tags"]["latest"]
            package_json["dependencies"][package] = latest

    for package in package_json["devDependencies"]:
        if package not in pinned:
            data = _get_package_data(package)
            latest = "^" + data["dist-tags"]["latest"]
            package_json["devDependencies"][package] = latest

    # Ensure engine matches the package
    if (
        package_json["engines"]["vscode"]
        != package_json["devDependencies"]["@types/vscode"]
    ):
        print(
            "Please check VS Code engine version and @types/vscode version in "
            "package.json."
        )

    new_package_json = json.dumps(package_json, indent=4)
    # JSON dumps uses \n for line ending on all platforms by default
    if not new_package_json.endswith("\n"):
        new_package_json += "\n"
    package_json_path.write_text(new_package_json, encoding="utf-8")
    session.run("npm", "install", external=True)


def _setup_template_environment(session: nox.Session) -> None:
    session.install("wheel", "pip-tools")
    session.run(
        "pip-compile", "--generate-hashes", "--upgrade", "./requirements.in"
    )
    session.run(
        "pip-compile", "--generate-hashes", "--upgrade", "./requirements-dev.in"
    )
    _install_bundle(session)


@nox.session()
def setup(session: nox.Session) -> None:
    """Set up the template for development."""
    _setup_template_environment(session)


@nox.session()
def test(session: nox.Session) -> None:
    """Run all the tests for the extension."""
    session.install("-r", "./requirements-dev.txt")
    session.run("pytest", "src/test/python_tests")


@nox.session()
def lint(session: nox.Session) -> None:
    """Lint the Python and TypeScript source files."""
    session.install("-r", "./requirements.txt")
    session.install("-r", "./requirements-dev.txt")

    # Check Python lint with Ruff.
    session.run("ruff", "./noxfile.py")
    session.run("ruff", "./bundled/tool")
    session.run("ruff", "./src/test/python_tests")

    # Check Python formatting with Black.
    session.run("black", "--check", "./noxfile.py")
    session.run("black", "--check", "./bundled/tool")
    session.run("black", "--check", "./src/test/python_tests")

    # Check TypeScript code.
    session.run("npm", "run", "lint", external=True)


@nox.session()
def typecheck(session: nox.Session) -> None:
    """Typecheck the Python and TypeScript source files."""
    session.install("-r", "./requirements.txt")
    session.install("-r", "./requirements-dev.txt")

    # Check Python types with Mypy.
    session.run("mypy")

    # Check TypeScript types with tsc.
    session.run("npm", "run", "typecheck", external=True)


@nox.session()
def fmt(session: nox.Session) -> None:
    """Format the Python and TypeScript source files."""
    session.install("-r", "./requirements.txt")
    session.install("-r", "./requirements-dev.txt")

    # Sort imports with Ruff.
    session.run("ruff", "--select", "I001", "--fix", "./noxfile.py")
    session.run("ruff", "--select", "I001", "--fix", "./bundled/tool")
    session.run("ruff", "--select", "I001", "--fix", "./src/test/python_tests")

    # Format Python with Black.
    session.run("black", "./noxfile.py")
    session.run("black", "./bundled/tool")
    session.run("black", "./src/test/python_tests")

    # Format TypeScript with Prettier.
    session.run("npm", "run", "fmt", external=True)


@nox.session()
def build_package(session: nox.Session) -> None:
    """Build the VSIX package for publishing."""
    _setup_template_environment(session)
    session.run("npm", "install", external=True)
    session.run("npm", "run", "vsce-package", external=True)


@nox.session()
def update_packages(session: nox.Session) -> None:
    """Update pip and npm packages."""
    session.install("wheel", "pip-tools")
    _update_pip_packages(session)
    _update_npm_packages(session)
