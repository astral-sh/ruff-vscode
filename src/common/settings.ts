import * as vscode from "vscode";
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

type ConfigPreference = "editorFirst" | "filesystemFirst" | "editorOnly";

type NativeServer = boolean | "on" | "off" | "auto";

type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

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
  preview?: boolean;
  select?: string[];
  extendSelect?: string[];
  ignore?: string[];
};

type Format = {
  args?: string[];
  preview?: boolean;
};

export interface ISettings {
  nativeServer: NativeServer;
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
  exclude?: string[];
  lineLength?: number;
  configurationPreference?: ConfigPreference;
  showSyntaxErrors: boolean;
  logLevel?: LogLevel;
  logFile?: string;
}

export function getExtensionSettings(namespace: string): Promise<ISettings[]> {
  return Promise.all(
    getWorkspaceFolders().map((workspaceFolder) =>
      getWorkspaceSettings(namespace, workspaceFolder),
    ),
  );
}

function resolveVariables(value: string[], workspace?: WorkspaceFolder): string[];
function resolveVariables(value: string, workspace?: WorkspaceFolder): string;
function resolveVariables(
  value: string | string[],
  workspace?: WorkspaceFolder,
): string | string[] | null {
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

  if (typeof value === "string") {
    let s = value;
    for (const [key, value] of substitutions) {
      s = s.replace(key, value);
    }
    return s;
  } else {
    return value.map((s) => {
      for (const [key, value] of substitutions) {
        s = s.replace(key, value);
      }
      return s;
    });
  }
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
  if (interpreter.length === 0 && vscode.workspace.isTrusted) {
    interpreter = (await getInterpreterDetails(workspace.uri)).path ?? [];
  }

  let configuration = config.get<string>("configuration") ?? null;
  if (configuration !== null) {
    configuration = resolveVariables(configuration, workspace);
  }

  return {
    nativeServer: config.get<NativeServer>("nativeServer") ?? "auto",
    cwd: workspace.uri.fsPath,
    workspace: workspace.uri.toString(),
    path: resolveVariables(config.get<string[]>("path") ?? [], workspace),
    ignoreStandardLibrary: config.get<boolean>("ignoreStandardLibrary") ?? true,
    interpreter: resolveVariables(interpreter, workspace),
    configuration,
    importStrategy: config.get<ImportStrategy>("importStrategy") ?? "fromEnvironment",
    codeAction: config.get<CodeAction>("codeAction") ?? {},
    lint: {
      enable: getPreferredWorkspaceSetting<boolean>("lint.enable", "enable", config) ?? true,
      run: getPreferredWorkspaceSetting<Run>("lint.run", "run", config) ?? "onType",
      args: resolveVariables(
        getPreferredWorkspaceSetting<string[]>("lint.args", "args", config) ?? [],
        workspace,
      ),
      preview: config.get<boolean>("lint.preview"),
      select: config.get<string[]>("lint.select"),
      extendSelect: config.get<string[]>("lint.extendSelect"),
      ignore: config.get<string[]>("lint.ignore"),
    },
    format: {
      args: resolveVariables(config.get<string[]>("format.args") ?? [], workspace),
      preview: config.get<boolean>("format.preview"),
    },
    enable: config.get<boolean>("enable") ?? true,
    organizeImports: config.get<boolean>("organizeImports") ?? true,
    fixAll: config.get<boolean>("fixAll") ?? true,
    showNotifications: config.get<string>("showNotifications") ?? "off",
    exclude: config.get<string[]>("exclude"),
    lineLength: config.get<number>("lineLength"),
    configurationPreference:
      config.get<ConfigPreference>("configurationPreference") ?? "editorFirst",
    showSyntaxErrors: config.get<boolean>("showSyntaxErrors") ?? true,
    logLevel: config.get<LogLevel>("logLevel"),
    logFile: config.get<string>("logFile"),
  };
}

function getGlobalValue<T>(config: WorkspaceConfiguration, key: string, defaultValue: T): T {
  const inspect = config.inspect<T>(key);
  return inspect?.globalValue ?? inspect?.defaultValue ?? defaultValue;
}

