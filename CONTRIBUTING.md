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
on the default branch with `auto-promote=true`. Only the upstream releases bot can start an auto-promotion.
Prepare skips older upstream versions and versions already pinned in a stable extension. Otherwise it opens a PR
for the next even minor version and enables GitHub auto-merge. GitHub squash-merges it when the branch protection
requirements are met. The merge starts [Release](https://github.com/astral-sh/ruff-vscode/actions/workflows/release.yml)
at the squash commit. After the builds finish, approve `release-gate` to publish.

Before enabling auto-promotion, apply the organization rulesets for `release/auto/*`. They reserve branch creation
for the releases bot and block updates, keeping the prepared commit fixed while GitHub waits to merge. GitHub
can still delete the branch after merge. The Prepare workflow checks for the update restriction before pushing.

### Manual releases

Run Prepare release on the default branch with `auto-promote` off (the default). With no inputs, it bundles
the latest Ruff on PyPI and sets the extension version to `<UTC year>.<current minor + 2>.0`.
To prepare a specific upstream release, replace `<upstream-version>` with its version number.

```sh
gh workflow run release-prepare.yml --repo astral-sh/ruff-vscode -f ruff-version='<upstream-version>'
```

For an extension-only release or a pre-release, set the `version` input when preparing the PR.
Review the PR, edit the changelog if needed, and merge it. Start Release on the default branch from your personal GitHub account.
The extension version defaults to the one in `package.json`. Approve `release-gate` after the builds finish.

Odd minor versions are pre-releases and retain timestamped nightly build IDs; even minor versions are stable releases.

When preparing a release, choose an extension version greater than the checked-in version. Both preparation and publication require a version greater than every existing release tag.

The publish jobs run in the `release` environment and authenticate to VS Code Marketplace and Open VSX with GitHub Actions OIDC tokens.
The repository must have protection rules configured for the `release-gate` environment to require approval.

After both publications succeed, the workflow creates the `<version>` tag and GitHub release, automatically marking odd
minor versions as pre-releases. Review and curate the generated GitHub release notes as needed.

It may take a few minutes after the workflow completes for the extension to be available.

### Retrying a release

- If preparation fails before pushing the branch, rerun the failed job in Prepare release.
- If an automated release PR is behind the default branch or preparation fails after pushing
  `release/auto/<version>`, close the PR if it exists and delete that branch before rerunning Prepare release.
- If Prepare reports a conflicting release PR for the same version, resolve that PR before rerunning.
- If a build or publish job fails, rerun the failed jobs in the original Release run.
