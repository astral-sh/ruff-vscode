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

Stable Ruff releases start [Prepare release](https://github.com/astral-sh/ruff-vscode/actions/workflows/release-prepare.yml)
on `main` with the upstream version and `auto-promote=true`. It opens a PR for the next even-minor
extension version, waits for CI and zizmor, then squash-merges the tested PR and starts
[Release](https://github.com/astral-sh/ruff-vscode/actions/workflows/release.yml) with the merge SHA.
Approve `release-gate` after the builds finish. If `main` advances before Release starts, review
the intervening changes before running Release manually on the new commit.

For a manual release, run Prepare release on `main`. **Auto-promote** defaults to off, so the workflow
stops after opening the PR. With no inputs, the release script uses its default extension version
and the latest Ruff on PyPI. To prepare a specific upstream version, run

```sh
gh workflow run release-prepare.yml --repo astral-sh/ruff-vscode --ref main -f ruff-version=0.17.6
```

For an extension-only release or a pre-release, set the `version` input when preparing the PR.
Review the PR and edit the changelog if needed, merge it, then run Release on `main`. The extension version
defaults to the one in `package.json`. Approve `release-gate` after the builds finish.

Odd minor versions are pre-releases and retain timestamped nightly build IDs; even minor versions are stable releases.

When preparing a release, choose an extension version greater than the checked-in version. Both preparation and publication require a version greater than every existing release tag.

The publish jobs run in the `release` environment and authenticate to VS Code Marketplace and Open VSX with GitHub Actions OIDC tokens.
The repository must have protection rules configured for the `release-gate` environment to require approval.

After both publications succeed, the workflow creates the `<version>` tag and GitHub release, automatically marking odd
minor versions as pre-releases. Review and curate the generated GitHub release notes as needed.

It may take a few minutes after the workflow completes for the extension to be available.
