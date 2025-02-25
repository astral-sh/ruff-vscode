import * as fsapi from "fs-extra";
import * as vscode from "vscode";
import { platform } from "os";
import { Disposable, l10n, LanguageStatusSeverity, OutputChannel } from "vscode";
import { State, ShowMessageNotification, MessageType } from "vscode-languageclient";
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
} from "vscode-languageclient/node";
import {
  BUNDLED_RUFF_EXECUTABLE,
  DEBUG_SERVER_SCRIPT_PATH,
  RUFF_SERVER_PREVIEW_ARGS,
  RUFF_SERVER_SUBCOMMAND,
  RUFF_LSP_SERVER_SCRIPT_PATH,
  FIND_RUFF_BINARY_SCRIPT_PATH,
  RUFF_BINARY_NAME,
} from "./constants";
import { logger } from "./logger";
import { getDebuggerPath } from "./python";
import {
  checkInlineConfigSupport,
  getExtensionSettings,
  getGlobalSettings,
  getUserSetLegacyServerSettings,
  ISettings,
  LegacyServerSetting,
} from "./settings";
import {
  supportsNativeServer,
  versionToString,
  VersionInfo,
  MINIMUM_NATIVE_SERVER_VERSION,
  supportsStableNativeServer,
  NATIVE_SERVER_STABLE_VERSION,
} from "./version";
import { updateServerKind, updateStatus } from "./status";
import { getDocumentSelector } from "./utilities";
import { execFile } from "child_process";
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
async function findRuffBinaryPath(settings: ISettings): Promise<string> {
  if (!vscode.workspace.isTrusted) {
    logger.info(`Workspace is not trusted, using bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
    return BUNDLED_RUFF_EXECUTABLE;
  }

  // 'path' setting takes priority over everything.
  if (settings.path.length > 0) {
    for (const path of settings.path) {
      if (await fsapi.pathExists(path)) {
        logger.info(`Using 'path' setting: ${path}`);
        return path;
      }
    }
    logger.info(`Could not find executable in 'path': ${settings.path.join(", ")}`);
  }

  if (settings.importStrategy === "useBundled") {
    logger.info(`Using bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
    return BUNDLED_RUFF_EXECUTABLE;
  }

  // Otherwise, we'll call a Python script that tries to locate a binary.
  let ruffBinaryPath: string | undefined;
  try {
    const stdout = await executeFile(settings.interpreter[0], [FIND_RUFF_BINARY_SCRIPT_PATH]);
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

  if (ruffBinaryPath && ruffBinaryPath.length > 0) {
    // First choice: the executable found by the script.
    logger.info(`Using the Ruff binary: ${ruffBinaryPath}`);
    return ruffBinaryPath;
  }

  // Second choice: the executable in the global environment.
  const environmentPath = await which(RUFF_BINARY_NAME, { nothrow: true });
  if (environmentPath) {
    logger.info(`Using environment executable: ${environmentPath}`);
    return environmentPath;
  }

  // Third choice: bundled executable.
  logger.info(`Falling back to bundled executable: ${BUNDLED_RUFF_EXECUTABLE}`);
  return BUNDLED_RUFF_EXECUTABLE;
}

async function createNativeServer(
  settings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: OutputChannel,
  traceOutputChannel: OutputChannel,
  initializationOptions: IInitializationOptions,
  ruffExecutable?: RuffExecutable,
): Promise<LanguageClient> {
  if (!ruffExecutable) {
    const ruffBinaryPath = await findRuffBinaryPath(settings);
    const ruffVersion = await getRuffVersion(ruffBinaryPath);
    ruffExecutable = { path: ruffBinaryPath, version: ruffVersion };
  }
  const { path: ruffBinaryPath, version: ruffVersion } = ruffExecutable;

  logger.info(`Found Ruff ${versionToString(ruffVersion)} at ${ruffBinaryPath}`);

  if (!ruffBinaryPath.endsWith("red_knot")) {
    if (!supportsNativeServer(ruffVersion)) {
      const message =
        `Native server requires Ruff ${versionToString(
          MINIMUM_NATIVE_SERVER_VERSION,
        )}, but found ${versionToString(
          ruffVersion,
        )} at ${ruffBinaryPath} instead. Please upgrade Ruff or use the legacy server (ruff-lsp) by ` +
        "[pinning the extension](https://stackoverflow.com/questions/42626065/vs-code-how-to-rollback-extension-install-specific-extension-version) " +
        `version to 2025.4.0 and setting '${serverId}.nativeServer' to 'off'.`;
      logger.error(message);
      vscode.window.showErrorMessage(message);
      return Promise.reject();
    }

    checkInlineConfigSupport(ruffVersion, serverId);
  }

  let ruffServerArgs: string[];
  if (ruffBinaryPath.endsWith("red_knot")) {
    ruffServerArgs = [RUFF_SERVER_SUBCOMMAND];
  } else if (supportsStableNativeServer(ruffVersion)) {
    ruffServerArgs = [RUFF_SERVER_SUBCOMMAND];
  } else {
    ruffServerArgs = [RUFF_SERVER_SUBCOMMAND, ...RUFF_SERVER_PREVIEW_ARGS];
  }
  logger.info(`Server run command: ${[ruffBinaryPath, ...ruffServerArgs].join(" ")}`);

  let serverOptions = {
    command: ruffBinaryPath,
    args: ruffServerArgs,
    options: { cwd: settings.cwd, env: process.env },
  };

  const clientOptions = {
    // Register the server for python documents
    documentSelector: getDocumentSelector(),
    outputChannel,
    traceOutputChannel,
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions,
  };

  return new LanguageClient(serverId, serverName, serverOptions, clientOptions);
}

async function createLegacyServer(
  settings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: OutputChannel,
  traceOutputChannel: OutputChannel,
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
  // Signal `ruff-lsp` to not show deprecation warning as it's handled by the extension.
  newEnv.LS_SHOW_DEPRECATION_WARNING = "False";

  const args =
    newEnv.USE_DEBUGPY === "False" || !isDebugScript
      ? settings.interpreter.slice(1).concat([RUFF_LSP_SERVER_SCRIPT_PATH])
      : settings.interpreter.slice(1).concat([DEBUG_SERVER_SCRIPT_PATH]);
  logger.info(`Server run command: ${[command, ...args].join(" ")}`);

  const serverOptions: ServerOptions = {
    command,
    args,
    options: { cwd, env: newEnv },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for python documents
    documentSelector: getDocumentSelector(),
    outputChannel: outputChannel,
    traceOutputChannel: traceOutputChannel,
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    initializationOptions,
  };

  return new LanguageClient(serverId, serverName, serverOptions, clientOptions);
}

function showWarningMessage(message: string) {
  vscode.window.showWarningMessage(message, "Show Logs").then((selection) => {
    if (selection) {
      logger.channel.show();
    }
  });
  logger.warn(message);
}

type RuffExecutable = {
  path: string;
  version: VersionInfo;
};

const RUFF_LSP_URL = "https://github.com/astral-sh/ruff-lsp";
const LSP_MIGRATION_URL = "https://docs.astral.sh/ruff/editors/migration/";
const LSP_DEPRECATION_DISCUSSION_MESSAGE =
  "Feel free to comment on the [GitHub discussion](https://github.com/astral-sh/ruff/discussions/15991) to ask questions or share feedback.";

function formatLegacyServerSettings(settings: LegacyServerSetting[]): string {
  return settings.map((s) => `'${s.key}' in ${s.location}`).join(", ");
}

async function resolveNativeServerSetting(
  settings: ISettings,
  workspace: vscode.WorkspaceFolder,
  serverId: string,
): Promise<{ useNativeServer: boolean; executable: RuffExecutable | undefined }> {
  let useNativeServer: boolean;
  let executable: RuffExecutable | undefined;
  let legacyServerSettings: LegacyServerSetting[];

  switch (settings.nativeServer) {
    case "on":
    case true:
      legacyServerSettings = getUserSetLegacyServerSettings(serverId, workspace);
      if (legacyServerSettings.length > 0) {
        // User has explicitly set the native server to 'on' but still has legacy server settings.
        showWarningMessage(
          `The following settings have been deprecated in the native server: ${formatLegacyServerSettings(
            legacyServerSettings,
          )}. Please [migrate](${LSP_MIGRATION_URL}) to the new settings or remove them. ` +
            LSP_DEPRECATION_DISCUSSION_MESSAGE,
        );
      }
      return { useNativeServer: true, executable };
    case "off":
    case false:
      if (!vscode.workspace.isTrusted) {
        const message =
          `Cannot use the legacy server ([ruff-lsp](${RUFF_LSP_URL})) in an untrusted workspace; ` +
          "switching to the native server using the bundled executable.";
        vscode.window.showWarningMessage(message);
        logger.warn(message);
        return { useNativeServer: true, executable };
      }

      // User has explicitly set the native server to 'off'. Recommend them to upgrade to the native server ...
      let message =
        `The legacy server ([ruff-lsp](${RUFF_LSP_URL})) has been deprecated. ` +
        `Please consider using the native server instead by removing '${serverId}.nativeServer' or setting it to 'on'. `;
      legacyServerSettings = getUserSetLegacyServerSettings(serverId, workspace);
      if (legacyServerSettings.length > 0) {
        // ... and update the message if they have legacy server settings.
        message += `The following settings are not supported with the native server and have been deprecated: ${formatLegacyServerSettings(
          legacyServerSettings,
        )}. Please [migrate](${LSP_MIGRATION_URL}) to the new settings or remove them. `;
      }
      message += LSP_DEPRECATION_DISCUSSION_MESSAGE;
      showWarningMessage(message);

      return { useNativeServer: false, executable };
    case "auto":
      if (!vscode.workspace.isTrusted) {
        logger.info(
          `Resolved '${serverId}.nativeServer: auto' to use the native server in an untrusted workspace`,
        );
        return { useNativeServer: true, executable };
      }

      const ruffBinaryPath = await findRuffBinaryPath(settings);
      const ruffVersion = await getRuffVersion(ruffBinaryPath);

      // Start with the assumption that the native server will be used.
      useNativeServer = true;

      if (!supportsStableNativeServer(ruffVersion)) {
        logger.info(
          `Stable version of the native server requires Ruff ${versionToString(
            NATIVE_SERVER_STABLE_VERSION,
          )}, but found ${versionToString(
            ruffVersion,
          )} at ${ruffBinaryPath} instead; using the legacy server (ruff-lsp)`,
        );
        // Ruff version does not include the stable native server.
        useNativeServer = false;
      }

      legacyServerSettings = getUserSetLegacyServerSettings(serverId, workspace);
      if (useNativeServer && legacyServerSettings.length > 0) {
        // User has legacy server settings set.
        useNativeServer = false;
      }

      if (!useNativeServer) {
        let message = `The legacy server ([ruff-lsp](${RUFF_LSP_URL})) has been deprecated. `;
        if (legacyServerSettings.length > 0) {
          message += `The following settings were only supported by the legacy server and has been deprecated: ${formatLegacyServerSettings(
            legacyServerSettings,
          )}. Please [migrate](${LSP_MIGRATION_URL}) to the new settings or remove them. `;
        }
        message += LSP_DEPRECATION_DISCUSSION_MESSAGE;
        showWarningMessage(message);
      }

      logger.info(
        `Resolved '${serverId}.nativeServer: auto' to use the ${
          useNativeServer ? "native" : "legacy (ruff-lsp)"
        } server`,
      );
      return { useNativeServer, executable: { path: ruffBinaryPath, version: ruffVersion } };
  }
}

async function createServer(
  settings: ISettings,
  projectRoot: vscode.WorkspaceFolder,
  serverId: string,
  serverName: string,
  outputChannel: OutputChannel,
  traceOutputChannel: OutputChannel,
  initializationOptions: IInitializationOptions,
): Promise<LanguageClient> {
  const { useNativeServer, executable } = await resolveNativeServerSetting(
    settings,
    projectRoot,
    serverId,
  );

  updateServerKind(useNativeServer);
  if (useNativeServer) {
    return createNativeServer(
      settings,
      serverId,
      serverName,
      outputChannel,
      traceOutputChannel,
      initializationOptions,
      executable,
    );
  } else {
    return createLegacyServer(
      settings,
      serverId,
      serverName,
      outputChannel,
      traceOutputChannel,
      initializationOptions,
    );
  }
}

let _disposables: Disposable[] = [];

export async function startServer(
  projectRoot: vscode.WorkspaceFolder,
  workspaceSettings: ISettings,
  serverId: string,
  serverName: string,
  outputChannel: OutputChannel,
  traceOutputChannel: OutputChannel,
): Promise<LanguageClient | undefined> {
  updateStatus(undefined, LanguageStatusSeverity.Information, true);

  const extensionSettings = await getExtensionSettings(serverId);
  const globalSettings = await getGlobalSettings(serverId);

  let newLSClient = await createServer(
    workspaceSettings,
    projectRoot,
    serverId,
    serverName,
    outputChannel,
    traceOutputChannel,
    {
      settings: extensionSettings,
      globalSettings: globalSettings,
    },
  );
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
    return undefined;
  }

  return newLSClient;
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
