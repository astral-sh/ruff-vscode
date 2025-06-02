import * as util from "util";
import * as vscode from "vscode";

class ExtensionLogger {
  /**
   * The output channel used to log messages for the extension.
   */
  readonly channel = vscode.window.createOutputChannel("Ruff", { log: true });

  /**
   * Whether the extension is running in a CI environment.
   */
  private readonly isCI = process.env.CI === "true";

  /**
   * Logs messages to the console if the extension is running in a CI environment.
   */
  private logForCI(...messages: unknown[]): void {
    if (this.isCI) {
      // eslint-disable-next-line no-console
      console.log(...messages);
    }
  }

  error(...messages: unknown[]): void {
    this.logForCI(...messages);
    this.channel.error(util.format(...messages));
  }

  warn(...messages: unknown[]): void {
    this.logForCI(...messages);
    this.channel.warn(util.format(...messages));
  }

  info(...messages: unknown[]): void {
    this.logForCI(...messages);
    this.channel.info(util.format(...messages));
  }

  debug(...messages: unknown[]): void {
    this.logForCI(...messages);
    this.channel.debug(util.format(...messages));
  }

  trace(...messages: unknown[]): void {
    this.logForCI(...messages);
    this.channel.trace(util.format(...messages));
  }
}

/**
 * The logger used by the extension.
 *
 * This will log the messages to the "Ruff" output channel, optionally logging them
 * to the console if the extension is running in a CI environment (e.g., GitHub Actions).
 *
 * This should mainly be used for logging messages that are intended for the user.
 */
export const logger = new ExtensionLogger();

/**
 * A VS Code output channel that is lazily created when it is first accessed.
 *
 * This is useful when the messages are only logged when the extension is configured
 * to log them, as it avoids creating an empty output channel.
 *
 * This is currently being used to create the trace output channel for the language server
 * as it is only created when the user enables trace logging.
 */
export class LazyOutputChannel implements vscode.OutputChannel {
  name: string;
  _channel: vscode.OutputChannel | undefined;

  constructor(name: string) {
    this.name = name;
  }

  get channel(): vscode.OutputChannel {
    if (!this._channel) {
      this._channel = vscode.window.createOutputChannel(this.name);
    }
    return this._channel;
  }

  append(value: string): void {
    this.channel.append(value);
  }

  appendLine(value: string): void {
    this.channel.appendLine(value);
  }

  replace(value: string): void {
    this.channel.replace(value);
  }

  clear(): void {
    this._channel?.clear();
  }

  show(preserveFocus?: boolean): void;
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  show(column?: any, preserveFocus?: any): void {
    this.channel.show(column, preserveFocus);
  }

  hide(): void {
    this._channel?.hide();
  }

  dispose(): void {
    this._channel?.dispose();
  }
}
