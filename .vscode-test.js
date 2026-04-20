const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig([
  {
    label: "E2E tests",
    files: "out/test/e2e.test.js",
    workspaceFolder: "./src/testFixture",
    mocha: {
      ui: "tdd",
      color: true,
      timeout: 20000,
    },
  },
  {
    label: "Unit tests",
    files: "out/test/utils.test.js",
    workspaceFolder: "./src/testFixture",
    mocha: {
      ui: "tdd",
      color: true,
      timeout: 20000,
    },
  },
  {
    label: "VFS tests",
    files: "out/test/vfs.e2e.test.js",
    extensionDevelopmentPath: [
      ".",
      "./src/test/testVfsExtension",
    ],
    launchArgs: [
      "--folder-uri", "testvfs:/project",
    ],
    mocha: {
      ui: "tdd",
      color: true,
      timeout: 60000,
    },
  },
]);
