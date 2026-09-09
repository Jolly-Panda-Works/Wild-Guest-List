# ARCHITECTURE.md — Wild Guest List

**Scope:** describes the *current, implemented* architecture, verified directly against the code as of `app.version` `1.42.0` (`data/config.json`).

This document is distinct from `docs/ARCHITECTURE_PLAN.md`, which is a **forward-looking target/migration plan** (server-authoritative economy, accounts, online play) written against an earlier audit snapshot (`docs/PROJECT_AUDIT.md`, dated 2026-08-09) and not fully up to date with everything below. Where the two disagree, this document — read directly from the code — is the current state; `ARCHITECTURE_PLAN.md` is the proposal for where things are headed.

See also: [`docs/ANIMAL_ABILITIES.md`](ANIMAL_ABILITIES.md) for the card/ability system in full per-animal detail (this document covers it only at the module/boundary level).

---

## 1. Tech Stack

| Layer | Technology |
| --- | --- |
| Markup | Plain HTML5, one document per top-level screen |
| Styling | Vanilla CSS (`css/style.css`, ~9,200 lines), no preprocessor, no utility framework |
| Logic | Vanilla JavaScript, native ES Modules (`<script type="module">`), no framework (no React/Vue/etc.), no game engine |
| Data | Static JSON (`data/*.json`), fetched at runtime |
| Persistence | Browser `localStorage` (profile, settings, achievements) and `sessionStorage` (one-time cross-page handoffs) — no backend, no database |
| Build | **None.** No bundler, no transpiler, no `package.json`, no compile step. Files are served and run as-authored. |
| Testing | Node's built-in `node:test` + `node:assert/strict` (no external test framework) — see § 8 |
| Package manager | None — there is no `package.json`/`node_modules` for the app itself; only Node's own built-in test runner is used, via a plain `node` install |
| Deployment | Static hosting only (GitHub Pages / Netlify / Cloudflare Pages / Vercel / any static file server) |

There is no server, no API, and no network calls other than fetching the app's own static files (JSON/JS/CSS/assets) — everything described below runs entirely in one browser tab.

---

## 2. Domain Model & Data Flow

### Game State (`js/game/gameState.js`)

A single mutable object, the one source of truth for an in-progress match:

```
gameState = {
  players: [ ... ],   // Player instances (see below)
  queue:   [ ... ],   // cards currently in the shared Queue
  trash:   [ ... ],   // cards sent to the shared Trash
  logs:    [ ... ],
  currentPlayer: <index>,
  round: <number>,
  lastAbility: <card | null>,  // see Known Quirks below
  gameOver: <bool>,
  outcome: null | { type: "WIN", winnerId } | { type: "DRAW", playerIds: [...] }
}
```

`Party` is **not** on `gameState` — each `Player` (`js/player.js`) owns its own `party` array (alongside `deck`/`hand`), since Party is per-player while Queue/Trash are shared across all players in the match.

### Card model (`js/services/dataLoader.js`, `data/cardInfo.json`)

Every card's `id` is numerically identical to its `power` — Power doubles as the animal's identity and as the key the ability dispatcher switches on (see § 3). Each player's deck is built (`js/game/deck.js#createDeck`) from exactly one copy of each of the 12 animals, shuffled; a running `uid` counter gives every card instance across all players a stable identity for the DOM/animation layer to track.

### Match lifecycle

```
Home → choose bot count/difficulty → game.html boots
        │
        ▼
   Turn loop (turnManager.js):
     play a card → card enters back of Queue → its ability resolves
        → if Queue length ≥ 5: resolve Queue (front 2 → Party, back 1 → Trash)
        → draw a replacement card (respecting the 4-card hand cap)
        → next player's turn
        │
        ▼
   Game ends once every player's hand AND deck are empty
        → any cards still in the Queue are drained (resolveRemainingQueue)
        → determineMatchOutcome() (js/game/matchOutcome.js) compares
          Party Card Count across players → WIN / DRAW
        → Reward Popup shown (js/ui/endgame-ui.js)
```

Player count is **not fixed** — Home lets the human choose 1, 2, or 3 bot opponents (`js/game-main.js` deals in however many bot difficulties were actually selected), so a match can have 2, 3, or 4 total players. `js/game/scoreManager.js` and `js/game/matchOutcome.js` are deliberately seat-count-agnostic — they only ever read `players[].party.length`, never assume a fixed player count.

