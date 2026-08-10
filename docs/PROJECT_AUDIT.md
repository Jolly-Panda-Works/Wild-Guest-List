# PROJECT_AUDIT.md — Wild Guest List

**Audit date:** 2026-08-09
**Scope:** Full inspection of the existing codebase, prior to any feature work.
**Companion documents:** `ARCHITECTURE_PLAN.md`, `ECONOMY_PLAN.md`, `UI_UX_PLAN.md`, `PRODUCT_ROADMAP.md`

---

## 1. Current Architecture

Wild Guest List is a **100% client-side, static, single-page game**. There is:

- No backend, no server, no database, no API.
- No build step — no bundler, no transpiler, no `package.json`, no linter, no test runner.
- No framework — plain HTML + CSS + **vanilla JavaScript using native ES Modules** (`<script type="module">`).
- Content served as static files (`index.html`, `css/`, `js/`, `data/*.json`, `assets/`), deployable to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).

The whole game runs inside one browser tab, in one JS module graph rooted at `js/main.js`. There is one single-player-vs-3-AI game session per page load; refreshing the page discards all progress.

This is a legitimate, deliberate architecture for what the game is today (a local bot-only card game), and it explains why it is lightweight and easy to deploy. It is **not** compatible, as-is, with any of the target features (accounts, coins, purchases, online play, leaderboards) because none of those can be trusted or persisted without a server.

## 2. Current Project Structure

```
index.html            single HTML shell; all screens/modals live in this one file
css/style.css         one monolithic stylesheet (4,205 lines, ~300 class selectors, 15 media queries)
data/
  cardInfo.json       12 animal cards: id, power, emoji, description, example, image, translations
  config.json         icon path map + sound file path map
  i18n.json           translation strings for en / fa / ar / tr (127 keys), incl. RTL "dir"
  tutorial.json       tutorial slide content (data-driven)
js/
  main.js             composition root: boots i18n, builds splash/difficulty UI, starts a game
  cards.js, constants/cardIds.js   re-export card data loaded via dataLoader
  player.js            Player class (id, name, type, difficulty, deck, hand, party)
  i18n.js               translation engine + language persistence + RTL handling
  services/
    dataLoader.js        fetches & caches data/cardInfo.json → CARDS / CARD_IDS
    logger.js             game-log entry creation + i18n text resolution
    soundManager.js        SFX + background music, toggle, no persistence of the toggle
  game/
    gameState.js           the single global mutable state object (singleton)
    deck.js                 deck creation/shuffle, draw
    turnManager.js          turn loop: play card → ability → queue resolve → draw → next
    queueManager.js          shared-queue push/resolve/remaining-resolve logic
    gameOver.js               end condition + winner determination
    help.js                    "Help" modal (card reference) rendering
    scoreManager.js             EMPTY FILE — dead placeholder, never imported
  abilities/
    abilities.js                12 card ability implementations (switch on card.power)
    helpers/{queue,trash,followHelpers,chooser}.js   shared queue-manipulation primitives
  ai/ai.js                       AI card selection: easy=random, medium=50/50, hard=85/15 heuristic
  ui/
    ui.js                        UI composition root (initializeUI/updateUI)
    game-ui.js                    board render: hand, queue, other players, party, trash, card factory
    leaderboard-ui.js               in-game score panel (NOT a persistent/global leaderboard)
    log-ui.js                        game log rendering (duplicates logger.js's text templates)
    endgame-ui.js                     end-of-game screen + final score table
    modal-ui.js                        modal open/close wiring (settings, about, tutorial)
    mobile-ui.js                        mobile tab switching, info popups
    icon-ui.js                          data-driven icon loader (config.json icons → DOM)
    kangaroo-ui.js                        Kangaroo jump-choice modal (1 vs 2 spaces)
    tutorial-ui.js                        data-driven tutorial slideshow
    walkthrough.js                        first-time in-game guided walkthrough (spotlight overlay)
assets/
  img/ (banner, logo variants, favicon, 12 card avatar images, ~15 UI icons)
  sound/background.mp3
```

**Notable module boundaries that already exist and are good:**
- Game rules (`game/`, `abilities/`) are cleanly separated from rendering (`ui/`).
- Card content, translations, tutorial content, and icon/sound paths are already data-driven via JSON rather than hardcoded in JS — this pattern should be extended, not replaced, for future cosmetics/quests/rewards.
- `services/` is a reasonable seam for a future API client to slot into.

## 3. Current User Flow

