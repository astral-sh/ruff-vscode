import { WriteStream } from "fs-extra";
import * as util from "util";
import { Disposable } from "vscode-jsonrpc";
import { Arguments, ILogging } from "./types";
import { getTimeForLogging } from "../utilities";

function formatMessage(level: string, ...data: Arguments): string {
  return `[${level.toUpperCase()} ${getTimeForLogging()}]: ${util.format(...data)}\r\n`;
}

export class FileLogger implements ILogging, Disposable {
  constructor(private readonly stream: WriteStream) {}

  public traceLog(...data: Arguments): void {
    this.stream.write(`${util.format(...data)}\r\n`);
  }

  public traceError(...data: Arguments): void {
    this.stream.write(formatMessage("error", ...data));
  }

  public traceWarn(...data: Arguments): void {
    this.stream.write(formatMessage("warn", ...data));
  }

  public traceInfo(...data: Arguments): void {
    this.stream.write(formatMessage("info", ...data));
  }

  public traceVerbose(...data: Arguments): void {
    this.stream.write(formatMessage("debug", ...data));
  }

  public dispose(): void {
    try {
      this.stream.close();
    } catch (ex) {
      /** do nothing */
    }
  }
}
