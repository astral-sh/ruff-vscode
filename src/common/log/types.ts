// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export type Arguments = unknown[];

export interface ILogging {
    traceLog(...data: Arguments): void;
    traceError(...data: Arguments): void;
    traceWarn(...data: Arguments): void;
    traceInfo(...data: Arguments): void;
    traceVerbose(...data: Arguments): void;
}

export type LoggingLevelSettingType = 'off' | 'error' | 'warn' | 'info' | 'debug';
export enum LogLevel {
    off = 0,
    error = 10,
    warn = 20,
    info = 30,
    debug = 40,
}