```
Page load
  → main.js: load i18n, build bot-difficulty panel, play background music
  → Splash Screen (enter name, "Start Game" / "Settings")
  → Difficulty Modal (choose Easy/Medium/Hard per bot)
  → "Let's Play!" → 4 Player objects created (1 human "p1", 3 AI), decks shuffled, 4 cards drawn each
  → splash/difficulty hidden, tutorial system initialized, main UI initialized
  → first-time walkthrough overlay plays automatically if never seen (localStorage flag)
  → Game board shown; game loop begins (see Game Flow)
  → End Game screen shown when a round condition is met; "Play Again" reloads the page
```

There is **no Home screen** in the target-vision sense: no persistent hub with Profile / Store / Leaderboard / Tournament entry points. The splash screen only starts a new local game.

## 4. Current Game Flow

```
startTurn(gameState)
  if current player has no cards → log + skip turn
  if current player is human (p1) → wait for a hand-card click
  if current player is AI → after 1s delay, AI picks a card index (ai.js) and calls playCard()

playCard(player, cardIndex, gameState)
  → remove card from hand, push to shared queue (addToQueue)
  → log "played"
  → resolveAbility(card, gameState)     // 12 distinct animal abilities mutate the queue/trash
  → if queue.length >= 5 → resolveQueue(): first 2 → owners' party, last 1 → trash
  → drawCard(player)                    // refill hand to 4 if deck has cards
  → if isGameOver (every player: empty hand AND empty deck) → resolveRemainingQueue, finishGame
  → else → nextTurn() → advances currentPlayer (wraps → increments round) → startTurn()

finishGame(gameState)
  → winner = highest party.length, tie-broken by sum of card power
  → gameState.gameOver = true; showEndGame() renders the final score table
```

Everything here happens synchronously in one browser session against the single `gameState` singleton — there is no concept of a "match" that outlives the tab, no server validation of any move, and no persisted result.

## 5. Current Data Flow

```
JSON files (data/*.json)  →  services/dataLoader.js (cached fetch)  →  in-memory JS objects
                                                                         (CARDS, CARD_IDS, i18n strings)
User input (clicks) → game/*.js mutates gameState (module-level singleton, passed by reference)
gameState  →  ui/*.js reads gameState  →  DOM (innerHTML re-renders on every updateUI() call)
```

There is no UI → state → API → backend → UI round trip anywhere in the project, because there is no backend. State changes and renders happen in the same synchronous (or short `await wait()`-delayed) call chain. This is the single biggest structural fact the rest of this audit and all following documents are built around.

## 6. Current State Management

- `gameState` (`js/game/gameState.js`) is **one exported plain object**, mutated in place by many modules (`turnManager`, `queueManager`, `abilities.js`, `gameOver.js`). This is a classic "global mutable singleton" pattern — acceptable for a single local session, but:
  - It cannot represent more than one concurrent game.
  - It has no undo/replay/audit trail (only a capped, display-oriented `logs` array).
  - It cannot be serialized/resumed (a refresh loses everything).
- `Player` instances hold `deck`/`hand`/`party` directly; cards are deep-cloned per player from a shared `CARDS` template via `structuredClone`.
- Settings state is split and inconsistent:
  - Language → persisted to `localStorage` (`wgl_lang`).
  - Tutorial-seen / walkthrough-seen → persisted to `localStorage` (two different flags: `tutorialSeen`, `walkthroughSeen`).
  - Sound on/off → **not persisted at all** (resets to "on" every reload).
  - Player name → **not persisted**; re-entered every game.
- There is no player identity that survives a page reload, and therefore nothing today that a "Profile" screen could actually display beyond the current in-progress match.

## 7. Current Strengths

1. **Clean separation of game logic from rendering.** `abilities.js` and the `game/` folder never touch the DOM; all rendering lives in `ui/`. This will make it straightforward to later host the same rule engine on a server for online play.
2. **Data-driven content already established as a pattern.** Cards, translations, tutorial slides, and icon/sound paths already live in JSON rather than being hardcoded — the exact pattern the target vision asks for with cosmetics/quests/rewards.
3. **Solid, real internationalization.** Four languages including two RTL locales, with a working `dir` attribute switch, `data-i18n*` attribute system, and live re-render on language change. This is more than many hobby projects bother with and is a genuine asset.
4. **Reasonable AI design.** Three difficulty tiers with an actual heuristic (not just "random vs perfect"), isolated in one file, easy to extend.
5. **Mobile-aware from the start.** Dedicated `mobile-ui.js`, responsive CSS with 15 media queries, tab-based panel switching for small screens.
6. **Small and readable.** ~4,000 lines of JS total; nothing here is over-engineered or obfuscated. A new developer can read the whole game logic in under an hour.
7. **Onboarding is genuinely good.** Both a static Help/card-reference modal and an interactive first-run walkthrough exist and are data-driven.

## 8. Current Weaknesses

