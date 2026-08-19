default: fmt check

lock:
  uv lock --upgrade
  npm install --package-lock-only --ignore-scripts

setup:
  uv export --locked --no-dev --no-emit-project | uv pip sync --no-config --require-hashes --python-version 3.8.20 --target ./bundled/libs -

install:
  uv sync --active --locked
  npm ci --ignore-scripts

test: setup
  python -m unittest

e2e-tests: setup
  npm run pretest
  npm run tests

check:
  ruff check ./bundled/tool ./build ./tests ./scripts
  ruff format --check ./bundled/tool ./build ./tests ./scripts
  ty check scripts/release.py
  ty check ./bundled/tool ./build ./tests
  npm run fmt-check
  npm run lint
  npm run tsc

fmt:
  ruff check --fix ./bundled/tool ./build ./tests ./scripts
  ruff format ./bundled/tool ./build ./tests ./scripts
  npm run fmt

build-package: setup
  npm ci --ignore-scripts
  npm run vsce-package

clean:
  rm -rf out
  rm -rf node_modules
  rm -rf .vscode-test
  rm -rf bundled/libs

release:
  uv run scripts/release.py
