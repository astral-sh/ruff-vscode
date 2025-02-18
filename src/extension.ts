import * as vscode from "vscode";
import { ExecuteCommandRequest, LanguageClient } from "vscode-languageclient/node";
import { LazyOutputChannel, logger } from "./common/logger";
import {
  checkVersion,
  initializePython,
  onDidChangePythonInterpreter,
  resolveInterpreter,
} from "./common/python";
import { startServer, stopServer } from "./common/server";
import {
  checkIfConfigurationChanged,
  getInterpreterFromSetting,
  getWorkspaceSettings,
  ISettings,
} from "./common/settings";
import { loadServerDefaults } from "./common/setup";
import { registerLanguageStatusItem, updateStatus } from "./common/status";
import {
  getConfiguration,
  onDidChangeConfiguration,
  onDidGrantWorkspaceTrust,
  registerCommand,
} from "./common/vscodeapi";
import { getProjectRoot } from "./common/utilities";
import { executeAutofix, executeFormat, executeOrganizeImports } from "./common/commands";

let lsClient: LanguageClient | undefined;
let restartInProgress = false;
let restartQueued = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // This is required to get server name and module. This should be
  // the first thing that we do in this extension.
  const serverInfo = loadServerDefaults();
  const serverName = serverInfo.name;
  const serverId = serverInfo.module;

  // Log Server information
  logger.info(`Name: ${serverInfo.name}`);
  logger.info(`Module: ${serverInfo.module}`);
  logger.debug(`Full Server Info: ${JSON.stringify(serverInfo)}`);

  // Create output channels for the server and trace logs
  const outputChannel = vscode.window.createOutputChannel(`${serverName} Language Server`);
  const traceOutputChannel = new LazyOutputChannel(`${serverName} Language Server Trace`);

  // Make sure that these channels are disposed when the extension is deactivated.
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(traceOutputChannel);
  context.subscriptions.push(logger.channel);

  context.subscriptions.push(
    onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("ruff.enable")) {
        vscode.window.showWarningMessage(
          "To enable or disable Ruff after changing the `enable` setting, you must restart VS Code.",
        );
      }
    }),
  );

  const { enable } = getConfiguration(serverId) as unknown as ISettings;
  if (!enable) {
    logger.info(
      "Extension is disabled. To enable, change `ruff.enable` to `true` and restart VS Code.",
    );
    return;
  }

  if (restartInProgress) {
    if (!restartQueued) {
      // Schedule a new restart after the current restart.
      logger.info(
        `Triggered ${serverName} restart while restart is in progress; queuing a restart.`,
      );
      restartQueued = true;
    }
    return;
  }

  const runServer = async () => {
    if (restartInProgress) {
      if (!restartQueued) {
        // Schedule a new restart after the current restart.
        logger.info(
          `Triggered ${serverName} restart while restart is in progress; queuing a restart.`,
        );
        restartQueued = true;
      }
      return;
    }

    restartInProgress = true;

    try {
      if (lsClient) {
        await stopServer(lsClient);
      }

      const projectRoot = await getProjectRoot();
      const workspaceSettings = await getWorkspaceSettings(serverId, projectRoot);

      if (vscode.workspace.isTrusted) {
        if (workspaceSettings.interpreter.length === 0) {
          updateStatus(
            vscode.l10n.t("Please select a Python interpreter."),
            vscode.LanguageStatusSeverity.Error,
          );
          logger.error(
            "Python interpreter missing:\r\n" +
              "[Option 1] Select Python interpreter using the ms-python.python.\r\n" +
              `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n` +
              "Please use Python 3.7 or greater.",
          );
          return;
        }

        logger.info(`Using interpreter: ${workspaceSettings.interpreter.join(" ")}`);
        const resolvedEnvironment = await resolveInterpreter(workspaceSettings.interpreter);
        if (resolvedEnvironment === undefined) {
          updateStatus(
            vscode.l10n.t("Python interpreter not found."),
            vscode.LanguageStatusSeverity.Error,
          );
          logger.error(
            "Unable to find any Python environment for the interpreter path:",
            workspaceSettings.interpreter.join(" "),
          );
          return;
        } else if (!checkVersion(resolvedEnvironment)) {
          return;
        }
      }

      lsClient = await startServer(
        projectRoot,
        workspaceSettings,
        serverId,
        serverName,
        outputChannel,
        traceOutputChannel,
      );
    } finally {
      // Ensure that we reset the flag in case of an error, early return, or success.
      restartInProgress = false;
      if (restartQueued) {
        restartQueued = false;
        await runServer();
      }
    }
  };

  context.subscriptions.push(
    onDidChangePythonInterpreter(async () => {
      await runServer();
    }),
    onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
      if (checkIfConfigurationChanged(e, serverId)) {
        await runServer();
      }
    }),
    onDidGrantWorkspaceTrust(async () => {
      await runServer();
    }),
    registerCommand(`${serverId}.showLogs`, () => {
      logger.channel.show();
    }),
    registerCommand(`${serverId}.showServerLogs`, () => {
      outputChannel.show();
    }),
    registerCommand(`${serverId}.restart`, async () => {
      await runServer();
    }),
    registerCommand(`${serverId}.executeAutofix`, async () => {
      if (lsClient) {
        await executeAutofix(lsClient, serverId);
      }
    }),
    registerCommand(`${serverId}.executeFormat`, async () => {
      if (lsClient) {
        await executeFormat(lsClient, serverId);
      }
    }),
    registerCommand(`${serverId}.executeOrganizeImports`, async () => {
      if (lsClient) {
        await executeOrganizeImports(lsClient, serverId);
      }
    }),
    registerCommand(`${serverId}.debugInformation`, async () => {
      let configuration = getConfiguration(serverId) as unknown as ISettings;
      if (!lsClient || !configuration.nativeServer) {
        return;
      }

      const params = {
        command: `${serverId}.printDebugInformation`,
      };

      await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
        vscode.window.showErrorMessage("Failed to print debug information.");
      });
    }),
    registerLanguageStatusItem(serverId, serverName, `${serverId}.showLogs`),
  );

  setImmediate(async () => {
    if (vscode.workspace.isTrusted) {
      const interpreter = getInterpreterFromSetting(serverId);
      if (interpreter === undefined || interpreter.length === 0) {
        logger.info(`Python extension loading`);
        await initializePython(context.subscriptions);
        logger.info(`Python extension loaded`);
        return; // The `onDidChangePythonInterpreter` event will trigger the server start.
      }
    }
    await runServer();
  });
}

export async function deactivate(): Promise<void> {
  if (lsClient) {
    await stopServer(lsClient);
  }
}
