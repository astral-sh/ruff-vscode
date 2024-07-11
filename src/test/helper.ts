import * as vscode from "vscode";
import * as path from "path";

const EXTENSION_ID = "charliermarsh.ruff";

export async function initialize(docUri: vscode.Uri) {
  const ruffConfiguration = vscode.workspace.getConfiguration("ruff");
  await ruffConfiguration.update("importStrategy", "useBundled");
  const pythonConfiguration = vscode.workspace.getConfiguration("python");
  // Ruff's extension depends on the Python extension which also provides a language server,
  // so we need to disable the Python language server to avoid special casing in the tests.
  await pythonConfiguration.update("languageServer", "None");
  await activateExtension(docUri);
}

async function activateExtension(docUri: vscode.Uri) {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (extension === undefined) {
    throw new Error(`Extension ${EXTENSION_ID} not found`);
  }
  await extension.activate();
  try {
    const doc = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(doc);
    await sleep(1000); // Wait for server activation
  } catch (e) {
    console.error(e);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, "../../src/testFixture", p);
};

export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};
