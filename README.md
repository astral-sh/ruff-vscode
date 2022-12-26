# Ruff extension for Visual Studio Code

A Visual Studio Code extension with support for the [Ruff](https://github.com/charliermarsh/ruff)
linter. Available on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff).

The extension ships with `ruff==0.0.192`.

(Interested in using [Ruff](https://github.com/charliermarsh/ruff) with another editor? Check out
[`ruff-lsp`](https://github.com/charliermarsh/ruff-lsp).)

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

| Settings         | Default | Description                                                                              |
|------------------|---------|------------------------------------------------------------------------------------------|
| args             | `[]`    | Custom arguments passed to `ruff`. E.g `"args": ["--config=/path/to/pyproject.toml"]`.   |
| logLevel         | `error` | Sets the tracing level for the extension.                                                |
| path             | `[]`    | Setting to provide custom `ruff` executables, to try in order. E.g. `["/path/to/ruff"]`. |
| interpreter      | `[]`    | Path to a Python interpreter to use to run the linter server.                            |
| showNotification | `off`   | Setting to control when a notification is shown.                                         |
| organizeImports  | `true`  | Whether to register Ruff as capable of handling `source.organizeImports` actions.        |
| fixAll           | `true`  | Whether to register Ruff as capable of handling `source.fixAll` actions.                 |

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

If you're using the VS Code Python extension, you can configure VS Code to autofix violations
on-save using Ruff, then re-format with Black, via the following `settings.json`:

```json
{
    "[python]": {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.fixAll": true
        }
    },
    "python.formatting.provider": "black"
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

If you'd like to run Ruff in lieu of another formatter, you can mark the Ruff extension as your
default Python formatter in `settings.json`:

```json
{
    "[python]": {
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.fixAll": true
        }
    }
}
```

## Commands

| Command                             | Description                      |
| ----------------------------------- | -------------------------------- |
| Ruff: Fix all auto-fixable problems | Fix all auto-fixable problems.   |
| Ruff: Restart Server                | Force restart the linter server. |

## Development

This extension is based on the [Template for VS Code Python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template).

### Getting Started

- Install [`just`](https://github.com/casey/just), or see the `justfile` for corresponding commands.
- Create and activate a virtual environment (e.g., `python -m venv .venv && source .venv/bin/activate`).
- Install development dependencies (`just install`).
- To automatically format the codebase, run: `just fmt`.
- To run lint and type checks, run: `just check`.
- To run tests, run: `just test`.

### Development

- `nox --session fmt`
- `nox --session check`
- `nox --session test`
