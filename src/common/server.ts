import * as fsapi from "fs-extra";
import { Disposable, env, l10n, LanguageStatusSeverity, LogOutputChannel } from "vscode";
import { State } from "vscode-languageclient";
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
} from "vscode-languageclient/node";
import {
  BUNDLED_PYTHON_SCRIPTS_DIR,
  DEBUG_SERVER_SCRIPT_PATH,
  RUFF_SERVER_REQUIRED_ARGS,
  RUFF_SERVER_CMD,
  SERVER_SCRIPT_PATH,
  EXPERIMENTAL_SERVER_SCRIPT_PATH,
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
import { getLSClientTraceLevel, getProjectRoot } from "./utilities";
import { isVirtualWorkspace } from "./vscodeapi";

export type IInitOptions = {
  settings: ISettings[];
  globalSettings: ISettings;
};

async function createExperimentalServer(
  settings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: LogOutputChannel,
  initializationOptions: IInitOptions,
): Promise<LanguageClient> {
  let serverOptions: ServerOptions;
  // If the user provided a binary path, we'll try to call that path directly.
  if (settings.path[0]) {
    const command = settings.path[0];
    const cwd = settings.cwd;
    const args = [RUFF_SERVER_CMD, ...RUFF_SERVER_REQUIRED_ARGS];
    serverOptions = {
      command,
      args,
      options: { cwd, env: process.env },
    };

    traceInfo(`Server run command: ${[command, ...args].join(" ")}`);
  } else {
    // Otherwise, we'll call a Python script that tries to locate
    // a binary, falling back to the bundled version if no local executable is found.
    const command = settings.interpreter[0];
    const cwd = settings.cwd;
    const args = [EXPERIMENTAL_SERVER_SCRIPT_PATH, RUFF_SERVER_CMD, ...RUFF_SERVER_REQUIRED_ARGS];

    serverOptions = {
      command,
      args,
      options: { cwd, env: process.env },
    };

    traceInfo(`Server run command: ${[command, ...args].join(" ")}`);
  }

  const clientOptions = {
    // Register the server for python documents
    documentSelector: isVirtualWorkspace()
      ? [{ language: "python" }]
      : [
          { scheme: "file", language: "python" },
          { scheme: "untitled", language: "python" },
          // TODO(jane): Support Jupyter Notebook
          // { scheme: "vscode-notebook", language: "python" },
          // { scheme: "vscode-notebook-cell", language: "python" },
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
  initializationOptions: IInitOptions,
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
      ? settings.interpreter.slice(1).concat([SERVER_SCRIPT_PATH])
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
  if (workspaceSettings.experimentalServer || globalSettings.experimentalServer) {
    newLSClient = await createExperimentalServer(
      workspaceSettings,
      serverId,
      serverName,
      outputChannel,
      {
        settings: extensionSettings,
        globalSettings: globalSettings,
      },
    );
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

  const level = getLSClientTraceLevel(outputChannel.logLevel, env.logLevel);
  await newLSClient.setTrace(level);
  return newLSClient;
}
