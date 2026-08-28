import * as fs from "fs-extra";
import * as path from "path";
import { Uri, WorkspaceFolder } from "vscode";
import { DocumentSelector } from "vscode-languageclient";
import { getWorkspaceFolders, isVirtualWorkspace } from "./vscodeapi";
import { supportsToml, VersionInfo } from "./version";

export async function getProjectRoot(): Promise<WorkspaceFolder> {
  const workspaces: readonly WorkspaceFolder[] = getWorkspaceFolders();
  if (workspaces.length === 0) {
    return {
      uri: Uri.file(process.cwd()),
      name: path.basename(process.cwd()),
      index: 0,
    };
  } else if (workspaces.length === 1) {
    return workspaces[0];
  } else {
    let rootWorkspace = workspaces[0];
    let root = undefined;
    for (const w of workspaces) {
      if (await fs.pathExists(w.uri.fsPath)) {
        root = w.uri.fsPath;
        rootWorkspace = w;
        break;
      }
    }

    for (const w of workspaces) {
      if (root && root.length > w.uri.fsPath.length && (await fs.pathExists(w.uri.fsPath))) {
        root = w.uri.fsPath;
        rootWorkspace = w;
      }
    }
    return rootWorkspace;
  }
}

export function getDocumentSelector(ruffVersion?: VersionInfo): DocumentSelector {
  if (isVirtualWorkspace()) {
    return [{ language: "python" }, { language: "markdown" }];
  }

  const selector: DocumentSelector = [
    { scheme: "file", language: "python" },
    { scheme: "untitled", language: "python" },
    { scheme: "vscode-notebook", language: "python" },
    { scheme: "vscode-notebook-cell", language: "python" },
    { scheme: "file", language: "markdown" },
    { scheme: "untitled", language: "markdown" },
  ];

  if (ruffVersion != null && supportsToml(ruffVersion)) {
    selector.push({ scheme: "file", pattern: "**/{pyproject.toml,ruff.toml,.ruff.toml}" });
  }

  return selector;
}
