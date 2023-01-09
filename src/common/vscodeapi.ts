/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    commands,
    ConfigurationScope,
    Disposable,
    OutputChannel,
    window,
    workspace,
    WorkspaceConfiguration,
    WorkspaceFolder,
} from 'vscode';

export function createOutputChannel(name: string): OutputChannel {
    return window.createOutputChannel(name);
}

export function getConfiguration(config: string, scope?: ConfigurationScope): WorkspaceConfiguration {
    return workspace.getConfiguration(config, scope);
}

export function registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
    return commands.registerCommand(command, callback, thisArg);
}

export const { onDidChangeConfiguration } = workspace;

export function isVirtualWorkspace(): boolean {
    const isVirtual = workspace.workspaceFolders && workspace.workspaceFolders.every((f) => f.uri.scheme !== 'file');
    return !!isVirtual;
}

export function getWorkspaceFolders(): readonly WorkspaceFolder[] {
    return workspace.workspaceFolders ?? [];
}
