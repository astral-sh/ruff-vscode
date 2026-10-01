import * as fsapi from "fs-extra";
import * as vscode from "vscode";
import { platform } from "os";
import { join } from "path";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import { Disposable, l10n, LanguageStatusSeverity, LogOutputChannel } from "vscode";
import { State, ShowMessageNotification, MessageType, vsdiag } from "vscode-languageclient";
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
} from "vscode-languageclient/node";
import {
  BUNDLED_RUFF_EXECUTABLE,
  RUFF_SERVER_PREVIEW_ARGS,
  RUFF_SERVER_SUBCOMMAND,
  FIND_RUFF_BINARY_SCRIPT_PATH,
  RUFF_BINARY_NAME,
} from "./constants";
import { logger } from "./logger";
import {
  checkInterpreterVersion,
  type EnvironmentProvider,
  type PythonCommand,
  type PythonEnvironmentDetails,
} from "./python";
import {
  checkInlineConfigSupport,
  getExtensionSettings,
  getGlobalSettings,
  ISettings,
} from "./settings";
import {
  supportsNativeServer,
  versionToString,
  VersionInfo,
  MINIMUM_NATIVE_SERVER_VERSION,
  supportsStableNativeServer,
  supportsUntrustedWorkspace,
} from "./version";
import { updateDocumentSelector, updateStatus } from "./status";
import { getDocumentSelector } from "./utilities";
import { execFile } from "child_process";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import which = require("which");

export type IInitializationOptions = {
  settings: ISettings[];
  globalSettings: ISettings;
};

/**
 * Check if shell mode is required for `execFile`.
 *
 * The conditions are:
 * - Windows OS
 * - File extension is `.cmd` or `.bat`
 */
export function execFileShellModeRequired(file: string) {
  file = file.toLowerCase();
  return platform() === "win32" && (file.endsWith(".cmd") || file.endsWith(".bat"));
}

/**
 * Function to execute a command and return the stdout.
 */
