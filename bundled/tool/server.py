# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""Implementation of tool support over LSP."""

from __future__ import annotations

import copy
import json
import os
import pathlib
import sys
import sysconfig
from typing import Sequence


# **********************************************************
# Update sys.path before importing any bundled libraries.
# **********************************************************
def update_sys_path(path_to_add: str, strategy: str) -> None:
    """Add given path to `sys.path`."""
    if path_to_add not in sys.path and os.path.isdir(path_to_add):
        if strategy == "useBundled":
            sys.path.insert(0, path_to_add)
        elif strategy == "fromEnvironment":
            sys.path.append(path_to_add)


# Ensure that we can import LSP libraries, and other bundled libraries.
update_sys_path(
    os.fspath(pathlib.Path(__file__).parent.parent / "libs"),
    os.getenv("LS_IMPORT_STRATEGY", "useBundled"),
)

# **********************************************************
# Imports needed for the language server.
# **********************************************************
import jsonrpc  # noqa: E402
import utils  # noqa: E402
from pygls import lsp, protocol, server, uris, workspace  # noqa: E402

WORKSPACE_SETTINGS = {}
RUNNER = pathlib.Path(__file__).parent / "runner.py"

MAX_WORKERS = 5
LSP_SERVER = server.LanguageServer(
    name="Ruff",
    version="2022.0.17",
    max_workers=MAX_WORKERS,
)


# **********************************************************
# Tool specific code goes below this.
# **********************************************************

TOOL_MODULE = "ruff"

TOOL_DISPLAY = "Ruff"

TOOL_ARGS = ["--no-cache", "--no-fix", "--quiet", "--format", "json", "-"]

# **********************************************************
# Linting features start here
# **********************************************************


@LSP_SERVER.feature(lsp.TEXT_DOCUMENT_DID_OPEN)
def did_open(params: lsp.DidOpenTextDocumentParams) -> None:
    """LSP handler for textDocument/didOpen request."""
    document = LSP_SERVER.workspace.get_document(params.text_document.uri)
    diagnostics: list[lsp.Diagnostic] = _linting_helper(document)
    LSP_SERVER.publish_diagnostics(document.uri, diagnostics)


@LSP_SERVER.feature(lsp.TEXT_DOCUMENT_DID_SAVE)
def did_save(params: lsp.DidSaveTextDocumentParams) -> None:
    """LSP handler for textDocument/didSave request."""
    document = LSP_SERVER.workspace.get_document(params.text_document.uri)
    diagnostics: list[lsp.Diagnostic] = _linting_helper(document)
    LSP_SERVER.publish_diagnostics(document.uri, diagnostics)


@LSP_SERVER.feature(lsp.TEXT_DOCUMENT_DID_CHANGE)
def did_change(params: lsp.DidChangeTextDocumentParams) -> None:
    """LSP handler for textDocument/didSave request."""
    document = LSP_SERVER.workspace.get_document(params.text_document.uri)
    diagnostics: list[lsp.Diagnostic] = _linting_helper(document)
    LSP_SERVER.publish_diagnostics(document.uri, diagnostics)


@LSP_SERVER.feature(lsp.TEXT_DOCUMENT_DID_CLOSE)
def did_close(params: lsp.DidCloseTextDocumentParams) -> None:
    """LSP handler for textDocument/didClose request."""
    document = LSP_SERVER.workspace.get_document(params.text_document.uri)
    # Publishing empty diagnostics to clear the entries for this file.
    LSP_SERVER.publish_diagnostics(document.uri, [])


def _linting_helper(document: workspace.Document) -> list[lsp.Diagnostic]:
    result = _run_tool_on_document(document, use_stdin=True)
    if result is None:
        return []
    return _parse_output_using_regex(result.stdout) if result.stdout else []


