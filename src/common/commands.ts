import * as vscode from "vscode";
import { ExecuteCommandRequest, LanguageClient } from "vscode-languageclient/node";

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
