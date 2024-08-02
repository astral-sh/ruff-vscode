import * as vscode from "vscode";
import * as path from "path";
import { platform } from "os";

const EXTENSION_ID = "charliermarsh.ruff";

export async function activateExtension() {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (extension === undefined) {
    throw new Error(`Extension ${EXTENSION_ID} not found`);
  }
  try {
    await extension.activate();
  } catch (e) {
    console.error(`Failed to activate the extension: ${e}`);
  }
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

export const isWindows = () => {
  return platform() === "win32";
};