function getOptionalGlobalValue<T>(config: WorkspaceConfiguration, key: string): T | undefined {
  const inspect = config.inspect<T>(key);
  return inspect?.globalValue;
}

export async function getGlobalSettings(namespace: string): Promise<ISettings> {
  const config = getConfiguration(namespace);
  return {
    nativeServer: getGlobalValue<NativeServer>(config, "nativeServer", "auto"),
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
      preview: getOptionalGlobalValue<boolean>(config, "lint.preview"),
      select: getOptionalGlobalValue<string[]>(config, "lint.select"),
      extendSelect: getOptionalGlobalValue<string[]>(config, "lint.extendSelect"),
      ignore: getOptionalGlobalValue<string[]>(config, "lint.ignore"),
    },
    format: {
      args: getGlobalValue<string[]>(config, "format.args", []),
      preview: getOptionalGlobalValue<boolean>(config, "format.preview"),
    },
    enable: getGlobalValue<boolean>(config, "enable", true),
    organizeImports: getGlobalValue<boolean>(config, "organizeImports", true),
    fixAll: getGlobalValue<boolean>(config, "fixAll", true),
    showNotifications: getGlobalValue<string>(config, "showNotifications", "off"),
    exclude: getOptionalGlobalValue<string[]>(config, "exclude"),
    lineLength: getOptionalGlobalValue<number>(config, "lineLength"),
    configurationPreference: getGlobalValue<ConfigPreference>(
      config,
      "configurationPreference",
      "editorFirst",
    ),
    showSyntaxErrors: getGlobalValue<boolean>(config, "showSyntaxErrors", true),
    logLevel: getOptionalGlobalValue<LogLevel>(config, "logLevel"),
    logFile: getOptionalGlobalValue<string>(config, "logFile"),
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
    `${namespace}.nativeServer`,
    `${namespace}.fixAll`,
    `${namespace}.ignoreStandardLibrary`,
    `${namespace}.importStrategy`,
    `${namespace}.interpreter`,
    `${namespace}.lint.enable`,
    `${namespace}.lint.run`,
    `${namespace}.lint.preview`,
    `${namespace}.lint.select`,
    `${namespace}.lint.extendSelect`,
    `${namespace}.lint.ignore`,
    `${namespace}.organizeImports`,
    `${namespace}.path`,
    `${namespace}.showNotifications`,
    `${namespace}.format.preview`,
    `${namespace}.exclude`,
    `${namespace}.lineLength`,
    `${namespace}.configurationPreference`,
    `${namespace}.showSyntaxErrors`,
    `${namespace}.logLevel`,
    `${namespace}.logFile`,
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

/**
 * Get the settings that were explicitly set by the user that are only relevant
 * to the native server.
 */
export function getUserSetNativeServerSettings(
  namespace: string,
  workspace: WorkspaceFolder,
): string[] {
  const settings = [
    "configuration",
    "configurationPreference",
    "exclude",
    "lineLength",
    "lint.preview",
    "lint.select",
    "lint.extendSelect",
    "lint.ignore",
    "lint.extendIgnore",
    "format.preview",
  ];
  const config = getConfiguration(namespace, workspace);
  return settings
    .filter((s) => isSettingExplicitlySetByUser(config, s))
    .map((s) => `${namespace}.${s}`);
}

/**
 * Get the settings that were explicitly set by the user that are only relevant
 * to the legacy server.
 */
export function getUserSetLegacyServerSettings(
  namespace: string,
  workspace: WorkspaceFolder,
): string[] {
  const settings = ["ignoreStandardLibrary", "lint.run", "lint.args", "format.args"];
  const config = getConfiguration(namespace, workspace);
  return settings
    .filter((s) => isSettingExplicitlySetByUser(config, s))
    .map((s) => `${namespace}.${s}`);
}

/**
 * Check if a setting was explicitly set by the user.
 */
function isSettingExplicitlySetByUser(config: WorkspaceConfiguration, section: string): boolean {
  const inspect = config.inspect(section);
  return (
    inspect?.globalValue !== undefined ||
    inspect?.workspaceValue !== undefined ||
    inspect?.workspaceFolderValue !== undefined
  );
}
