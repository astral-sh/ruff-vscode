import * as assert from "assert";
import { execFileShellModeRequired } from "../common/server";
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
      isWindows() ? true : false,
      "Shell mode should be required for .cmd files",
    );
    assert.strictEqual(
      execFileShellModeRequired("C:\\random\\python.bat"),
      isWindows() ? true : false,
      "Shell mode should be required for .bat files",
    );
  });
});
