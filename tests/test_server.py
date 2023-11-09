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
                    "diagnostics": [
                        {
                            "code": "F401",
                            "codeDescription": {
                                "href": "https://docs.astral.sh/ruff/rules/unused-import"
                            },
                            "data": {
                                "fix": {
                                    "applicability": "safe",
                                    "edits": [
                                        {
                                            "content": "",
                                            "end_location": {"column": 0, "row": 2},
                                            "location": {"column": 0, "row": 1},
                                        }
                                    ],
                                    "message": "Remove unused import: `sys`",
                                },
                                "noqa_row": 1,
                                "cell": None,
                            },
                            "message": "`sys` imported but unused",
                            "range": {
                                "end": {"character": 10, "line": 0},
                                "start": {"character": 7, "line": 0},
                            },
                            "severity": 2,
                            "source": "Ruff",
                            "tags": [1],
                        },
                        {
                            "code": "F821",
                            "codeDescription": {
                                "href": "https://docs.astral.sh/ruff/rules/undefined-name"
                            },
                            "data": {"fix": None, "noqa_row": 3, "cell": None},
                            "message": "Undefined name `x`",
                            "range": {
                                "end": {"character": 7, "line": 2},
                                "start": {"character": 6, "line": 2},
                            },
                            "severity": 1,
                            "source": "Ruff",
                        },
                    ],
                    "uri": uri,
                }

            self.maxDiff = None
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
                    "diagnostics": [
                        {
                            "code": "F401",
                            "codeDescription": {
                                "href": "https://docs.astral.sh/ruff/rules/unused-import"
                            },
                            "data": {
                                "fix": {
                                    "applicability": "safe",
                                    "edits": [
                                        {
                                            "content": "",
                                            "end_location": {"column": 0, "row": 2},
                                            "location": {"column": 0, "row": 1},
                                        }
                                    ],
                                    "message": "Remove unused import: `sys`",
                                },
                                "noqa_row": 1,
                                "cell": None,
                            },
                            "message": "`sys` imported but unused",
                            "range": {
                                "end": {"character": 10, "line": 0},
                                "start": {"character": 7, "line": 0},
                            },
                            "severity": 2,
                            "source": "Ruff",
                            "tags": [1],
                        },
                        {
                            "code": "F821",
                            "codeDescription": {
                                "href": "https://docs.astral.sh/ruff/rules/undefined-name"
                            },
                            "data": {"fix": None, "noqa_row": 3, "cell": None},
                            "message": "Undefined name `x`",
                            "range": {
                                "end": {"character": 7, "line": 2},
                                "start": {"character": 6, "line": 2},
                            },
                            "severity": 1,
                            "source": "Ruff",
                        },
                    ],
                    "uri": uri,
                }

            self.maxDiff = None
            self.assertEqual(actual, expected)