1. **No backend of any kind.** Every future requirement in the target vision (coins, purchases, profiles, quests, leaderboards, tournaments, online play) fundamentally requires server authority that does not exist today. This is not a bug to fix, it's the central gap the whole roadmap is about.
2. **Global mutable singleton game state.** `gameState` cannot support multiple simultaneous games (needed once a server exists) without becoming a per-match object owned by a session/match manager.
3. **No player identity/persistence.** Name is retyped every game; no ID, no stats, no history.
4. **Inconsistent settings persistence.** Language and onboarding flags use `localStorage` directly and inconsistently (three separate ad-hoc keys); sound preference isn't persisted at all. There is no single "local settings" module.
5. **Dead code.** `js/game/scoreManager.js` is a 0-byte file, imported nowhere — either a stub that was abandoned or a signal that score logic was meant to live there but ended up duplicated elsewhere (party-power calculation is currently copy-pasted across `leaderboard-ui.js`, `endgame-ui.js`, and `gameOver.js`).
6. **Duplicated log-text templates.** The exact same `textKey → localized string` switch/map exists in both `services/logger.js` and `ui/log-ui.js`. Any new log type must be added in two places or the two renderers will silently disagree.
7. **One inconsistent log call bypasses i18n.** `abilities/helpers/followHelpers.js` calls `addLog(gameState, follower.owner, \`${cardLabel(follower)} followed ${cardLabel(card)}\`)` — a raw hardcoded English string as the "key", instead of a translation key + params like every other call site. This will render in English even for non-English players.
8. **A small dead UI wire.** `modal-ui.js` attaches a click handler to `document.getElementById("closeToturial")`, which does not exist (the real element is `#closeTutorial`, wired independently in `tutorial-ui.js`). Harmless today (silently a no-op), but it's a maintenance trap.
9. **One monolithic 4,205-line CSS file** with no component boundaries, custom-property-based theming mixed with one-off rules. Workable today; will get harder to extend once Store, Profile, Customization, Quests, and Leaderboard screens are added, each with their own component families.
10. **No tests, no linter, no build step, no CI.** Fine for a static hobby game; not fine once money (payments, coins) and multiple contributors are involved. Regressions can only be caught by manual play-testing today.
11. **No input sanitization on the one piece of user-generated text that exists.** `playerNameInput.value` is trimmed but not HTML-escaped before it flows into i18n-templated `textContent`/other rendering paths. Low risk today (self-XSS at most, single local session), but becomes a real stored/reflected-XSS risk the moment any name is shown to other players (online mode, leaderboards, public profiles).
12. **Version string is hardcoded in HTML** (`<strong>Version</strong>: 1.9.0` inside `index.html`) rather than sourced from a single config/manifest value.

## 9. Technical Debt (Ranked)

