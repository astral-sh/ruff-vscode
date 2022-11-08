# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
"""
Test for linting over LSP.
"""

from threading import Event

from hamcrest import assert_that, is_

from .lsp_test_client import constants, defaults, session, utils

TEST_FILE_PATH = constants.TEST_DATA / "sample1" / "sample.py"
TEST_FILE_URI = utils.as_uri(str(TEST_FILE_PATH))
SERVER_INFO = utils.get_server_info_defaults()
TIMEOUT = 10  # 10 seconds


def test_linting_example():
    """Test to linting on file open."""
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

        # wait for some time to receive all notifications
        done.wait(TIMEOUT)

        expected = {
            "uri": TEST_FILE_URI,
            "diagnostics": [
                {
                    "range": {
                        "start": {"line": 0, "character": 0},
                        "end": {"line": 0, "character": 0},
                    },
                    "message": "`sys` imported but unused",
                    "severity": 2,
                    "code": "F401",
                    "source": SERVER_INFO["name"],
                },
                {
                    "range": {
                        "start": {"line": 2, "character": 6},
                        "end": {"line": 2, "character": 6},
                    },
                    "message": "Undefined name `x`",
                    "severity": 2,
                    "code": "F821",
                    "source": SERVER_INFO["name"],
                },
            ],
        }

    assert_that(actual, is_(expected))