**Victory metric:** Party Card Count is the *only* input to Win/Draw/Loss (`matchOutcome.js#determineMatchOutcome`). A unique highest count is a `WIN`; two or more players tied for the highest count is a full `DRAW` with **no secondary tie-breaker of any kind** — Card Power specifically plays no role in scoring, ranking, or tie-breaking. This was a deliberate change (see `CHANGELOG.md` — "Card Power removed from victory; real Draw outcome added"); Power's only remaining gameplay role is driving ability dispatch/targeting (§ 3) and AI evaluation (§ 5).

### Module boundaries

```
gameState (game/gameState.js)
    │
    ▼
turnManager.js ── orchestrates one player's turn:
    │              play → addToQueue → resolveAbility → (maybe) resolveQueue → draw → next
    │
    ├── deck.js          (deck/hand: create, draw)
    ├── abilities/abilities.js   (12 ability implementations, dispatched on card.power)
    │     └── abilities/helpers/{queue,trash,followHelpers,chooser}.js
    ├── queueManager.js  (Queue push + 5-card resolution → Party/Trash)
    ├── gameOver.js       (end-condition check)
    ├── matchOutcome.js   (WIN/DRAW resolver — Party Card Count only)
    └── scoreManager.js   (live standings/rank sort — same metric, no tie-breaker)

presentation/ ── animation layer, decoupled from game logic (see § 4)
services/     ── cross-cutting: data loading, i18n, persistence, achievements, audio
ui/           ── DOM rendering + event wiring for each screen
ai/ai.js      ── bot card selection (see § 5)
```

---

## 3. Ability System

`js/abilities/abilities.js`'s `resolveAbility(card, gameState)` dispatches with a plain `switch(card.power)` — one case per animal Power value 1–12. Two animals (**Sloth Bear**, Power 5, and **Zebra**, Power 7) have **no case at all**; their behavior is entirely passive, implemented as identity checks (`card.id === CARD_IDS.X`) inside other animals' resolution code (Hippo's/Crocodile's traversal loops, and Hippo's/Lion's shared `moveFollowersBehind` helper).

Shared primitives used by multiple abilities live in `abilities/helpers/`:

