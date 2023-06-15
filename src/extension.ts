import * as vscode from 'vscode';
import { ExecuteCommandRequest, LanguageClient } from 'vscode-languageclient/node';
import { registerLogger, traceLog, traceVerbose } from './common/log/logging';
import { OutputChannelLogger } from './common/log/outputChannelLogger';
import {
    getInterpreterDetails,
    initializePython,
    onDidChangePythonInterpreter,
    runPythonExtensionCommand,
} from './common/python';
import { restartServer } from './common/server';
import { checkIfConfigurationChanged, getInterpreterFromSetting } from './common/settings';
import { loadServerDefaults } from './common/setup';
import { getProjectRoot } from './common/utilities';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './common/vscodeapi';

const issueTracker = 'https://github.com/charliermarsh/ruff/issues';

let client: LanguageClient | undefined;
let clientPromise: Promise<LanguageClient | undefined> | undefined = undefined;
let isNewRestartQueued = false;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // This is required to get server name and module. This should be
    // the first thing that we do in this extension.
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    // Setup logging
    const outputChannel = createOutputChannel(serverName);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(registerLogger(new OutputChannelLogger(outputChannel)));

    traceLog(`Name: ${serverName}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Configuration: ${JSON.stringify(serverInfo)}`);

    const runServer = async () => {
        if (clientPromise != null) {
            traceLog(`Triggered ${serverName} restart while restart already in progress, queuing another restart`);
            if (!isNewRestartQueued) {
                // Schedule a new restart after the current one, but also make it so that there is one restart queue at a time,
                // this restart will have the latest settings anyway.
                isNewRestartQueued = true;
                try {
                    await clientPromise;
                } catch {
                    // We don't care whether this failed, we'll restart afterward anyway.
                }
            } else {
                // In this case, we're currently restarting and a new restart is also queued, so we just do nothing and
                // let the other restart handle this
                traceLog(
                    `Triggered ${serverName} restart while restart already in progress and another already queued, doing nothing`,
                );
                return;
            }
        }
        clientPromise = restartServer(serverId, serverName, outputChannel, client);
        isNewRestartQueued = false;
        await clientPromise;
    };

    context.subscriptions.push(
        onDidChangePythonInterpreter(async () => {
            await runServer();
        }),
    );

    context.subscriptions.push(
        registerCommand(`${serverId}.restart`, async () => {
            const interpreter = getInterpreterFromSetting(serverId);
            const interpreterDetails = await getInterpreterDetails();
            if (interpreter?.length || interpreterDetails.path) {
                await runServer();
            } else {
                const workspaceFolder = getProjectRoot();
                if (workspaceFolder) {
                    await runPythonExtensionCommand('python.triggerEnvSelection', workspaceFolder.uri);
                }
            }
        }),
    );

    context.subscriptions.push(
        registerCommand(`${serverId}.executeAutofix`, async () => {
            if (!client) {
                return;
            }

            const textEditor = vscode.window.activeTextEditor;
            if (!textEditor) {
                return;
            }

            const textDocument = {
                uri: textEditor.document.uri.toString(),
                version: textEditor.document.version,
            };
            const params = {
                command: `${serverId}.applyAutofix`,
                arguments: [textDocument],
            };

            await client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
                await vscode.window.showErrorMessage(
                    'Failed to apply Ruff fixes to the document. Please consider opening an issue with steps to reproduce.',
                );
            });
        }),

        registerCommand(`${serverId}.executeOrganizeImports`, async () => {
            if (!client) {
                return;
            }

            const textEditor = vscode.window.activeTextEditor;
            if (!textEditor) {
                return;
            }

            const textDocument = {
                uri: textEditor.document.uri.toString(),
                version: textEditor.document.version,
            };
            const params = {
                command: `${serverId}.applyOrganizeImports`,
                arguments: [textDocument],
            };

            await client.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
                await vscode.window.showErrorMessage(
                    `Failed to apply Ruff fixes to the document. Please consider opening an issue at ${issueTracker} with steps to reproduce.`,
                );
            });
        }),
    );

    context.subscriptions.push(
        onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
            if (checkIfConfigurationChanged(e, serverId)) {
                await runServer();
            }
        }),
    );

    setImmediate(async () => {
        const interpreter = getInterpreterFromSetting(serverId);
        if (interpreter === undefined || interpreter.length === 0) {
            traceLog(`Python extension loading`);
            await initializePython(context.subscriptions);
            traceLog(`Python extension loaded`);
        } else {
            await runServer();
        }
    });
}
