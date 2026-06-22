import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { LazyOutputChannel, logger } from "./common/logger";
import {
  getEnvironmentProvider,
  onDidChangeActivePythonEnvironment,
  type OnDidChangeActivePythonEnvironmentEventArgs,
} from "./common/python";
import {
  resolveServerPlan,
  serverPlanKey,
  type ServerState,
  startServer,
  stopServer,
} from "./common/server";
import {
  checkIfConfigurationChanged,
  getWorkspaceSettings,
  ISettings,
  checkNotebookCodeActionsOnSave,
} from "./common/settings";
import { loadServerDefaults } from "./common/setup";
import { registerLanguageStatusItem } from "./common/status";
import {
  getConfiguration,
  onDidChangeConfiguration,
  onDidGrantWorkspaceTrust,
  registerCommand,
} from "./common/vscodeapi";
import { getProjectRoot } from "./common/utilities";
import {
  executeAutofix,
  executeFormat,
  executeOrganizeImports,
  createDebugInformationProvider,
} from "./common/commands";

let serverState: ServerState | null = null;
let restartQueued = false;
let restartPromise: Promise<void> | null = null;

function getClient(): LanguageClient | undefined {
  return serverState?.client;
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // This is required to get server name and module. This should be
  // the first thing that we do in this extension.
  const serverInfo = loadServerDefaults();
  const serverName = serverInfo.name;
  const serverId = serverInfo.module;

  // Log Server information
  logger.info(`Name: ${serverInfo.name}`);
  logger.info(`Module: ${serverInfo.module}`);
  logger.debug(`Full Server Info: ${JSON.stringify(serverInfo)}`);

  // Create output channels for the server and trace logs
  const outputChannel = vscode.window.createOutputChannel(`${serverName} Language Server`);
  const traceOutputChannel = new LazyOutputChannel(`${serverName} Language Server Trace`);

  // Make sure that these channels are disposed when the extension is deactivated.
  context.subscriptions.push(outputChannel);
  context.subscriptions.push(traceOutputChannel);
  context.subscriptions.push(logger.channel);

  context.subscriptions.push(
    onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("ruff.enable")) {
        vscode.window.showWarningMessage(
          "To enable or disable Ruff after changing the `enable` setting, you must restart VS Code.",
        );
      }
    }),
  );

  const { enable } = getConfiguration(serverId) as unknown as ISettings;
  if (!enable) {
    logger.info(
      "Extension is disabled. To enable, change `ruff.enable` to `true` and restart VS Code.",
    );
    return;
  }

  const environmentProvider = await getEnvironmentProvider();

  const runServer = async () => {
    if (serverState != null) {
      await stopServer(serverState.client);
      serverState = null;
    }

    const projectRoot = await getProjectRoot();
    const workspaceSettings = await getWorkspaceSettings(serverId, projectRoot);
    serverState = await startServer(
      projectRoot,
      workspaceSettings,
      serverId,
      serverName,
      outputChannel,
      traceOutputChannel,
      environmentProvider,
    );
  };

  const requestRestart = async () => {
    if (restartPromise != null) {
      if (!restartQueued) {
        logger.info(
          `${serverName} restart requested while another restart is in progress; queuing one more restart.`,
        );
        restartQueued = true;
      }
      await restartPromise;
      return;
    }

    restartQueued = false;
    restartPromise = (async () => {
      try {
        do {
          restartQueued = false;
          await runServer();
        } while (restartQueued);
      } finally {
        restartPromise = null;
      }
    })();
    await restartPromise;
  };

  let activeEnvironmentChangePromise = Promise.resolve();
  const enqueueActiveEnvironmentChange = (task: () => Promise<void>) => {
    const current = activeEnvironmentChangePromise.then(task, task);
    activeEnvironmentChangePromise = current.then(
      () => undefined,
      (error) => {
        logger.error(`Failed to handle Python environment change: ${error}`);
      },
    );
    return current;
  };

  context.subscriptions.push(
    onDidChangeActivePythonEnvironment(
      async (event: OnDidChangeActivePythonEnvironmentEventArgs) => {
        await enqueueActiveEnvironmentChange(async () => {
          logger.info(
            `Selected Python interpreter for '${event.uri ?? "workspace"}' changed to '${event.path ?? "<unknown>"}'.`,
          );

          if (restartPromise != null) {
            logger.debug(
              `${serverName} restart is already in progress; waiting before checking the Python environment change.`,
            );
            await restartPromise;
          }

          const projectRoot = await getProjectRoot();
          const affectsProjectRoot =
            event.uri == null || event.uri.toString() === projectRoot.uri.toString();
          if (!affectsProjectRoot) {
            return;
          }

          if (serverState == null) {
            await requestRestart();
            return;
          }

          if (!serverState.plan.dependsOnActiveInterpreter) {
            logger.debug(
              "Ignoring Python environment change because server selection is independent of it.",
            );
            return;
          }

          const settings = await getWorkspaceSettings(serverId, projectRoot);
          const activeEnvironment =
            (await environmentProvider?.getActiveEnvironment(projectRoot.uri)) ?? null;
          const nextPlan = await resolveServerPlan(
            settings,
            projectRoot,
            serverId,
            environmentProvider,
            activeEnvironment,
            false,
          );

          if (nextPlan == null || serverPlanKey(nextPlan) !== serverPlanKey(serverState.plan)) {
            logger.info(`Restarting ${serverName} because its execution plan changed.`);
            await requestRestart();
          } else {
            logger.debug("Python environment changed without changing the Ruff execution plan.");
          }
        });
      },
    ),
    onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
      if (checkIfConfigurationChanged(e, serverId)) {
        await requestRestart();
      }
    }),
    onDidGrantWorkspaceTrust(async () => {
      await requestRestart();
    }),
    registerCommand(`${serverId}.showLogs`, () => {
      logger.channel.show();
    }),
    registerCommand(`${serverId}.showServerLogs`, () => {
      outputChannel.show();
    }),
    registerCommand(`${serverId}.restart`, async () => {
      await requestRestart();
    }),
    registerCommand(`${serverId}.executeAutofix`, async () => {
      if (serverState != null) {
        await executeAutofix(serverState.client, serverId);
      }
    }),
    registerCommand(`${serverId}.executeFormat`, async () => {
      if (serverState != null) {
        await executeFormat(serverState.client, serverId);
      }
    }),
    registerCommand(`${serverId}.executeOrganizeImports`, async () => {
      if (serverState != null) {
        await executeOrganizeImports(serverState.client, serverId);
      }
    }),
    registerCommand(
      `${serverId}.debugInformation`,
      createDebugInformationProvider(getClient, serverId, context),
    ),
    registerLanguageStatusItem(serverId, serverName, `${serverId}.showLogs`),
  );

  checkNotebookCodeActionsOnSave(serverId);

  await environmentProvider?.initialize(context.subscriptions);
  await requestRestart();
}

export async function deactivate(): Promise<void> {
  if (serverState != null) {
    await stopServer(serverState.client);
    serverState = null;
  }
}
