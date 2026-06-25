import * as assert from "assert";
import * as vscode from "vscode";
import { BUNDLED_RUFF_EXECUTABLE } from "../common/constants";
import type { EnvironmentProvider, PythonEnvironmentDetails } from "../common/python";
import {
  execFileShellModeRequired,
  findRuffBinaryPath,
  resolvePythonEnvironment,
} from "../common/server";
import type { ISettings } from "../common/settings";
import { isWindows } from "./helper";

suite("Utils tests", () => {
  test("Check execFile shell mode", () => {
    assert.strictEqual(
      execFileShellModeRequired("/use/random/python"),
      false,
      "Shell mode should not be required for unix paths",
    );
    assert.strictEqual(
      execFileShellModeRequired("C:\\random\\python.exe"),
      false,
      "Shell mode should not be required for .exe files",
    );
    assert.strictEqual(
      execFileShellModeRequired("C:\\random\\python.cmd"),
      isWindows(),
      "Shell mode should be required for .cmd files",
    );
    assert.strictEqual(
      execFileShellModeRequired("C:\\random\\python.bat"),
      isWindows(),
      "Shell mode should be required for .bat files",
    );
  });

  test("Invalid configured interpreter falls back to the active environment", async () => {
    const activeEnvironment = environment("/workspace/.venv/bin/python", ["-X", "utf8"]);
    const provider = environmentProvider(null, activeEnvironment);

    const resolved = await resolvePythonEnvironment(
      ["/missing/python", "-I"],
      "file:///workspace",
      provider,
      activeEnvironment,
    );
    assert.deepStrictEqual(resolved, {
      environment: activeEnvironment,
      command: activeEnvironment.command,
      dependsOnActiveInterpreter: true,
    });
  });

  test("Configured interpreter takes precedence over the active environment", async () => {
    const configuredEnvironment = environment("/configured/python", ["-X", "utf8"]);
    const activeEnvironment = environment("/workspace/.venv/bin/python");

    const resolved = await resolvePythonEnvironment(
      ["/configured/python", "-I"],
      "file:///workspace",
      environmentProvider(configuredEnvironment, activeEnvironment),
      activeEnvironment,
    );
    assert.deepStrictEqual(resolved, {
      environment: configuredEnvironment,
      command: { executable: "/configured/python", args: ["-X", "utf8", "-I"] },
      dependsOnActiveInterpreter: false,
    });
  });

  test("path and useBundled do not resolve a Python environment", async () => {
    assert.strictEqual(vscode.workspace.isTrusted, true);

    for (const settings of [
      { path: [BUNDLED_RUFF_EXECUTABLE], importStrategy: "fromEnvironment" },
      { path: [], importStrategy: "useBundled" },
    ]) {
      const resolution = await findRuffBinaryPath(
        settings as ISettings,
        {
          ...environmentProvider(null, null),
          resolveInterpreter: () => Promise.reject(new Error("unexpected interpreter lookup")),
        },
        null,
      );

      assert.deepStrictEqual(resolution, {
        path: BUNDLED_RUFF_EXECUTABLE,
        dependsOnActiveInterpreter: false,
      });
    }
  });
});

function environment(executable: string, args: string[] = []): PythonEnvironmentDetails {
  return {
    command: { executable, args },
    sysPrefix: executable,
    version: { major: 3, minor: 12, patch: 0 },
  };
}

function environmentProvider(
  resolved: PythonEnvironmentDetails | null,
  active: PythonEnvironmentDetails | null,
): EnvironmentProvider {
  return {
    initialize: () => Promise.resolve(),
    resolveInterpreter: () => Promise.resolve(resolved),
    getActiveEnvironment: () => Promise.resolve(active),
  };
}
