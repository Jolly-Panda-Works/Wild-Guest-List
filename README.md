# 🐾 Wild Guest List

**Wild Guest List** is a browser-based strategy card game: 12 animal cards, each with its own ability, all played into one **shared Queue** where those abilities collide, remove each other, and reorder the line — with the goal of getting as many of your own animals as possible into your **Party** by the time everyone's deck runs out.

Play an animal → its ability resolves → the Queue reshuffles → the front of the Queue empties into Party (or Trash) → repeat, for 12 cards per player, against 1–3 AI opponents.

Built as a **framework-free, build-step-free** static web app — plain HTML/CSS/vanilla JavaScript ES Modules, no game engine, no bundler, no backend.

**Current version:** `1.44.2` — see [`CHANGELOG.md`](CHANGELOG.md) for release history.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Core Gameplay](#core-gameplay)
- [Victory Rules](#victory-rules)
- [Animal Cards](#animal-cards)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [AI-Assisted Development](#ai-assisted-development)
- [Roadmap](#roadmap)
- [Credits](#credits)
- [License](#license)

---

## Overview

Every player gets a private deck of the same 12 unique animals. On your turn you play one animal from your hand into a **Queue** shared by every player at the table; that animal's ability fires immediately — it might remove cards, reorder the Queue, push through weaker animals, or sort/reverse the whole line. Once the Queue holds 5 cards, it resolves: the front two go to their owners' **Party**, the last one is sent to the shared **Trash**, and the two left in the middle carry over. After 12 cards each, whoever has the most cards in their Party wins.

The strategic core is entirely in how the 12 abilities interact — a card that looks weak in isolation can become the exact right answer to what's currently sitting in the Queue. See [Animal Cards](#animal-cards) below, and [`docs/ANIMAL_ABILITIES.md`](docs/ANIMAL_ABILITIES.md) for the full, code-verified rules for every ability.

A new developer should be able to open [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) next for how the codebase is organized, or jump straight to [Getting Started](#getting-started) to run it locally.

---

## Features

**Implemented:**

- 🐾 12 unique animal cards, each with its own ability (see [Animal Cards](#animal-cards))
- 🎯 Shared Queue system — abilities interact with whatever else is currently in the Queue, not just the played card
- 🎉 Party and Trash resolution (5-card Queue → front 2 to Party, last to Trash)
- 🔮 Drag-to-play with a live **Ability Preview** — see what a card would do to the Queue before committing to play it
- 🤖 AI opponents (1–3 bots per match) with **three difficulty levels** — Easy, Medium, Hard
- 🏆 Live Match Standings panel + rank badges on opponent seats, both driven by the same Party-count ranking logic
- 📜 In-match game log
- 🏅 A data-driven achievement system (10 achievements, persisted per player)
- 📖 Interactive tutorial + a first-time gameplay walkthrough
- 🌍 Localization — English, Persian, Arabic, Turkish, including RTL layout support
- 📱 Portrait-first mobile layout, with a dedicated desktop layout (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § Responsive Design)
- 🚀 Full asset-preload loading screen — every image is fetched and decoded before Home is shown, so nothing pops in mid-match
- 🔊 Background music and a sound-effect system
- 👤 Custom player name/avatar, with settings persisted locally

**Foundation-only (visible, not yet functional):** Coin/Gem currency pills always show `0` — the balances persist, but nothing earns, spends, or rewards either currency yet. Store, Tournament, Leaderboard, Lucky Wheel, and Play vs Human (Rank/Friendly) are all real, reachable "Coming Soon" entries in the UI, not implemented features — see [Roadmap](#roadmap).

Only functionality that actually exists in the code is listed above — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 14 for a couple of documentation-accuracy findings from a recent audit, not gameplay changes.

---

## Core Gameplay

```
Player plays 1 card from hand
        ↓
Card enters the back of the shared Queue
        ↓
Its Animal Ability resolves immediately
   (may move, remove, block, sort, or reorder cards in the Queue)
        ↓
Once the Queue reaches 5 cards, it resolves:
   front 2 cards → their owners' Party
   last 1 card   → the shared Trash
   remaining 2   → stay in the Queue
        ↓
Repeat until every player has played all 12 cards
        ↓
Any cards still in the Queue are drained the same way
        ↓
Party Card Count is compared across all players
        ↓
Match Outcome: WIN / DRAW is determined
```

A match seats 1 human + 1–3 AI bots (2–4 players total, chosen from Home). See [`docs/ANIMAL_ABILITIES.md`](docs/ANIMAL_ABILITIES.md) for exactly how each of the 12 abilities resolves, including multi-player and edge-case behavior.

---

## Victory Rules

Each player plays exactly **12 cards**. After all 12 have been played (and the Queue is fully drained):

- **Party Card Count** — how many cards ended up in a player's Party — is the *only* metric compared.
- A **unique highest** Party Card Count → that player is the **WINNER**.
- **Two or more players tied** for the highest Party Card Count → the match is a **DRAW** between them.

**Card Power is not a victory metric.** There is no secondary tie-breaker of any kind — not Power, not turn count, not anything hidden — and no sudden-death round. Power's role in the game is entirely about *gameplay*: it drives which ability a card has and which cards certain abilities target (see [`docs/ANIMAL_ABILITIES.md`](docs/ANIMAL_ABILITIES.md) § Power Dependency Summary) — it plays no part in who wins.

---

## Animal Cards

| Power | Animal | Ability (short) |
| ----: | --- | --- |
| 1 | 🦡 Weasel | Removes the two highest-Power other cards in the Queue |
| 2 | 🐒 Monkey | Moves to the back; a 2nd Monkey in Queue triggers removal of all Crocodiles/Hippos |
| 3 | 🦘 Kangaroo | Jumps 1–2 positions toward the front |
| 4 | 🦜 Parrot | Same removal as Weasel, staying in the Queue |
| 5 | 🦥 Sloth Bear | No ability of its own — passively gets pulled in behind Hippo/Lion |
| 6 | 🦭 Seal | Reverses the entire Queue |
| 7 | 🦓 Zebra | No ability of its own — passively blocks Hippo/Crocodile |
| 8 | 🦒 Giraffe | Swaps with the card immediately in front of it |
| 9 | 🐍 Snake | Sorts the whole Queue by Power, highest to lowest |
| 10 | 🐊 Crocodile | Eats every weaker card in front of it, until blocked |
| 11 | 🦛 Hippo | Pushes past every weaker card in front of it, until blocked |
| 12 | 🦁 Lion | Removes all Monkeys, then rushes to the front of the Queue |

This table is a quick-reference summary. **[`docs/ANIMAL_ABILITIES.md`](docs/ANIMAL_ABILITIES.md)** is the authoritative, code-verified breakdown — trigger/target/effect/Power-dependency/edge cases for every animal, clearly split into **Current / Implemented** vs **Proposed / Not Implemented** (design-only) abilities.

---

## Architecture

Framework-free vanilla JavaScript (ES Modules), no game engine, no build step. The engine (`js/game/`, `js/abilities/`) is fully decoupled from rendering (`js/ui/`) and from an animation/presentation layer (`js/presentation/`) that translates semantic gameplay events into DOM motion without ever touching game state itself.

```
gameState ── turnManager ── abilities (dispatched by card Power)
                │                 │
                │                 └── Queue Manager ── Party / Trash
                │
                └── presentation layer (Director/Events/FLIP) ── ui/*.js (rendering)
```

Full module map, domain boundaries, the Ability Preview system, the Achievement system, AI evaluation, current Navigation Architecture (including a documentation-audit finding about four currently-unlinked legacy pages), Startup sequence, and Responsive Design are all in **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Markup | Plain HTML5 |
| Styling | Vanilla CSS, no preprocessor/framework |
| Logic | Vanilla JavaScript, native ES Modules — no frontend framework, no game engine |
| Data | Static JSON, fetched at runtime (`data/*.json`) |
| Persistence | Browser `localStorage`/`sessionStorage` — no backend, no database |
| Build tools | None — no bundler, no transpiler, no compile step |
| Testing | Node's built-in `node:test` (no external test framework) |
| Package manager | None for the app itself (no `package.json`) |
| Deployment | Any static host (GitHub Pages, Netlify, Cloudflare Pages, Vercel, etc.) |

---

## Project Structure

```text
WildGuestList/
├── index.html, bot-difficulty.html, game.html, coming-soon.html   Live, linked top-level pages
├── css/style.css        One shared stylesheet
├── data/                 cardInfo.json, config.json, i18n.json, tutorial.json, cardColors.json
├── js/
│   ├── abilities/          Ability system (dispatched by card Power)
│   ├── presentation/       Animation layer, decoupled from game logic
│   ├── ai/                  Bot card-selection logic
│   ├── game/                  Core loop: state, turns, Queue, match outcome, scoring
│   ├── services/                Data loading, i18n, persistence, achievements, audio
│   └── ui/                        DOM rendering + event wiring, per screen
└── assets/                 fonts/, sound/, img/ (branding, cards, avatars, icons)
```

This is a summary. **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § Project Structure** has the complete, accurate directory listing — including four legacy top-level pages (`profile.html`, `settings.html`, `cards.html`, `game-modes.html`) that still exist and work, but are not currently linked from Home; see that section for the full explanation.

---

## Getting Started

### Prerequisites

- A modern browser (anything with ES Module support).
- A way to serve static files over `http://` — the game fetches JSON via `fetch()` inside ES modules, which most browsers restrict under a bare `file://` URL. Any static file server works.
- [Node.js](https://nodejs.org/) 18+ **only if you want to run the test suite** — the game itself needs no Node install to play.

### Installation

There is nothing to install — no dependencies, no `npm install`, no build step. Clone or download the repository and serve it as static files.

### Configuration

There are no environment variables or secrets to configure. Runtime configuration lives entirely in `data/config.json` (app version, icon paths, sound file map, branding paths, achievement thresholds) and is committed to the repository — nothing here is sensitive.

### Running Locally

**Option 1 — VS Code Live Server (or any similar extension):** open the project folder, then launch `index.html` through the local server.

**Option 2 — Python's built-in server:**

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

**Option 3 — any other static server** (e.g. `npx serve`, `caddy file-server`, etc.) works the same way — just make sure it's serving the project root, not a subfolder.

### Development

No build/watch step exists — edit a file, refresh the browser. See [`AGENTS.md`](AGENTS.md) for the project's working conventions if you're contributing (versioning discipline, when a menu destination should be a popup vs. a page, and the documentation-maintenance rules this audit added).

A Development-only Reward Popup preview (`Ctrl+Alt+R`/`D`/`L`/`O` on `localhost`/`127.0.0.1`/a `file:` URL) lets you see the end-of-match screen without playing a full match — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) § 11 for the full trigger list; it's a genuine no-op on any real deployment.

---

## Testing

Tests use Node's built-in `node:test` + `node:assert/strict` — there is no external test framework, no `package.json`, and no DOM test harness (jsdom/Playwright); a few files stub just enough of `fetch`/`localStorage`/DOM for the real module under test to run unmodified.

```bash
node --test tests/*.test.mjs
```

Run this from the project root — the tests' polyfilled `fetch()` calls resolve `data/config.json`/`data/cardInfo.json` relative to the current working directory.

At the time of writing there are 14 test files, covering achievement unlock conditions, match-outcome/Draw resolution, profile currency storage, the orientation gate, and a set of CSS/markup-source-level regression tests. There is **no automated coverage of the core ability-resolution logic** (`js/abilities/abilities.js`) yet — see [`tests/README.md`](tests/README.md) for the authoritative, maintained breakdown of what's covered and its known gaps; that file is the source of truth for test coverage, not this section.

---

## Documentation

| Document | Covers |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Current, code-verified architecture — module boundaries, data flow, ability system, presentation layer, AI, navigation, project structure, startup, responsive design |
| [`docs/ANIMAL_ABILITIES.md`](docs/ANIMAL_ABILITIES.md) | Every animal ability in full detail (Current/Implemented), plus design proposals for future animals (Proposed/Not Implemented) |
| [`tests/README.md`](tests/README.md) | What each test file covers, how to run the suite, and known coverage gaps |
| [`CHANGELOG.md`](CHANGELOG.md) | Full release history, most recent first |
| [`AGENTS.md`](AGENTS.md) | Working conventions for anyone (human or AI) changing this codebase, including documentation-maintenance rules |
| [`docs/ARCHITECTURE_PLAN.md`](docs/ARCHITECTURE_PLAN.md) | *Forward-looking* target architecture/migration plan — not current state |
| [`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md) | *Forward-looking* phased roadmap and task breakdown |
| [`docs/ECONOMY_PLAN.md`](docs/ECONOMY_PLAN.md) | *Forward-looking* plan for the Store/coin economy — none of it is implemented yet |
| [`docs/UI_UX_PLAN.md`](docs/UI_UX_PLAN.md) | *Forward-looking* per-screen UI/UX review and design-system recommendations |
| [`docs/PROJECT_AUDIT.md`](docs/PROJECT_AUDIT.md) | A dated (2026-08-09) point-in-time codebase audit — kept as a historical record; see `docs/ARCHITECTURE.md` for current state |

All links above were verified to resolve to real files in this repository as of this README revision.

---

## Contributing

This is a small/solo-maintained project without a formal external-contribution process, CI pipeline, or issue-triage workflow today — there's no `CONTRIBUTING.md` because there isn't yet a process to document beyond what's already in `AGENTS.md`. If that changes, this section (and a proper `CONTRIBUTING.md`) should be added — see the Documentation Maintenance rules in `AGENTS.md`.

For anyone working in this codebase (including AI coding agents), `AGENTS.md` is the authoritative set of working rules: version-bumping discipline, when a Home destination should be a popup vs. a real page, and — as of this audit — documentation-maintenance requirements.

---

## AI-Assisted Development

This project has been developed with AI coding assistance, and **[`AGENTS.md`](AGENTS.md)** is the single, authoritative instruction file any AI coding assistant (Claude, Cursor, Copilot, etc.) should read before making changes here — not a competing or duplicate set of rules. It currently covers:

- Version-bumping discipline (`data/config.json` → `app.version`, semver rules).
- Keeping `README.md` current alongside code changes.
- When a Home menu destination should default to a popup vs. a real top-level page.
- How Home's boot sequence (`bootHome()`) must stay structured.
- **Documentation Maintenance** — when documentation must be updated as part of a change, and where each kind of documentation belongs (added by this audit).

---

## Roadmap

The Home UI already reserves real, labeled "Coming Soon" entries for several of these, so they can be built in without reshaping navigation later:

- 🌐 Online multiplayer (Play vs Human — Rank/Friendly)
- 🏪 Store, with a real coin/gem economy
- 🏆 Tournament and global Leaderboard modes
- 🎡 Lucky Wheel rewards
- 🎨 Additional animal cards
- 🃏 Additional game modes

See [`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md) for the phased, task-level plan and [`docs/ECONOMY_PLAN.md`](docs/ECONOMY_PLAN.md) for the coin/store design specifically. Both are forward-looking plans, not commitments or current behavior.

---

## Credits

**Wild Guest List** — designed and developed by **Usef / Jolly Panda**.

An indie project exploring card-game design, AI decision-making, Queue-based mechanics, data-driven game systems, and a modular, framework-free JavaScript architecture.

---

## License

This project is an original game project. Unless otherwise specified, the source code, artwork, game design, and other project assets are not licensed for redistribution or commercial use without permission from the developer.

---

**Build your guest list. Manipulate the queue. Outsmart the wild.** 🎉
