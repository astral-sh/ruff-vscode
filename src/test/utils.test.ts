import * as assert from "assert";
import type { EnvironmentProvider, PythonEnvironmentDetails } from "../common/python";
import {
  execFileShellModeRequired,
  resolvePythonEnvironment,
  serverPlanKey,
  type ServerPlan,
} from "../common/server";
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
    const activeEnvironment = environment("/workspace/.venv/bin/python");
    const provider = environmentProvider(null, activeEnvironment);

    const native = await resolvePythonEnvironment(
      ["/missing/python"],
      "file:///workspace",
      provider,
      activeEnvironment,
      true,
    );
    assert.deepStrictEqual(native, {
      environment: activeEnvironment,
      dependsOnActiveInterpreter: true,
    });

    const legacy = await resolvePythonEnvironment(
      ["/missing/python"],
      "file:///workspace",
      provider,
      activeEnvironment,
      false,
    );
    assert.deepStrictEqual(legacy, {
      environment: null,
      dependsOnActiveInterpreter: false,
    });
  });

  test("Configured interpreter takes precedence over the active environment", async () => {
    const configuredEnvironment = environment("/configured/python");
    const activeEnvironment = environment("/workspace/.venv/bin/python");

    const resolved = await resolvePythonEnvironment(
      ["/configured/python"],
      "file:///workspace",
      environmentProvider(configuredEnvironment, activeEnvironment),
      activeEnvironment,
      true,
    );
    assert.deepStrictEqual(resolved, {
      environment: configuredEnvironment,
      dependsOnActiveInterpreter: false,
    });
  });

  test("Server plan key includes executable version and interpreter arguments", () => {
    const native: ServerPlan = {
      kind: "native",
      executable: { path: "/bin/ruff", version: { major: 1, minor: 0, patch: 0 } },
      dependsOnActiveInterpreter: true,
    };
    const updatedNative: ServerPlan = {
      ...native,
      executable: { path: "/bin/ruff", version: { major: 1, minor: 1, patch: 0 } },
    };
    assert.notStrictEqual(serverPlanKey(native), serverPlanKey(updatedNative));

    const legacy: ServerPlan = {
      kind: "legacy",
      interpreter: { executable: "/bin/python", args: [] },
      autoRuffExecutable: null,
      dependsOnActiveInterpreter: true,
    };
    const updatedLegacy: ServerPlan = {
      ...legacy,
      interpreter: { executable: "/bin/python", args: ["-I"] },
    };
    assert.notStrictEqual(serverPlanKey(legacy), serverPlanKey(updatedLegacy));
  });
});

function environment(executable: string): PythonEnvironmentDetails {
  return {
    command: { executable, args: [] },
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