| Helper | Used by |
| --- | --- |
| `queue.js` (`moveCard`, `swapCards`) | Kangaroo, Giraffe |
| `trash.js` (`sendToTrash`) | Weasel, Parrot, Monkey, Crocodile, Lion |
| `followHelpers.js` (`moveFollowersBehind`) | Hippo, Lion (pulls Sloth Bears in behind the mover) |
| `chooser.js` (`chooseKangarooJump`) | Kangaroo (human chooser UI / AI random pick / Preview's deterministic max-jump) |

`resolveAbility` runs **synchronously as part of playing the card** (`turnManager.js#playCard`), before the Queue-full check — so an ability can never see a Queue that already resolved as a result of the very card that triggered it.

For the full per-animal breakdown (trigger/target/effect/Power dependency/edge cases) and the design proposals for future animals, see **[`docs/ANIMAL_ABILITIES.md`](ANIMAL_ABILITIES.md)**.

### Ability Preview System

```
js/abilities/previewActions.js    action enum: Stay / MoveBack / Remove / Defend / MoveToSlot / Attach / Escape
js/abilities/previewResolver.js   previewAbility() — the shared resolver
js/ui/previewOverlay-ui.js        full-card overlays — visual layer only
js/constants/preview.js           drag-start threshold
```

Before a card actually enters the Queue, both the dragging human player and the bot (just before it plays its chosen card) can preview what would happen. `previewAbility(card, gameState)` runs the **exact same** `resolveAbility()` real execution uses, but against a throwaway clone of the Queue (`{ queue: [...gameState.queue, card], trash: [], logs: [] }` — new arrays, same card object references), capturing the same events real turns emit. Because Preview and real execution share one code path, they cannot drift into two different rule sets.

Known, documented simplification: Kangaroo's jump distance is chosen interactively in real play, but Preview always assumes the farthest legal jump (`chooseKangarooJump(..., { preview: true })` short-circuits to `maxJump`) — the real distance is decided again once the card is actually played.

---

## 4. Presentation Layer (animation)

A separate module group, deliberately decoupled from game logic — **not documented anywhere else in this project's docs prior to this audit**:

```
js/presentation/events.js               semantic event vocabulary (CARD_MOVED, CARD_JUMPED, CARD_EATEN, QUEUE_REORDERED, CARD_ENTERED_PARTY, ...) + a capture buffer (beginCapture/endCapture)
js/presentation/director.js             sequential playback of a captured event batch against whichever presenter is registered (game-ui.js registers itself)
js/presentation/flip.js                 low-level DOM animation primitives (FLIP technique), operating on real DOM nodes so a card element keeps its identity as it moves between Hand/Queue/Party/Trash
js/presentation/abilityPresentations.js per-ability visual "flavor" registry (which animation/easing a given reason/cause string maps to)
```

Game/ability logic (`abilities.js`, `queueManager.js`) emits semantic events describing **what** happened, never **how** it should look. Events only exist inside a short-lived "capture" window opened by `turnManager.js` right before it calls into logic that mutates `gameState`; if nothing is capturing, `emit()` is a safe no-op. The Director never reads or mutates `gameState` and never decides what happened — it only asks the registered presenter to show something that already happened, logging and continuing past any DOM/animation failure rather than stalling the turn (game state is already correct regardless of whether the animation played).

---

## 5. AI System (`js/ai/ai.js`)

Three difficulty levels, selected per bot seat on the Choose Bot Difficulty step:

| Difficulty | Behavior |
| --- | --- |
| Easy | Picks a card at random |
| Medium | 50% best-evaluated card / 50% random |
| Hard | 85% best-evaluated card / 15% random |

The evaluator weighs Card Power, Queue size/position, opponents' cards currently in the Queue, and each ability's strategic value. AI turns run through the same `playCard()`/ability/Queue-resolution path as a human turn — there is no separate AI-only execution path.

---

## 6. Achievement System (`js/services/achievements.js`)

Data-driven: adding an achievement means adding one entry to `ACHIEVEMENT_DEFS` (+ its icon in `data/config.json` → `icons`, its i18n strings in `data/i18n.json`) — no new UI/storage/modal code. Thresholds are overridable from `data/config.json` → `achievements` without touching code. Progress is per-player, persisted to `localStorage` (`wgl_achievements`). It is event-driven, not UI-coupled — fed only from the presentation layer's capture batches (§ 4) and `gameOver.js#finishGame()`, never from reading UI state directly. See `tests/achievements.test.mjs` / `tests/README.md` for the full unlock-condition matrix, including the one known dormant achievement (**Duel Master**, which requires a 2-player match — currently unreachable since the minimum match size is also 2-player, but see the note in `tests/README.md`: it's real, wired logic, just not yet exercised by an actual 2-player game in manual play at the time it was added).

---

## 7. Navigation Architecture

**Currently linked/live flow**, reached from `index.html` (Home):

| Page | Destination | Reached from |
| --- | --- | --- |
| `index.html` | Home (+ popups: Profile, Settings, Card Guide, About, How-to-Play, Store/Tournament/Leaderboard/Lucky Wheel Coming Soon) | — |
| `bot-difficulty.html` | Choose Bot Difficulty | Home → Play vs Bot → pick bot count → Play |
| `game.html` | Gameplay | `bot-difficulty.html` → Let's Play! |
| `coming-soon.html` | Shop / Tournament / Leaderboard (`?feature=`) | Unlinked from Home's nav; still reachable by direct URL |

Home's menu-type destinations (Profile, Settings, Card Guide, About, How-to-Play) are `.modal`/`.modal-content` **popups** defined in `index.html` and wired via `js/ui/modal-ui.js`, not separate pages — per the convention in `AGENTS.md` § 4. Home's "Start Game" area is a two-level tab bar (**Play vs Bot** / **Play vs Human**), not a separate Game Modes page; Play vs Bot offers **1 / 2 / 3 Bots** as selectors plus a separate **Play** button, handing off to `bot-difficulty.html` via a `sessionStorage` key (`wgl_selectedBotCount`).

### ⚠ Orphaned pages found during this audit

The repository also contains four fully implemented, self-contained top-level pages and their entry scripts that are **not linked from anywhere in the live Home flow** (`index.html` has no link/navigation to any of them):

