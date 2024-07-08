// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { LanguageStatusItem, Disposable, l10n, LanguageStatusSeverity } from "vscode";
import { createLanguageStatusItem } from "./vscodeapi";
import { Command } from "vscode-languageclient";
import { getDocumentSelector } from "./utilities";

let _status: LanguageStatusItem | undefined;
let _serverKind: "native" | "ruff-lsp" | undefined;

export function registerLanguageStatusItem(id: string, name: string, command: string): Disposable {
  _status = createLanguageStatusItem(id, getDocumentSelector());
  _status.name = name;
  _status.text = name;
  _status.command = Command.create(l10n.t("Open logs"), command);

  return {
    dispose: () => {
      _status?.dispose();
      _status = undefined;
    },
  };
}

export function updateServerKind(native: boolean): void {
  _serverKind = native ? "native" : "ruff-lsp";
}

export function updateStatus(
  status: string | undefined,
  severity: LanguageStatusSeverity,
  busy?: boolean,
  detail?: string,
): void {
  if (_status) {
    let name = _status.name;
    if (_serverKind) {
      name = `${name} (${_serverKind})`;
    }
    _status.text = status && status.length > 0 ? `${name}: ${status}` : `${name}`;
    _status.severity = severity;
    _status.busy = busy ?? false;
    _status.detail = detail;
  }
}
