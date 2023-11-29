// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
  commands,
  ConfigurationScope,
  Disposable,
  languages,
  LanguageStatusItem,
  LogOutputChannel,
  window,
  workspace,
  WorkspaceConfiguration,
  WorkspaceFolder,
} from "vscode";
import { DocumentSelector } from "vscode-languageclient";

export function createOutputChannel(name: string): LogOutputChannel {
  return window.createOutputChannel(name, { log: true });
}

export function getConfiguration(
  config: string,
  scope?: ConfigurationScope,
): WorkspaceConfiguration {
  return workspace.getConfiguration(config, scope);
}

export function registerCommand(
  command: string,
  callback: (...args: any[]) => any,
  thisArg?: any,
): Disposable {
  return commands.registerCommand(command, callback, thisArg);
}

export const { onDidChangeConfiguration } = workspace;

export function isVirtualWorkspace(): boolean {
  const isVirtual =
    workspace.workspaceFolders && workspace.workspaceFolders.every((f) => f.uri.scheme !== "file");
  return !!isVirtual;
}

export function getWorkspaceFolders(): readonly WorkspaceFolder[] {
  return workspace.workspaceFolders ?? [];
}

export function createLanguageStatusItem(
  id: string,
  selector: DocumentSelector,
): LanguageStatusItem {
  return languages.createLanguageStatusItem(id, selector);
}
