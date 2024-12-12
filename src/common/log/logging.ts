import * as util from "util";
import { Disposable, LogOutputChannel } from "vscode";

type Arguments = unknown[];
class OutputChannelLogger {
  constructor(private readonly channel: LogOutputChannel) {}

  public traceLog(...data: Arguments): void {
    this.channel.appendLine(util.format(...data));
  }

  public traceError(...data: Arguments): void {
    this.channel.error(util.format(...data));
  }

  public traceWarn(...data: Arguments): void {
    this.channel.warn(util.format(...data));
  }

  public traceInfo(...data: Arguments): void {
    this.channel.info(util.format(...data));
  }

  public traceVerbose(...data: Arguments): void {
    this.channel.debug(util.format(...data));
  }
}

let channel: OutputChannelLogger | undefined;
export function registerLogger(logChannel: LogOutputChannel): Disposable {
  channel = new OutputChannelLogger(logChannel);
  return {
    dispose: () => {
      channel = undefined;
    },
  };
}

export function traceLog(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceLog(...args);
}

export function traceError(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceError(...args);
}

export function traceWarn(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceWarn(...args);
}

export function traceInfo(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceInfo(...args);
}

export function traceVerbose(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceVerbose(...args);
}

let knotChanel: OutputChannelLogger | undefined;
export function registerKnotLogger(logChannel: LogOutputChannel): Disposable {
  knotChanel = new OutputChannelLogger(logChannel);
  return {
    dispose: () => {
      knotChanel = undefined;
    },
  };
}

export function knotTraceLog(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceLog(...args);
}

export function knotTraceError(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceError(...args);
}

export function knotTraceWarn(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceWarn(...args);
}

export function knotTraceInfo(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceInfo(...args);
}

export function knotTraceVerbose(...args: Arguments): void {
  if (process.env.CI === "true") {
    console.log(...args);
  }
  channel?.traceVerbose(...args);
}
