import {
  ConfigurationChangeEvent,
  ConfigurationScope,
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
  enable?: boolean;
  args?: string[];
  run?: Run;
};

type Format = {
  args?: string[];
};

export interface ISettings {
  experimentalServer: boolean;
  cwd: string;
  workspace: string;
  path: string[];
  ignoreStandardLibrary: boolean;
  interpreter: string[];
  configuration: string | null;
  importStrategy: ImportStrategy;
  codeAction: CodeAction;
  enable: boolean;
  showNotifications: string;
  organizeImports: boolean;
  fixAll: boolean;
  lint: Lint;
  format: Format;
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
    experimentalServer: config.get<boolean>("experimentalServer") ?? false,
    cwd: workspace.uri.fsPath,
    workspace: workspace.uri.toString(),
    path: resolveVariables(config.get<string[]>("path") ?? [], workspace),
    ignoreStandardLibrary: config.get<boolean>("ignoreStandardLibrary") ?? true,
    interpreter: resolveVariables(interpreter, workspace),
    configuration: config.get<string | null>("configuration") ?? null,
    importStrategy: config.get<ImportStrategy>("importStrategy") ?? "fromEnvironment",
    codeAction: config.get<CodeAction>("codeAction") ?? {},
    lint: {
      enable: getPreferredWorkspaceSetting<boolean>("lint.enable", "enable", config) ?? true,
      run: getPreferredWorkspaceSetting<Run>("lint.run", "run", config) ?? "onType",
      args: resolveVariables(
        getPreferredWorkspaceSetting<string[]>("lint.args", "args", config) ?? [],
        workspace,
      ),
    },
    format: {
      args: resolveVariables(config.get<string[]>("format.args") ?? [], workspace),
    },
    enable: config.get<boolean>("enable") ?? true,
    organizeImports: config.get<boolean>("organizeImports") ?? true,
    fixAll: config.get<boolean>("fixAll") ?? true,
    showNotifications: config.get<string>("showNotifications") ?? "off",
  };
}

function getGlobalValue<T>(config: WorkspaceConfiguration, key: string, defaultValue: T): T {
  const inspect = config.inspect<T>(key);
  return inspect?.globalValue ?? inspect?.defaultValue ?? defaultValue;
}

export async function getGlobalSettings(namespace: string): Promise<ISettings> {
  const config = getConfiguration(namespace);
  return {
    experimentalServer: getGlobalValue<boolean>(config, "experimentalServer", false),
    cwd: process.cwd(),
    workspace: process.cwd(),
    path: getGlobalValue<string[]>(config, "path", []),
    ignoreStandardLibrary: getGlobalValue<boolean>(config, "ignoreStandardLibrary", true),
    interpreter: [],
    configuration: getGlobalValue<string | null>(config, "configuration", null),
    importStrategy: getGlobalValue<ImportStrategy>(config, "importStrategy", "fromEnvironment"),
    codeAction: getGlobalValue<CodeAction>(config, "codeAction", {}),
    lint: {
      enable: getPreferredGlobalSetting<boolean>("lint.enable", "enable", config) ?? true,
      run: getPreferredGlobalSetting<Run>("lint.run", "run", config) ?? "onType",
      args: getPreferredGlobalSetting<string[]>("lint.args", "args", config) ?? [],
    },
    format: {
      args: getGlobalValue<string[]>(config, "format.args", []),
    },
    enable: getGlobalValue<boolean>(config, "enable", true),
    organizeImports: getGlobalValue<boolean>(config, "organizeImports", true),
    fixAll: getGlobalValue<boolean>(config, "fixAll", true),
    showNotifications: getGlobalValue<string>(config, "showNotifications", "off"),
  };
}

export function checkIfConfigurationChanged(
  e: ConfigurationChangeEvent,
  namespace: string,
): boolean {
  const settings = [
    `${namespace}.codeAction`,
    `${namespace}.configuration`,
    `${namespace}.enable`,
    `${namespace}.experimentalServer`,
    `${namespace}.fixAll`,
    `${namespace}.ignoreStandardLibrary`,
    `${namespace}.importStrategy`,
    `${namespace}.interpreter`,
    `${namespace}.lint.enable`,
    `${namespace}.lint.run`,
    `${namespace}.organizeImports`,
    `${namespace}.path`,
    `${namespace}.showNotifications`,
    // Deprecated settings (prefer `lint.args`, etc.).
    `${namespace}.args`,
    `${namespace}.run`,
    // Deprecated settings (will be replaced with specific config options in the future)
    `${namespace}.lint.args`,
    `${namespace}.format.args`,
  ];
  return settings.some((s) => e.affectsConfiguration(s));
}

/**
 * Get the preferred value for a workspace setting.
 */
function getPreferredWorkspaceSetting<T>(
  section: string,
  deprecated: string,
  config: WorkspaceConfiguration,
): T | undefined {
  // If a value was explicitly provided for the new setting, respect it.
  const newSetting = config.inspect<T>(section);
  if (
    newSetting?.globalValue !== undefined ||
    newSetting?.workspaceValue !== undefined ||
    newSetting?.workspaceFolderValue !== undefined ||
    newSetting?.defaultLanguageValue !== undefined ||
    newSetting?.globalLanguageValue !== undefined ||
    newSetting?.workspaceLanguageValue !== undefined ||
    newSetting?.workspaceFolderLanguageValue !== undefined
  ) {
    return config.get<T>(section);
  }

  // If a value was explicitly provided for the deprecated setting, respect it.
  const deprecatedSetting = config.inspect<T>(deprecated);
  if (
    deprecatedSetting?.globalValue !== undefined ||
    deprecatedSetting?.workspaceValue !== undefined ||
    deprecatedSetting?.workspaceFolderValue !== undefined ||
    deprecatedSetting?.defaultLanguageValue !== undefined ||
    deprecatedSetting?.globalLanguageValue !== undefined ||
    deprecatedSetting?.workspaceLanguageValue !== undefined ||
    deprecatedSetting?.workspaceFolderLanguageValue !== undefined
  ) {
    return config.get<T>(deprecated);
  }

  return newSetting?.defaultValue;
}

/**
 * Get the preferred value for a global setting.
 */
function getPreferredGlobalSetting<T>(
  section: string,
  deprecated: string,
  config: WorkspaceConfiguration,
): T | undefined {
  // If a value was explicitly provided for the new setting, respect it.
  const newSettings = config.inspect<T>(section);
  if (newSettings?.globalValue !== undefined) {
    return newSettings.globalValue;
  }

  // If a value was explicitly provided for the deprecated setting, respect it.
  const deprecatedSetting = config.inspect<T>(deprecated);
  if (deprecatedSetting?.globalValue !== undefined) {
    return deprecatedSetting.globalValue;
  }

  return newSettings?.defaultValue;
}