function executeFile(file: string, args: string[] = []): Promise<string> {
  const shell = execFileShellModeRequired(file);
  return new Promise((resolve, reject) => {
    execFile(shell ? `"${file}"` : file, args, { shell }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Get the version of the Ruff executable at the given path.
 */
async function getRuffVersion(executable: string): Promise<VersionInfo> {
  const stdout = await executeFile(executable, ["--version"]);
  const version = stdout.trim().split(" ")[1];
  const [major, minor, patch] = version.split(".").map((x) => parseInt(x, 10));
  return { major, minor, patch };
}

async function resolvePythonExecutable(interpreterPath: string): Promise<string> {
  const stats = await fsapi.stat(interpreterPath).catch(() => undefined);
  if (stats?.isFile()) {
    return interpreterPath;
  }
  if (!stats?.isDirectory()) {
    throw new Error(`'${interpreterPath}' is not a file or directory.`);
  }

  // Match the Python extensions' native resolver, including MSYS2's bin layout on Windows.
  // https://github.com/microsoft/python-environment-tools/blob/4b7a780391ec7d447689a740be5073fbd8968a3d/crates/pet-python-utils/src/executable.rs#L49-L75
  const candidates =
    platform() === "win32"
      ? [
          "Scripts/python.exe",
          "Scripts/python3.exe",
          "bin/python.exe",
          "bin/python3.exe",
          "python.exe",
          "python3.exe",
        ]
      : ["bin/python", "bin/python3", "python", "python3"];

  for (const candidate of candidates) {
    const executable = join(interpreterPath, candidate);
    const stats = await fsapi.stat(executable).catch(() => undefined);
    if (stats?.isFile()) {
      return executable;
    }
  }

  throw new Error(`No Python executable found in '${interpreterPath}'.`);
}

/**
 * Finds the Ruff binary path and returns it.
 *
 * The strategy is as follows:
 * 1. If the 'path' setting is set, check each path in order. The first valid
 *    path is returned.
 * 2. If the 'importStrategy' setting is 'useBundled', return the bundled
 *    executable path.
 * 3. Execute a Python script that tries to locate the binary. This uses either
 *    the user-provided interpreter or the interpreter provided by the Python
 *    extension. If no Python environment extension is available, the configured
 *    interpreter is used directly.
 * 4. If the Python script doesn't return a path, check the global environment
 *    which checks the PATH environment variable.
 * 5. If all else fails, return the bundled executable path.
 */
export type BinaryResolution = {
  path: string;
  dependsOnActiveInterpreter: boolean;
};

export async function resolvePythonEnvironment(
  configuredInterpreter: string[],
  workspace: string,
  environmentProvider: EnvironmentProvider | null,
  activeEnvironment: PythonEnvironmentDetails | null,
): Promise<{
  environment: PythonEnvironmentDetails | null;
  command: PythonCommand | null;
  dependsOnActiveInterpreter: boolean;
}> {
  if (environmentProvider == null) {
    return { environment: null, command: null, dependsOnActiveInterpreter: false };
  }

  const [configuredPath, ...configuredArgs] = configuredInterpreter;
  if (configuredPath != null) {
    logger.info(`Resolving Python interpreter from 'ruff.interpreter': '${configuredPath}'`);
    const environment = await environmentProvider.resolveInterpreter(configuredPath);
    if (environment != null) {
      const command =
        environment.command == null
          ? null
          : { ...environment.command, args: environment.command.args.concat(configuredArgs) };
      return {
        environment,
        command,
        dependsOnActiveInterpreter: false,
      };
    }

    logger.warn(`'${configuredPath}' (from 'ruff.interpreter') is not a valid interpreter.`);
    logger.warn("Falling back to the active Python environment.");
  }

  logger.info(`Resolving active Python environment for workspace: '${workspace}'`);
  if (activeEnvironment == null) {
    logger.warn("No active Python environment found.");
  }
  return {
    environment: activeEnvironment,
    command: activeEnvironment?.command ?? null,
    dependsOnActiveInterpreter: true,
  };
}

/**
 * Finds the Ruff binary path and returns it.
 *
 * The strategy is as follows:
 * 1. If the 'path' setting is set, check each path in order. The first valid
 *    path is returned.
 * 2. If the 'importStrategy' setting is 'useBundled', return the bundled
 *    executable path.
 * 3. Execute a Python script that tries to locate the binary. This uses either
 *    the user-provided interpreter or the interpreter provided by the Python
 *    extension.
 * 4. If the Python script doesn't return a path, check the global environment
 *    which checks the PATH environment variable.
 * 5. If all else fails, return the bundled executable path.
 */
export async function findRuffBinaryPath(
  settings: ISettings,
  environmentProvider: EnvironmentProvider | null,
  activeEnvironment: PythonEnvironmentDetails | null,
): Promise<BinaryResolution> {
  if (!vscode.workspace.isTrusted) {
    logger.info(`Workspace is not trusted, using bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
    return { path: BUNDLED_RUFF_EXECUTABLE, dependsOnActiveInterpreter: false };
  }

  // 'path' setting takes priority over everything.
  if (settings.path.length > 0) {
    for (const path of settings.path) {
      if (await fsapi.pathExists(path)) {
        logger.info(`Using 'path' setting: ${path}`);
        return { path, dependsOnActiveInterpreter: false };
      }
    }
    logger.info(`Could not find executable in 'path': ${settings.path.join(", ")}`);
  }

  if (settings.importStrategy === "useBundled") {
    logger.info(`Using bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
    return { path: BUNDLED_RUFF_EXECUTABLE, dependsOnActiveInterpreter: false };
  }

  // Otherwise, we'll call a Python script that tries to locate a binary.
  const [configuredPath, ...configuredArgs] = settings.interpreter;
  if (environmentProvider == null && configuredPath != null) {
    logger.info(`Looking for Ruff using 'ruff.interpreter': '${configuredPath}'`);
    try {
      const executable = await resolvePythonExecutable(configuredPath);
      logger.info(`Resolved Python executable for Ruff lookup: '${executable}'`);
      const stdout = await executeFile(executable, [
        ...configuredArgs,
        FIND_RUFF_BINARY_SCRIPT_PATH,
      ]);
      const ruffBinaryPath = stdout.trim();
      if (ruffBinaryPath.length > 0) {
        logger.info(`Using the Ruff binary: ${ruffBinaryPath}`);
        return { path: ruffBinaryPath, dependsOnActiveInterpreter: false };
      }
    } catch (err) {
      logger.warn(`Could not find Ruff using 'ruff.interpreter': ${err}`);
    }
  }

  let ruffBinaryPath: string | undefined;
  const { environment, command, dependsOnActiveInterpreter } = await resolvePythonEnvironment(
    settings.interpreter,
    settings.workspace,
    environmentProvider,
    activeEnvironment,
  );

  if (environment != null) {
    if (command == null) {
      logger.warn("Resolved Python environment has no executable command.");
    } else if (checkInterpreterVersion(environment)) {
      logger.info(`Resolved Python executable for Ruff lookup: '${command.executable}'`);
      try {
        const stdout = await executeFile(command.executable, [
          ...command.args,
          FIND_RUFF_BINARY_SCRIPT_PATH,
        ]);
        ruffBinaryPath = stdout.trim();
      } catch (err) {
        vscode.window
          .showErrorMessage(
            "Unexpected error while trying to find the Ruff binary. See the logs for more details.",
            "Show Logs",
          )
          .then((selection) => {
            if (selection) {
              logger.channel.show();
            }
          });
        logger.error(`Error while trying to find the Ruff binary: ${err}`);
      }
    } else {
      logger.warn(
        "Skipping lookup of the Ruff executable in the Python environment because its Python version is unsupported or unknown.",
      );
    }
  }

  if (ruffBinaryPath && ruffBinaryPath.length > 0) {
    // First choice: the executable found by the script.
    logger.info(`Using the Ruff binary: ${ruffBinaryPath}`);
    return { path: ruffBinaryPath, dependsOnActiveInterpreter };
  }

  // Second choice: the executable in the global environment.
  const environmentPath = await which(RUFF_BINARY_NAME, { nothrow: true });
  if (environmentPath) {
    logger.info(`Using environment executable: ${environmentPath}`);
    return { path: environmentPath, dependsOnActiveInterpreter };
  }

  // Third choice: bundled executable.
  logger.info(`Falling back to bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
  return { path: BUNDLED_RUFF_EXECUTABLE, dependsOnActiveInterpreter };
}

function createServer(
  settings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: LogOutputChannel,
  traceOutputChannel: LogOutputChannel,
  initializationOptions: IInitializationOptions,
  ruffExecutable: RuffExecutable,
): LanguageClient {
  const { path: ruffBinaryPath, version: ruffVersion } = ruffExecutable;

  logger.info(`Found Ruff ${versionToString(ruffVersion)} at ${ruffBinaryPath}`);

  const isTy =
    ruffBinaryPath.endsWith("ty") ||
    ruffBinaryPath.endsWith("ty.exe") ||
    ruffBinaryPath.endsWith("red_knot") ||
    ruffBinaryPath.endsWith("red_knot.exe");

  if (!isTy) {
    if (!supportsNativeServer(ruffVersion)) {
      const message =
        `Ruff server requires Ruff ${versionToString(
          MINIMUM_NATIVE_SERVER_VERSION,
        )}, but found ${versionToString(
          ruffVersion,
        )} at ${ruffBinaryPath} instead. Please upgrade Ruff or use the bundled executable by ` +
        `clearing '${serverId}.path' and setting '${serverId}.importStrategy' to 'useBundled'.`;
      logger.error(message);
      vscode.window.showErrorMessage(message);
      throw new Error(message);
    }

    checkInlineConfigSupport(ruffVersion, serverId);
  }

  let ruffServerArgs: string[];
  if (isTy) {
    ruffServerArgs = [RUFF_SERVER_SUBCOMMAND];
  } else if (supportsStableNativeServer(ruffVersion)) {
    ruffServerArgs = [RUFF_SERVER_SUBCOMMAND];
  } else {
    ruffServerArgs = [RUFF_SERVER_SUBCOMMAND, ...RUFF_SERVER_PREVIEW_ARGS];
  }
  if (!vscode.workspace.isTrusted && supportsUntrustedWorkspace(ruffVersion)) {
    ruffServerArgs.push("--untrusted-workspace");
  }
  logger.info(`Server run command: ${[ruffBinaryPath, ...ruffServerArgs].join(" ")}`);

  const serverOptions = {
    command: ruffBinaryPath,
    args: ruffServerArgs,
    options: { cwd: settings.cwd, env: process.env },
  };

  const clientOptions: LanguageClientOptions = {
    // Register the server for supported documents.
    documentSelector: getDocumentSelector(ruffVersion),
    outputChannel,
    traceOutputChannel,
    // Protocol stdout is owned by the client; server stderr is forwarded unchanged.
    stdioOptions: { stdout: forwardServerOutput, stderr: forwardServerOutput },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions,
    middleware: {
      provideDiagnostics(document, previousResultId, token, next) {
        const uri = document instanceof vscode.Uri ? document : document.uri;
        if (uri.scheme === "vscode-notebook-cell") {
          // Return an empty report to prevent the VS Code language client v10 from pulling
          // diagnostics for notebook cell text documents.
          //
          // We do this for two reasons:
          //
          // Older Ruff servers return diagnostics for the wrong notebook cell. Disabling
          // notebook pulls maintains backwards compatibility with these servers.
          //
          // Prefer pushed diagnostics for notebook cells to work around these upstream issues.
          // Notebook pulls need interFileDependencies to update other cells, which makes
          // updates slow, and reordering cells does not update diagnostics:
          // * https://github.com/microsoft/vscode-languageserver-node/issues/1837
          // * https://github.com/microsoft/vscode-languageserver-node/issues/1836
          //
          // Push and pull use separate diagnostic collections, so an empty pull report does not
          // clear diagnostics pushed by the server.
          //
          // Once the upstream issues are fixed, enable notebook pulls based on a negotiated
          // client/server capability.
          return { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] };
        }

        return next(document, previousResultId, token);
      },
    },
  };

  return new LanguageClient(serverId, serverName, serverOptions, clientOptions);
}

function forwardServerOutput(input: Readable, outputChannel: LogOutputChannel): void {
  createInterface({ input, crlfDelay: Infinity, terminal: false, historySize: 0 }).on(
    "line",
    (line) => outputChannel.appendLine(line),
  );
}

type RuffExecutable = {
  path: string;
  version: VersionInfo;
};

type ServerResolution = {
  executable: RuffExecutable;
  dependsOnActiveInterpreter: boolean;
};

export type ServerState = {
  client: LanguageClient;
  resolution: ServerResolution;
};

export async function resolveServer(
  settings: ISettings,
  environmentProvider: EnvironmentProvider | null,
  activeEnvironment: PythonEnvironmentDetails | null,
): Promise<ServerResolution> {
  const resolution = await findRuffBinaryPath(settings, environmentProvider, activeEnvironment);
  return {
    executable: {
      path: resolution.path,
      version: await getRuffVersion(resolution.path),
    },
    dependsOnActiveInterpreter: resolution.dependsOnActiveInterpreter,
  };
}

let _disposables: Disposable[] = [];

export async function startServer(
  projectRoot: vscode.WorkspaceFolder,
  workspaceSettings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: LogOutputChannel,
  traceOutputChannel: LogOutputChannel,
  environmentProvider: EnvironmentProvider | null,
): Promise<ServerState | null> {
  updateStatus(undefined, LanguageStatusSeverity.Information, true);

  const activeEnvironment =
    (await environmentProvider?.getActiveEnvironment(projectRoot.uri)) ?? null;
  const resolution = await resolveServer(workspaceSettings, environmentProvider, activeEnvironment);

  const extensionSettings = await getExtensionSettings(serverId);
  for (const settings of extensionSettings) {
    logger.info(`Workspace settings for ${settings.cwd}: ${JSON.stringify(settings, null, 4)}`);
  }
  const globalSettings = await getGlobalSettings(serverId);
  logger.info(`Global settings: ${JSON.stringify(globalSettings, null, 4)}`);

  const newLSClient = createServer(
    workspaceSettings,
    serverId,
    serverName,
    outputChannel,
    traceOutputChannel,
    {
      settings: extensionSettings,
      globalSettings: globalSettings,
    },
    resolution.executable,
  );
  updateDocumentSelector(getDocumentSelector(resolution.executable.version));
  logger.info(`Server: Start requested.`);

  _disposables.push(
    newLSClient.onDidChangeState((e) => {
      switch (e.newState) {
        case State.Stopped:
          logger.debug(`Server State: Stopped`);
          break;
        case State.Starting:
          logger.debug(`Server State: Starting`);
          break;
        case State.Running:
          logger.debug(`Server State: Running`);
          updateStatus(undefined, LanguageStatusSeverity.Information, false);
          break;
      }
    }),
    newLSClient.onNotification(ShowMessageNotification.type, (params) => {
      const showMessageMethod =
        params.type === MessageType.Error
          ? vscode.window.showErrorMessage
          : params.type === MessageType.Warning
            ? vscode.window.showWarningMessage
            : vscode.window.showInformationMessage;
      showMessageMethod(params.message, "Show Logs").then((selection) => {
        if (selection) {
          outputChannel.show();
        }
      });
    }),
  );

  try {
    await newLSClient.start();
  } catch (ex) {
    updateStatus(l10n.t("Server failed to start."), LanguageStatusSeverity.Error);
    logger.error(`Server: Start failed: ${ex}`);
    dispose();
    return null;
  }

  return { client: newLSClient, resolution };
}

export async function stopServer(lsClient: LanguageClient): Promise<void> {
  logger.info(`Server: Stop requested`);
  await lsClient.stop();
  dispose();
}

function dispose(): void {
  _disposables.forEach((d) => d.dispose());
  _disposables = [];
}
