// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ConfigurationChangeEvent, WorkspaceFolder } from 'vscode';
import { getInterpreterDetails } from './python';
import { LoggingLevelSettingType } from './log/types';
import { getConfiguration, getWorkspaceFolders } from './vscodeapi';

export interface ISettings {
    workspace: string;
    logLevel: LoggingLevelSettingType;
    args: string[];
    path: string[];
    interpreter: string[];
    importStrategy: string;
    showNotifications: string;
}

export async function getExtensionSettings(namespace: string): Promise<ISettings[]> {
    const settings: ISettings[] = [];
    const workspaces = getWorkspaceFolders();

    for (const workspace of workspaces) {
        const workspaceSetting = await getWorkspaceSettings(namespace, workspace);
        settings.push(workspaceSetting);
    }

    return settings;
}

export function getInterpreterFromSetting(namespace: string): string[] | undefined {
    const config = getConfiguration(namespace);
    return config.get<string[]>('interpreter');
}

export async function getWorkspaceSettings(namespace: string, workspace: WorkspaceFolder): Promise<ISettings> {
    const config = getConfiguration(namespace, workspace.uri);

    let interpreter: string[] | undefined = getInterpreterFromSetting(namespace);
    if (interpreter === undefined || interpreter.length === 0) {
        interpreter = (await getInterpreterDetails(workspace.uri)).path;
    }

    return {
        workspace: workspace.uri.toString(),
        logLevel: config.get<LoggingLevelSettingType>(`logLevel`) ?? 'error',
        args: config.get<string[]>(`args`) ?? [],
        path: config.get<string[]>(`path`) ?? [],
        interpreter: interpreter ?? [],
        importStrategy: config.get<string>(`importStrategy`) ?? 'fromEnvironment',
        showNotifications: config.get<string>(`showNotifications`) ?? 'off',
    };
}

export function checkIfConfigurationChanged(e: ConfigurationChangeEvent, namespace: string): boolean {
    const settings = [
        `${namespace}.trace`,
        `${namespace}.args`,
        `${namespace}.path`,
        `${namespace}.interpreter`,
        `${namespace}.importStrategy`,
        `${namespace}.showNotifications`,
    ];
    return settings.some((s) => e.affectsConfiguration(s));
}
