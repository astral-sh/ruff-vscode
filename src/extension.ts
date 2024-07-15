import * as vscode from "vscode";
import { ExecuteCommandRequest, LanguageClient } from "vscode-languageclient/node";
import { registerLogger, traceError, traceLog, traceVerbose } from "./common/log/logging";
import {
  checkVersion,
  getInterpreterDetails,
  initializePython,
  onDidChangePythonInterpreter,
  resolveInterpreter,
} from "./common/python";
import { restartServer } from "./common/server";
import {
  checkIfConfigurationChanged,
  getInterpreterFromSetting,
  ISettings,
} from "./common/settings";
import { loadServerDefaults } from "./common/setup";
import { registerLanguageStatusItem, updateStatus } from "./common/status";
import {
  createOutputChannel,
  getConfiguration,
  onDidChangeConfiguration,
  onDidGrantWorkspaceTrust,
  registerCommand,
} from "./common/vscodeapi";

const issueTracker = "https://github.com/astral-sh/ruff/issues";

let lsClient: LanguageClient | undefined;
let restartInProgress = false;
let restartQueued = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // This is required to get server name and module. This should be
  // the first thing that we do in this extension.
  const serverInfo = loadServerDefaults();
  const serverName = serverInfo.name;
  const serverId = serverInfo.module;

  // Setup logging
  const outputChannel = createOutputChannel(serverName);
  context.subscriptions.push(outputChannel, registerLogger(outputChannel));

  // Log Server information
  traceLog(`Name: ${serverInfo.name}`);
  traceLog(`Module: ${serverInfo.module}`);
  traceVerbose(`Full Server Info: ${JSON.stringify(serverInfo)}`);

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
    traceLog(
      "Extension is disabled. To enable, change `ruff.enable` to `true` and restart VS Code.",
    );
    return;
  }

  if (restartInProgress) {
    if (!restartQueued) {
      // Schedule a new restart after the current restart.
      traceLog(`Triggered ${serverName} restart while restart is in progress; queuing a restart.`);
      restartQueued = true;
    }
    return;
  }

  const runServer = async () => {
    if (restartInProgress) {
      if (!restartQueued) {
        // Schedule a new restart after the current restart.
        traceLog(
          `Triggered ${serverName} restart while restart is in progress; queuing a restart.`,
        );
        restartQueued = true;
      }
      return;
    }

    restartInProgress = true;

    if (!vscode.workspace.isTrusted) {
      lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);

      restartInProgress = false;
      if (restartQueued) {
        restartQueued = false;
        await runServer();
      }

      return;
    }

    const interpreter = getInterpreterFromSetting(serverId);
    if (interpreter !== undefined && interpreter.length > 0) {
      if (checkVersion(await resolveInterpreter(interpreter))) {
        traceVerbose(
          `Using interpreter from ${serverInfo.module}.interpreter: ${interpreter.join(" ")}`,
        );
        lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);

        restartInProgress = false;
        if (restartQueued) {
          restartQueued = false;
          await runServer();
        }
      }

      restartInProgress = false;
      return;
    }

    const interpreterDetails = await getInterpreterDetails();
    if (interpreterDetails.path) {
      traceVerbose(`Using interpreter from Python extension: ${interpreterDetails.path.join(" ")}`);
      lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);

      restartInProgress = false;
      if (restartQueued) {
        restartQueued = false;
        await runServer();
      }

      return;
    }

    restartInProgress = false;

    updateStatus(
      vscode.l10n.t("Please select a Python interpreter."),
      vscode.LanguageStatusSeverity.Error,
    );
    traceError(
      "Python interpreter missing:\r\n" +
        "[Option 1] Select Python interpreter using the ms-python.python.\r\n" +
        `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n` +
        "Please use Python 3.7 or greater.",
    );
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
    registerCommand(`${serverId}.showLogs`, async () => {
      outputChannel.show();
    }),
    registerCommand(`${serverId}.restart`, async () => {
      await runServer();
    }),
    registerCommand(`${serverId}.executeAutofix`, async () => {
      if (!lsClient) {
        return;
      }

      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
        return;
      }

      const textDocument = {
        uri: textEditor.document.uri.toString(),
        version: textEditor.document.version,
      };
      const params = {
        command: `${serverId}.applyAutofix`,
        arguments: [textDocument],
      };

      await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
        await vscode.window.showErrorMessage(
          "Failed to apply Ruff fixes to the document. Please consider opening an issue with steps to reproduce.",
        );
      });
    }),
    registerCommand(`${serverId}.executeFormat`, async () => {
      if (!lsClient) {
        return;
      }

      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
        return;
      }

      const textDocument = {
        uri: textEditor.document.uri.toString(),
        version: textEditor.document.version,
      };
      const params = {
        command: `${serverId}.applyFormat`,
        arguments: [textDocument],
      };

      await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
        await vscode.window.showErrorMessage(
          "Failed to apply Ruff formatting to the document. Please consider opening an issue with steps to reproduce.",
        );
      });
    }),
    registerCommand(`${serverId}.executeOrganizeImports`, async () => {
      if (!lsClient) {
        return;
      }

      const textEditor = vscode.window.activeTextEditor;
      if (!textEditor) {
        return;
      }

      const textDocument = {
        uri: textEditor.document.uri.toString(),
        version: textEditor.document.version,
      };
      const params = {
        command: `${serverId}.applyOrganizeImports`,
        arguments: [textDocument],
      };

      await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
        await vscode.window.showErrorMessage(
          `Failed to apply Ruff fixes to the document. Please consider opening an issue at ${issueTracker} with steps to reproduce.`,
        );
      });
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
        await vscode.window.showErrorMessage("Failed to print debug information.");
      });
    }),
    registerLanguageStatusItem(serverId, serverName, `${serverId}.showLogs`),
  );

  setImmediate(async () => {
    if (vscode.workspace.isTrusted) {
      const interpreter = getInterpreterFromSetting(serverId);
      if (interpreter === undefined || interpreter.length === 0) {
        traceLog(`Python extension loading`);
        await initializePython(context.subscriptions);
        traceLog(`Python extension loaded`);
      }
    } else {
      await runServer();
    }
  });
}

export async function deactivate(): Promise<void> {
  if (lsClient) {
    await lsClient.stop();
  }
}
