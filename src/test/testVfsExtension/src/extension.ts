"use strict";

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

import type { RuffUriTranslator, RuffExtensionApi } from "../../../common/uriTranslator";

// --- In-memory virtual file store ---

const VIRTUAL_FILES: Record<string, string> = {};

// --- FileSystemProvider ---

class TestFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this._emitter.event;
  readonly scheme = "testvfs";

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const p = uri.path;
    if (VIRTUAL_FILES[p] !== undefined) {
      return {
        type: vscode.FileType.File,
        ctime: 0,
        mtime: Date.now(),
        size: Buffer.byteLength(VIRTUAL_FILES[p], "utf-8"),
      };
    }
    if (Object.keys(VIRTUAL_FILES).some((k) => k.startsWith(p + "/")) || p === "/") {
      return { type: vscode.FileType.Directory, ctime: 0, mtime: Date.now(), size: 0 };
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    const prefix = uri.path.endsWith("/") ? uri.path : uri.path + "/";
    const entries = new Map<string, vscode.FileType>();
    for (const key of Object.keys(VIRTUAL_FILES)) {
      if (key.startsWith(prefix)) {
        const rest = key.substring(prefix.length);
        const parts = rest.split("/");
        entries.set(
          parts[0],
          parts.length === 1 ? vscode.FileType.File : vscode.FileType.Directory,
        );
      }
    }
    return Array.from(entries.entries());
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const content = VIRTUAL_FILES[uri.path];
    if (content !== undefined) {
      return Buffer.from(content, "utf-8");
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  writeFile(uri: vscode.Uri, content: Uint8Array): void {
    VIRTUAL_FILES[uri.path] = Buffer.from(content).toString("utf-8");
    this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  createDirectory(uri: vscode.Uri): void {
    const p = uri.path.endsWith("/") ? uri.path : uri.path + "/";
    if (!Object.keys(VIRTUAL_FILES).some((k) => k.startsWith(p))) {
      VIRTUAL_FILES[uri.path + "/.keep"] = "";
    }
  }

  delete(uri: vscode.Uri): void {
    delete VIRTUAL_FILES[uri.path];
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri): void {
    const content = VIRTUAL_FILES[oldUri.path];
    if (content !== undefined) {
      VIRTUAL_FILES[newUri.path] = content;
      delete VIRTUAL_FILES[oldUri.path];
    }
  }

  clear(): void {
    for (const key of Object.keys(VIRTUAL_FILES)) {
      delete VIRTUAL_FILES[key];
    }
  }
}

// --- URI Translator ---

export interface TranslatorStats {
  translateToDiskCalls: number;
  translateToVirtualCalls: number;
  toDiskTranslated: number;
  toVirtualTranslated: number;
}

class TestUriTranslator implements RuffUriTranslator {
  private static instance: TestUriTranslator | undefined;

  private cacheRoot: string;
  private toDiskCache = new Map<string, vscode.Uri>();
  private toVirtualCache = new Map<string, vscode.Uri>();
  private stats: TranslatorStats = {
    translateToDiskCalls: 0,
    translateToVirtualCalls: 0,
    toDiskTranslated: 0,
    toVirtualTranslated: 0,
  };

  private constructor() {
    this.cacheRoot = path.join(os.tmpdir(), `ruff-test-vfs-${process.pid}`);
    fs.mkdirSync(this.cacheRoot, { recursive: true });
  }

  static getInstance(): TestUriTranslator {
    if (!TestUriTranslator.instance) {
      TestUriTranslator.instance = new TestUriTranslator();
    }
    return TestUriTranslator.instance;
  }

  async initialize(workspaceFolders: vscode.Uri[]): Promise<void> {
    for (const folderUri of workspaceFolders) {
      const localRoot = this.buildLocalPath(folderUri);
      fs.mkdirSync(localRoot, { recursive: true });
      this.toDiskCache.set(folderUri.toString(), vscode.Uri.file(localRoot));
      this.toVirtualCache.set(localRoot, folderUri);

      try {
        const entries = await vscode.workspace.fs.readDirectory(folderUri);
        for (const [name, type] of entries) {
          if (type === vscode.FileType.File) {
            const fileUri = folderUri.with({ path: path.posix.join(folderUri.path, name) });
            try {
              const content = await vscode.workspace.fs.readFile(fileUri);
              const localPath = this.buildLocalPath(fileUri);
              fs.mkdirSync(path.dirname(localPath), { recursive: true });
              fs.writeFileSync(localPath, Buffer.from(content));
              this.toDiskCache.set(fileUri.toString(), vscode.Uri.file(localPath));
              this.toVirtualCache.set(localPath, fileUri);
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }
  }

  translateToDisk(uri: vscode.Uri): vscode.Uri | undefined {
    this.stats.translateToDiskCalls++;
    if (uri.scheme !== "testvfs") {
      return undefined;
    }
    const cached = this.toDiskCache.get(uri.toString());
    if (cached) {
      this.stats.toDiskTranslated++;
      return cached;
    }
    const localPath = this.buildLocalPath(uri);
    const diskUri = vscode.Uri.file(localPath);
    this.toDiskCache.set(uri.toString(), diskUri);
    this.toVirtualCache.set(localPath, uri);
    this.stats.toDiskTranslated++;
    return diskUri;
  }

  translateToVirtual(uri: vscode.Uri): vscode.Uri | undefined {
    this.stats.translateToVirtualCalls++;
    if (uri.scheme !== "file") {
      return undefined;
    }
    const direct = this.toVirtualCache.get(uri.fsPath);
    if (direct) {
      this.stats.toVirtualTranslated++;
      return direct;
    }
    const normalized = uri.fsPath.toLowerCase();
    for (const [localPath, virtualUri] of this.toVirtualCache) {
      if (localPath.toLowerCase() === normalized) {
        this.stats.toVirtualTranslated++;
        return virtualUri;
      }
    }
    return undefined;
  }

  private buildLocalPath(uri: vscode.Uri): string {
    const sanitized = uri.path.replace(/^\/+/, "").replace(/[<>:"|?*]/g, "_");
    return path.join(this.cacheRoot, sanitized);
  }

  getStats(): TranslatorStats { return { ...this.stats }; }
  resetStats(): void {
    this.stats = { translateToDiskCalls: 0, translateToVirtualCalls: 0, toDiskTranslated: 0, toVirtualTranslated: 0 };
  }
}

// --- Exported types ---

export interface ITestVfsExtension {
  scheme: string;
  createDirectory(uri: vscode.Uri): void;
  writeFile(uri: vscode.Uri, content: Uint8Array): void;
  clear(): void;
  getStats(): TranslatorStats;
  resetStats(): void;
  translateToDisk(uri: vscode.Uri): vscode.Uri | undefined;
  translateToVirtual(uri: vscode.Uri): vscode.Uri | undefined;
}

// --- Extension activation ---

export async function activate(context: vscode.ExtensionContext): Promise<ITestVfsExtension> {
  // Register VFS provider
  const testFS = new TestFileSystemProvider();
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(testFS.scheme, testFS, { isCaseSensitive: true }),
  );

  // Seed test files so they exist before Ruff starts
  testFS.writeFile(
    vscode.Uri.parse("testvfs:/project/diagnostics.py"),
    Buffer.from(
      "import os\nimport sys\nimport os\n\ndef greet(name):\n" +
      '    print(f"Hello, {name}!")\n\ngreet("world")\n',
    ),
  );
  testFS.writeFile(
    vscode.Uri.parse("testvfs:/project/formatting.py"),
    Buffer.from(
      "def function(foo,bar,):\n    print('hello world')\n",
    ),
  );
  testFS.writeFile(
    vscode.Uri.parse("testvfs:/project/pyproject.toml"),
    Buffer.from(
      '[tool.ruff.lint]\nselect = ["E", "F", "I"]\n',
    ),
  );

  // Register URI translator with Ruff
  const translator = TestUriTranslator.getInstance();
  const ruffExtension = vscode.extensions.getExtension("charliermarsh.ruff");
  if (ruffExtension) {
    const ruffApi: RuffExtensionApi = ruffExtension.isActive
      ? ruffExtension.exports
      : await ruffExtension.activate();
    if (ruffApi.registerUriTranslator) {
      ruffApi.registerUriTranslator(translator);
    }
  }

  return {
    scheme: testFS.scheme,
    createDirectory: (uri) => testFS.createDirectory(uri),
    writeFile: (uri, content) => testFS.writeFile(uri, content),
    clear: () => testFS.clear(),
    getStats: () => translator.getStats(),
    resetStats: () => translator.resetStats(),
    translateToDisk: (uri) => translator.translateToDisk(uri),
    translateToVirtual: (uri) => translator.translateToVirtual(uri),
  };
}
