# Ruff extension for Visual Studio Code

A Visual Studio Code extension with support for the [Ruff](https://github.com/charliermarsh/ruff)
linter. Available on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff).

The extension ships with `ruff==0.0.121`.

## Usage

Once installed in Visual Studio Code, `ruff` will automatically execute when you open or edit a
Python file.

If you want to disable Ruff, you can [disable this extension](https://code.visualstudio.com/docs/editor/extension-marketplace#_disable-an-extension)
per workspace in Visual Studio Code.

## Settings

| Settings             | Default      | Description                                                                                                                                                  |
|----------------------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ruff.args             | `[]`         | Custom arguments passed to `ruff`. E.g `"ruff.args": ["--config=/path/to/pyproject.toml"]`.                                                                 |
| ruff.logLevel         | `error`      | Sets the tracing level for the extension.                                                                                                                    |
| ruff.path             | `[]`         | Setting to provide custom `ruff` executable. E.g. `["~/global_env/ruff"]`.                                                                                   |
| ruff.interpreter      | `[]`         | Path to a python interpreter to use to run the linter server.                                                                                                |
| ruff.importStrategy   | `useBundled` | Setting to choose where to load `ruff` from. `useBundled` picks ruff bundled with the extension. `fromEnvironment` uses `ruff` available in the environment. |
| ruff.showNotification | `off`        | Setting to control when a notification is shown.                                                                                                             |

## Commands

| Command              | Description                      |
|----------------------| -------------------------------- |
| Ruff: Restart Server | Force restart the linter server. |

## Development

This extension is based on the [Template for VS Code Python tools extensions](https://github.com/microsoft/vscode-python-tools-extension-template).

### Getting Started

1. Create and activate a virtual environment.
2. Install `nox` in the activated environment: `python -m pip install nox`.
3. Run `nox --session setup`.

### Linting

To run linters: `nox --session lint`.

### Testing

To run tests: `nox --session tests`.

### Packaging and Publishing

To build the extension, run: `nox --session build_package`. Then upload the generated `.vsix` file
to the [extension management page](https://marketplace.visualstudio.com/manage).