| File | Entry script | What it implements |
| --- | --- | --- |
| `profile.html` | `js/profile-main.js` | A standalone Profile page (the live flow uses `#profileModal`, a popup, instead) |
| `settings.html` | `js/settings-main.js` | A standalone Settings page (the live flow uses `#settingsModal`, a popup, instead) |
| `cards.html` | `js/cards-main.js` | A standalone Card Guide page (the live flow uses `#helpModal`, a popup, instead) |
| `game-modes.html` | `js/game-modes-main.js` | A standalone "Game Modes" page that itself hosts the bot-count/difficulty selection UI as a sub-state (superseded by Home's own Play vs Bot tab + `bot-difficulty.html`, added in `CHANGELOG.md`'s 1.40.0/1.41.0 entries) |

Evidence this isn't a documentation gap but a real, currently-unlinked set of pages: `CHANGELOG.md`'s 1.36.6 entry describes `cards.html` as "Home's Card Guide destination, a top-level `.screen-overlay` page" at that point in the project's history, and 1.36.7 separately references "Home's Settings **page**" alongside "its popup on `index.html`" as two simultaneously-existing surfaces. Later entries (1.40.0, 1.41.0) restructured Home's Start Game area directly on `index.html` rather than through `game-modes.html`. Each of these four pages still works correctly if opened directly by URL (each has its own working bootstrap, i18n loading, and orientation gate) — none of them are broken; they are simply no longer part of the linked navigation graph.

**This is a finding, not a fix applied here** (this task is documentation-only — see `AGENTS.md` § Scope). A follow-up implementation task should decide whether to: (a) delete these four pages/entry-scripts as superseded dead code, (b) re-link them for a specific purpose, or (c) leave them as intentional direct-URL-only alternates — and then update this section accordingly.

---

## 8. Testing

