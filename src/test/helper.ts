import * as vscode from "vscode";
import * as path from "path";

const RUFF_EXTENSION_ID = "charliermarsh.ruff";
const PYTHON_EXTENSION_ID = "ms-python.python";

async function activateExtension(extensionId: string) {
  const extension = vscode.extensions.getExtension(extensionId);
  if (extension === undefined) {
    throw new Error(`Extension ${extensionId} not found`);
  }
  if (!extension.isActive) {
    try {
      await extension.activate();
    } catch (e) {
      console.error(`Failed to activate the extension: ${e}`);
    }
  }
}

export async function activateExtensions() {
  await activateExtension(RUFF_EXTENSION_ID);
  await activateExtension(PYTHON_EXTENSION_ID);
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocumentPath = (p: string) => {
  return path.resolve(__dirname, "../../src/testFixture", p);
};

export const getDocumentUri = (p: string) => {
  return vscode.Uri.file(getDocumentPath(p));
};
