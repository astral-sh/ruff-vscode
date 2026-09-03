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

1. Run the [Prepare release workflow](https://github.com/astral-sh/ruff-vscode/actions/workflows/release-prepare.yml)
   from `main` with the exact extension version, without a leading `v`. The workflow runs `scripts/release.py` to update
   the extension version, bundled Ruff and ruff-lsp versions, README, changelog, and lockfiles.
   Optionally specify the bundled Ruff and ruff-lsp versions; each defaults to the latest version on PyPI.
2. Review the generated release PR, copy-edit the changelog, and merge it.
3. Run the [Release workflow](https://github.com/astral-sh/ruff-vscode/actions/workflows/release.yml)
   from `main` with the same extension version.
4. Approve the protected `release-gate` deployment after all platform builds succeed.

Odd minor versions are pre-releases and retain timestamped nightly build IDs; even minor versions are stable releases.

Publishing uses the `release` environment and the `MARKETPLACE_TOKEN` and `OPENVSX_TOKEN` secrets.
The repository must have protection rules configured for the `release-gate` environment to require approval.

After both publications succeed, the workflow creates the `<version>` tag and GitHub release, automatically marking odd
minor versions as pre-releases. Review and curate the generated GitHub release notes as needed.

It may take a few minutes after the workflow completes for the extension to be available.
