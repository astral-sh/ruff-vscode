# Ruff extension for Visual Studio Code

[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![image](https://img.shields.io/pypi/v/ruff/0.3.3.svg)](https://pypi.python.org/pypi/ruff)
[![image](https://img.shields.io/pypi/l/ruff/0.3.3.svg)](https://pypi.python.org/pypi/ruff)
[![image](https://img.shields.io/pypi/pyversions/ruff/0.3.3.svg)](https://pypi.python.org/pypi/ruff)
[![Actions status](https://github.com/astral-sh/ruff-vscode/workflows/CI/badge.svg)](https://github.com/astral-sh/ruff-vscode/actions)

A Visual Studio Code extension for [Ruff](https://github.com/astral-sh/ruff), an extremely fast
Python linter and code formatter, written in Rust. Available on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff).

Ruff can be used to replace Flake8 (plus dozens of plugins), Black, isort, pyupgrade, and more,
all while executing tens or hundreds of times faster than any individual tool.

The extension ships with `ruff==0.3.3`.

(Interested in using [Ruff](https://github.com/astral-sh/ruff) with another editor? Check out
[`ruff-lsp`](https://github.com/astral-sh/ruff-lsp).)

## Highlights

### "Quick Fix" actions for auto-fixable violations (like unused imports)

![Using the "Quick Fix" action to fix a violation](https://user-images.githubusercontent.com/1309177/205176932-44cfc03a-120f-4bad-b710-612bdd7765d6.gif)

### "Fix all": automatically fix all auto-fixable violations

![Using the "Fix all" action to fix all violations](https://user-images.githubusercontent.com/1309177/205175763-cf34871d-5c05-4abf-9916-440afc82dbf8.gif)

### "Format Document": Black-compatible code formatting

![Using the "Format Document" action to format Python source code](https://github.com/astral-sh/ruff-lsp/assets/1309177/51c27215-87fb-490c-b1d6-ee81ab4171a1)

### "Organize Imports": `isort`-compatible import sorting

![Using the "Organize Imports" action to sort and deduplicate Python imports](https://user-images.githubusercontent.com/1309177/205175987-82e23e21-14bb-467d-9ef0-027f24b75865.gif)

## Usage

Once installed in Visual Studio Code, `ruff` will automatically execute when you open or edit a
Python or Jupyter Notebook file.

If you want to disable Ruff, you can [disable this extension](https://code.visualstudio.com/docs/editor/extension-marketplace#_disable-an-extension)
per workspace in Visual Studio Code.

## Fix safety

Ruff's automatic fixes are labeled as "safe" and "unsafe". By default, the "Fix all" action will not apply unsafe
fixes. However, unsafe fixes can be applied manually with the "Quick fix" action. Application of unsafe fixes when
using "Fix all" can be enabled by setting `unsafe-fixes = true` in your Ruff configuration file or adding
`--unsafe-fixes` flag to the "Lint args" setting.

See the [Ruff fix docs](https://docs.astral.sh/ruff/configuration/#fix-safety) for more details on how fix
safety works.

## Jupyter Notebook Support

The extension has support for Jupyter Notebooks via the [Notebook Document Synchronization] capabilities of the Language
Server Protocol which were added in 3.17. This has been implemented in `ruff-lsp` as of version `v0.0.43` which provides
full support for all of the existing capabilities available to Python files in Jupyter Notebooks, including diagnostics,
code actions, and formatting.

This requires Ruff version `v0.1.3` or later.

[Notebook Document Synchronization]: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#notebookDocument_synchronization

## Settings

| Settings                             | Default           | Description                                                                                                                                                                                                                                                       |
| ------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| codeAction.disableRuleComment.enable | `true`            | Whether to display Quick Fix actions to disable rules via `noqa` suppression comments.                                                                                                                                                                            |
| codeAction.fixViolation.enable       | `true`            | Whether to display Quick Fix actions to autofix violations.                                                                                                                                                                                                       |
| enable                               | `true`            | Whether to enable the Ruff extension. Modifying this setting requires restarting VS Code to take effect.                                                                                                                                                          |
| fixAll                               | `"explicit"`      | Whether to register Ruff as capable of handling `source.fixAll` actions.                                                                                                                                                                                          |
| ignoreStandardLibrary                | `true`            | Whether to ignore files that are inferred to be part of the Python standard library.                                                                                                                                                                              |
| importStrategy                       | `fromEnvironment` | Strategy for loading the `ruff` executable. `fromEnvironment` picks up Ruff from the environment, falling back to the bundled version if needed. `useBundled` uses the version bundled with the extension.                                                        |
| interpreter                          | `[]`              | Path to a Python interpreter to use to run the linter server.                                                                                                                                                                                                     |
| lint.args                            | `[]`              | Additional command-line arguments to pass to `ruff check`, e.g., `"args": ["--config=/path/to/pyproject.toml"]`. Supports a subset of Ruff's command-line arguments, ignoring those that are required to operate the LSP, like `--force-exclude` and `--verbose`. |
| lint.enable                          | `true`            | Whether to enable linting. Set to `false` to use Ruff exclusively as a formatter.                                                                                                                                                                                 |
| lint.run                             | `onType`          | Run Ruff on every keystroke (`onType`) or on save (`onSave`).                                                                                                                                                                                                     |
| organizeImports                      | `"explicit"`      | Whether to register Ruff as capable of handling `source.organizeImports` actions.                                                                                                                                                                                 |
| path                                 | `[]`              | Path to a custom `ruff` executable, e.g., `["/path/to/ruff"]`.                                                                                                                                                                                                    |
| showNotification                     | `off`             | Setting to control when a notification is shown: `off`, `onError`, `onWarning`, `always`.                                                                                                                                                                         |

### Configuring VS Code

You can configure Ruff to format Python code on-save by enabling the `editor.formatOnSave` action in
`settings.json`, and setting Ruff as your default formatter:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

And, for Jupyter Notebooks:

```json
{
  "notebook.formatOnSave.enabled": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

You can configure Ruff to fix lint violations on-save by enabling the `source.fixAll` action in
`settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit"
    }
  }
}
```

And, for Jupyter Notebooks:

```json
{
  "notebook.codeActionsOnSave": {
    "notebook.source.fixAll": "explicit"
  }
}
```

Similarly, you can configure Ruff to organize imports on-save by enabling the
`source.organizeImports` action in `settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  }
}
```

And, for Jupyter Notebooks:

```json
{
  "notebook.codeActionsOnSave": {
    "notebook.source.organizeImports": "explicit"
  }
}
```

Taken together, you can configure Ruff to format, fix, and organize imports on-save via the
following `settings.json`:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    },
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

And, for Jupyter Notebooks:

```json
{
  "notebook.formatOnSave.enabled": true,
  "notebook.codeActionsOnSave": {
    "notebook.source.fixAll": "explicit",
    "notebook.source.organizeImports": "explicit"
  },
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

_Note: if you're using Ruff to organize imports in VS Code and also expect to run Ruff from the
command line, you'll want to enable Ruff's isort rules by adding `"I"` to your
[`extend-select`](https://docs.astral.sh/ruff/settings/#extend-select)._

_Note: All of the above mentioned Notebook configurations will run the action for each cell individually.
This is the way VS Code handles Notebook actions and is unrelated to `ruff-lsp`. If you'd prefer to run
them on the entire notebook at once, prefer to use the `Ruff` prefixed commands such as
`Ruff: Organize Imports` and `Ruff: Fix all auto-fixable problems`._

If you're using the [VS Code Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python),
you can configure VS Code to fix violations on-save using Ruff, then re-format with [the Black extension](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter),
via the following `settings.json`:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit"
    },
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

If you'd like to use Ruff as a linter, but continue to sort imports with the [isort extension](https://marketplace.visualstudio.com/items?itemName=ms-python.isort),
you can disable Ruff's import-sorting capabilities via the following `settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "ruff.organizeImports": false
}
```

If you'd like to run Ruff on-save, but avoid allowing other extensions to run on-save, you can
use Ruff's scoped `source.fixAll` and `source.organizeImports` actions via the following `settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.fixAll.ruff": "explicit",
      "source.organizeImports.ruff": "explicit"
    }
  }
}
```

If you'd like to run Ruff, but disable code formatting (by Ruff, or by another formatter), be sure
to unset the `editor.defaultFormatter` in `settings.json`:

```json
{
  "[python]": {
    "editor.defaultFormatter": null,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit"
    }
  }
}
```

### Configuring Ruff

The Ruff VS Code extension will respect any Ruff configuration as defined in your project's
`pyproject.toml`, `ruff.toml`, or `.ruff.toml` file (see: [Configuring Ruff](https://docs.astral.sh/ruff/configuration/) in the Ruff documentation).
In general, we recommend configuring Ruff via `pyproject.toml` or `ruff.toml` so that your
configuration is shared between the VS Code extension and the command-line tool, and between all
contributors to the project.

However, to provide custom arguments to the Ruff CLI, you can use the `ruff.lint.args` and
`ruff.format.args` settings in `settings.json`. For example, to enable the `pyupgrade` rule set in
VS Code, add the following to `settings.json`:

```json
{
  "ruff.lint.args": ["--extend-select=UP"]
}
```

To override the VS Code extension's Ruff configuration entirely, and override any local
`pyproject.toml` file or similar, you can pass a custom `--config` argument to the Ruff CLI, again
using the `ruff.lint.args` and `ruff.format.args` options in `settings.json`:

```json
{
  "ruff.lint.args": ["--config=/path/to/ruff.toml"],
  "ruff.format.args": ["--config=/path/to/ruff.toml"]
}
```

Finally, to use a common Ruff configuration across all projects, consider creating a user-specific
`pyproject.toml` or `ruff.toml` file as described in the [FAQ](https://docs.astral.sh/ruff/faq/#does-ruff-support-numpy-or-google-style-docstrings).

### Using the Experimental Server

To use the new Rust-based language server (`ruff server`), you'll need to enable the "Experimental Server" setting and reload the extension.

At the moment, the experimental server has the following known limitations:

- Most extension settings are not yet supported, and many will not be needed after the transition to the new server is finished. For example, `editor.codeActionsOnSave` does not work at the moment due to missing support for source-level code actions (see below). Additionally, `lint.args` / `format.args` will be replaced in the future with specific configuration fields for the linter and formatter.
- Commands like `Fix all` and `Organize Imports` have not yet been implemented. (Quick Fixes should still work, though)
- Hierarchial configuration for individual files is not yet supported. At the moment, the language server uses the `ruff.toml` / `pyproject.toml` at the workspace root to configure the formatter and linter.
- Jupyter Notebook files are not supported yet.
- Using local Ruff binaries is not yet supported. At the moment, the extension will always use the bundled Ruff binary. (`v0.3.3`)

## Commands

| Command                             | Description                      |
| ----------------------------------- | -------------------------------- |
| Ruff: Fix all auto-fixable problems | Fix all auto-fixable problems.   |
| Ruff: Format Imports                | Organize imports.                |
| Ruff: Format Document               | Format the entire document.      |
| Ruff: Restart Server                | Force restart the linter server. |

## Requirements

This extension requires a version of the VSCode Python extension that supports Python 3.7+. Ruff
itself is compatible with Python 3.7 to 3.12.

## Development

This extension is based on the [Template for VS Code Python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template).

### Getting Started

- Install [`just`](https://github.com/casey/just), or see the `justfile` for corresponding commands.
- Create and activate a virtual environment (e.g., `python -m venv .venv && source .venv/bin/activate`).
- Install development dependencies (`just install`).
- To automatically format the codebase, run: `just fmt`.
- To run lint and type checks, run: `just check`.
- To run tests, run: `just test`.

To run the extension, navigate to `src/extension.ts` and run (`F5`). You should see the LSP output
and Python log messages in the debug console under "Python Server".

### Modifying the LSP

- Clone [ruff-lsp](https://github.com/astral-sh/ruff-lsp) to, e.g., `../ruff-lsp`.
- In `../ruff-lsp`, run: `pip install -t ../ruff-vscode/bundled/libs/ -e .`.

### Using a custom version of ruff

- Clone [ruff](https://github.com/astral-sh/ruff) to, e.g., `/home/ferris/ruff`.
- Run `cargo build` in the Ruff repository.
- Set "Ruff: Path" to `/home/ferris/ruff/target/debug/ruff` in the VS Code settings.

## Release

- Bump the version in `package.json` and `pyproject.toml` (use even numbers for stable releases).
- Bump the `ruff` and `ruff-lsp` versions in `pyproject.toml`.
- Update the `ruff` version in the README.md
  - in the Bade URLs
  - in "The extension ships with `ruff==...`"
- Make sure you use Python 3.7 installed and as your default Python.
- Run `python -m venv .venv` to create a venv and activate it.
- Run `python -m pip install pip-tools` to install `pip-tools`.
- Run `rm requirements.txt requirements-dev.txt` and then `just lock` to update `ruff` and `ruff-lsp`.
- Create a new PR and merge it.
- Update the Changelog
- [Create a new Release](https://github.com/astral-sh/ruff-vscode/releases/new), enter `x.x.x` (where `x.x.x` is the new version) into the _Choose a tag_ selector. Click _Generate release notes_, curate the release notes and publish the release.
- The Release workflow publishes the extension to the VS Code marketplace.

## License

MIT

<div align="center">
  <a target="_blank" href="https://astral.sh" style="background:none">
    <img height="24px" src="https://raw.githubusercontent.com/astral-sh/ruff/main/assets/png/Astral.png">
  </a>
</div>
