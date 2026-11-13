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

To debug the extension, open this repository in VS Code and run the "Debug Extension" launch configuration (`F5`).
View client logs in the "Ruff" output channel and server logs in "Ruff Language Server".

### Using a custom version of ruff

- Clone [ruff](https://github.com/astral-sh/ruff) to, e.g., `/home/ferris/ruff`.
- Run `cargo build` in the Ruff repository.
- Set "Ruff: Path" to `/home/ferris/ruff/target/debug/ruff` in the VS Code settings.

## Release

The [Release workflow](https://github.com/astral-sh/ruff-vscode/actions/workflows/release.yml)
defaults to `prepare-only`. Dispatch it on `main` to open a PR for review. With no inputs, it uses
the release script's default extension version and the latest Ruff on PyPI. To prepare a specific
upstream release, pass its exact version:

```sh
gh workflow run release.yml --repo astral-sh/ruff-vscode --ref main -f ruff-version=0.17.6
```

To automate the merge and start publishing, pass both `ruff-version` and `prepare-only=false`.
That run prepares the next even-minor extension release, waits for CI and zizmor on the PR, and
squash-merges the tested commit. It dispatches the same workflow again with the extension version
and expected merge SHA. Approve `release-gate` in the second run after the builds finish. If another
commit reaches `main` before that dispatch, the run stops before building. Review the intervening
changes before manually dispatching publication for the extension version on the new commit.

For an extension-only release, a pre-release, or a release that needs changelog edits:

1. Run the Release workflow from `main` with the desired extension version, without a leading `v`. The workflow runs `scripts/release.py` to update
   the extension version, bundled Ruff version, README, changelog, and lockfiles.
   Optionally specify the bundled Ruff version; it defaults to the latest version on PyPI.
2. Review the generated release PR, copy-edit the changelog, and merge it.
3. Run the [Release workflow](https://github.com/astral-sh/ruff-vscode/actions/workflows/release.yml)
   from `main` with the same extension version and `prepare-only=false`.
4. Approve the protected `release-gate` deployment after all platform builds succeed.

Odd minor versions are pre-releases and retain timestamped nightly build IDs; even minor versions are stable releases.

The publish jobs run in the `release` environment and authenticate to VS Code Marketplace and Open VSX with GitHub Actions OIDC tokens.
The repository must have protection rules configured for the `release-gate` environment to require approval.

After both publications succeed, the workflow creates the `<version>` tag and GitHub release, automatically marking odd
minor versions as pre-releases. Review and curate the generated GitHub release notes as needed.

It may take a few minutes after the workflow completes for the extension to be available.
