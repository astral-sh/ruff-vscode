import {
  ConfigurationChangeEvent,
  ConfigurationScope,
  Uri,
  WorkspaceConfiguration,
  WorkspaceFolder,
} from "vscode";
import { getInterpreterDetails } from "./python";
import { getConfiguration, getWorkspaceFolders } from "./vscodeapi";

type ImportStrategy = "fromEnvironment" | "useBundled";

type Run = "onType" | "onSave";

type CodeAction = {
  disableRuleComment?: {
    enable?: boolean;
  };
  fixViolation?: {
    enable?: boolean;
  };
};

type Lint = {
  args?: string[];
  run?: Run;
};

export interface ISettings {
  cwd: string;
  workspace: string;
  path: string[];
  interpreter: string[];
  importStrategy: ImportStrategy;
  codeAction: CodeAction;
  enable: boolean;
  enableExperimentalFormatter: boolean;
  showNotifications: string;
  organizeImports: boolean;
  fixAll: boolean;
  lint: Lint;

  // Deprecated settings (prefer `lint.args`, etc.).
  args: string[];
  run: Run;
}

export function getExtensionSettings(namespace: string): Promise<ISettings[]> {
  return Promise.all(
    getWorkspaceFolders().map((workspaceFolder) =>
      getWorkspaceSettings(namespace, workspaceFolder),
    ),
  );
}

function resolveVariables(value: string[], workspace?: WorkspaceFolder): string[] {
  const substitutions = new Map<string, string>();
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    substitutions.set("${userHome}", home);
  }
  if (workspace) {
    substitutions.set("${workspaceFolder}", workspace.uri.fsPath);
  }
  substitutions.set("${cwd}", process.cwd());
  getWorkspaceFolders().forEach((w) => {
    substitutions.set("${workspaceFolder:" + w.name + "}", w.uri.fsPath);
  });

  return value.map((s) => {
    for (const [key, value] of substitutions) {
      s = s.replace(key, value);
    }
    return s;
  });
}

export function getInterpreterFromSetting(namespace: string, scope?: ConfigurationScope) {
  const config = getConfiguration(namespace, scope);
  return config.get<string[]>("interpreter");
}

export async function getWorkspaceSettings(
  namespace: string,
  workspace: WorkspaceFolder,
): Promise<ISettings> {
  const config = getConfiguration(namespace, workspace.uri);

  let interpreter: string[] = getInterpreterFromSetting(namespace, workspace) ?? [];
  if (interpreter.length === 0) {
    interpreter = (await getInterpreterDetails(workspace.uri)).path ?? [];
  }

  return {
    cwd: workspace.uri.fsPath,
    workspace: workspace.uri.toString(),
    path: resolveVariables(config.get<string[]>("path") ?? [], workspace),
    interpreter: resolveVariables(interpreter, workspace),
    importStrategy: config.get<ImportStrategy>("importStrategy") ?? "fromEnvironment",
    codeAction: config.get<CodeAction>("codeAction") ?? {},
    lint: config.get<Lint>("lint") ?? {},
    enable: config.get<boolean>("enable") ?? true,
    organizeImports: config.get<boolean>("organizeImports") ?? true,
    fixAll: config.get<boolean>("fixAll") ?? true,
    showNotifications: config.get<string>("showNotifications") ?? "off",
    enableExperimentalFormatter: config.get<boolean>("enableExperimentalFormatter") ?? false,

    // Deprecated settings (prefer `lint.args`, etc.).
    args: resolveVariables(config.get<string[]>("args") ?? [], workspace),
    run: config.get<Run>("run") ?? "onType",
  };
}

function getGlobalValue<T>(config: WorkspaceConfiguration, key: string, defaultValue: T): T {
  const inspect = config.inspect<T>(key);
  return inspect?.globalValue ?? inspect?.defaultValue ?? defaultValue;
}

export async function getGlobalSettings(namespace: string): Promise<ISettings> {
  const config = getConfiguration(namespace);
  return {
    cwd: process.cwd(),
    workspace: process.cwd(),
    path: getGlobalValue<string[]>(config, "path", []),
    interpreter: [],
    importStrategy: getGlobalValue<ImportStrategy>(config, "importStrategy", "fromEnvironment"),
    codeAction: getGlobalValue<CodeAction>(config, "codeAction", {}),
    lint: getGlobalValue<Lint>(config, "lint", {}),
    enable: getGlobalValue<boolean>(config, "enable", true),
    organizeImports: getGlobalValue<boolean>(config, "organizeImports", true),
    fixAll: getGlobalValue<boolean>(config, "fixAll", true),
    showNotifications: getGlobalValue<string>(config, "showNotifications", "off"),
    enableExperimentalFormatter: getGlobalValue<boolean>(
      config,
      "enableExperimentalFormatter",
      false,
    ),

    // Deprecated settings (prefer `lint.args`, etc.).
    args: getGlobalValue<string[]>(config, "args", []),
    run: getGlobalValue<Run>(config, "run", "onType"),
  };
}

export function checkIfConfigurationChanged(
  e: ConfigurationChangeEvent,
  namespace: string,
): boolean {
  const settings = [
    `${namespace}.codeAction`,
    `${namespace}.enableExperimentalFormatter`,
    `${namespace}.enable`,
    `${namespace}.fixAll`,
    `${namespace}.importStrategy`,
    `${namespace}.interpreter`,
    `${namespace}.lint`,
    `${namespace}.organizeImports`,
    `${namespace}.path`,
    `${namespace}.showNotifications`,

    // Deprecated settings (prefer `lint.args`, etc.).
    `${namespace}.args`,
    `${namespace}.run`,
  ];
  return settings.some((s) => e.affectsConfiguration(s));
}
