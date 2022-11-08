// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Disposable, OutputChannel } from 'vscode';
import { State } from 'vscode-languageclient';
import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
    RevealOutputChannelOn,
    ServerOptions,
} from 'vscode-languageclient/node';
import { DEBUG_SERVER_SCRIPT_PATH, SERVER_SCRIPT_PATH } from './constants';
import { traceError, traceInfo, traceLog, traceVerbose } from './log/logging';
import { getDebuggerPath } from './python';
import { getExtensionSettings, getWorkspaceSettings, ISettings } from './settings';
import { getProjectRoot, traceLevelToLSTrace } from './utilities';
import { isVirtualWorkspace } from './vscodeapi';

export type IInitOptions = { settings: ISettings[] };

async function getDebugServerOptions(
    interpreter: string[],
    cwd: string,
    env: {
        [x: string]: string | undefined;
    },
): Promise<Executable> {
    // Set debugger path needed for debugging python code.
    if (env.DEBUGPY_ENABLED !== 'False') {
        env.DEBUGPY_PATH = await getDebuggerPath();
    }

    const command = interpreter[0];
    const args = interpreter.slice(1).concat([DEBUG_SERVER_SCRIPT_PATH]);
    traceLog(`Server Command [DEBUG]: ${[command, ...args].join(' ')}`);

    return {
        command,
        args,
        options: { cwd, env },
    };
}

async function getRunServerOptions(
    interpreter: string[],
    cwd: string,
    env: {
        [x: string]: string | undefined;
    },
): Promise<Executable> {
    const command = interpreter[0];
    const args = interpreter.slice(1).concat([SERVER_SCRIPT_PATH]);
    traceLog(`Server Command [RUN]: ${[command, ...args].join(' ')}`);

    return Promise.resolve({
        command,
        args,
        options: { cwd, env },
    });
}

export async function createServer(
    interpreter: string[],
    serverId: string,
    serverName: string,
    outputChannel: OutputChannel,
    initializationOptions: IInitOptions,
    workspaceSetting: ISettings,
): Promise<LanguageClient> {
    const cwd = getProjectRoot().uri.fsPath;
    const newEnv = { ...process.env };

    // Set import strategy
    newEnv.LS_IMPORT_STRATEGY = workspaceSetting.importStrategy;

    // Set notification type
    newEnv.LS_SHOW_NOTIFICATION = workspaceSetting.showNotifications;

    const serverOptions: ServerOptions = {
        run: await getRunServerOptions(interpreter, cwd, { ...newEnv }),
        debug: await getDebugServerOptions(interpreter, cwd, { ...newEnv }),
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        // Register the server for python documents
        documentSelector: isVirtualWorkspace()
            ? [{ language: 'python' }]
            : [
                  { scheme: 'file', language: 'python' },
                  { scheme: 'untitled', language: 'python' },
                  { scheme: 'vscode-notebook', language: 'python' },
                  { scheme: 'vscode-notebook-cell', language: 'python' },
              ],
        outputChannel: outputChannel,
        traceOutputChannel: outputChannel,
        revealOutputChannelOn: RevealOutputChannelOn.Never,
        initializationOptions,
    };

    return new LanguageClient(serverId, serverName, serverOptions, clientOptions);
}

let _disposables: Disposable[] = [];
export async function restartServer(
    serverId: string,
    serverName: string,
    outputChannel: OutputChannel,
    lsClient?: LanguageClient,
): Promise<LanguageClient | undefined> {
    if (lsClient) {
        traceInfo(`Server: Stop requested`);
        await lsClient.stop();
        _disposables.forEach((d) => d.dispose());
        _disposables = [];
    }
    const workspaceSetting = await getWorkspaceSettings(serverId, getProjectRoot(), true);
    if (workspaceSetting.interpreter.length === 0) {
        traceError(
            'Python interpreter missing:\r\n' +
                '[Option 1] Select python interpreter using the ms-python.python.\r\n' +
                `[Option 2] Set an interpreter using "${serverId}.interpreter" setting.\r\n`,
        );
        return undefined;
    }

    const newLSClient = await createServer(
        workspaceSetting.interpreter,
        serverId,
        serverName,
        outputChannel,
        {
            settings: await getExtensionSettings(serverId, true),
        },
        workspaceSetting,
    );

    newLSClient.trace = traceLevelToLSTrace(workspaceSetting.logLevel);
    traceInfo(`Server: Start requested.`);
    _disposables.push(
        newLSClient.onDidChangeState((e) => {
            switch (e.newState) {
                case State.Stopped:
                    traceVerbose(`Server State: Stopped`);
                    break;
                case State.Starting:
                    traceVerbose(`Server State: Starting`);
                    break;
                case State.Running:
                    traceVerbose(`Server State: Running`);
                    break;
            }
        }),
        newLSClient.start(),
    );
    return newLSClient;
}
