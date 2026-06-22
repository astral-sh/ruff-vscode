import * as vscode from "vscode";
import { logger } from "./logger";

/**
 * Interface for URI translators provided by VFS extensions (e.g., vscode-trident).
 *
 * VFS providers implement this interface and register it with the Ruff extension
 * via `ruffExtension.exports.registerUriTranslator(translator)`.
 *
 * This follows the same pattern as Pylance's `registerUriTranslator` API.
 */
export interface RuffUriTranslator {
  /**
   * Called once before the Ruff language server starts. Use this to prepare
   * the local disk cache — e.g., sync config files, create directory structures,
   * warm caches, and pre-populate all URI translations.
   *
   * All async work (file I/O, network requests) must happen here.
   * After initialize() resolves, translateToDisk/translateToVirtual must work synchronously.
   *
   * @param workspaceFolders The workspace folder URIs that the server will operate on
   */
  initialize(workspaceFolders: vscode.Uri[]): Promise<void>;

  /**
   * Translates a URI from a virtual workspace location to a disk cache location.
   * Called synchronously for inbound requests/notifications to the Ruff language server.
   * Must return immediately — all caching should be done in initialize().
   * @param uri The virtual workspace URI to translate
   * @returns The translated disk cache URI, or undefined if no translation is needed
   */
  translateToDisk(uri: vscode.Uri): vscode.Uri | undefined;

  /**
   * Translates a URI from a disk cache location back to a virtual workspace location.
   * Called synchronously for outbound responses from the Ruff language server.
   * Must return immediately.
   * @param uri The disk cache URI to translate
   * @returns The translated virtual workspace URI, or undefined if no translation is needed
   */
  translateToVirtual(uri: vscode.Uri): vscode.Uri | undefined;
}

/**
 * Public API exported by the Ruff extension for consumption by VFS providers.
 *
 * Usage from a VFS extension:
 * ```typescript
 * const ruffExtension = vscode.extensions.getExtension('charliermarsh.ruff');
 * if (ruffExtension?.isActive && ruffExtension.exports?.registerUriTranslator) {
 *   ruffExtension.exports.registerUriTranslator(myTranslator);
 * }
 * ```
 */
export interface RuffExtensionApi {
  /**
   * Register a URI translator for virtual workspace support.
   * When registered, the Ruff language server will be restarted to use the
   * translator for all URI conversions between VS Code and the server.
   *
   * Only one translator can be registered at a time. Registering a new
   * translator replaces the previous one and triggers a server restart.
   */
  registerUriTranslator(translator: RuffUriTranslator): void;
}

// Module-level state for the registered translator
let registeredTranslator: RuffUriTranslator | undefined;
let onTranslatorRegistered: (() => Promise<void>) | undefined;

/**
 * Get the currently registered URI translator, if any.
 */
export function getRegisteredTranslator(): RuffUriTranslator | undefined {
  return registeredTranslator;
}

/**
 * Create the extension API object that will be returned from `activate()`.
 * @param restartCallback Called when a translator is registered to restart the server
 */
export function createExtensionApi(
  restartCallback: () => Promise<void>,
): RuffExtensionApi {
  onTranslatorRegistered = restartCallback;

  return {
    registerUriTranslator(translator: RuffUriTranslator): void {
      logger.info("[UriTranslator] URI translator registered by external VFS provider");
      registeredTranslator = translator;

      // Restart the language server so it picks up the translator
      if (onTranslatorRegistered) {
        onTranslatorRegistered().then(() => {
        }).catch((err) => {
          logger.error(`[UriTranslator] Failed to restart server after translator registration: ${err}`);
        });
      } else {
      }
    },
  };
}

/**
 * Clear the registered translator (for cleanup on deactivation).
 */
export function clearRegisteredTranslator(): void {
  registeredTranslator = undefined;
  onTranslatorRegistered = undefined;
}
