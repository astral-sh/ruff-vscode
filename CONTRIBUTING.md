# Contributing

This extension is based on the [Template for VS Code Python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template).

## Development

### Getting Started

- Install [Node.js](https://nodejs.org/).
- Install [`uv`](https://github.com/astral-sh/uv).

Install development dependencies:

```console
uv sync --dev
uv pip sync --require-hashes ./requirements.txt --target ./bundled/libs
npm ci --ignore-scripts
```

To automatically format the codebase:

```console
npm run fmt
```

To run lint and type checks:

```console
npm run check
```

To run tests:

```console
uv pip sync --require-hashes ./requirements.txt --target ./bundled/libs
uv run --dev python -m unittest
```

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

- Run `uv run scripts/release.py`.
  (Run `uv run scripts/release.py --help` for information on what this script does,
  and its various options.)
- Check the changes the script made, copy-edit the changelog, and commit the changes.
- Create a new PR and merge it.
- [Create a new Release](https://github.com/astral-sh/ruff-vscode/releases/new), enter `x.x.x` (where `x.x.x` is the new version) into the _Choose a tag_ selector. Click _Generate release notes_, curate the release notes and publish the release.
- The Release workflow publishes the extension to the VS Code marketplace.
