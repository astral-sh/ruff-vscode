import { ConfigurationChangeEvent, Uri } from "vscode";
import { getInterpreterDetails } from "./python";
import { getConfiguration, getWorkspaceFolders } from "./vscodeapi";

type ImportStrategy = "fromEnvironment" | "useBundled";

type Run = "onType" | "onSave";

export interface ISettings {
  workspace: string;
  args: string[];
  path: string[];
  interpreter: string[];
  importStrategy: ImportStrategy;
  run: Run;
  enable: boolean;
  showNotifications: string;
  organizeImports: boolean;
  fixAll: boolean;
}

export async function getExtensionSettings(namespace: string): Promise<ISettings[]> {
  const settings: ISettings[] = [];
  const workspaces = getWorkspaceFolders();

  for (const workspace of workspaces) {
    const workspaceSetting = await getWorkspaceSettings(namespace, workspace.uri);
    settings.push({
      workspace: workspace.uri.toString(),
      ...workspaceSetting,
    });
  }

  return settings;
}

export function getInterpreterFromSetting(namespace: string): string[] | undefined {
  const config = getConfiguration(namespace);
  return config.get<string[]>("interpreter");
}

export async function getWorkspaceSettings(
  namespace: string,
  resource?: Uri,
): Promise<Omit<ISettings, "workspace">> {
  const config = getConfiguration(namespace, resource);

  let interpreter: string[] | undefined = getInterpreterFromSetting(namespace);
  if (interpreter === undefined || interpreter.length === 0) {
    interpreter = (await getInterpreterDetails(resource)).path;
  }

  return {
    args: config.get<string[]>(`args`) ?? [],
    path: config.get<string[]>(`path`) ?? [],
    interpreter: interpreter ?? [],
    importStrategy: config.get<ImportStrategy>(`importStrategy`) ?? "fromEnvironment",
    run: config.get<Run>(`run`) ?? "onType",
    enable: config.get<boolean>(`enable`) ?? true,
    showNotifications: config.get<string>(`showNotifications`) ?? "off",
    organizeImports: config.get<boolean>(`organizeImports`) ?? true,
    fixAll: config.get<boolean>(`fixAll`) ?? true,
  };
}

export async function getGlobalSettings(namespace: string): Promise<Omit<ISettings, "workspace">> {
  const config = getConfiguration(namespace);

  let interpreter: string[] | undefined = getInterpreterFromSetting(namespace);

  return {
    args: config.get<string[]>(`args`) ?? [],
    path: config.get<string[]>(`path`) ?? [],
    interpreter: interpreter ?? [],
    importStrategy: config.get<ImportStrategy>(`importStrategy`) ?? "fromEnvironment",
    run: config.get<Run>(`run`) ?? "onType",
    enable: config.get<boolean>(`enable`) ?? true,
    showNotifications: config.get<string>(`showNotifications`) ?? "off",
    organizeImports: config.get<boolean>(`organizeImports`) ?? true,
    fixAll: config.get<boolean>(`fixAll`) ?? true,
  };
}

export function checkIfConfigurationChanged(
  e: ConfigurationChangeEvent,
  namespace: string,
): boolean {
  const settings = [
    `${namespace}.args`,
    `${namespace}.path`,
    `${namespace}.interpreter`,
    `${namespace}.importStrategy`,
    `${namespace}.run`,
    `${namespace}.enable`,
    `${namespace}.showNotifications`,
    `${namespace}.organizeImports`,
    `${namespace}.fixAll`,
  ];
  return settings.some((s) => e.affectsConfiguration(s));
}
