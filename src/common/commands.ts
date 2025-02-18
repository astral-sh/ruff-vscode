import * as vscode from "vscode";
import { ExecuteCommandRequest, LanguageClient } from "vscode-languageclient/node";
import { getConfiguration } from "./vscodeapi";
import { ISettings } from "./settings";

const ISSUE_TRACKER = "https://github.com/astral-sh/ruff/issues";

export async function executeAutofix(lsClient: LanguageClient, serverId: string) {
  await executeCommand(lsClient, `${serverId}.applyAutofix`);
}

export async function executeFormat(lsClient: LanguageClient, serverId: string) {
  await executeCommand(lsClient, `${serverId}.applyFormat`);
}

export async function executeOrganizeImports(lsClient: LanguageClient, serverId: string) {
  await executeCommand(lsClient, `${serverId}.applyOrganizeImports`);
}

async function executeCommand(lsClient: LanguageClient, command: string) {
  const textEditor = vscode.window.activeTextEditor;
  if (!textEditor) {
    return;
  }

  const textDocument = {
    uri: textEditor.document.uri.toString(),
    version: textEditor.document.version,
  };
  const params = {
    command,
    arguments: [textDocument],
  };

  await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
    vscode.window.showErrorMessage(
      `Failed to execute the command '${command}'. Please consider opening an issue at ${ISSUE_TRACKER} with steps to reproduce.`,
    );
  });
}

/**
 * Creates a debug information provider for the `ruff.printDebugInformation` command.
 *
 * This will open a new editor window with the debug information considering the active editor.
 */
export function createDebugInformationProvider(
  getClient: () => LanguageClient | undefined,
  serverId: string,
  context: vscode.ExtensionContext,
) {
  let configuration = getConfiguration(serverId) as unknown as ISettings;
  if (configuration.nativeServer === false || configuration.nativeServer === "off") {
    return async () => {
      vscode.window.showInformationMessage(
        "Debug information is only available when using the native server",
      );
    };
  }

  const contentProvider = new (class implements vscode.TextDocumentContentProvider {
    readonly uri = vscode.Uri.parse("ruff-server-debug://debug");
    readonly eventEmitter = new vscode.EventEmitter<vscode.Uri>();

    async provideTextDocumentContent(_uri: vscode.Uri): Promise<string> {
      const lsClient = getClient();
      if (!lsClient) {
        return "";
      }
      const editor = vscode.window.activeTextEditor;
      const params = {
        command: `${serverId}.printDebugInformation`,
        arguments: [
          {
            textDocument: editor ? { uri: editor.document.uri.toString() } : null,
          },
        ],
      };
      return await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(
        (result) => {
          if (typeof result === "string") {
            return result;
          }
          // For older Ruff version, we don't return a string but log the information.
          return "";
        },
        async () => {
          vscode.window.showErrorMessage(
            `Failed to print debug information. Please consider opening an issue at ${ISSUE_TRACKER} with steps to reproduce.`,
          );
          return "";
        },
      );
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
      return this.eventEmitter.event;
    }
  })();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider("ruff-server-debug", contentProvider),
  );

  return async () => {
    contentProvider.eventEmitter.fire(contentProvider.uri);
    const document = await vscode.workspace.openTextDocument(contentProvider.uri);
    const content = document.getText();

    // Show the document only if it has content.
    if (content.length > 0) {
      void (await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true,
      }));
    }
  };
}
