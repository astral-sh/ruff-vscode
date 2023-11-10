# Changelog

See [here](https://github.com/charliermarsh/ruff/releases) for the Ruff release notes.

## 2023.50.0

This release fixes a bug in which Ruff overwrite excluded files during formatting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.48.0...2023.50.0

## 2023.48.0

This release fixes a bug in which syntax errors caused files to clear when formatting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.46.0...2023.48.0

## 2023.46.0

This release includes full support for using Ruff with Jupyter Notebooks in VS Code. For example:

```json
{
  "notebook.formatOnSave.enabled": true,
  "notebook.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.44.0...2023.46.0

## 2023.44.0

This release includes full support for using Ruff as a Python formatter via Ruff's `ruff format`
command.

You can configure Ruff to format Python code by marking it as your default formatter in VS Code's
`settings.json`:

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "charliermarsh.ruff"
  }
}
```

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.42.0...2023.44.0

## 2023.42.0

This release is required for compatibility with [Ruff v0.1.0+](https://github.com/astral-sh/ruff/releases/v0.1.0)
which includes breaking changes.

Ruff fixes are now labeled as "safe" or "unsafe". By default, the "Fix all" action will no longer apply unsafe
fixes. However, unsafe fixes can be applied manually with the "Quick fix" action. Application of unsafe fixes when
using "Fix all" can be enabled by setting `unsafe-fixes = true` in your Ruff configuration file or adding
`--unsafe-fixes` flag to the "Lint args" setting.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.40.0...2023.42.0

## 2023.40.0

- **Deprecation**: `ruff.args` has been renamed to `ruff.lint.args` (see: https://github.com/astral-sh/ruff-vscode/pull/293).
- **Deprecation**: `ruff.run` has been renamed to `ruff.lint.run` (see: https://github.com/astral-sh/ruff-vscode/pull/293).

The extension will continue to respect the deprecated variants (`ruff.args` and `ruff.run`), but
they will be removed in a future release.

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.38.0...2023.40.0

## 2023.38.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.36.0...2023.38.0

## 2023.36.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.34.0...2023.36.0

## 2023.34.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.32.0...2023.34.0

## 2023.32.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.30.0...2023.32.0

## 2023.30.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.28.0...2023.30.0

## 2023.28.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.26.0...2023.28.0

## 2023.26.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.24.0...2023.26.0

## 2023.24.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.22.0...2023.24.0

## 2023.22.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.20.0...2023.22.0

## 2023.20.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.18.0...2023.20.0

## 2023.18.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.16.0...2023.18.0

## 2023.16.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.14.0...2023.16.0

## 2023.14.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.12.0...2023.14.0

## 2023.12.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.10.0...2023.12.0

## 2023.10.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.8.0...2023.10.0

## 2023.8.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.6.0...2023.8.0

## 2023.6.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.4.0...2023.6.0

## 2023.4.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2023.2.0...2023.4.0

## 2023.2.0

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.2.0...2023.2.0

## 2022.0.26 (22 December 2022)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.25...2022.0.26

## 2022.0.25 (22 December 2022)

- Migrate to ruff-lsp by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/75
- Simplify some TypeScript code by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/77
- Upgrade ruff-lsp to v0.0.8 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/79

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.24...2022.0.25

## 2022.0.24 (21 December 2022)

- Add docs on replacing Black et al by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/66
- Skip JSON RPC abstraction for cross-interpreter calls by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/67
- Remove mypy.ini by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/68
- Clarify Black + Ruff compatibility in README by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/69
- Show check summary when hovering on checkcode in noqa comment by @harupy in https://github.com/astral-sh/ruff-vscode/pull/26
- Bump Ruff version to 0.0.190 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/74

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.23...2022.0.24

## 2022.0.23 (17 December 2022)

- Modify settings logic to match isort plugin by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/60
- Remove severity from default settings by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/62
- Bump Ruff version to 0.0.185 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/63
- Add `ruff-lsp` to README by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/64

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.22...2022.0.23

## 2022.0.22 (14 December 2022)

- Fix 'Exception ignored in atexit callback' in jsonrpc by @eddyg in https://github.com/astral-sh/ruff-vscode/pull/54
- Mark unused imports and local variables as unnecessary by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/55
- Bump Ruff version to 0.0.182 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/57

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.21...2022.0.22

## 2022.0.21 (6 December 2022)

- Bump Ruff version to 0.0.165 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/52

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.20...2022.0.21

## 2022.0.20 (1 December 2022)

- Bump default line length by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/46
- Enable CI by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/47
- Delay import of typing_extensions by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/49

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.19...2022.0.20

## 2022.0.19 (1 December 2022)

- Restore Python 3.7 compatibility by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/44

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.18...2022.0.19

## 2022.0.18 (1 December 2022)

- Enable `ruff: Organize Imports` action by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/32
- Bump Ruff version to 0.0.149 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/33
- Fix failing lint test by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/34
- Fix mypy by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/35
- Remove pylint ignore directives by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/36
- Add name and version to LanguageServer by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/38
- Upgrade to pygls==1.0.0a3 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/37
- Bump Ruff version to 0.0.150 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/40
- Implement code actions for Ruff autofix by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/39
- Update noxfile and fix lint errors by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/41
- Add diagnostic code to Quickfix by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/42

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.17...2022.0.18

## 2022.0.17 (25 November 2022)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.16...2022.0.17

## 2022.0.16 (25 November 2022)

- Publish to OpenVSX by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/30
- Bump Ruff version to 0.0.138 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/31

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.15...2022.0.16

## 2022.0.15 (20 November 2022)

- Bump Ruff version to 0.0.132 by @charliermarsh in https://github.com/astral-sh/ruff-vscode/pull/27
- add changelog.md by @akanz1 in https://github.com/astral-sh/ruff-vscode/pull/24

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.14...2022.0.15

## 2022.0.14 (15 November 2022)

- Update README.md by @akanz1 in [#21](https://github.com/astral-sh/ruff-vscode/pull/21)
- Bump Ruff version to 0.0.121 by @charliermarsh in [#22](https://github.com/astral-sh/ruff-vscode/pull/22)
- Bump version to 2022.0.14 by @charliermarsh in [#23](https://github.com/astral-sh/ruff-vscode/pull/23)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.13...2022.0.14

## 2022.0.13 (13 November 2022)

- Use scripts path when interpreter is set by @charliermarsh in [#18](https://github.com/astral-sh/ruff-vscode/pull/18)
- Bump Ruff version to 0.0.117 by @charliermarsh in [#19](https://github.com/astral-sh/ruff-vscode/pull/19)

**Full Changelog**: https://github.com/astral-sh/ruff-vscode/compare/2022.0.12...2022.0.13

## 2022.0.12 (11 November 2022)

- Add .idea and .ruff_cache to .vscodeignore by @charliermarsh in [#14](https://github.com/astral-sh/ruff-vscode/pull/14)
