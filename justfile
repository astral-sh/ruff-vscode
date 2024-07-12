default: fmt check

lock:
  uv pip compile --python-version 3.7.9 --generate-hashes -o ./requirements.txt ./pyproject.toml
  uv pip compile --python-version 3.7.9 --generate-hashes --upgrade --extra dev -o ./requirements-dev.txt ./pyproject.toml
  npm install --package-lock-only

setup:
  uv pip sync --require-hashes ./requirements.txt --target ./bundled/libs

install:
  uv pip sync --require-hashes ./requirements-dev.txt
  npm ci

test: setup
  python -m unittest

e2e-tests: setup
  npm run pretest
  npm run tests

check:
  ruff check ./bundled/tool ./build ./tests
  ruff format --check ./bundled/tool ./build ./tests
  mypy ./bundled/tool ./build ./tests
  npm run fmt-check
  npm run lint
  npm run tsc

fmt:
  ruff check --fix ./bundled/tool ./build ./tests
  ruff format ./bundled/tool ./build ./tests
  npm run fmt

build-package: setup
  npm ci
  npm run vsce-package

clean:
  rm -rf out
  rm -rf node_modules
  rm -rf .vscode-test
  rm -rf bundled/libs
