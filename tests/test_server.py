"""Test for linting over LSP."""
from __future__ import annotations

import logging
import unittest
from threading import Event

from tests.client import constants, defaults, session, utils

TEST_FILE_PATH = constants.TEST_DATA / "sample" / "sample.py"
TEST_FILE_URI = utils.as_uri(str(TEST_FILE_PATH))
TIMEOUT_SECONDS = 10


class TestServer(unittest.TestCase):
    def test_linting_example(self):
        """Test linting on file open."""
        logging.info(TEST_FILE_PATH)
        contents = TEST_FILE_PATH.read_text()

        actual = []
        with session.LspSession() as ls_session:
            ls_session.initialize(defaults.VSCODE_DEFAULT_INITIALIZE)

            done = Event()

            def _handler(params):
                nonlocal actual
                actual = params
                done.set()

            ls_session.set_notification_callback(session.PUBLISH_DIAGNOSTICS, _handler)

            ls_session.notify_did_open(
                {
                    "textDocument": {
                        "uri": TEST_FILE_URI,
                        "languageId": "python",
                        "version": 1,
                        "text": contents,
                    }
                }
            )

            # Wait to receive all notifications.
            done.wait(TIMEOUT_SECONDS)

            expected = {
                "uri": TEST_FILE_URI,
                "diagnostics": [
                    {
                        "range": {
                            "start": {"line": 0, "character": 7},
                            "end": {"line": 0, "character": 10},
                        },
                        "data": {
                            "content": "",
                            "location": {"row": 1, "column": 0},
                            "end_location": {"row": 2, "column": 0},
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
                        "message": "Undefined name `x`",
                        "severity": 2,
                        "code": "F821",
                        "source": "Ruff",
                    },
                ],
            }

        self.assertEqual(actual, expected)
