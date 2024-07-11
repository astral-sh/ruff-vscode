import * as vscode from "vscode";
import * as assert from "assert";
import { getDocUri, initialize } from "./helper";

suite("Should provide diagnostics", () => {
  const docUri = getDocUri("diagnostics.py");

  test("Provide diagnostics", async () => {
    await testDiagnostics(docUri, [
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
    ]);
  });
});

async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]) {
  await initialize(docUri);

  const actualDiagnostics = vscode.languages.getDiagnostics(docUri).sort((a, b) => {
    return a.range.start.compareTo(b.range.start);
  });

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
}

function toRange(startLine: number, startChar: number, endLine: number, endChar: number) {
  const start = new vscode.Position(startLine, startChar);
  const end = new vscode.Position(endLine, endChar);
  return new vscode.Range(start, end);
}
