"""Test for linting over LSP."""
from __future__ import annotations

import os
import tempfile
import unittest
from threading import Event

from tests.client import defaults, session, utils
from tests.client.constants import PROJECT_ROOT

TIMEOUT_SECONDS = 10

CONTENTS = """import sys

print(x)
"""


class TestServer(unittest.TestCase):
    def test_linting_example(self):
        with tempfile.NamedTemporaryFile(suffix=".py") as fp:
            fp.write(CONTENTS.encode())
            fp.flush()
            uri = utils.as_uri(fp.name)

            actual = []
            with session.LspSession(
                cwd=os.getcwd(),
                script=PROJECT_ROOT / "bundled" / "tool" / "server.py",
            ) as ls_session:
                ls_session.initialize(defaults.VSCODE_DEFAULT_INITIALIZE)

                done = Event()

                def _handler(params):
                    nonlocal actual
                    actual = params
                    done.set()

                ls_session.set_notification_callback(
                    session.PUBLISH_DIAGNOSTICS, _handler
                )

                ls_session.notify_did_open(
                    {
                        "textDocument": {
                            "uri": uri,
                            "languageId": "python",
                            "version": 1,
                            "text": CONTENTS,
                        }
                    }
                )

                # Wait to receive all notifications.
                done.wait(TIMEOUT_SECONDS)

                expected = {
                    "uri": uri,
                    "diagnostics": [
                        {
                            "range": {
                                "start": {"line": 0, "character": 7},
                                "end": {"line": 0, "character": 10},
                            },
                            "data": {
                                "fix": {
                                    "content": "",
                                    "message": "Remove unused import: `sys`",
                                    "location": {"row": 1, "column": 0},
                                    "end_location": {"row": 2, "column": 0},
                                },
                                "noqa_row": 1,
                            },
                            "message": "`sys` imported but unused",
                            "severity": 2,
                            "code": "F401",
                            "source": "Ruff",
                            "tags": [1],
                        },
                        {
                            "range": {
                                "start": {"line": 2, "character": 6},
                                "end": {"line": 2, "character": 7},
                            },
                            "data": {"fix": None, "noqa_row": 3},
                            "message": "Undefined name `x`",
                            "severity": 1,
                            "code": "F821",
                            "source": "Ruff",
                        },
                    ],
                }

            self.assertEqual(actual, expected)

    def test_no_initialization_options(self):
        with tempfile.NamedTemporaryFile(suffix=".py") as fp:
            fp.write(CONTENTS.encode())
            fp.flush()
            uri = utils.as_uri(fp.name)

            actual = []
            with session.LspSession(
                cwd=os.getcwd(),
                script=PROJECT_ROOT / "bundled" / "tool" / "server.py",
            ) as ls_session:
                ls_session.initialize(
                    {
                        **defaults.VSCODE_DEFAULT_INITIALIZE,
                        "initializationOptions": None,
                    }
                )

                done = Event()

                def _handler(params):
                    nonlocal actual
                    actual = params
                    done.set()

                ls_session.set_notification_callback(
                    session.PUBLISH_DIAGNOSTICS, _handler
                )

                ls_session.notify_did_open(
                    {
                        "textDocument": {
                            "uri": uri,
                            "languageId": "python",
                            "version": 1,
                            "text": CONTENTS,
                        }
                    }
                )

                # Wait to receive all notifications.
                done.wait(TIMEOUT_SECONDS)

                expected = {
                    "uri": uri,
                    "diagnostics": [
                        {
                            "range": {
                                "start": {"line": 0, "character": 7},
                                "end": {"line": 0, "character": 10},
                            },
                            "data": {
                                "fix": {
                                    "content": "",
                                    "message": "Remove unused import: `sys`",
                                    "location": {"row": 1, "column": 0},
                                    "end_location": {"row": 2, "column": 0},
                                },
                                "noqa_row": 1,
                            },
                            "message": "`sys` imported but unused",
                            "severity": 2,
                            "code": "F401",
                            "source": "Ruff",
                            "tags": [1],
                        },
                        {
                            "range": {
                                "start": {"line": 2, "character": 6},
                                "end": {"line": 2, "character": 7},
                            },
                            "data": {"fix": None, "noqa_row": 3},
                            "message": "Undefined name `x`",
                            "severity": 1,
                            "code": "F821",
                            "source": "Ruff",
                        },
                    ],
                }

            self.assertEqual(actual, expected)
