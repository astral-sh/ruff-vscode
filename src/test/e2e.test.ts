import * as vscode from "vscode";
import * as assert from "assert";
import { getDocumentUri, activateExtension, sleep } from "./helper";

suite("E2E tests", () => {
  const TIMEOUT = 5000;

  suiteTeardown(async () => {
    await vscode.workspace
      .getConfiguration("ruff")
      .update("nativeServer", "off", vscode.ConfigurationTarget.Workspace);
  });

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("Should provide diagnostics", async () => {
    await activateExtension();

    const documentUri = getDocumentUri("diagnostics.py");
    const document = await vscode.workspace.openTextDocument(documentUri);
    await vscode.window.showTextDocument(document);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, "No active text editor");
    assert.ok(
      editor.document.uri.fsPath.endsWith("diagnostics.py"),
      "Active text editor is not diagnostics.py",
    );

    let actualDiagnostics = vscode.languages.getDiagnostics(documentUri);
    if (actualDiagnostics.length === 0) {
      // Wait for diagnostics to be computed
      let timeout = TIMEOUT;
      while (actualDiagnostics.length === 0 && timeout > 0) {
        await sleep(100);
        actualDiagnostics = vscode.languages.getDiagnostics(documentUri);
        timeout -= 100;
      }
      assert.ok(actualDiagnostics.length > 0, `No diagnostics provided in ${TIMEOUT}ms`);
    }

    actualDiagnostics = actualDiagnostics.sort((a, b) => {
      return a.range.start.compareTo(b.range.start);
    });

    const expectedDiagnostics = [
      {
        message: "Import block is un-sorted or un-formatted\n\nhelp: Organize imports",
        range: toRange(0, 0, 1, 10),
        severity: vscode.DiagnosticSeverity.Warning,
      },
      {
        message: "`pathlib.Path` imported but unused\n\nhelp: Remove unused import: `pathlib.Path`",
        range: toRange(0, 20, 0, 24),
        severity: vscode.DiagnosticSeverity.Warning,
      },
      {
        message: "Undefined name `name`",
        range: toRange(5, 35, 5, 39),
        severity: vscode.DiagnosticSeverity.Error,
      },
    ];

    assert.equal(actualDiagnostics.length, expectedDiagnostics.length);
    actualDiagnostics.forEach((actualDiagnostic, i) => {
      const expectedDiagnostic = expectedDiagnostics[i];
      assert.deepEqual(
        new vscode.Diagnostic(
          actualDiagnostic.range,
          actualDiagnostic.message,
          actualDiagnostic.severity,
        ),
        expectedDiagnostic,
      );
    });
  });

  test("Should format document", async () => {
    await activateExtension();

    const docUri = getDocumentUri("formatting.py");
    const document = await vscode.workspace.openTextDocument(docUri);
    await vscode.window.showTextDocument(document);

    const originalContent = document.getText();
    const expectedContent = `\
def function(
    foo,
    bar,
):
    print("hello world")
`;
    assert.notEqual(originalContent, expectedContent);

    await vscode.commands.executeCommand("editor.action.formatDocument");
    const formattedContent = document.getText();
    assert.equal(formattedContent, expectedContent);
  });

  test("Should print debug information with nativeServer disabled", async () => {
    await activateExtension();
    // Activation starts the server asynchronously; wait for a completed startup.
    await vscode.commands.executeCommand("ruff.restart");
    const document = await vscode.workspace.openTextDocument(getDocumentUri("diagnostics.py"));
    await vscode.window.showTextDocument(document);

    for (const value of ["off", false]) {
      await vscode.workspace
        .getConfiguration("ruff")
        .update("nativeServer", value, vscode.ConfigurationTarget.Workspace);
      await vscode.commands.executeCommand("ruff.debugInformation");
      const debugDocument = vscode.window.visibleTextEditors.find(
        (editor) => editor.document.uri.scheme === "ruff-server-debug",
      )?.document;
      assert.ok(debugDocument, "Debug information should open beside the source document");
      assert.ok(debugDocument.getText().length > 0, "Debug information should not be empty");
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      await vscode.window.showTextDocument(document);
    }
  });
});

function toRange(startLine: number, startChar: number, endLine: number, endChar: number) {
  const start = new vscode.Position(startLine, startChar);
  const end = new vscode.Position(endLine, endChar);
  return new vscode.Range(start, end);
}