def _parse_output_using_regex(content: str) -> list[lsp.Diagnostic]:
    diagnostics: list[lsp.Diagnostic] = []

    line_at_1 = True
    column_at_1 = True

    line_offset = 1 if line_at_1 else 0
    col_offset = 1 if column_at_1 else 0

    # Ruff's output looks like:
    # [
    #   {
    #     "kind": {
    #       "UnusedVariable": "x"
    #     },
    #     "code": "F841",
    #     "message": "Local variable `x` is assigned to but never used",
    #     "fixed": false,
    #     "location": {
    #       "row": 2,
    #       "column": 5
    #     },
    #     "filename": "/path/to/test.py"
    #   },
    #   ...
    # ]
    for check in json.loads(content):
        start = lsp.Position(
            line=max([int(check["location"]["row"]) - line_offset, 0]),
            character=int(check["location"]["column"]) - col_offset,
        )
        end = lsp.Position(
            line=max([int(check["end_location"]["row"]) - line_offset, 0]),
            character=int(check["end_location"]["column"]) - col_offset,
        )
        diagnostic = lsp.Diagnostic(
            range=lsp.Range(
                start=start,
                end=end,
            ),
            message=check.get("message"),
            severity=_get_severity(check["code"], check.get("type", "Error")),
            code=check["code"],
            source=TOOL_DISPLAY,
        )
        diagnostics.append(diagnostic)

    return diagnostics


def _get_severity(*_codes: list[str]) -> lsp.DiagnosticSeverity:
    return lsp.DiagnosticSeverity.Warning


# **********************************************************
# Linting features end here
# **********************************************************

# **********************************************************
# Code Action features start here
# **********************************************************


@LSP_SERVER.feature(
    lsp.CODE_ACTION,
    lsp.CodeActionOptions(
        code_action_kinds=[
            lsp.CodeActionKind.SourceOrganizeImports,
        ],
        resolve_provider=True,
    ),
)
def code_action_organize_imports(params: lsp.CodeActionParams):
    text_document = LSP_SERVER.workspace.get_document(params.text_document.uri)

    if utils.is_stdlib_file(text_document.path):
        # Don't format standard library python files.
        # Publishing empty diagnostics clears the entry
        return None

    if (
        params.context.only
        and len(params.context.only) == 1
        and lsp.CodeActionKind.SourceOrganizeImports in params.context.only
    ):
        # This is triggered when users run the Organize Imports command from
        # VS Code. The `context.only` field will have one item that is the
        # `SourceOrganizeImports` code action.
        results = _formatting_helper(text_document)
        if results:
            # Clear out diagnostics, since we are making changes to address
            # import sorting issues.
            LSP_SERVER.publish_diagnostics(text_document.uri, [])
            return [
                lsp.CodeAction(
                    title="ruff: Organize Imports",
                    kind=lsp.CodeActionKind.SourceOrganizeImports,
                    data=params.text_document.uri,
                    edit=_create_workspace_edits(text_document, results),
                    diagnostics=[],
                )
            ]

    actions = []
    if not params.context.only or lsp.CodeActionKind.SourceOrganizeImports in params.context.only:
        actions.append(
            lsp.CodeAction(
                title="ruff: Organize Imports",
                kind=lsp.CodeActionKind.SourceOrganizeImports,
                data=params.text_document.uri,
                edit=None,
                diagnostics=[],
            ),
        )

    return actions if actions else None


@LSP_SERVER.feature(lsp.CODE_ACTION_RESOLVE)
def code_action_resolve(params: lsp.CodeAction):
    text_document = LSP_SERVER.workspace.get_document(params.data)

    results = _formatting_helper(text_document)
    if results:
        # Clear out diagnostics, since we are making changes to address
        # import sorting issues.
        LSP_SERVER.publish_diagnostics(text_document.uri, [])
    else:
        # There are no changes so return the original code as is.
        # This could be due to error while running import sorter
        # so, don't clear out the diagnostics.
        results = [
            lsp.TextEdit(
                range=lsp.Range(
                    start=lsp.Position(line=0, character=0),
                    end=lsp.Position(line=len(text_document.lines), character=0),
                ),
                new_text=text_document.source,
            )
        ]

    params.edit = _create_workspace_edits(text_document, results)
    return params


