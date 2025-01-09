# Changelog

See [here](https://github.com/astral-sh/ruff/releases) for the Ruff release notes.

## 2024.56.0

This release upgrades the bundled Ruff version to `v0.8.0`, and the bundled `ruff-lsp`
version to `0.0.59`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.54.0...2024.56.0

## 2024.54.0

This release upgrades the bundled Ruff version to `v0.7.1` that includes an important
fix for the language server to avoid indexing the entire root directory when opening
a file directly in VS Code.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.52.0...2024.54.0

## 2024.52.0

This release upgrades the bundled Ruff version to `v0.7.0`, and the bundled `ruff-lsp`
version to `0.0.58`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.50.0...2024.52.0

## 2024.50.0

This release upgrades the bundled Ruff version to `v0.6.6`, and the bundled `ruff-lsp`
version to `0.0.57`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.48.0...2024.50.0

## 2024.48.0

This previous release failed to publish the artifacts to the Open VSX registry. This
release is a re-release of `2024.46.0` to ensure that users of that registry aren't affected.
Additionally, the publish step has been split into two separate steps to avoid the issue
in the future.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.46.0...2024.48.0

## 2024.46.0

This release fixes a regression from the last release where the loading spinner would not disappear after
the extension is successfully activated.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.44.0...2024.46.0

## 2024.44.0

This release upgrades the bundled Ruff version to `v0.6.4`, and the bundled `ruff-lsp`
version to `0.0.56`.

- Use "application" scope for global only settings (`ruff.logLevel`, `ruff.logFile`) (#594)
- Always include "Show Logs" button in Ruff notification (#600)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.42.0...2024.44.0

## 2024.42.0

This release upgrades the bundled Ruff version to `v0.6.1`, and the bundled `ruff-lsp`
version to `0.0.55`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.40.0...2024.42.0

## 2024.40.0

The previous release failed to upload some artifacts to the Open VSX registry due to
the registry being down. This release is a re-release of `2024.38.0` to ensure that
users of that registry aren't affected.

**Note**: The VS Code marketplace contains all the artifacts for `2024.38.0`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.38.0...2024.40.0

## 2024.38.0

This release upgrades the bundled Ruff version to `v0.5.7`, which includes a number of bug fixes
and improvements to `ruff server`.

In addition, it also adds support for `.cmd` and `.bat` files in the `ruff.interpreter` setting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.36.0...2024.38.0

## 2024.36.0

This release follows-up on the previous pre-release (`2024.35.0-dev`) and includes additional
bug fixes, specifically to avoid awaiting the VS Code pop-up notifications. These are shown
when a user has set any incompatible settings as per the `ruff.nativeServer` value.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.34.0...2024.36.0

## 2024.35.0-dev

This pre-release upgrades the bundled Ruff version to `v0.5.4`.

This pre-release also updates the `ruff.interpreter` setting to allow VS Code specific variables
such as `${workspaceFolder}` (https://github.com/astral-sh/ruff-vscode/pull/553). Additionally, the
[environment variables](https://code.visualstudio.com/docs/editor/variables-reference#_environment-variables)
of the form `${env:HOME}` are also replaced (https://github.com/astral-sh/ruff-vscode/pull/554).

## 2024.34.0

This release includes a bug fix to use `spawn` rather than `exec` to support
paths with spaces (https://github.com/astral-sh/ruff-vscode/pull/539).

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.32.0...2024.34.0

## 2024.32.0

This release upgrades the bundled Ruff version to `v0.5.3`. Ruff `0.5.3` marks
the stable release of the Ruff language server and introduces revamped
[documentation](https://docs.astral.sh/ruff/editors), including [setup guides
for your editor of choice](https://docs.astral.sh/ruff/editors/setup) and [the
language server itself](https://docs.astral.sh/ruff/editors/settings).

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.30.0...2024.32.0

## 2024.30.0

This release upgrades the bundled Ruff version to `v0.5.0`. Check out the [blog post](https://astral.sh/blog/ruff-v0.5.0) for a migration guide and overview of the changes!

This release also adds a new `showSyntaxErrors` setting that controls whether Ruff shows syntax errors.
Disabling the syntax errors can be helpful when using the Ruff extension with other Python extensions that also show syntax errors.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.28.0...2024.30.0

## 2024.28.0

This release upgrades the bundled Ruff version to `v0.4.9`, which includes a number of bug fixes
and improvements to `ruff server`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.26.0...2024.28.0

## 2024.26.0

This release upgrades the bundled Ruff version to `v0.4.8`, which includes a number of bug fixes
and improvements to `ruff server`.

To start using `ruff server`, add the following to your `settings.json`:

```json
{
  "ruff.nativeServer": true
}
```

Or see the [README](https://github.com/astral-sh/ruff-vscode/?tab=readme-ov-file#enabling-the-rust-based-language-server)
for more.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.24.0...2024.26.0

## 2024.24.0

This release upgrades the bundled Ruff version to `v0.4.7`, which includes a number of bug fixes
and improvements to `ruff server`.

To start using `ruff server`, add the following to your `settings.json`:

```json
{
  "ruff.nativeServer": true
}
```

Or see the [README](https://github.com/astral-sh/ruff-vscode/?tab=readme-ov-file#enabling-the-rust-based-language-server)
for more.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.22.0...2024.24.0

## 2024.22.0

This release upgrades the bundled Ruff version to `v0.4.5`.

This release also stabilizes `ruff server` as an available feature, along with its new configuration options. `ruff server` supports the same feature set as `ruff-lsp`, powering linting, formatting, and code fixes in Ruff's editor integrations -- but with superior performance and no installation required. We'd love your feedback!

To start using `ruff server`, add the following to your `settings.json`:

```json
{
  "ruff.nativeServer": true
}
```

Or see the [README](https://github.com/astral-sh/ruff-vscode/?tab=readme-ov-file#enabling-the-rust-based-language-server)
for more.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.20.0...2024.22.0

## 2024.21.0-dev

This pre-release upgrades the bundled Ruff version to `v0.4.2`.

Several new extension settings have been introduced, which allow you to override certain options passed into the linter and formatter. See [#10984](https://github.com/astral-sh/ruff/pull/10984)
for more details.

The `v0.4.2` server introduces several other features and improvements:

- Diagnostics for open files are now automatically refreshed when a configuration file is modified ([#10988](https://github.com/astral-sh/ruff/pull/10988))
- File configuration is now resolved on a per-file basis, which matches how the CLI resolves configuration ([#10950](https://github.com/astral-sh/ruff/pull/10950))
- Hover documentation for `noqa` codes has been implemented ([#11096](https://github.com/astral-sh/ruff/pull/11096))
- Major errors are now shown as pop-up notifications ([#10951](https://github.com/astral-sh/ruff/pull/10951))

This release also includes a bug fix:

- Ruff-specific source actions (such as `source.organizeImports.ruff`) now work as intended ([#10916](https://github.com/astral-sh/ruff/pull/10916))

## 2024.20.0

This release upgrades the bundled Ruff version to v0.4.1.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.18.0...2024.20.0

## 2024.19.0-dev

This pre-release upgrades the bundled Ruff version to `v0.3.6`.

The extension can now detect and use local `ruff` executables on your system, though it can still fall back to the bundled Ruff binary.

The `v0.3.6` server introduces several major features:

- Source actions like `source.fixAll` and `source.organizeImports` are now supported.
- Extension commands are now supported.
- Some extension settings now work as expected. See [the relevant PR](https://github.com/astral-sh/ruff/pull/10764) for more details.
- Linter/formatter configuration is now reloaded automatically when you make changes to `ruff.toml` / `pyproject.toml` files.

This release also brings significant quality-of-life improvements and fixes several bugs.

## 2024.18.0

This release upgrades the bundled Ruff version to v0.4.0.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.16.0...2024.18.0

## 2024.17.0-dev

This pre-release introduces support for the new, experimental Ruff language server (`ruff server`). It also upgrades the bundled Ruff version to `v0.3.3`.

`ruff server` is still missing some core functionality and stability guarantees - this pre-release is intended for early testing. The server can be enabled and disabled with the `experimentalServer` setting. A restart is required after changing this setting.

At the moment, the experimental server has the following known limitations:

- Most extension settings are not yet supported, and many will not be needed after the transition to the new server is finished. For example, `editor.codeActionsOnSave` does not work at the moment due to missing support for source-level code actions (see below). Additionally, `lint.args` / `format.args` will be replaced in the future with specific configuration fields for the linter and formatter.
- Commands/source-level code actions like `Fix all` and `Organize Imports` have not yet been implemented (Quick Fixes should still work, though).
- Hierarchial configuration for individual files is not yet supported. At the moment, the language server uses the `ruff.toml` / `pyproject.toml` at the workspace root to configure the formatter and linter.
- Jupyter Notebook files are not supported yet.
- Using local Ruff binaries is not yet supported. At the moment, the extension will always use the bundled Ruff binary. (`v0.3.3`)

These limitations will all be resolved in future versions.

## 2024.16.0

This release upgrades the bundled Ruff version to v0.3.1.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.14.0...2024.16.0

## 2024.14.0

This release upgrades the bundled Ruff version to v0.3.0.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.12.0...2024.14.0

## 2024.12.0

This release upgrades the bundled Ruff version to v0.2.2.

As of v0.2.2, Ruff now accepts configuration for arbitrary settings on command-line arguments via
the `--config` flag, which in turn allows for configuration arbitrary settings within the VS Code
extension.

For example, to set Ruff's `lint.isort.combine-as-imports` setting to `false`, add the following to
your `settings.json`:

```json
{
  "ruff.lint.args": ["--config", "lint.isort.combine-as-imports=false"]
}
```

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.10.0...2024.12.0

## 2024.10.0

This release includes support for "Format Selection" (i.e., the ability to format specific lines
within a source file) for Ruff v0.2.1 and later.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.8.0...2024.10.0

## 2024.8.0

This release upgrades the bundled Ruff version to v0.2.0.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.6.0...2024.8.0

## 2024.6.0

This release upgrades the Ruff LSP in anticipation of Ruff's upcoming v0.2.0 release

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.4.0...2024.6.0

## 2024.4.0

This release upgrades the bundled Ruff version to v0.1.14 and adds two additional settings
to the extension:

- `ruff.lint.enable`: Defaults to `true`. Set to `false` to use Ruff for formatting exclusively.
- `ruff.ignoreStandardLibrary`: Defaults to `true`. Set to `false` to disable the extension's
  standard library exclusion logic.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.2.0...2024.4.0

## 2024.2.0

This release upgrades the bundled Ruff version to v0.1.13 and adds Alpine Linux support
to the extension.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2024.0.0...2024.2.0

## 2024.0.0

This release upgrades the bundled Ruff version to v0.1.11 and adds support for Notebook-wide
code actions on save via the `notebook.codeActionsOnSave` setting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.60.0...2024.0.0

## 2023.60.0

This release upgrades the bundled Ruff version to v0.1.9.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.58.0...2023.60.0

## 2023.58.0

This release avoids surfacing errors when formatting files with syntax errors.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.56.0...2023.58.0

## 2023.56.0

This release fixes a bug in which the bundled version of Ruff was incompatible with ARM
Mac devices.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.54.0...2023.56.0

## 2023.54.0

This release fixes a bug in which Ruff overwrite files when invalid settings were provided
via `ruff.lint.args` or `ruff.format.args`.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.52.0...2023.54.0

## 2023.52.0

This release upgrades the bundled Ruff version to v0.1.8.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.50.0...2023.52.0

## 2023.50.0

This release fixes a bug in which Ruff overwrite excluded files during formatting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.48.0...2023.50.0

## 2023.48.0

This release fixes a bug in which syntax errors caused files to clear when formatting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.46.0...2023.48.0

## 2023.46.0

This release includes full support for using Ruff with Jupyter Notebooks in VS Code. For example:

```json
{
  "notebook.formatOnSave.enabled": true,
  "notebook.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.44.0...2023.46.0

## 2023.44.0

This release includes full support for using Ruff as a Python formatter via Ruff's `ruff format`
command.

You can configure Ruff to format Python code by marking it as your default formatter in VS Code's
`settings.json`:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.42.0...2023.44.0

## 2023.42.0

This release is required for compatibility with [Ruff v0.1.0+](https://github.com/astral-sh/ruff/releases/v0.1.0)
which includes breaking changes.

Ruff fixes are now labeled as "safe" or "unsafe". By default, the "Fix all" action will no longer apply unsafe
fixes. However, unsafe fixes can be applied manually with the "Quick fix" action. Application of unsafe fixes when
using "Fix all" can be enabled by setting `unsafe-fixes = true` in your Ruff configuration file or adding
`--unsafe-fixes` flag to the "Lint args" setting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.40.0...2023.42.0

## 2023.40.0

- **Deprecation**: `ruff.args` has been renamed to `ruff.lint.args` (see: https://github.com/astral-sh/ruff-vscode/pull/293).
- **Deprecation**: `ruff.run` has been renamed to `ruff.lint.run` (see: https://github.com/astral-sh/ruff-vscode/pull/293).

The extension will continue to respect the deprecated variants (`ruff.args` and `ruff.run`), but
they will be removed in a future release.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.38.0...2023.40.0

## 2023.38.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.36.0...2023.38.0

## 2023.36.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.34.0...2023.36.0

## 2023.34.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.32.0...2023.34.0

## 2023.32.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.30.0...2023.32.0

## 2023.30.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.28.0...2023.30.0

## 2023.28.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.26.0...2023.28.0

## 2023.26.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.24.0...2023.26.0

## 2023.24.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.22.0...2023.24.0

## 2023.22.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.20.0...2023.22.0

## 2023.20.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.18.0...2023.20.0

## 2023.18.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.16.0...2023.18.0

## 2023.16.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.14.0...2023.16.0

## 2023.14.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.12.0...2023.14.0

## 2023.12.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.10.0...2023.12.0

## 2023.10.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.8.0...2023.10.0

## 2023.8.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.6.0...2023.8.0

## 2023.6.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.4.0...2023.6.0

## 2023.4.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.2.0...2023.4.0

## 2023.2.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.2.0...2023.2.0

## 2022.0.26 (22 December 2022)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.25...2022.0.26

## 2022.0.25 (22 December 2022)

- Migrate to ruff-lsp by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/75
- Simplify some TypeScript code by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/77
- Upgrade ruff-lsp to v0.0.8 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/79

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.24...2022.0.25

## 2022.0.24 (21 December 2022)

- Add docs on replacing Black et al by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/66
- Skip JSON RPC abstraction for cross-interpreter calls by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/67
- Remove mypy.ini by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/68
- Clarify Black + Ruff compatibility in README by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/69
- Show check summary when hovering on checkcode in noqa comment by @harupy in https://github.com/astral-sh/ruff-vscode/pull/26
- Bump Ruff version to 0.0.190 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/74

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.23...2022.0.24

## 2022.0.23 (17 December 2022)

- Modify settings logic to match isort plugin by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/60
- Remove severity from default settings by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/62
- Bump Ruff version to 0.0.185 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/63
- Add `ruff-lsp` to README by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/64

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.22...2022.0.23

## 2022.0.22 (14 December 2022)

- Fix 'Exception ignored in atexit callback' in jsonrpc by @eddyg in https://github.com/astral-sh/ruff-vscode/pull/54
- Mark unused imports and local variables as unnecessary by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/55
- Bump Ruff version to 0.0.182 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/57

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.21...2022.0.22

## 2022.0.21 (6 December 2022)

- Bump Ruff version to 0.0.165 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/52

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.20...2022.0.21

## 2022.0.20 (1 December 2022)

- Bump default line length by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/46
- Enable CI by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/47
- Delay import of typing_extensions by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/49

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.19...2022.0.20

## 2022.0.19 (1 December 2022)

- Restore Python 3.7 compatibility by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/44

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.18...2022.0.19

## 2022.0.18 (1 December 2022)

- Enable `ruff: Organize Imports` action by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/32
- Bump Ruff version to 0.0.149 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/33
- Fix failing lint test by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/34
- Fix mypy by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/35
- Remove pylint ignore directives by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/36
- Add name and version to LanguageServer by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/38
- Upgrade to pygls==1.0.0a3 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/37
- Bump Ruff version to 0.0.150 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/40
- Implement code actions for Ruff autofix by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/39
- Update noxfile and fix lint errors by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/41
- Add diagnostic code to Quickfix by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/42

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.17...2022.0.18

## 2022.0.17 (25 November 2022)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.16...2022.0.17

## 2022.0.16 (25 November 2022)

- Publish to OpenVSX by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/30
- Bump Ruff version to 0.0.138 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/31

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.15...2022.0.16

## 2022.0.15 (20 November 2022)

- Bump Ruff version to 0.0.132 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/27
- add changelog.md by @akanz1 in https://github.com/astral-sh/ruff-vscode/pull/24

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.14...2022.0.15

## 2022.0.14 (15 November 2022)

- Update README.md by @akanz1 in [#21](https://github.com/astral-sh/ruff-vscode/pull/21)
- Bump Ruff version to 0.0.121 by @charliermarsh in [#22](https://github.com/astral-sh/ruff-vscode/pull/22)
- Bump version to 2022.0.14 by @charliermarsh in [#23](https://github.com/astral-sh/ruff-vscode/pull/23)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.13...2022.0.14

## 2022.0.13 (13 November 2022)

- Use scripts path when interpreter is set by @charliermarsh in [#18](https://github.com/astral-sh/ruff-vscode/pull/18)
- Bump Ruff version to 0.0.117 by @charliermarsh in [#19](https://github.com/astral-sh/ruff-vscode/pull/19)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.12...2022.0.13

## 2022.0.12 (11 November 2022)

- Add .idea and .ruff_cache to .vscodeignore by @charliermarsh in [#14](https://github.com/astral-sh/ruff-vscode/pull/14)
