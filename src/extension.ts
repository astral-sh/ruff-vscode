// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import { LanguageClient, ExecuteCommandRequest } from 'vscode-languageclient/node';
import { restartServer } from './common/server';
import { registerLogger, setLoggingLevel, traceLog, traceVerbose } from './common/log/logging';
import { OutputChannelLogger } from './common/log/outputChannelLogger';
import {
    getInterpreterDetails,
    initializePython,
    onDidChangePythonInterpreter,
    runPythonExtensionCommand,
} from './common/python';
import {
    checkIfConfigurationChanged,
    getExtensionSettings,
    getInterpreterFromSetting,
    ISettings,
} from './common/settings';
import { loadServerDefaults } from './common/setup';
import { createOutputChannel, onDidChangeConfiguration, registerCommand } from './common/vscodeapi';
import { getProjectRoot } from './common/utilities';

let lsClient: LanguageClient | undefined;
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // This is required to get server name and module. This should be
    // the first thing that we do in this extension.
    const serverInfo = loadServerDefaults();
    const serverName = serverInfo.name;
    const serverId = serverInfo.module;

    const settings: ISettings[] = await getExtensionSettings(serverId);

    // Setup logging
    const outputChannel = createOutputChannel(serverName);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(registerLogger(new OutputChannelLogger(outputChannel)));

    traceLog(`Name: ${serverName}`);
    traceLog(`Module: ${serverInfo.module}`);
    traceVerbose(`Configuration: ${JSON.stringify(serverInfo)}`);

    const runServer = async () => {
        lsClient = await restartServer(serverId, serverName, outputChannel, lsClient);
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
                runPythonExtensionCommand('python.triggerEnvSelection', getProjectRoot().uri);
            }
        }),
    );

    context.subscriptions.push(
        registerCommand(`${serverId}.executeAutofix`, async () => {
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

			await lsClient.sendRequest(ExecuteCommandRequest.type, params).then(undefined, async () => {
				await vscode.window.showErrorMessage(
					'Failed to apply Stylelint fixes to the document. Please consider opening an issue with steps to reproduce.',
				);
			});
		}),
    );

    context.subscriptions.push(
        onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
            if (checkIfConfigurationChanged(e, serverId)) {
                const newSettings = await getExtensionSettings(serverId);
                // setLoggingLevel(newSettings[0].logLevel);
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
