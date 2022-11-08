// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { WorkspaceFolder } from 'vscode';
import { Trace } from 'vscode-jsonrpc/node';
import { getWorkspaceFolders } from './vscodeapi';

export function getTimeForLogging(): string {
    const date = new Date();
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;
}

export function traceLevelToLSTrace(level: string): Trace {
    switch (level) {
        case 'error':
        case 'warn':
        case 'info':
            return Trace.Messages;
        case 'debug':
            return Trace.Verbose;
        default:
            return Trace.Off;
    }
}

export function getProjectRoot(): WorkspaceFolder {
    const workspaces: readonly WorkspaceFolder[] = getWorkspaceFolders();
    if (workspaces.length === 1) {
        return workspaces[0];
    } else {
        let root = workspaces[0].uri.fsPath;
        let rootWorkspace = workspaces[0];
        for (const w of workspaces) {
            if (root.length > w.uri.fsPath.length) {
                root = w.uri.fsPath;
                rootWorkspace = w;
            }
        }
        return rootWorkspace;
    }
}
