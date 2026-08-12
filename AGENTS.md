# AGENTS.md — Rules for AI assistants working on this repo

These rules apply to any AI coding assistant (Claude, Cursor, Copilot, etc.)
making changes in this repository. Follow them on every task, not just when
asked.

## 1. Always bump the version

`data/config.json` → `app.version` is the single source of truth for the
project's version number (see README.md § Version). It is displayed at
runtime in the Settings modal via `index.html`'s `[data-app-version]`
element, populated by `js/ui/icon-ui.js`.

On **every task that changes code, data, or assets** (feature, fix, style,
refactor — anything with a real effect on the shipped app):

1. Bump `app.version` in `data/config.json` using semver:
   - **MAJOR** — breaking change (save/data format change, incompatible
     rework of core mechanics).
   - **MINOR** — new feature or user-visible capability (`feat:` commits).
   - **PATCH** — bug fix, small tweak, refactor, style/UI polish
     (`fix:`/`style:`/`refactor:` commits).
2. Never edit the version number anywhere else. `index.html` must keep
   reading it dynamically — do not reintroduce a hardcoded version string.
3. If a task is purely internal (docs-only, comments, no shipped-code
   change), the version does not need to bump — use judgment, but default
   to bumping when in doubt.

## 2. Always keep README.md current

After any change that affects what's described in `README.md` — new
features, changed gameplay rules, new animal cards/abilities, changed
settings, new file/folder in the project structure, etc. — update the
relevant section of `README.md` in the same task. Do not let it drift out
of date. At minimum, always update the **Version** section to match the new
`app.version`.

## 3. Do both in the same task

Treat "bump the version" and "update the README" as part of finishing the
task, not a separate follow-up step — do them before considering the task
done.
