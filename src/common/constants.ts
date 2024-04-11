import * as path from "path";

const folderName = path.basename(__dirname);
export const EXTENSION_ROOT_DIR =
  folderName === "common" ? path.dirname(path.dirname(__dirname)) : path.dirname(__dirname);
export const BUNDLED_PYTHON_SCRIPTS_DIR = path.join(EXTENSION_ROOT_DIR, "bundled");
export const SERVER_SCRIPT_PATH = path.join(BUNDLED_PYTHON_SCRIPTS_DIR, "tool", `server.py`);
export const DEBUG_SERVER_SCRIPT_PATH = path.join(
  BUNDLED_PYTHON_SCRIPTS_DIR,
  "tool",
  `_debug_server.py`,
);
export const EXPERIMENTAL_SERVER_SCRIPT_PATH = path.join(
  BUNDLED_PYTHON_SCRIPTS_DIR,
  "tool",
  "ruff_server.py",
);
export const RUFF_SERVER_CMD = "server";
export const RUFF_SERVER_REQUIRED_ARGS = ["--preview"];
