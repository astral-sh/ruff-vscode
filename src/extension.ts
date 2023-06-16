import * as vscode from "vscode";
import { ExecuteCommandRequest, LanguageClient } from "vscode-languageclient/node";
import { registerLogger, traceLog, traceVerbose } from "./common/log/logging";
import { OutputChannelLogger } from "./common/log/outputChannelLogger";
import {
  getInterpreterDetails,
  initializePython,
  onDidChangePythonInterpreter,
  runPythonExtensionCommand,
} from "./common/python";
import { restartServer } from "./common/server";
import { checkIfConfigurationChanged, getInterpreterFromSetting } from "./common/settings";
import { loadServerDefaults } from "./common/setup";
import { getProjectRoot } from "./common/utilities";
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from "./common/vscodeapi";

const issueTracker = "https://github.com/charliermarsh/ruff/issues";

let client: LanguageClient | undefined;
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
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(registerLogger(new OutputChannelLogger(outputChannel)));

  traceLog(`Name: ${serverName}`);
  traceLog(`Module: ${serverInfo.module}`);
  traceVerbose(`Configuration: ${JSON.stringify(serverInfo)}`);

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
    client = await restartServer(serverId, serverName, outputChannel, client);

    restartInProgress = false;

    if (restartQueued) {
      restartQueued = false;
      await runServer();
    }
  };

  context.subscriptions.push(
    onDidChangePythonInterpreter(async () => {
      await runServer();
    }),
  );

  context.subscriptions.push(
    registerCommand(`${serverId}.restart`, async () => {
      const interpreter = getInterpreterFromSetting(serverId);
      const interpreterDetails = await getInterpreterDetails();
      if (interpreter?.length || interpreterDetails.path) {
        await runServer();
      } else {
        const workspaceFolder = getProjectRoot();
        if (workspaceFolder) {
          await runPythonExtensionCommand("python.triggerEnvSelection", workspaceFolder.uri);
        }
      }
    }),
  );

  context.subscriptions.push(
    registerCommand(`${serverId}.executeAutofix`, async () => {
      if (!client) {
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

      await client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
        await vscode.window.showErrorMessage(
          "Failed to apply Ruff fixes to the document. Please consider opening an issue with steps to reproduce.",
        );
      });
    }),

    registerCommand(`${serverId}.executeOrganizeImports`, async () => {
      if (!client) {
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

      await client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
        await vscode.window.showErrorMessage(
          `Failed to apply Ruff fixes to the document. Please consider opening an issue at ${issueTracker} with steps to reproduce.`,
        );
      });
    }),
  );

  context.subscriptions.push(
    onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
      if (checkIfConfigurationChanged(e, serverId)) {
        await runServer();
      }
    }),
  );

  setImmediate(async () => {
    const interpreter = getInterpreterFromSetting(serverId);
    if (interpreter === undefined || interpreter.length === 0) {
      traceLog(`Python extension loading`);
      await initializePython(context.subscriptions);
      traceLog(`Python extension loaded`);
    } else {
      await runServer();
    }
  });
}
