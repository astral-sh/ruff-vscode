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
