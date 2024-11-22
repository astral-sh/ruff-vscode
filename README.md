# Ruff extension for Visual Studio Code

[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![image](https://img.shields.io/pypi/v/ruff/0.8.0.svg)](https://pypi.python.org/pypi/ruff)
[![image](https://img.shields.io/pypi/l/ruff/0.8.0.svg)](https://pypi.python.org/pypi/ruff)
[![image](https://img.shields.io/pypi/pyversions/ruff/0.8.0.svg)](https://pypi.python.org/pypi/ruff)
[![Actions status](https://github.com/astral-sh/ruff-vscode/workflows/CI/badge.svg)](https://github.com/astral-sh/ruff-vscode/actions)

> [!NOTE]
>
> **As of Ruff v0.4.5, Ruff ships with a built-in language server written in Rust: ⚡ `ruff server` ⚡**
>
> **The server was marked as stable in Ruff v0.5.3 and will automatically be used by the extension if
> available.**
>
> **See: [_Enabling the Rust-based language server_](#using-the-rust-based-language-server).**

A Visual Studio Code extension for [Ruff](https://github.com/astral-sh/ruff), an extremely fast
Python linter and code formatter, written in Rust. Available on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff).

Ruff can be used to replace Flake8 (plus dozens of plugins), Black, isort, pyupgrade, and more,
all while executing tens or hundreds of times faster than any individual tool.

The extension ships with `ruff==0.8.0`.

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

### Native Server

Jupyter Notebook support was stabilized in [Ruff `0.6.0`](https://astral.sh/blog/ruff-v0.6.0#jupyter-notebooks-are-now-linted-and-formatted-by-default) and
is now linted and formatted by default. Before this version, the native server required users to explicitly include Jupyter Notebooks
in the set of files to be linted and formatted. This can be done by updating the [`extend-include`](https://docs.astral.sh/ruff/settings/#extend-include)
setting in the Ruff configuration file.

```toml
[tool.ruff]
extend-include = ["*.ipynb"]
```

For more information, refer to the [Jupyter Notebook discovery](https://docs.astral.sh/ruff/configuration/#jupyter-notebook-discovery) section
of the Ruff documentation.

[notebook document synchronization]: https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#notebookDocument_synchronization

## Untrusted Workspace

_New in v2024.32.0_

The extension supports loading in an [untrusted workspace](https://code.visualstudio.com/docs/editor/workspace-trust).
When the workspace is untrusted, the extension will always use the Rust-based language server even if the [`nativeServer`](https://docs.astral.sh/ruff/editors/settings/#nativeserver)
setting is set to `off`. This is because the Python-based language server requires a Python interpreter to run, which
is not allowed in an untrusted workspace. This also means that the extension will always use the bundled executable of
the `ruff` binary regardless of any other settings.

The following settings are not supported in an untrusted workspace:

- [`ruff.configuration`](https://docs.astral.sh/ruff/editors/settings/#configuration)
- [`ruff.importStrategy`](https://docs.astral.sh/ruff/editors/settings/#importstrategy)
- [`ruff.interpreter`](https://docs.astral.sh/ruff/editors/settings/#interpreter)
- [`ruff.path`](https://docs.astral.sh/ruff/editors/settings/#path)

## Settings

Refer to the [Ruff Language Server documentation](https://docs.astral.sh/ruff/editors/settings/) for a full list of
settings available in the extension.

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

_Note: The above-mentioned Notebook configurations will run the action for each cell individually.
This is the way VS Code handles Notebook actions and is unrelated to `ruff-lsp`. If you'd prefer to
run them on the entire notebook at once, prefer to use the `Ruff` prefixed commands such as
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

### Using the Rust-based language server

The Ruff extension will automatically use the Rust-based language server (`ruff server`) if the
following conditions are met:

1. The `ruff` executable is at least version `0.5.3`
2. The `ruff.nativeServer` setting is set to `auto` (default)
3. None of the settings that are exclusive to the Python-based language server
   are enabled (i.e., those that are marked as "unused by the native language server" in the
   [_Settings_](https://docs.astral.sh/ruff/editors/settings/#vs-code-specific) documentation).

You can explicitly enable or disable the Rust-based language server by setting
the `nativeServer` setting to `on` or `off`. If set to `off`, the extension
will use the Python-based language server (`ruff-lsp`).

```json
{
  "ruff.nativeServer": "on"
}
```

The Rust-based language server is built into Ruff directly, and is both faster and more fully-featured
than the Python-based language server.

Use of the native server may require changes to your VS Code configuration, as some settings are
unsupported; see [_Configuring Ruff_](#rust-based-language-server) for more information.

### Configuring Ruff

The Ruff VS Code extension will respect any Ruff configuration as defined in your project's
`pyproject.toml`, `ruff.toml`, or `.ruff.toml` file (see: [_Configuring Ruff_](https://docs.astral.sh/ruff/configuration/) in the Ruff documentation).
In general, we recommend configuring Ruff via `pyproject.toml` or `ruff.toml` so that your
configuration is shared between the VS Code extension and the command-line tool, and between all
contributors to the project.

#### Rust-based language server

If you're using the Rust-based language server (`ruff server`), you can configure some common
settings in VS Code directly, like `ruff.lineLength` (to configure the line length for the linter
and formatter) or `ruff.lint.select` (to configure the enabled lint rules):

```json
{
  "ruff.lineLength": 88,
  "ruff.lint.select": ["C", "E", "F", "W"]
}
```

To use a custom configuration file, set the `ruff.configuration` setting to the path of your
`ruff.toml` or `pyproject.toml` file:

```json
{
  "ruff.configuration": "/path/to/ruff.toml"
}
```

Finally, to use a common Ruff configuration across all projects, consider creating a user-specific
`pyproject.toml` or `ruff.toml` file as described in the [FAQ](https://docs.astral.sh/ruff/faq/#does-ruff-support-numpy-or-google-style-docstrings).

#### Python-based language server (`ruff-lsp`)

If you're using the default Python-based language server, you can use the `ruff.lint.args` and
`ruff.format.args` settings in `settings.json` to pass command-line arguments to Ruff.

For example, to enable the `pyupgrade` rule set in VS Code, add the following to `settings.json`:

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

## Commands

| Command                                            | Description                                      |
| -------------------------------------------------- | ------------------------------------------------ |
| Ruff: Fix all auto-fixable problems                | Fix all auto-fixable problems.                   |
| Ruff: Format Imports                               | Organize imports.                                |
| Ruff: Format Document                              | Format the entire document.                      |
| Ruff: Restart Server                               | Force restart the linter server.                 |
| Ruff: Print debug information (native server only) | Print debug information about the native server. |
| Ruff: Show logs                                    | Open the Ruff output channel.                    |

## Requirements

This extension requires a version of the VSCode Python extension that supports Python 3.7+. Ruff
itself is compatible with Python 3.7 to 3.13.

## Troubleshooting

If you encounter any issues with the extension or the language server, please refer to the
logs in the output panel in VS Code. You can access the logs by running the `Ruff: Show logs`
command.

By default, the output panel will only contain logs from the extension. To enable logs from the
language server, set the `trace.server` setting to `messages` in your `settings.json`:

```json
{
  "ruff.trace.server": "messages"
}
```

The trace value can also be set to `verbose` for more detailed logs. If you're using the Rust-based
language server, you can use the `ruff.logLevel` setting to control the log level of the server and
`ruff.logFile` to write logs to a file instead of the output panel.

The extension also displays certain information in the status bar. This can be pinned to the status
bar as a permanent item.

<details><summary><b>How to pin the Ruff status item in VS Code toolbar?</b></summary>
<img
    width="677"
    alt="Instructions to pin 'Ruff' status item on VS Code editor toolbar"
    src="https://github.com/user-attachments/assets/fae75b6a-ae3f-4933-ad9c-61c6374f435b"
>
</details>

The status bar item displays the status of the language server, specifically whether it's using the
Rust-based language server (`Ruff (native)`) or the Python-based language server (`Ruff (ruff-lsp)`).
It can also be clicked to open the Ruff output channel.

## License

MIT

<div align="center">
  <a target="_blank" href="https://astral.sh" style="background:none">
    <img height="24px" src="https://raw.githubusercontent.com/astral-sh/ruff/main/assets/png/Astral.png">
  </a>
</div>
