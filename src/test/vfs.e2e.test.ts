import * as vscode from "vscode";
import * as assert from "assert";
import { activateExtension, sleep } from "./helper";
import type { ITestVfsExtension } from "./testVfsExtension/src/extension";

function waitForDiagnostics(uri: vscode.Uri, timeoutMs: number): Promise<vscode.Diagnostic[]> {
  return new Promise((resolve) => {
    const existing = vscode.languages.getDiagnostics(uri);
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const timer = setTimeout(() => {
      disposable.dispose();
      resolve(vscode.languages.getDiagnostics(uri));
    }, timeoutMs);
    const disposable = vscode.languages.onDidChangeDiagnostics(() => {
      const diags = vscode.languages.getDiagnostics(uri);
      if (diags.length > 0) {
        clearTimeout(timer);
        disposable.dispose();
        resolve(diags);
      }
    });
  });
}

async function waitForServerReady(docUri: vscode.Uri, timeoutMs: number): Promise<boolean> {
  const doc = await vscode.workspace.openTextDocument(docUri);
  await vscode.window.showTextDocument(doc);
  const diags = await waitForDiagnostics(docUri, timeoutMs);
  return diags.length > 0;
}

suite("VFS E2E tests", () => {
  const TIMEOUT = 120000;
  let vfsApi!: ITestVfsExtension;

  suiteSetup(async function () {
    this.timeout(TIMEOUT);

    // Remove any file:// workspace folders (test runner may add testFixture)
    // to ensure a pure VFS workspace for isVirtualWorkspace() to return true.
    const folders = vscode.workspace.workspaceFolders ?? [];
    const fileFolders = folders.filter((f) => f.uri.scheme === "file");
    if (fileFolders.length > 0) {
      const hasVfs = folders.some((f) => f.uri.scheme === "testvfs");
      if (!hasVfs) {
        // Add VFS folder first if missing
        vscode.workspace.updateWorkspaceFolders(folders.length, 0, {
          uri: vscode.Uri.parse("testvfs:/project"),
          name: "VFS Test Project",
        });
        await sleep(1000);
      }
      // Remove all file:// folders
      const updatedFolders = vscode.workspace.workspaceFolders ?? [];
      for (let i = updatedFolders.length - 1; i >= 0; i--) {
        if (updatedFolders[i].uri.scheme === "file") {
          vscode.workspace.updateWorkspaceFolders(i, 1);
        }
      }
      await sleep(1000);
    }

    // Verify pure VFS workspace
    const currentFolders = vscode.workspace.workspaceFolders ?? [];
    assert.ok(currentFolders.length > 0, "Should have workspace folders");
    assert.ok(
      currentFolders.every((f) => f.uri.scheme !== "file"),
      `Expected no file:// folders, got: ${currentFolders.map((f) => f.uri.toString()).join(", ")}`,
    );

    // Activate VFS test extension first (registers FileSystemProvider)
    const vfsExtension = vscode.extensions.getExtension("ruff.ruff-testvfs");
    assert.ok(vfsExtension, "VFS test extension should be found");
    vfsApi = vfsExtension!.isActive
      ? vfsExtension!.exports
      : await vfsExtension!.activate();

    // Activate Ruff (the VFS extension already registered translator in its activate)
    await activateExtension();

    // Wait for everything to settle — translator registration triggers server restart
    await sleep(15000);

    // Open a file and wait for diagnostics to confirm server is ready
    const testUri = vscode.Uri.parse("testvfs:/project/diagnostics.py");
    const ready = await waitForServerReady(testUri, 45000);
    assert.ok(ready, "Ruff server should start and provide diagnostics");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("Ruff should export registerUriTranslator API", async () => {
    const ruffExtension = vscode.extensions.getExtension("charliermarsh.ruff");
    assert.ok(ruffExtension?.isActive, "Ruff should be active");
    assert.ok(
      typeof ruffExtension!.exports?.registerUriTranslator === "function",
      "Should export registerUriTranslator",
    );
  });

  test("Translator should translate URIs bidirectionally", function () {
    const virtualUri = vscode.Uri.parse("testvfs:/project/diagnostics.py");
    const diskUri = vfsApi.translateToDisk(virtualUri);
    assert.ok(diskUri, "translateToDisk should return a URI");
    assert.equal(diskUri!.scheme, "file", "Should translate to file:// scheme");

    const reversed = vfsApi.translateToVirtual(diskUri!);
    assert.ok(reversed, "translateToVirtual should return a URI");
    assert.equal(reversed!.toString(), virtualUri.toString(), "Round-trip should match");
  });

  test("Ruff should provide diagnostics for VFS Python file", async function () {
    this.timeout(TIMEOUT);

    const docUri = vscode.Uri.parse("testvfs:/project/diagnostics.py");
    const doc = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(doc);

    const diagnostics = await waitForDiagnostics(docUri, 30000);
    assert.ok(diagnostics.length > 0, "Should provide diagnostics for VFS file");

    const messages = diagnostics.map((d) => d.message);
    const hasImportIssue = messages.some(
      (m) => m.toLowerCase().includes("import") || m.toLowerCase().includes("redefin"),
    );
    assert.ok(hasImportIssue, `Expected import issue, got: ${messages.join("; ")}`);
  });

  test("Ruff should format VFS Python file", async function () {
    this.timeout(TIMEOUT);

    // Use a unique file to avoid race with parallel extension hosts
    const fileName = `format_${Date.now()}.py`;
    const docUri = vscode.Uri.parse(`testvfs:/project/${fileName}`);
    vfsApi.writeFile(
      docUri,
      Buffer.from("def function(foo,bar,):\n    print('hello world')\n"),
    );

    const doc = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(doc);
    await sleep(3000);

    const before = doc.getText();
    await vscode.commands.executeCommand("editor.action.formatDocument");
    await sleep(3000);

    const after = doc.getText();
    assert.notEqual(after, before, "Formatting should change the document");
  });

  test("Ruff should apply auto-fix on VFS file", async function () {
    this.timeout(TIMEOUT);

    // Write content with known fixable issues fresh
    const docUri = vscode.Uri.parse("testvfs:/project/diagnostics.py");
    vfsApi.writeFile(
      docUri,
      Buffer.from(
        "import os\nimport sys\nimport os\n\ndef greet(name):\n" +
        '    print(f"Hello, {name}!")\n\ngreet("world")\n',
      ),
    );

    const doc = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(doc);
    await waitForDiagnostics(docUri, 30000);

    const before = doc.getText();
    await vscode.commands.executeCommand("ruff.executeAutofix");
    await sleep(5000);

    const after = doc.getText();
    assert.notEqual(after, before, "Auto-fix should change the document");
    const importCount = (after.match(/import os/g) || []).length;
    assert.ok(importCount <= 1, `Should have at most 1 'import os', got ${importCount}`);
  });
});
