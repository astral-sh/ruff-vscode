// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable @typescript-eslint/naming-convention */
import { commands, Disposable, Event, EventEmitter, extensions, Uri } from 'vscode';
import { traceError, traceLog } from './log/logging';

export enum PythonEnvKind {
    Unknown = 'unknown',
    // "global"
    System = 'global-system',
    WindowsStore = 'global-windows-store',
    Pyenv = 'global-pyenv',
    Poetry = 'poetry',
    Custom = 'global-custom',
    OtherGlobal = 'global-other',
    // "virtual"
    Venv = 'virt-venv',
    VirtualEnv = 'virt-virtualenv',
    VirtualEnvWrapper = 'virt-virtualenvwrapper',
    Pipenv = 'virt-pipenv',
    Conda = 'virt-conda',
    OtherVirtual = 'virt-other',
}

export interface EnvPathType {
    /**
     * Path to environment folder or path to interpreter that uniquely identifies an environment.
     * Virtual environments lacking an interpreter are identified by environment folder paths,
     * whereas other envs can be identified using interpreter path.
     */
    path: string;
    pathType: 'envFolderPath' | 'interpreterPath';
}

export interface EnvironmentDetailsOptions {
    useCache: boolean;
}

export interface EnvironmentDetails {
    interpreterPath: string;
    envFolderPath?: string;
    version: string[];
    environmentType: PythonEnvKind[];
    metadata: Record<string, unknown>;
}

export interface ActiveEnvironmentChangedParams {
    /**
     * Path to environment folder or path to interpreter that uniquely identifies an environment.
     * Virtual environments lacking an interpreter are identified by environment folder paths,
     * whereas other envs can be identified using interpreter path.
     */
    path: string;
    resource?: Uri;
}

interface IExtensionApi {
    ready: Promise<void>;
    debug: {
        getRemoteLauncherCommand(host: string, port: number, waitUntilDebuggerAttaches: boolean): Promise<string[]>;
        getDebuggerPackagePath(): Promise<string | undefined>;
    };
    settings: {
        readonly onDidChangeExecutionDetails: Event<Uri | undefined>;
        getExecutionDetails(resource?: Uri | undefined): {
            execCommand: string[] | undefined;
        };
    };
    environment: {
        getActiveEnvironmentPath(resource?: Uri | undefined): Promise<EnvPathType | undefined>;
        onDidActiveEnvironmentChanged: Event<ActiveEnvironmentChangedParams>;
    };
}

export interface IInterpreterDetails {
    path?: string[];
    resource?: Uri;
}

const onDidChangePythonInterpreterEvent = new EventEmitter<IInterpreterDetails>();
export const onDidChangePythonInterpreter: Event<IInterpreterDetails> = onDidChangePythonInterpreterEvent.event;

async function activateExtension() {
    const extension = extensions.getExtension('ms-python.python');
    if (extension) {
        if (!extension.isActive) {
            await extension.activate();
        }
    }
    return extension;
}

async function getPythonExtensionAPI(): Promise<IExtensionApi | undefined> {
    const extension = await activateExtension();
    return extension?.exports as IExtensionApi;
}

export async function initializePython(disposables: Disposable[]): Promise<void> {
    try {
        const api = await getPythonExtensionAPI();

        if (api) {
            disposables.push(
                api.environment.onDidActiveEnvironmentChanged((e) => {
                    onDidChangePythonInterpreterEvent.fire({ path: [e.path], resource: e.resource });
                }),
            );

            traceLog('Waiting for interpreter from python extension.');
            onDidChangePythonInterpreterEvent.fire(await getInterpreterDetails());
        }
    } catch (error) {
        traceError('Error initializing python: ', error);
    }
}

export async function getInterpreterDetails(resource?: Uri): Promise<IInterpreterDetails> {
    const api = await getPythonExtensionAPI();
    const interpreter = await api?.environment.getActiveEnvironmentPath(resource);
    if (interpreter && interpreter.pathType === 'interpreterPath') {
        return { path: [interpreter.path], resource };
    }
    return { path: undefined, resource };
}

export async function getDebuggerPath(): Promise<string | undefined> {
    const api = await getPythonExtensionAPI();
    return api?.debug.getDebuggerPackagePath();
}

export async function runPythonExtensionCommand(command: string, ...rest: any[]) {
    await activateExtension();
    return await commands.executeCommand(command, ...rest);
}
