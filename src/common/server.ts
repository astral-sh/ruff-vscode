import { Disposable, OutputChannel } from "vscode";
import { State } from "vscode-languageclient";
import {
  Executable,
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
} from "vscode-languageclient/node";
import { DEBUG_SERVER_SCRIPT_PATH, SERVER_SCRIPT_PATH } from "./constants";
import { traceError, traceInfo, traceLog, traceVerbose } from "./log/logging";
import { getDebuggerPath } from "./python";
import {
  getExtensionSettings,
  getGlobalSettings,
  getWorkspaceSettings,
  ISettings,
} from "./settings";
import { getProjectRoot, traceLevelToLSTrace } from "./utilities";
import { isVirtualWorkspace } from "./vscodeapi";

export type IInitOptions = { settings: ISettings[]; globalSettings: Omit<ISettings, "workspace"> };

async function getDebugServerOptions(
  interpreter: string[],
  cwd?: string,
  env?: {
    [x: string]: string | undefined;
  },
): Promise<Executable> {
  // Set debugger path needed for debugging Python code.
  if (env) {
    if (env.DEBUGPY_ENABLED !== "False") {
      env.DEBUGPY_PATH = await getDebuggerPath();
    }
  }

  const command = interpreter[0];
  const args = interpreter.slice(1).concat([DEBUG_SERVER_SCRIPT_PATH]);
  traceLog(`Server Command [DEBUG]: ${[command, ...args].join(" ")}`);

  return {
    command,
    args,
    options: { cwd, env },
  };
}

async function getRunServerOptions(
  interpreter: string[],
  cwd?: string,
  env?: {
    [x: string]: string | undefined;
  },
): Promise<Executable> {
  const command = interpreter[0];
  const args = interpreter.slice(1).concat([SERVER_SCRIPT_PATH]);
  traceLog(`Server Command [RUN]: ${[command, ...args].join(" ")}`);

  return Promise.resolve({
    command,
    args,
    options: { cwd, env },
  });
}

export async function createServer(
  interpreter: string[],
  serverId: string,
  serverName: string,
  outputChannel: OutputChannel,
  initializationOptions: IInitOptions,
  settings: Omit<ISettings, "workspace">,
): Promise<LanguageClient> {
  const cwd = getProjectRoot()?.uri.fsPath;
  const newEnv = { ...process.env };

  // Set notification type.
  newEnv.LS_SHOW_NOTIFICATION = settings.showNotifications;

  const serverOptions: ServerOptions = {
    run: await getRunServerOptions(interpreter, cwd, { ...newEnv }),
    debug: await getDebugServerOptions(interpreter, cwd, { ...newEnv }),
  };

  // Options to control the language client.
  const clientOptions: LanguageClientOptions = {
    // Register the server for python documents.
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
  outputChannel: OutputChannel,
  client?: LanguageClient,
): Promise<LanguageClient | undefined> {
  if (client) {
    traceInfo(`Server: Stop requested`);
    await client.stop();
    _disposables.forEach((d) => d.dispose());
    _disposables = [];
  }

  const workspaceFolder = getProjectRoot();
  const resourceSettings = await getWorkspaceSettings(serverId, workspaceFolder?.uri);
  if (resourceSettings.interpreter.length === 0) {
    traceError(
      "Python interpreter missing:\r\n" +
        "[Option 1] Select python interpreter using the ms-python.python.\r\n" +
        `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n`,
    );
    return undefined;
  }

  const newClient = await createServer(
    resourceSettings.interpreter,
    serverId,
    serverName,
    outputChannel,
    {
      settings: await getExtensionSettings(serverId),
      globalSettings: await getGlobalSettings(serverId),
    },
    resourceSettings,
  );

  newClient.trace = traceLevelToLSTrace(resourceSettings.logLevel);
  traceInfo(`Server: Start requested.`);
  _disposables.push(
    newClient.onDidChangeState((e) => {
      switch (e.newState) {
        case State.Stopped:
          traceVerbose(`Server State: Stopped`);
          break;
        case State.Starting:
          traceVerbose(`Server State: Starting`);
          break;
        case State.Running:
          traceVerbose(`Server State: Running`);
          break;
      }
    }),
    newClient.start(),
  );
  return newClient;
}