def _formatting_helper(document: workspace.Document) -> list[lsp.TextEdit] | None:
    result = _run_tool_on_document(document, use_stdin=True, extra_args=["--fix", "--select", "I"])
    if result is None:
        return None

    if result.stdout:
        new_source = _match_line_endings(document, result.stdout)

        # Skip last line ending in a notebook cell
        if document.uri.startswith("vscode-notebook-cell"):
            if new_source.endswith("\r\n"):
                new_source = new_source[:-2]
            elif new_source.endswith("\n"):
                new_source = new_source[:-1]

        if new_source != document.source:
            return [
                lsp.TextEdit(
                    range=lsp.Range(
                        start=lsp.Position(line=0, character=0),
                        end=lsp.Position(line=len(document.lines), character=0),
                    ),
                    new_text=new_source,
                )
            ]
    return None


def _create_workspace_edits(document: workspace.Document, results: list[lsp.TextEdit] | None):
    return lsp.WorkspaceEdit(
        document_changes=[
            lsp.TextDocumentEdit(
                text_document=lsp.VersionedTextDocumentIdentifier(
                    uri=document.uri,
                    version=0 if document.version is None else document.version,
                ),
                edits=results,
            )
        ],
    )


def _get_line_endings(lines: list[str]) -> str | None:
    """Returns line endings used in the text."""
    try:
        if lines[0][-2:] == "\r\n":
            return "\r\n"
        return "\n"
    except Exception:
        return None


def _match_line_endings(document: workspace.Document, text: str) -> str:
    """Ensures that the edited text line endings matches the document line endings."""
    expected = _get_line_endings(document.source.splitlines(keepends=True))
    actual = _get_line_endings(text.splitlines(keepends=True))
    if actual == expected or actual is None or expected is None:
        return text
    return text.replace(actual, expected)


# **********************************************************
# Code Action features ends here
# **********************************************************


# **********************************************************
# Required Language Server Initialization and Exit handlers.
# **********************************************************
@LSP_SERVER.feature(lsp.INITIALIZE)
def initialize(params: lsp.InitializeParams) -> None:
    """LSP handler for initialize request."""
    log_to_output(f"CWD Server: {os.getcwd()}")

    paths = "\r\n   ".join(sys.path)
    log_to_output(f"sys.path used to run Server:\r\n   {paths}")

    settings = params.initialization_options["settings"]
    _update_workspace_settings(settings)
    log_to_output(
        f"Settings used to run Server:\r\n{json.dumps(settings, indent=4, ensure_ascii=False)}\r\n"
    )

    if isinstance(LSP_SERVER.lsp, protocol.LanguageServerProtocol):
        if any(setting["logLevel"] == "debug" for setting in settings):
            LSP_SERVER.lsp.trace = lsp.Trace.Verbose
        elif any(setting["logLevel"] in ["error", "warn", "info"] for setting in settings):
            LSP_SERVER.lsp.trace = lsp.Trace.Messages
        else:
            LSP_SERVER.lsp.trace = lsp.Trace.Off


@LSP_SERVER.feature(lsp.EXIT)
def on_exit():
    """Handle clean up on exit."""
    jsonrpc.shutdown_json_rpc()


# *****************************************************
# Internal functional and settings management APIs.
# *****************************************************
def _update_workspace_settings(settings):
    for setting in settings:
        key = uris.to_fs_path(setting["workspace"])
        WORKSPACE_SETTINGS[key] = {
            **setting,
            "workspaceFS": key,
        }


def _get_settings_by_document(document: workspace.Document | None):
    if len(WORKSPACE_SETTINGS) == 1 or document is None or document.path is None:
        return list(WORKSPACE_SETTINGS.values())[0]

    document_workspace = pathlib.Path(document.path)
    workspaces = {s["workspaceFS"] for s in WORKSPACE_SETTINGS.values()}

    # COMMENT: about non workspace files
    while document_workspace != document_workspace.parent:
        if str(document_workspace) in workspaces:
            return WORKSPACE_SETTINGS[str(document_workspace)]
        document_workspace = document_workspace.parent

    return list(WORKSPACE_SETTINGS.values())[0]


