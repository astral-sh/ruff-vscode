/**
 * Virtual filesystem (VFS) support for the Ruff language server.
 *
 * When a URI translator is registered by a VFS provider, this module handles:
 * - Initializing the translator and translating the server's working directory
 * - Configuring LanguageClient uriConverters for bidirectional URI translation
 * - Setting up middleware for config file change notifications
 * - Translating cwd/workspace in settings sent to the server
 */
import * as vscode from "vscode";
import { LanguageClientOptions } from "vscode-languageclient/node";
import { isVirtualWorkspace } from "./vscodeapi";
import { getRegisteredTranslator, RuffUriTranslator } from "./uriTranslator";
import { ISettings } from "./settings";
import { logger } from "./logger";

/**
 * Initialize the VFS translator and configure server options.
 * Called from createNativeServer() when a translator is registered.
 *
 * @returns The translated cwd path, or undefined if no translator/translation available
 */
export async function initializeTranslator(): Promise<string | undefined> {
  const translator = getRegisteredTranslator();
  if (!translator) {
    return undefined;
  }

  const workspaceFolderUris = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri);
  try {
    await translator.initialize(workspaceFolderUris);
    logger.info("[UriTranslator] Translator initialization completed");
  } catch (err) {
    logger.error(`[UriTranslator] Translator initialization failed: ${err}`);
  }

  // Return the translated workspace root for use as server cwd
  if (workspaceFolderUris.length > 0) {
    const translatedRoot = translator.translateToDisk(workspaceFolderUris[0]);
    if (translatedRoot) {
      return translatedRoot.fsPath;
    }
  }
  return undefined;
}

/**
 * Configure LanguageClient options for VFS URI translation.
 * Adds uriConverters and middleware to the client options.
 *
 * @param clientOptions The LanguageClientOptions to configure
 * @param translator The registered URI translator
 * @param getVfsClient Function to get the current VFS LanguageClient (for sending notifications)
 */
export function configureVfsClientOptions(
  clientOptions: LanguageClientOptions,
  translator: RuffUriTranslator,
  getVfsClient: () => import("vscode-languageclient/node").LanguageClient | undefined,
): void {
  // All translate calls are synchronous — use directly in uriConverters
  clientOptions.uriConverters = {
    code2Protocol: (uri: vscode.Uri): string => {
      const translated = translator.translateToDisk(uri);
      if (translated) {
        // Use skipEncoding to avoid percent-encoding the colon in drive letters
        // (e.g., file:///c:/... instead of file:///c%3A/...)
        return translated.toString(true);
      }
      return uri.toString();
    },
    protocol2Code: (uriStr: string): vscode.Uri => {
      const uri = vscode.Uri.parse(uriStr);
      const translated = translator.translateToVirtual(uri);
      return translated ?? uri;
    },
  };

  // Middleware for config file change notifications and settings translation
  const CONFIG_FILES = ["pyproject.toml", "ruff.toml", ".ruff.toml", "setup.cfg"];

  const notifyConfigChange = (uri: vscode.Uri) => {
    const name = uri.path.split("/").pop() ?? "";
    const translated = translator.translateToDisk(uri);
    const client = getVfsClient();
    if (CONFIG_FILES.includes(name) && translated && client) {
      client.sendNotification("workspace/didChangeWatchedFiles", {
        changes: [{ uri: translated.toString(), type: 2 /* Changed */ }],
      });
    }
  };

  clientOptions.middleware = {
    didOpen: (document, next) => {
      return next(document);
    },
    didChange: (event, next) => {
      notifyConfigChange(event.document.uri);
      return next(event);
    },
    didSave: (document, next) => {
      notifyConfigChange(document.uri);
      return next(document);
    },
    workspace: {
      configuration: async (params, token, next) => {
        const result = await next(params, token);
        // Translate cwd/workspace in dynamically requested settings
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item && typeof item === "object") {
              translateSettingsObject(item as Record<string, unknown>, translator);
            }
          }
        }
        return result;
      },
    },
  };

  logger.info("[UriTranslator] External VFS translator configured on LanguageClient");
}

/**
 * Translate cwd/workspace fields in settings objects sent to the server.
 * Called from startServer() to fix initializationOptions, and from
 * workspace/configuration middleware to fix dynamically requested settings.
 */
export function translateSettingsObject(
  settings: Record<string, unknown>,
  translator: RuffUriTranslator,
): void {
  if (typeof settings.cwd === "string" && typeof settings.workspace === "string") {
    const wsUri = vscode.Uri.parse(settings.workspace as string);
    const translated = translator.translateToDisk(wsUri);
    if (translated) {
      settings.cwd = translated.fsPath;
      settings.workspace = translated.toString(true);
    }
  }
}

/**
 * Translate cwd/workspace in all settings objects before sending to the server.
 * Called from startServer() to fix initializationOptions.
 */
export function translateInitializationSettings(
  workspaceSettings: ISettings,
  extensionSettings: ISettings[],
  globalSettings: ISettings,
): void {
  const translator = getRegisteredTranslator();
  if (!translator || !isVirtualWorkspace()) {
    return;
  }

  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const translated = translator.translateToDisk(folder.uri);
    if (!translated) {
      continue;
    }
    const translatedCwd = translated.fsPath;
    const translatedWorkspace = translated.toString(true);

    // Fix workspaceSettings if it matches this folder
    if (workspaceSettings.workspace === folder.uri.toString()) {
      workspaceSettings.cwd = translatedCwd;
      workspaceSettings.workspace = translatedWorkspace;
    }

    // Fix matching extensionSettings entries
    for (const settings of extensionSettings) {
      if (settings.workspace === folder.uri.toString()) {
        settings.cwd = translatedCwd;
        settings.workspace = translatedWorkspace;
      }
    }
  }

  // Fix globalSettings — use first translated folder
  if (folders.length > 0) {
    const translated = translator.translateToDisk(folders[0].uri);
    if (translated) {
      globalSettings.cwd = translated.fsPath;
      globalSettings.workspace = translated.toString(true);
    }
  }
}
