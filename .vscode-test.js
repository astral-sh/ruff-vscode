const { defineConfig } = require("@vscode/test-cli");

module.exports = defineConfig({
  files: "out/test/**/*.test.js",
  workspaceFolder: "./src/testFixture",
  mocha: {
    ui: "tdd",
    color: true,
    timeout: 20000,
  },
});