# *****************************************************
# Internal execution APIs.
# *****************************************************
def _run_tool_on_document(
    document: workspace.Document,
    use_stdin: bool = False,
    extra_args: Sequence[str] = [],
) -> utils.RunResult | None:
    """Runs tool on the given document.

    If `use_stdin` is `True` then contents of the document is passed to the tool via
    stdin.
    """
    if str(document.uri).startswith("vscode-notebook-cell"):
        # Skip notebook cells
        return None

    if utils.is_stdlib_file(document.path):
        # Skip standard library python files.
        return None

    # deep copy here to prevent accidentally updating global settings.
    settings = copy.deepcopy(_get_settings_by_document(document))

    code_workspace = settings["workspaceFS"]
    cwd = settings["workspaceFS"]

    use_path = False
    use_rpc = False
    if settings["path"]:
        # 'path' setting takes priority over everything.
        use_path = True
        argv = settings["path"]
    elif settings["interpreter"] and not utils.is_current_interpreter(settings["interpreter"][0]):
        # If there is a different interpreter set use JSON-RPC to the subprocess
        # running under that interpreter.
        argv = [TOOL_MODULE]
        use_rpc = True
    elif settings["importStrategy"] == "useBundled":
        # If we're loading from the bundle, use the absolute path.
        argv = [
            os.fspath(pathlib.Path(__file__).parent.parent / "libs" / "bin" / TOOL_MODULE),
        ]
    else:
        # If the interpreter is same as the interpreter running this process then run
        # as module.
        argv = [os.path.join(sysconfig.get_path("scripts"), TOOL_MODULE)]

    argv += TOOL_ARGS + settings["args"] + list(extra_args)

    if use_stdin:
        argv += ["--stdin-filename", document.path]
    else:
        argv += [document.path]

    result: utils.RunResult
    if use_path:
        # This mode is used when running executables.
        log_to_output(" ".join(argv))
        log_to_output(f"CWD Server: {cwd}")
        result = utils.run_path(
            argv=argv,
            use_stdin=use_stdin,
            cwd=cwd,
            source=document.source.replace("\r\n", "\n"),
        )
        if result.stderr:
            log_to_output(result.stderr)
    elif use_rpc:
        # This mode is used if the interpreter running this server is different from
        # the interpreter used for running this server.
        log_to_output(" ".join(settings["interpreter"] + ["-m"] + argv))
        log_to_output(f"CWD Linter: {cwd}")

        rpc_result = jsonrpc.run_over_json_rpc(
            workspace=code_workspace,
            interpreter=settings["interpreter"],
            module=TOOL_MODULE,
            argv=argv,
            use_stdin=use_stdin,
            cwd=cwd,
            source=document.source,
        )
        if rpc_result.exception:
            log_error(rpc_result.exception)
        elif rpc_result.stderr:
            log_to_output(rpc_result.stderr)
        result = utils.RunResult(rpc_result.stdout, rpc_result.stderr)
    else:
        # This mode is used when running executables.
        log_to_output(" ".join(argv))
        log_to_output(f"CWD Server: {cwd}")
        result = utils.run_path(
            argv=argv,
            use_stdin=use_stdin,
            cwd=cwd,
            source=document.source.replace("\r\n", "\n"),
        )
        if result.stderr:
            log_to_output(result.stderr)

    log_to_output(f"{document.uri} :\r\n{result.stdout}")
    return result


# *****************************************************
# Logging and notification.
# *****************************************************
def log_to_output(message: str, msg_type: lsp.MessageType = lsp.MessageType.Log) -> None:
    LSP_SERVER.show_message_log(message, msg_type)


def log_error(message: str) -> None:
    LSP_SERVER.show_message_log(message, lsp.MessageType.Error)
    if os.getenv("LS_SHOW_NOTIFICATION", "off") in ["onError", "onWarning", "always"]:
        LSP_SERVER.show_message(message, lsp.MessageType.Error)


def log_warning(message: str) -> None:
    LSP_SERVER.show_message_log(message, lsp.MessageType.Warning)
    if os.getenv("LS_SHOW_NOTIFICATION", "off") in ["onWarning", "always"]:
        LSP_SERVER.show_message(message, lsp.MessageType.Warning)


def log_always(message: str) -> None:
    LSP_SERVER.show_message_log(message, lsp.MessageType.Info)
    if os.getenv("LS_SHOW_NOTIFICATION", "off") in ["always"]:
        LSP_SERVER.show_message(message, lsp.MessageType.Info)


# *****************************************************
# Start the server.
# *****************************************************
if __name__ == "__main__":
    LSP_SERVER.start_io()
