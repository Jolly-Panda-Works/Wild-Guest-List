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

## 4. Menu pages default to popups, not full pages

Home's menu-type destinations — anything that's a quick lookup or a
settings tweak rather than a step toward starting/continuing a match
(e.g. Profile, Settings, Card Guide, About, How-to-Play) — should open
as a genuine popup modal over Home (`.modal`/`.modal-content`, wired
via `js/ui/modal-ui.js`), **not** as a separate top-level page.

- Default to a popup for any new or converted Home menu item.
- Only make something a real top-level page/document if the task
  explicitly asks for that, or the screen is genuinely a step in
  starting/continuing a match (the current example: Choose Bot
  Difficulty, `bot-difficulty.html` — it needs real
  Back/refresh/direct-URL behavior because it's mid-flow, not a menu
  lookup).
- When converting a page into a popup (or vice versa), update
  `docs/ARCHITECTURE_PLAN.md` and the relevant `README.md` section so
  the documented navigation architecture still matches reality — see
  rule 2.
- All `.modal` popups share one open/close lifecycle — backdrop
  click, Escape, focus-into-popup-on-open, focus-restore-on-close,
  and a Tab focus trap — handled centrally in `js/ui/modal-ui.js`
  (`openModal`/`closeModal` + the document-level listeners at the
  bottom of that file). Use `openModal`/`closeModal` for any new
  popup instead of writing bespoke show/hide logic, and don't build a
  second popup framework — extend this one.

## 5. Home's real boot sequence lives in `bootHome()`, gated by Splash/Loading

`js/home-main.js`'s `bootHome()` is the actual startup sequence
(i18n → modals/profile → Home wiring → icons). It's driven by
`js/ui/startup-ui.js`'s `runStartup()`, which shows `#startupScreen`
(Splash with the Jolly Panda logo → Loading, only if boot genuinely
takes longer than the splash's minimum time → Error + Retry on
failure) — see README.md § Startup.

- Add new one-time boot steps *inside* `bootHome()`, not as bare
  top-level awaits in `js/home-main.js` — top-level awaits bypass the
  Splash/Loading/Error UI entirely.
- `bootHome()` must stay re-invokable: Retry calls it again on
  failure. Prefer steps that are safe to run twice (fetch-based reads,
  idempotent DOM population) over steps that unconditionally
  `addEventListener` on every call, or guard the latter.
- The Jolly Panda logo (and any future splash/loading visual) resolves
  through `data/config.json` → `branding.*`, loaded via
  `js/ui/icon-ui.js`'s exported `getIconConfig()` — don't add another
  parallel `fetch("./data/config.json")`.

