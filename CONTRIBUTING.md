# Contributing

This extension is based on the [Template for VS Code Python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template).

## Development

### Getting Started

- Install [`uv`](https://github.com/astral-sh/uv)
- Install [`just`](https://github.com/casey/just), or see the `justfile` for corresponding commands.
- Create and activate a virtual environment (e.g., `uv venv && source .venv/bin/activate`).
- Install development dependencies (`just install`).
- To automatically format the codebase, run: `just fmt`.
- To run lint and type checks, run: `just check`.
- To run tests, run: `just test`.

To run the extension, navigate to `src/extension.ts` and run (`F5`). You should see the LSP output
and Python log messages in the debug console under "Python Server".

### Modifying the LSP

- Clone [ruff-lsp](https://github.com/astral-sh/ruff-lsp) to, e.g., `../ruff-lsp`.
- In `../ruff-lsp`, run: `uv pip install -t ../ruff-vscode/bundled/libs/ -e .`.

### Using a custom version of ruff

- Clone [ruff](https://github.com/astral-sh/ruff) to, e.g., `/home/ferris/ruff`.
- Run `cargo build` in the Ruff repository.
- Set "Ruff: Path" to `/home/ferris/ruff/target/debug/ruff` in the VS Code settings.

## Release

- Bump the version in `package.json` and `pyproject.toml` (use even numbers for stable releases).
- Bump the `ruff` and `ruff-lsp` versions in `pyproject.toml`.
- Update the `ruff` version in the README.md
  - in the Base URLs
  - in "The extension ships with `ruff==...`"
- Make sure you have Python 3.7 installed
- Run `uv venv --python 3.7 && source .venv/bin/activate` to create a Python 3.7 venv and activate it.
- Run `rm requirements.txt requirements-dev.txt && just lock` to update `ruff` and `ruff-lsp`.
- Create a new PR and merge it.
- Update the Changelog
- [Create a new Release](https://github.com/astral-sh/ruff-vscode/releases/new), enter `x.x.x` (where `x.x.x` is the new version) into the _Choose a tag_ selector. Click _Generate release notes_, curate the release notes and publish the release.
- The Release workflow publishes the extension to the VS Code marketplace.