- **Framework:** none — Node's built-in `node:test` + `node:assert/strict`, with `fetch`/`localStorage`/a minimal DOM stubbed just enough for the real module under test to run unmodified. No jsdom/Playwright/other DOM harness exists.
- **Location:** `tests/*.test.mjs` (14 files at the time of this audit).
- **Run:** `node --test tests/*.test.mjs` from the project root (relative `fetch()` calls in the polyfill resolve against `process.cwd()`).
- **Coverage shape:** primarily achievement-unlock logic, match-outcome/Draw resolution, profile currency storage, the orientation gate, and a number of CSS/markup-source-level regression tests (this project's own established pattern for guarding layout/markup invariants without a real DOM harness — see individual test file headers). There is **no** automated coverage of the core ability-resolution logic (`abilities.js`) itself yet.
- See `tests/README.md` for the authoritative, maintained breakdown of what each test file covers and its known gaps — do not duplicate that detail elsewhere; link to it instead.

---

## 9. Project Structure

```text
WildGuestList/
│
├── index.html            Home — landing page; also hosts its menu popups (Profile, Settings, Card Guide, About, How-to-Play)
├── bot-difficulty.html    Choose Bot Difficulty — real top-level page, reached from Home → Play vs Bot
├── game.html              Gameplay — the board; all in-match init lives here
├── coming-soon.html       Shared "not built yet" page (?feature=...); unlinked from Home's nav, still reachable directly
├── profile.html            Not linked from Home today — see § 7 "Orphaned pages"
├── settings.html            Not linked from Home today — see § 7 "Orphaned pages"
├── cards.html                Not linked from Home today — see § 7 "Orphaned pages"
├── game-modes.html            Not linked from Home today — see § 7 "Orphaned pages"
│
├── css/
│   └── style.css          One shared stylesheet for every screen (no per-page CSS files)
│
├── data/                  All game/content data, fetched at runtime — nothing here is bundled
│   ├── cardInfo.json      The 12 animals: power/id, name, emoji, description, example, image path, translations
│   ├── config.json        app.version, icon path map, sound file map, branding paths, achievement thresholds
│   ├── i18n.json          UI strings for en/fa/ar/tr, incl. RTL direction metadata
│   ├── cardColors.json    Per-seat card color options
│   └── tutorial.json      Data-driven tutorial slide content
│
├── js/
│   ├── home-main.js / bot-difficulty-main.js / game-main.js / coming-soon-main.js   Page bootstraps for the four linked pages
│   ├── profile-main.js / settings-main.js / cards-main.js / game-modes-main.js       Page bootstraps for the four currently-unlinked pages (§ 7)
│   ├── cards.js, player.js, i18n.js
│   │
│   ├── abilities/          Ability system — see § 3
│   │   └── helpers/
│   ├── presentation/       Animation layer — see § 4 (director.js, events.js, flip.js, abilityPresentations.js)
│   ├── ai/                 ai.js — see § 5
│   ├── constants/          cardIds.js, playerTypes.js, preview.js, rank.js, cardColors.js, feedback.js, longPress.js, turnTimer.js
│   ├── dev/                rewardPopupDevTrigger.js — Development-only Reward Popup preview, gated by services/devEnv.js, no-op in Production
│   │
│   ├── game/               Core game loop — see § 2
│   │   ├── deck.js, gameOver.js, gameState.js, help.js (Card Guide), matchOutcome.js,
│   │   │   queueManager.js, scoreManager.js, turnManager.js, turnTimer.js
│   │
│   ├── services/           Cross-cutting concerns
│   │   ├── achievements.js  — see § 6
│   │   ├── assetPreloader.js  — preloads/decodes every game image during Startup
│   │   ├── dataLoader.js     — the one place data/cardInfo.json is fetched/cached
│   │   ├── devEnv.js         — runtime Development-vs-Production detection (hostname/protocol based; no bundler/NODE_ENV)
│   │   ├── logger.js, profile.js, soundManager.js
│   │
│   └── ui/                 DOM rendering + event wiring, one module per screen/concern
│       (achievementNotification-ui.js, cardColor-ui.js, cardGuidance-ui.js, cardHelpHint.js,
│        endgame-ui.js, feedback-ui.js, game-ui.js, home-ui.js, homeGameStart-ui.js, icon-ui.js,
│        kangaroo-ui.js, leaderboard-ui.js, log-ui.js, longPress.js, mobile-ui.js, modal-ui.js,
│        orientation-ui.js, pause-ui.js, playVsBot-ui.js, playerAvatar-ui.js, previewOverlay-ui.js,
│        profile-ui.js, startup-ui.js, tutorial-ui.js, ui.js, walkthrough.js)
│
└── assets/
    ├── fonts/               Self-hosted .woff2 files + fonts.css
    ├── sound/                background.mp3
    └── img/
        ├── branding/          banner, favicon, logos
        ├── cards/               01-weasel.png … 12-lion.png (path as declared in data/cardInfo.json's "image" field)
        ├── avatars/               boy.png, girl.png
        └── icons/                  UI icons, referenced via data/config.json, never hardcoded in JS
```

All folder/file names under `assets/` use lowercase kebab-case, so every path is safe to reference directly in code/URLs. Icon and card image paths are never hardcoded in JS — they're looked up from `data/config.json` (`icons`) and `data/cardInfo.json` (`image`) respectively.

---

## 10. Startup Sequence

`index.html` boots behind a Splash overlay (`#startupScreen`, `js/ui/startup-ui.js`) rather than appearing bare while `js/home-main.js#bootHome()` is still initializing:

1. **Splash + Progress** — a real (not simulated) progress bar driven by `js/services/assetPreloader.js#preloadAllImages()`, which fetches and `decode()`s every image the game can ever show (icons, card art, branding, avatars — assembled from the project's own existing manifests, never a hand-maintained second list) before boot finishes.
2. **Ready** — once both the image preload and the rest of `bootHome()` (i18n → modals/profile → Home wiring → icons) resolve, the overlay fades out.
3. **Error** — if `bootHome()` throws (e.g. `config.json`/`i18n.json` fails to fetch), a Retry button re-invokes `bootHome()` from the top.

---

## 11. Development/Test-Mode Shortcuts

The Reward Popup (`#endGameScreen`) is normally only reachable by finishing a full match. In a Development environment (`js/services/devEnv.js#isDevEnvironment()` — checks the page's actual runtime origin: `localhost`/`127.0.0.1`/`0.0.0.0`/`::1`/a `file:` URL, since there's no bundler/`NODE_ENV` to read), it can be previewed directly:

| Trigger | Scenario |
| --- | --- |
| `Ctrl+Alt+R` | WINNER |
| `Ctrl+Alt+D` | DRAW (tied for the lead) |
| `Ctrl+Alt+L` | LOSS |
| `Ctrl+Alt+O` | LOSS, while two other players DRAW for the lead |
| `Escape` | Dismiss the test popup without reloading |

Or from the browser console: `__wglRewardPopupTest.win()` / `.draw()` / `.loss()` / `.lossToDraw()` / `.close()`. This runs through the exact same `showEndGame()` component/state a real match end uses, with a throwaway test snapshot — it never touches live `gameState` and skips `finishGame()`/achievement persistence, so it can't corrupt an in-progress match or real saved progress. On any real deployment origin, `isDevEnvironment()` is always `false` and the entire trigger (`js/dev/rewardPopupDevTrigger.js`) becomes a no-op — no listener registered, nothing exposed on `window`.

---

## 12. Localization

`data/i18n.json` holds UI strings for **English, Persian, Arabic, and Turkish**, including RTL layout metadata for Persian/Arabic. Animal-specific translations (name/description/example) live directly in `data/cardInfo.json` per card. `js/i18n.js` is the loading/lookup layer.

---

## 13. Responsive Design & Orientation

Wild Guest List is **portrait-only on touch devices** — `js/ui/orientation-ui.js` gates any coarse-pointer device held in landscape behind a "please rotate" overlay (`#orientationGate`, present on every top-level page), reactive via `matchMedia` rather than a CSS transform hack. Desktop/laptop (fine pointer) is never gated. See `tests/orientation.test.mjs` for the gating matrix across pointer/orientation combinations.

Layout adapts across three tiers, all sharing one stylesheet (`css/style.css`) with no per-breakpoint markup duplication:

- **Desktop/tablet (fine pointer):** Party/Trash are icon buttons flanking the Queue, opening a centered popup (not a permanent sidebar).
- **Mobile Portrait (coarse pointer + portrait):** a dedicated "PORTRAIT-ONLY MOBILE — GAME BOARD LAYOUT LAYER" reworks the Game Board into a single vertical flex column (width-driven `dvw` sizing rather than landscape's old height-driven `dvh` sizing); Party/Trash buttons sit in a row above the Queue instead of flanking it.
- **Below 600px width:** every popup (`.modal`) renders as a bottom sheet rather than a centered dialog.

Every full-screen panel and popup follows the same **Header (fixed) / Scrollable Body / Fixed Footer** structure, so a primary action can never scroll out of reach on a short/narrow screen. This is intentionally summarized here — the full CSS-implementation-level detail (breakpoint values, specific class names, and the history of related fixes) lives in `CHANGELOG.md`'s entries around versions 1.30–1.37 rather than being duplicated in this document.

---

## 14. Known Documentation-Audit Findings (architecture-relevant)

These were discovered while writing this document and are recorded here for a future implementation/cleanup task — none were acted on in this documentation pass:

1. **Four orphaned top-level pages** — see § 7.
2. **`data/cardInfo.json`'s Monkey description** ("...removes all Crocodiles and Hippos and moves them to the front") does not match the implementation, which sends them to Trash — see `docs/ANIMAL_ABILITIES.md`'s Monkey entry.
3. **`version_history.txt`** (project root) is a second, older changelog that stopped being updated at `1.37.9` while the real version moved on to `1.42.0` — see the note at the top of `CHANGELOG.md`.
4. **`docs/PROJECT_AUDIT.md`** is a dated snapshot (2026-08-09) that predates many subsequent releases (e.g. it describes `js/game/scoreManager.js` as an empty dead file; it is now a real, implemented module — see § 2/§ 9 above) and states `css/style.css` was ~4,205 lines; it is now ~9,200 lines. It has been left in place as a point-in-time audit record (that's its stated purpose) rather than rewritten, with a note added at its top pointing here for current state.
5. **One currently-failing test** at the time of this audit: `tests/leaderboardPartyHeaderIcon.test.mjs`'s "header markup has a dedicated Party column cell carrying the partyEmoji icon" case (`node --test tests/*.test.mjs` → 102/103 passing). Not investigated or fixed here — out of scope for a documentation task; flagged for a follow-up.
