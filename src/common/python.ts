import { isDeepStrictEqual } from "node:util";
import { type Disposable, type Event, EventEmitter, extensions, Uri } from "vscode";
import {
  PythonExtension as PythonExtensionApi,
  type ResolvedEnvironment,
} from "@vscode/python-extension";
import type { PythonEnvironment, PythonEnvironmentApi } from "@vscode/python-environments";
import { logger } from "./logger";

const onDidChangeActivePythonEnvironmentEvent =
  new EventEmitter<OnDidChangeActivePythonEnvironmentEventArgs>();

export type OnDidChangeActivePythonEnvironmentEventArgs = {
  path?: string;
  uri?: Uri;
};

export const onDidChangeActivePythonEnvironment: Event<OnDidChangeActivePythonEnvironmentEventArgs> =
  onDidChangeActivePythonEnvironmentEvent.event;

export type PythonCommand = {
  executable: string;
  args: string[];
};

export interface PythonEnvironmentDetails {
  command: PythonCommand | null;
  sysPrefix: string;
  version: {
    major: number;
    minor: number;
    patch: number | null;
  } | null;
}

export interface EnvironmentProvider {
  initialize(disposables: Disposable[]): Promise<void>;

  /** Resolve a Python executable or environment directory to an environment. */
  resolveInterpreter(path: string): Promise<PythonEnvironmentDetails | null>;

  /** Resolve the active Python environment for a file, folder, or workspace. */
  getActiveEnvironment(uri?: Uri): Promise<PythonEnvironmentDetails | null>;
}

export async function getEnvironmentProvider(): Promise<EnvironmentProvider | null> {
  return (await getPythonEnvironmentExtension()) ?? (await getPythonExtension());
}

let pythonExtensionApi: PythonExtensionApi | undefined;

async function getPythonExtensionAPI(): Promise<PythonExtensionApi> {
  pythonExtensionApi ??= await PythonExtensionApi.api();
  return pythonExtensionApi;
}

/** Facade for the traditional Python extension environment API. */
class PythonExtension implements EnvironmentProvider {
  readonly #extension: PythonExtensionApi;

  private constructor(extension: PythonExtensionApi) {
    this.#extension = extension;
  }

  static async tryActivate(): Promise<PythonExtension | null> {
    logger.info("Initializing Python extension");

    try {
      return new PythonExtension(await getPythonExtensionAPI());
    } catch (error) {
      logger.error("Error initializing the Python extension: ", error);
      return null;
    }
  }

  async initialize(disposables: Disposable[]): Promise<void> {
    logger.info("Using Python extension for Python environment detection");
    disposables.push(
      this.#extension.environments.onDidChangeActiveEnvironmentPath((event) => {
        onDidChangeActivePythonEnvironmentEvent.fire({
          path: event.path,
          uri: event.resource instanceof Uri ? event.resource : event.resource?.uri,
        });
      }),
    );
  }

  async resolveInterpreter(path: string): Promise<PythonEnvironmentDetails | null> {
    const environment = await this.#extension.environments.resolveEnvironment(path);
    return environment == null ? null : PythonExtension.toEnvironmentDetails(environment);
  }

  async getActiveEnvironment(uri?: Uri): Promise<PythonEnvironmentDetails | null> {
    const environment = await this.#extension.environments.resolveEnvironment(
      this.#extension.environments.getActiveEnvironmentPath(uri),
    );
    return environment == null ? null : PythonExtension.toEnvironmentDetails(environment);
  }

  private static toEnvironmentDetails(environment: ResolvedEnvironment): PythonEnvironmentDetails {
    const version = environment.version;
    const executable = environment.executable.uri?.fsPath;

    return {
      command: executable == null ? null : { executable, args: [] },
      sysPrefix: environment.executable.sysPrefix,
      version:
        version == null
          ? null
          : {
              major: version.major,
              minor: version.minor,
              patch: version.micro,
            },
    };
  }
}

const pythonExtension = lazyInit(PythonExtension.tryActivate);

async function getPythonExtension(): Promise<PythonExtension | null> {
  return pythonExtension.get();
}

/** Facade for the dedicated Python Environments extension API. */
class PythonEnvironmentExtension implements EnvironmentProvider {
  readonly #extension: PythonEnvironmentApi;
  // The extension emits duplicate change events, so only forward actual changes per scope.
  readonly #activeEnvironments = createActiveEnvironmentCache();

  private constructor(extension: PythonEnvironmentApi) {
    this.#extension = extension;
  }

  static async tryActivate(): Promise<PythonEnvironmentExtension | null> {
    const extension = extensions.getExtension("ms-python.vscode-python-envs");

    if (extension == null) {
      logger.info("The Python Environments extension is not installed or is disabled.");
      return null;
    }

    if (!extension.isActive) {
      try {
        logger.info("Activating the Python Environments extension");
        await extension.activate();
        logger.info("Successfully activated the Python Environments extension.");
      } catch {
        logger.warn("Failed to activate the Python Environments extension.");
        return null;
      }
    }

    // The extension exports no API when `python.useEnvironmentsExtension` is false.
    if (extension.exports == null) {
      logger.info(
        "The Python Environments extension is disabled by 'python.useEnvironmentsExtension'.",
      );
      return null;
    }

    return new PythonEnvironmentExtension(extension.exports as PythonEnvironmentApi);
  }

