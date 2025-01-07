import * as util from "util";
import * as vscode from "vscode";

class ExtensionLogger {
  readonly channel = vscode.window.createOutputChannel("Ruff", { log: true });
  private readonly isCI = process.env.CI === "true";

  error(...messages: unknown[]): void {
    if (this.isCI) {
      console.log(...messages);
    }
    this.channel.error(util.format(...messages));
  }

  warn(...messages: unknown[]): void {
    if (this.isCI) {
      console.log(...messages);
    }
    this.channel.warn(util.format(...messages));
  }

  info(...messages: unknown[]): void {
    if (this.isCI) {
      console.log(...messages);
    }
    this.channel.info(util.format(...messages));
  }

  debug(...messages: unknown[]): void {
    if (this.isCI) {
      console.log(...messages);
    }
    this.channel.debug(util.format(...messages));
  }

  trace(...messages: unknown[]): void {
    if (this.isCI) {
      console.log(...messages);
    }
    this.channel.trace(util.format(...messages));
  }
}

export const logger = new ExtensionLogger();

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
    if (this._channel) {
      this._channel.clear();
    }
  }

  show(preserveFocus?: boolean): void;
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  show(column?: any, preserveFocus?: any): void {
    this.channel.show(column, preserveFocus);
  }

  hide(): void {
    if (this._channel) {
      this._channel.hide();
    }
  }

  dispose(): void {
    if (this._channel) {
      this._channel.dispose();
    }
  }
}
