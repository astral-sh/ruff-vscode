import { LogLevel, WorkspaceFolder } from "vscode";
import { Trace } from "vscode-jsonrpc/node";
import { getWorkspaceFolders } from "./vscodeapi";

function logLevelToTrace(logLevel: LogLevel): Trace {
  switch (logLevel) {
    case LogLevel.Error:
    case LogLevel.Warning:
    case LogLevel.Info:
      return Trace.Messages;

    case LogLevel.Debug:
    case LogLevel.Trace:
      return Trace.Verbose;

    case LogLevel.Off:
    default:
      return Trace.Off;
  }
}

export function getLSClientTraceLevel(channelLogLevel: LogLevel, globalLogLevel: LogLevel): Trace {
  if (channelLogLevel === LogLevel.Off) {
    return logLevelToTrace(globalLogLevel);
  }
  if (globalLogLevel === LogLevel.Off) {
    return logLevelToTrace(channelLogLevel);
  }
  const level = logLevelToTrace(
    channelLogLevel <= globalLogLevel ? channelLogLevel : globalLogLevel,
  );
  return level;
}

export function getProjectRoot(): WorkspaceFolder | null {
  const workspaces: readonly WorkspaceFolder[] = getWorkspaceFolders();
  if (workspaces.length === 0) {
    return null;
  } else if (workspaces.length === 1) {
    return workspaces[0];
  } else {
    let root = workspaces[0].uri.fsPath;
    let rootWorkspace = workspaces[0];
    for (const workspace of workspaces) {
      if (root.length > workspace.uri.fsPath.length) {
        root = workspace.uri.fsPath;
        rootWorkspace = workspace;
      }
    }
    return rootWorkspace;
  }
}