  async initialize(disposables: Disposable[]): Promise<void> {
    logger.info("Using Python Environments extension for Python environment detection");

    await this.getActiveEnvironment(undefined);

    disposables.push(
      this.#extension.onDidChangeEnvironment((event) => {
        logger.debug(`Python Environments didChangeEnvironment: ${JSON.stringify(event, null, 2)}`);

        const environment = event.new == null ? null : this.toEnvironmentDetails(event.new);
        const previousEnvironment = event.old == null ? null : this.toEnvironmentDetails(event.old);

        if (areEnvironmentsEqual(previousEnvironment, environment)) {
          this.#activeEnvironments.remember(event.uri, environment);
          logger.debug(
            `Ignoring Python Environments change event because the active environment is unchanged for '${event.uri ?? "workspace"}'.`,
          );
          return;
        }

        if (!this.#activeEnvironments.record(event.uri, environment)) {
          logger.debug(
            `Ignoring Python Environments change event because the active environment is unchanged for '${event.uri ?? "workspace"}'.`,
          );
          return;
        }

        onDidChangeActivePythonEnvironmentEvent.fire({
          path: environment?.command?.executable,
          uri: event.uri,
        });
      }),
    );
  }

  async resolveInterpreter(path: string): Promise<PythonEnvironmentDetails | null> {
    const environment = await this.#extension.resolveEnvironment(Uri.file(path));
    return environment == null ? null : this.toEnvironmentDetails(environment);
  }

  async getActiveEnvironment(uri?: Uri): Promise<PythonEnvironmentDetails | null> {
    const environment = await this.#extension.getEnvironment(uri);
    const details = environment == null ? null : this.toEnvironmentDetails(environment);

    this.#activeEnvironments.remember(uri, details);
    if (details != null) {
      logger.debug(`Resolved Python environment: '${details.sysPrefix}'`);
    }
    return details;
  }

  private toEnvironmentDetails(environment: PythonEnvironment): PythonEnvironmentDetails | null {
    if (environment.error) {
      logger.warn(
        `Ignoring environment '${environment.environmentPath}' with errors: ${environment.error}`,
      );
      return null;
    }

    return {
      command: {
        executable: environment.execInfo.run.executable,
        args: environment.execInfo.run.args ?? [],
      },
      sysPrefix: environment.sysPrefix,
      version: PythonEnvironmentExtension.parseVersion(environment.version),
    };
  }

  private static parseVersion(version: string): PythonEnvironmentDetails["version"] {
    const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);
    if (match == null) {
      return null;
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: match[3] == null ? null : parseInt(match[3]),
    };
  }
}

const pythonEnvironmentExtension = lazyInit(PythonEnvironmentExtension.tryActivate);

async function getPythonEnvironmentExtension(): Promise<PythonEnvironmentExtension | null> {
  return pythonEnvironmentExtension.get();
}

function createActiveEnvironmentCache() {
  const environments = new Map<string | symbol, PythonEnvironmentDetails | null>();
  const workspaceKey = Symbol("workspace");
  const scopeKey = (uri: Uri | undefined) => uri?.toString() ?? workspaceKey;

  return {
    remember(uri: Uri | undefined, environment: PythonEnvironmentDetails | null): void {
      environments.set(scopeKey(uri), environment);
    },

    record(uri: Uri | undefined, environment: PythonEnvironmentDetails | null): boolean {
      const key = scopeKey(uri);
      const unchanged = isDeepStrictEqual(environments.get(key), environment);
      environments.set(key, environment);
      return !unchanged;
    },
  };
}

function areEnvironmentsEqual(
  left: PythonEnvironmentDetails | null,
  right: PythonEnvironmentDetails | null,
): boolean {
  return isDeepStrictEqual(left, right);
}

export function checkInterpreterVersion(environment: PythonEnvironmentDetails): boolean | null {
  const version = environment.version;
  if (version == null) {
    return null;
  }
  if (version.major === 3 && version.minor >= 8) {
    return true;
  }

  logger.warn(`Python version ${version.major}.${version.minor} is not supported.`);
  logger.warn(`Selected Python path: '${environment.command?.executable}'`);
  logger.warn("Supported versions are 3.8 and above.");
  return false;
}

export async function getDebuggerPath(): Promise<string | undefined> {
  const api = await getPythonExtensionAPI();
  return api.debug.getDebuggerPackagePath();
}

const unavailable = Symbol("unavailable");

function lazyInit<T>(factory: () => Promise<T | null>): { get(): Promise<T | null> } {
  let cache: T | null | typeof unavailable = null;

  return {
    async get() {
      if (cache === unavailable) {
        return null;
      }

      const cached = cache ?? (await factory());
      if (cached == null) {
        cache = unavailable;
        return null;
      }

      cache = cached;
      return cached;
    },
  };
}
