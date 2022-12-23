"""Constants for use with tests."""
from __future__ import annotations

import pathlib

TEST_ROOT = pathlib.Path(__file__).parent.parent
TEST_DATA = TEST_ROOT / "data"
PROJECT_ROOT = TEST_ROOT.parent
