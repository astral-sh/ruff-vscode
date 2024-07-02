import * as path from "path";

const folderName = path.basename(__dirname);

/**
 * Path to the root directory of this extension.
 */
export const EXTENSION_ROOT_DIR =
  folderName === "common" ? path.dirname(path.dirname(__dirname)) : path.dirname(__dirname);

/**
 * Name of the `ruff` binary based on the current platform.
 */
export const RUFF_BINARY_NAME = process.platform == "win32" ? "ruff.exe" : "ruff";

/**
 * Path to the directory containing the bundled Python scripts.
 */
export const BUNDLED_PYTHON_SCRIPTS_DIR = path.join(EXTENSION_ROOT_DIR, "bundled");

/**
 * Path to the `ruff` executable that is bundled with the extension.
 */
export const BUNDLED_RUFF_EXECUTABLE = path.join(
  BUNDLED_PYTHON_SCRIPTS_DIR,
  "libs",
  "bin",
  RUFF_BINARY_NAME,
);

/**
 * Path to the Python script that starts the `ruff-lsp` language server.
 */
export const RUFF_LSP_SERVER_SCRIPT_PATH = path.join(
  BUNDLED_PYTHON_SCRIPTS_DIR,
  "tool",
  `server.py`,
);

export const DEBUG_SERVER_SCRIPT_PATH = path.join(
  BUNDLED_PYTHON_SCRIPTS_DIR,
  "tool",
  `_debug_server.py`,
);

/**
 * Path to the Python script that starts the native language server with an
 * appropriate `ruff` executable.
 *
 * This should only be used as a fallback if the user has not specified either
 * the `path` setting or is not using the bundled import strategy.
 */
export const NATIVE_SERVER_SCRIPT_PATH = path.join(
  BUNDLED_PYTHON_SCRIPTS_DIR,
  "tool",
  "ruff_server.py",
);

/**
 * The subcommand for the `ruff` binary that starts the language server.
 */
export const RUFF_SERVER_SUBCOMMAND = "server";

/**
 * Required arguments for the `ruff server` command.
 */
export const RUFF_SERVER_REQUIRED_ARGS = ["--preview"];
