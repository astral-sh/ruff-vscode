import * as vscode from "vscode";
import * as assert from "assert";
import { getDocUri, initialize } from "./helper";

suite("Should format document", () => {
  const docUri = getDocUri("formatting.py");

  test("Format document", async () => {
    await testFormatting(
      docUri,
      `def function(
    foo,
    bar,
):
    print("hello world")
`,
    );
  });
});

async function testFormatting(docUri: vscode.Uri, expectedContent: string) {
  await initialize(docUri);

  const document = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.toString() === docUri.toString(),
  );
  if (document === undefined) {
    assert.fail(`Document not found: ${docUri}`);
  }

  const originalContent = document.getText();
  assert.notEqual(originalContent, expectedContent);

  await vscode.commands.executeCommand("editor.action.formatDocument");
  const formattedContent = document.getText();
  assert.equal(formattedContent, expectedContent);
}
