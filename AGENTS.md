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

`README.md` is an onboarding entry point, not a changelog — record
per-release detail in `CHANGELOG.md` (most-recent-first, one entry
per notable change) instead of growing it inline in `README.md`
again. See rule 6 for the fuller documentation-maintenance policy,
which applies to `docs/` and `CHANGELOG.md` as well as `README.md`.

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
  `docs/ARCHITECTURE.md` § Navigation Architecture (the current-state
  doc) and the relevant `README.md` section so the documented
  navigation architecture still matches reality — see rule 2 and rule
  6. `docs/ARCHITECTURE_PLAN.md` is a separate, forward-looking target
  document; update it too only if the change affects that plan.
- If a page stops being linked from anywhere (superseded by a popup
  or another page) but its file isn't deleted, don't just leave it
  undocumented — either delete the now-dead file/entry-script in the
  same task, or explicitly note it as an intentionally-kept,
  currently-unlinked page in `docs/ARCHITECTURE.md` § Navigation
  Architecture. Silently leaving a fully-implemented, unlinked page
  with no documentation trail is how `profile.html`, `settings.html`,
  `cards.html`, and `game-modes.html` were found, undocumented, in a
  2026 documentation audit — don't repeat that.
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

## 6. Documentation Maintenance

Documentation is part of the implementation and must remain
consistent with the codebase — an inaccurate doc is worse than no
doc, because it actively misleads the next person (human or AI) who
trusts it.

When making a code, architecture, gameplay, API, configuration, or
workflow change:

1. Check whether existing documentation is affected —
   `README.md`, `docs/*.md`, `tests/README.md`, or this file.
2. Update affected documentation in the **same task**, not a
   follow-up one — see rule 3's "do both in the same task" principle;
   it applies to documentation generally, not just the version/README
   pairing.
3. Create documentation when introducing a new significant system or
   developer-facing workflow that doesn't fit into an existing doc's
   scope.
4. Remove or update documentation that becomes obsolete. Do not leave
   documentation describing behavior that no longer exists — an
   outdated doc left in place is treated as a bug.
5. Keep `README.md`'s setup/run/test instructions synchronized with
   the project's actual scripts and configuration (there is no
   `package.json`/build step today — if that ever changes, update
   README's Getting Started/Testing sections in the same task).
6. Keep documentation links valid — if you rename, move, or delete a
   file that's linked from `README.md` or another doc, update every
   link to it in the same task.
7. Do not document planned/proposed behavior as implemented behavior.
   Where a document needs both (e.g. `docs/ANIMAL_ABILITIES.md`),
   keep "Current / Implemented" and "Proposed / Not Implemented"
   clearly separated, never interleaved.
8. Prefer a single authoritative source for each concept instead of
   restating it in multiple places:
   - **Current architecture / module boundaries / navigation** →
     `docs/ARCHITECTURE.md`.
   - **Forward-looking plans** (target architecture, roadmap, economy,
     UI/UX backlog) → `docs/ARCHITECTURE_PLAN.md`,
     `docs/PRODUCT_ROADMAP.md`, `docs/ECONOMY_PLAN.md`,
     `docs/UI_UX_PLAN.md`. Don't let plan documents silently become
     the description of current behavior — if a planned item ships,
     move its description into `docs/ARCHITECTURE.md`/`README.md` and
     either remove it from the plan doc or mark it done there.
   - **Animal ability rules** → `docs/ANIMAL_ABILITIES.md`.
   - **Release history** → `CHANGELOG.md`. Do not restart a second
     inline changelog inside `README.md` — that duplication is exactly
     what a prior documentation audit had to unwind (see
     `CHANGELOG.md`'s own header note and `docs/ARCHITECTURE.md` § 14).
   - **Test coverage** → `tests/README.md`.
   `README.md` should summarize and link to these, not duplicate their
   detail.

### Documentation Impact Check

Before considering a task done, ask whether the change affects any of:
public/gameplay behavior, architecture, APIs, configuration,
development workflows, commands, data models, or user-facing
functionality. If it does, update the relevant documentation as part
of the same task — don't defer it to a separate documentation task
unless the task you were given explicitly scopes documentation out.

### Don't over-document

This rule exists to keep documentation *accurate*, not to maximize how
much of it exists. Most trivial changes need no documentation update
at all. Typically requires a doc check:

- A new gameplay system or changed gameplay rule
- A new or changed public API/behavior
- A new development command or changed setup process
- A new architecture boundary or configuration requirement
- A significant UI/system behavior change
- A new developer workflow
- A changed project structure (new/removed top-level file or folder)

Typically does **not** require a doc update:

- An internal variable/function rename with no behavioral change
- A small refactor with no observable difference
- A typo fix in code (not in a doc)
- An internal performance optimization with no developer-facing impact

When genuinely unsure, err toward a short doc update rather than
silence — but don't pad an existing doc with restatements of things
it already says.

