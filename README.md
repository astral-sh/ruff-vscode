# Ruff extension for Visual Studio Code

[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)
[![image](https://img.shields.io/pypi/v/ruff/0.0.289.svg)](https://pypi.python.org/pypi/ruff)
[![image](https://img.shields.io/pypi/l/ruff/0.0.289.svg)](https://pypi.python.org/pypi/ruff)
[![image](https://img.shields.io/pypi/pyversions/ruff/0.0.289.svg)](https://pypi.python.org/pypi/ruff)
[![Actions status](https://github.com/astral-sh/ruff-vscode/workflows/CI/badge.svg)](https://github.com/astral-sh/ruff-vscode/actions)

A Visual Studio Code extension with support for the [Ruff](https://github.com/astral-sh/ruff)
linter. Available on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff).

The extension ships with `ruff==0.0.289`.

(Interested in using [Ruff](https://github.com/astral-sh/ruff) with another editor? Check out
[`ruff-lsp`](https://github.com/astral-sh/ruff-lsp).)

## Highlights

### "Quick Fix" actions for auto-fixable violations (like unused imports)

![Demo of Ruff's "Quick Fix" action](https://user-images.githubusercontent.com/1309177/205176932-44cfc03a-120f-4bad-b710-612bdd7765d6.gif)

### "Fix all": automatically fix all auto-fixable violations

![Demo of Ruff's "Fix all" action](https://user-images.githubusercontent.com/1309177/205175763-cf34871d-5c05-4abf-9916-440afc82dbf8.gif)

### "Organize Imports": `isort`-compatible import sorting

![Demo of Ruff's "Organize Imports" action](https://user-images.githubusercontent.com/1309177/205175987-82e23e21-14bb-467d-9ef0-027f24b75865.gif)

## Usage

Once installed in Visual Studio Code, `ruff` will automatically execute when you open or edit a
Python file.

If you want to disable Ruff, you can [disable this extension](https://code.visualstudio.com/docs/editor/extension-marketplace#_disable-an-extension)
per workspace in Visual Studio Code.

## Settings

| Settings                             | Default           | Description                                                                                                                                                                                                                                                 |
| ------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| args                                 | `[]`              | Additional command-line arguments to pass to `ruff`, e.g., `"args": ["--config=/path/to/pyproject.toml"]`. Supports a subset of Ruff's command-line arguments, ignoring those that are required to operate the LSP, like `--force-exclude` and `--verbose`. |
| path                                 | `[]`              | Path to a custom `ruff` executable, e.g., `["/path/to/ruff"]`.                                                                                                                                                                                              |
| interpreter                          | `[]`              | Path to a Python interpreter to use to run the linter server.                                                                                                                                                                                               |
| importStrategy                       | `fromEnvironment` | Strategy for loading the `ruff` executable. `fromEnvironment` picks up Ruff from the environment, falling back to the bundled version if needed. `useBundled` uses the version bundled with the extension.                                                  |
| run                                  | `onType`          | Run Ruff on every keystroke (`onType`) or on save (`onSave`).                                                                                                                                                                                               |
| enable                               | `true`            | Whether to enable the Ruff extension. Modifying this setting requires restarting VS Code to take effect.                                                                                                                                                    |
| organizeImports                      | `true`            | Whether to register Ruff as capable of handling `source.organizeImports` actions.                                                                                                                                                                           |
| fixAll                               | `true`            | Whether to register Ruff as capable of handling `source.fixAll` actions.                                                                                                                                                                                    |
| codeAction.fixViolation.enable       | `true`            | Whether to display Quick Fix actions to autofix violations.                                                                                                                                                                                                 |
| codeAction.disableRuleComment.enable | `true`            | Whether to display Quick Fix actions to disable rules via `noqa` suppression comments.                                                                                                                                                                      |
| showNotification                     | `off`             | Setting to control when a notification is shown: `off`, `onError`, `onWarning`, `always`.                                                                                                                                                                   |

### Example configurations

You can configure Ruff to autofix violations on-save by enabling the `source.fixAll` action in
`settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.fixAll": true
    }
  }
}
```

You can configure Ruff to organize imports on-save by enabling the `source.organizeImports` action in
`settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

If you're using the [VS Code Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python),
you can configure VS Code to autofix violations on-save using Ruff,
then re-format with [the Black extension](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter),
via the following `settings.json`:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": true
    },
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

If you'd like to use Ruff as an autofix linter, but continue to sort imports with the `isort` VS
Code extension, you can disable Ruff's import-sorting capabilities via the following
`settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.fixAll": true,
      "source.organizeImports": true
    }
  },
  "ruff.organizeImports": false
}
```

If you'd like to run Ruff on-save, but avoid enabling other extensions to run on-save, you can
use Ruff's scoped `source.fixAll` and `source.organizeImports` actions via the following `settings.json`:

```json
{
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.fixAll.ruff": true,
      "source.organizeImports.ruff": true
    }
  }
}
```

If you'd like to run Ruff in lieu of another formatter altogether, be sure to unset the
`editor.defaultFormatter` in `settings.json`:

```json
{
  "[python]": {
    "editor.defaultFormatter": null,
    "editor.codeActionsOnSave": {
      "source.fixAll": true
    }
  }
}
```

If you'd like to configure Ruff with more customized settings, 
you can use `ruff.args` in `settings.json` while picking the right [rules](https://docs.astral.sh/ruff/rules/) 
and [args](https://docs.astral.sh/ruff/configuration/#command-line-interface):

```json
{
    "[python]": {
      "editor.defaultFormatter": "ms-python.black-formatter",
      "editor.formatOnSave": true,
      "editor.codeActionsOnSave": {
        "source.fixAll": "always",
      }
    },
    "ruff.args": ["--select=E,W,F,I001,PL", "--ignore=E203", "--per-file-ignores=**/__init__.py:F401"]
}
```

## Commands

| Command                             | Description                      |
| ----------------------------------- | -------------------------------- |
| Ruff: Fix all auto-fixable problems | Fix all auto-fixable problems.   |
| Ruff: Restart Server                | Force restart the linter server. |

## Requirements

This extension requires a version of the VSCode Python extension that supports Python 3.7+. Ruff
itself is compatible with Python 3.7 to 3.11.

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

## License

MIT

<div align="center">
  <a target="_blank" href="https://astral.sh" style="background:none">
    <img height="24px" src="https://raw.githubusercontent.com/astral-sh/ruff/main/assets/png/Astral.png">
  </a>
</div>
