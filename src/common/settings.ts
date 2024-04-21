import {
  ConfigurationChangeEvent,
  ConfigurationScope,
  Uri,
  WorkspaceConfiguration,
  WorkspaceFolder,
} from "vscode";
import { traceError } from "./log/logging";
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
  experimentalServer: boolean;
  cwd: string;
  workspace: string;
  path: string[];
  ignoreStandardLibrary: boolean;
  interpreter: string[];
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

function getLineLength(configuration: WorkspaceConfiguration, key: string): number | undefined {
  let lineLength = configuration.get<number>(key);
  if (lineLength && lineLength > 0 && lineLength <= 320) {
    return lineLength;
  }
  return undefined;
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
    lineLength: getLineLength(config, "lineLength"),
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

function getGlobalLineLength(config: WorkspaceConfiguration, key: string): number | undefined {
  let lineLength = config.inspect<number>(key)?.globalValue;
  if (lineLength && lineLength > 0 && lineLength <= 320) {
    return lineLength;
  }
  return undefined;
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
    lineLength: getGlobalLineLength(config, "lineLength"),
  };
}

export function checkIfConfigurationChanged(
  e: ConfigurationChangeEvent,
  namespace: string,
): boolean {
  const settings = [
    `${namespace}.codeAction`,
    `${namespace}.enable`,
    `${namespace}.experimentalServer`,
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
