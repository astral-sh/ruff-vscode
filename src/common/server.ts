import * as fsapi from "fs-extra";
import { Disposable, l10n, LanguageStatusSeverity, LogOutputChannel } from "vscode";
import { State } from "vscode-languageclient";
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
} from "vscode-languageclient/node";
import {
  BUNDLED_RUFF_EXECUTABLE,
  DEBUG_SERVER_SCRIPT_PATH,
  RUFF_SERVER_REQUIRED_ARGS,
  RUFF_SERVER_SUBCOMMAND,
  RUFF_LSP_SERVER_SCRIPT_PATH,
  FIND_RUFF_BINARY_SCRIPT_PATH,
  RUFF_BINARY_NAME,
} from "./constants";
import { traceError, traceInfo, traceVerbose } from "./log/logging";
import { getDebuggerPath } from "./python";
import {
  getExtensionSettings,
  getGlobalSettings,
  getWorkspaceSettings,
  ISettings,
} from "./settings";
import { updateStatus } from "./status";
import { getProjectRoot } from "./utilities";
import { isVirtualWorkspace } from "./vscodeapi";
import { exec } from "child_process";
import which = require("which");

export type IInitializationOptions = {
  settings: ISettings[];
  globalSettings: ISettings;
};

// Function to execute a command and capture the stdout.
function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, _) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function findRuffBinaryPath(settings: ISettings): Promise<string> {
  // 'path' setting takes priority over everything.
  if (settings.path.length > 0) {
    for (const path of settings.path) {
      if (await fsapi.pathExists(path)) {
        traceInfo(`Using 'path' setting: ${path}`);
        return path;
      }
    }
    traceInfo(`Could not find executable in 'path': ${settings.path.join(", ")}`);
  }

  if (settings.importStrategy === "useBundled") {
    traceInfo(`Using bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
    return BUNDLED_RUFF_EXECUTABLE;
  }

  // Otherwise, we'll call a Python script that tries to locate a binary,
  // falling back to the bundled version if no local executable is found.
  let ruffBinaryPath: string | null = null;
  try {
    const stdout = await executeCommand(
      `${settings.interpreter[0]} ${FIND_RUFF_BINARY_SCRIPT_PATH}`,
    );
    ruffBinaryPath = stdout.trim();
  } catch (err) {
    traceError(`Error while trying to find the Ruff binary: ${err}`);
  }

  if (ruffBinaryPath && ruffBinaryPath.length > 0) {
    // First choice: the executable found by the script.
    traceInfo(`Using the Ruff binary: ${ruffBinaryPath}`);
    return ruffBinaryPath;
  }

  // Second choice: the executable in the global environment.
  const environmentPath = await which(RUFF_BINARY_NAME, { nothrow: true });
  if (environmentPath) {
    traceInfo(`Using environment executable: ${environmentPath}`);
    return environmentPath;
  }

  // Third choice: bundled executable.
  traceInfo(`Falling back to bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
  return BUNDLED_RUFF_EXECUTABLE;
}

async function createNativeServer(
  settings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: LogOutputChannel,
  initializationOptions: IInitializationOptions,
): Promise<LanguageClient> {
  const ruffBinaryPath = await findRuffBinaryPath(settings);
  const ruffServerArgs = [RUFF_SERVER_SUBCOMMAND, ...RUFF_SERVER_REQUIRED_ARGS];
  traceInfo(`Server run command: ${[ruffBinaryPath, ...ruffServerArgs].join(" ")}`);

  let serverOptions = {
    command: ruffBinaryPath,
    args: ruffServerArgs,
    options: { cwd: settings.cwd, env: process.env },
  };

  const clientOptions = {
    // Register the server for python documents
    documentSelector: isVirtualWorkspace()
      ? [{ language: "python" }]
      : [
          { scheme: "file", language: "python" },
          { scheme: "untitled", language: "python" },
          { scheme: "vscode-notebook", language: "python" },
          { scheme: "vscode-notebook-cell", language: "python" },
        ],
    outputChannel: outputChannel,
    traceOutputChannel: outputChannel,
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions,
  };

  return new LanguageClient(serverId, serverName, serverOptions, clientOptions);
}

async function createServer(
  settings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: LogOutputChannel,
  initializationOptions: IInitializationOptions,
): Promise<LanguageClient> {
  const command = settings.interpreter[0];
  const cwd = settings.cwd;

  // Set debugger path needed for debugging python code.
  const newEnv = { ...process.env };
  const debuggerPath = await getDebuggerPath();
  const isDebugScript = await fsapi.pathExists(DEBUG_SERVER_SCRIPT_PATH);
  if (newEnv.USE_DEBUGPY && debuggerPath) {
    newEnv.DEBUGPY_PATH = debuggerPath;
  } else {
    newEnv.USE_DEBUGPY = "False";
  }

  // Set notification type
  newEnv.LS_SHOW_NOTIFICATION = settings.showNotifications;

  const args =
    newEnv.USE_DEBUGPY === "False" || !isDebugScript
      ? settings.interpreter.slice(1).concat([RUFF_LSP_SERVER_SCRIPT_PATH])
      : settings.interpreter.slice(1).concat([DEBUG_SERVER_SCRIPT_PATH]);
  traceInfo(`Server run command: ${[command, ...args].join(" ")}`);

  const serverOptions: ServerOptions = {
    command,
    args,
    options: { cwd, env: newEnv },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for python documents
    documentSelector: isVirtualWorkspace()
      ? [{ language: "python" }]
      : [
          { scheme: "file", language: "python" },
          { scheme: "untitled", language: "python" },
          { scheme: "vscode-notebook", language: "python" },
          { scheme: "vscode-notebook-cell", language: "python" },
        ],
    outputChannel: outputChannel,
    traceOutputChannel: outputChannel,
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions,
  };

  return new LanguageClient(serverId, serverName, serverOptions, clientOptions);
}

let _disposables: Disposable[] = [];
export async function restartServer(
  serverId: string,
  serverName: string,
  outputChannel: LogOutputChannel,
  lsClient?: LanguageClient,
): Promise<LanguageClient | undefined> {
  if (lsClient) {
    traceInfo(`Server: Stop requested`);
    await lsClient.stop();
    _disposables.forEach((d) => d.dispose());
    _disposables = [];
  }

  updateStatus(undefined, LanguageStatusSeverity.Information, true);

  const projectRoot = await getProjectRoot();
  const workspaceSettings = await getWorkspaceSettings(serverId, projectRoot);

  const extensionSettings = await getExtensionSettings(serverId);
  const globalSettings = await getGlobalSettings(serverId);

  let newLSClient;
  if (workspaceSettings.nativeServer || globalSettings.nativeServer) {
    newLSClient = await createNativeServer(workspaceSettings, serverId, serverName, outputChannel, {
      settings: extensionSettings,
      globalSettings: globalSettings,
    });
  } else {
    newLSClient = await createServer(workspaceSettings, serverId, serverName, outputChannel, {
      settings: extensionSettings,
      globalSettings: globalSettings,
    });
  }
  traceInfo(`Server: Start requested.`);
  _disposables.push(
    newLSClient.onDidChangeState((e) => {
      switch (e.newState) {
        case State.Stopped:
          traceVerbose(`Server State: Stopped`);
          break;
        case State.Starting:
          traceVerbose(`Server State: Starting`);
          break;
        case State.Running:
          traceVerbose(`Server State: Running`);
          updateStatus(undefined, LanguageStatusSeverity.Information, false);
          break;
      }
    }),
  );
  try {
    await newLSClient.start();
  } catch (ex) {
    updateStatus(l10n.t("Server failed to start."), LanguageStatusSeverity.Error);
    traceError(`Server: Start failed: ${ex}`);
    return undefined;
  }

  return newLSClient;
}