| Item | Rank | Why |
|---|---|---|
| No backend / no server authority for anything | **Critical** | Blocks every economy, identity, and multiplayer feature in the target vision. Not a "fix", a build. |
| Global singleton `gameState` (can't support multiple matches) | **Critical** (becomes so the moment a server/online mode exists) | Needs to become a per-match, ownable object before online play or even a server-hosted bot match can exist. |
| No player identity / persistence layer | **High** | Profile, stats, inventory, coins all depend on a stable player ID that survives reloads. |
| Duplicated log-text templates (`logger.js` vs `log-ui.js`) | **Medium** | Silent drift risk; not urgent, but should be fixed before the log system grows (quest/reward log entries will be added). |
| Inconsistent/missing settings persistence (sound, name) | **Medium** | Poor UX, easy fix, worth doing early as part of Phase 0/1 groundwork. |
| Dead file `scoreManager.js`, dead DOM wire `closeToturial` | **Low** | Cosmetic cleanup; zero functional impact today. |
| One log call bypassing i18n | **Low** | Cosmetic today (one line of untranslated log text); trivial fix. |
| Monolithic CSS file | **Low→Medium** | Not urgent, but will compound as 6+ new screens are added; worth modularizing during the Home/Navigation phase rather than later. |
| No tests/lint/CI | **Medium**, rising to **High** once payments exist | Currently low risk (small, readable codebase); becomes high risk the moment real money and a backend are introduced. |
| Unescaped user-generated name text | **Medium**, rising to **High** once names are shown to other players/publicly | Fix before any leaderboard, public profile, or online match ships. |

## 10. Architectural Risks

- **Coupling game logic to the DOM via direct calls**, e.g. `abilities/helpers/chooser.js` calls `ui/kangaroo-ui.js` directly to ask a human player a UI question in the middle of ability resolution. This works locally but means the "engine" is not cleanly separable from "the browser" — a future server-hosted authoritative engine (needed for online play / anti-cheat) cannot reuse this code unmodified. It will need an abstraction (an `InputProvider`/`Resolver` interface) so the engine can ask "which jump distance?" without knowing whether the answer comes from a DOM modal, an AI heuristic, or a network message from a remote client.
- **No clear module for "the current match" vs "the app shell".** `main.js` does both app bootstrapping and match creation. Splitting these is a prerequisite for a Home screen that can start/stop matches without a full page reload.
- **No versioning strategy for the JSON content files.** `cardInfo.json`, `i18n.json`, etc. have no schema version field; adding new fields (e.g., cosmetic unlock requirements) safely, without breaking older cached clients, needs a convention now.

## 11. Scalability Risks

All of these are "not a problem today, will be a hard blocker as soon as the following features are attempted":

- **Thousands/millions of players / online multiplayer**: impossible without a backend, session/match management, and moving `gameState` from a singleton to a per-match instance.
- **Coins as a real economy**: impossible to make safe on a client-only architecture (see Security Risks below) — must be server-authoritative from day one of implementation, not retrofitted later.
- **Leaderboards**: today's "leaderboard" is just the current match's party-power ranking, recomputed client-side from in-memory data. A real global/weekly/monthly/friends leaderboard needs server-side aggregation and pagination; none of the current code is reusable for that beyond the *display* component.
- **Daily/weekly quests**: need a server-tracked, timezone-aware, resettable counter per player — `localStorage` (the only persistence mechanism in the project today) is trivially editable by the client and cannot be trusted for anything with a reward attached.
- **Cosmetics/inventory**: currently nothing distinguishes "owned" from "equipped" because there is no inventory concept at all; must be modeled from scratch (this is addressed in `ARCHITECTURE_PLAN.md` / `DATA_MODEL`).
- **Public player profiles**: nothing today separates "private" from "public" player data because there is no player data beyond a transient name string.
- **Tournaments**: need bracket/match-progression state that outlives a single browser tab; the current turn/queue engine can likely be reused for individual matches, but the meta-layer (registration, brackets, scheduling) doesn't exist in any form.

## 12. Security Risks

Framed against the target vision's monetization and multiplayer features — **all of the following are currently non-issues only because none of these features exist yet.** They become Critical the moment a corresponding feature is implemented on top of today's client-only trust model:

- **Coins**: any client-computed or client-stored coin balance can be edited via DevTools. Coins must never be calculated or persisted client-side once real; server must be the sole source of truth (see `ECONOMY_PLAN.md`).
- **Rewards / game results**: today, `finishGame()` determines the winner entirely in the browser with no external verification. Once rewards are tied to game results, a malicious client could report a fabricated result. The server must independently validate or recompute match outcomes (or receive a signed/replayable action log) before granting any reward.
- **Player identity / username uniqueness**: doesn't exist yet; must be validated server-side with a uniqueness constraint and race-condition-safe reservation (see `ARCHITECTURE_PLAN.md` §Profile/Username).
- **Purchases / payment verification**: no payment code exists yet. The critical rule going in: the client must never be trusted to say "payment succeeded, grant the item" — verification must happen server-side against the payment provider (webhook or server-to-server confirmation), detailed in `ECONOMY_PLAN.md`.
- **Leaderboards**: once real, must be computed and served from trusted server-side data, never accepting a client-submitted score directly.
- **Client-side manipulation, generally**: because literally all logic currently runs in the browser with `gameState` as a plain mutable object accessible from the console, **any current game outcome can already be trivially manipulated by an end user** (e.g., typing `gameState.players[0].party.push(...)` in DevTools). This is harmless today (no stakes attached to a local bot game), but is the concrete proof of why an authoritative server is mandatory before coins/rewards/leaderboards attach real value to game outcomes.
- **API abuse**: not yet applicable (no API yet); noted here as a requirement for the future backend (rate limiting, auth, idempotency — see `ECONOMY_PLAN.md`).

## 13. UI/UX Problems (Summary — full detail in `UI_UX_PLAN.md`)

- No persistent navigation shell/Home screen; the app is "splash → one game → reload."
- Coin balance, profile entry point, and store/leaderboard/tournament entry points have no home in the current UI at all.
- The desktop layout's "Leaderboard" panel is actually just this match's live score table, which will collide conceptually with a real, persistent Leaderboard feature — this needs a naming/IA distinction before both exist side by side (e.g. "Match Standings" vs "Leaderboard").
- Version number, sound state, and language are handled inconsistently in Settings (see §8, item 4 and 12).
- No loading/error/empty states are designed anywhere — JSON fetches (`cardInfo.json`, `config.json`, `i18n.json`, `tutorial.json`) have no visible failure handling; a failed fetch currently just breaks rendering silently.
- Full UI/UX review, per-screen problems, and prioritized recommendations are in `UI_UX_PLAN.md`.

---

*Continue to `ARCHITECTURE_PLAN.md` for the target architecture, data model, and migration strategy.*
