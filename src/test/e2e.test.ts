import * as vscode from "vscode";
import * as assert from "assert";
import { getDocumentUri, activateExtension, sleep } from "./helper";

suite("E2E tests", () => {
  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("Should provide diagnostics", async () => {
    await activateExtension();

    const documentUri = getDocumentUri("diagnostics.py");
    const document = await vscode.workspace.openTextDocument(documentUri);
    await vscode.window.showTextDocument(document);

    let actualDiagnostics = vscode.languages.getDiagnostics(documentUri);
    if (actualDiagnostics.length === 0) {
      // Wait for diagnostics to be computed
      let timeout = 1000;
      while (actualDiagnostics.length === 0 && timeout > 0) {
        await sleep(100);
        actualDiagnostics = vscode.languages.getDiagnostics(documentUri);
        timeout -= 100;
      }
      assert.ok(actualDiagnostics.length > 0, "No diagnostics provided in 1 second");
    }

    actualDiagnostics = actualDiagnostics.sort((a, b) => {
      return a.range.start.compareTo(b.range.start);
    });

    const expectedDiagnostics = [
      {
        message: "Import block is un-sorted or un-formatted",
        range: toRange(0, 0, 4, 0),
        severity: vscode.DiagnosticSeverity.Warning,
      },
      {
        message: "`pathlib.Path` imported but unused",
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
});

function toRange(startLine: number, startChar: number, endLine: number, endChar: number) {
  const start = new vscode.Position(startLine, startChar);
  const end = new vscode.Position(endLine, endChar);
  return new vscode.Range(start, end);
}
