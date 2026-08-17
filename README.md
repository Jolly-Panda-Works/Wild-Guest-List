# 🐾 Wild Guest List

**Wild Guest List** is a strategic multiplayer-style card game where wild animals compete to become part of the ultimate party.

Each player controls a unique set of **12 animal cards**. Every animal has its own special ability that can change the position, order, or even existence of other animals in the queue.

Build the strongest party, outsmart your opponents, and become the ultimate host! 🎉

---

## 🎮 Game Overview

Wild Guest List is built around a simple idea:

> **Play an animal → trigger its ability → manipulate the queue → get the best animals into your party.**

Players take turns playing one animal from their hand.

Played animals enter a shared queue. When the queue reaches **5 animals**, it is resolved:

* 🥇 The first 2 animals join their owners' parties.
* 🗑️ The last animal is sent to the trash.
* ⏳ The remaining animals stay in the queue.

The game continues until all players have used their animals.

At the end, the player with the **most animals in their party wins**.

---

## ✨ Features

* 🐾 **12 unique animal cards**
* 🧠 Unique abilities for each animal
* 🤖 AI opponents
* 🎚️ Three AI difficulty levels

  * Easy
  * Medium
  * Hard
* 🎯 Strategic shared queue system
* 🎉 Party and Trash systems
* 🏆 Match Standings (live in-match score panel)
* 📜 Game log
* 📖 Interactive tutorial
* 🎓 First-time gameplay walkthrough
* 🌍 Multi-language support
* 📱 Mobile-friendly interface
* 🔊 Background music and sound system
* ⚙️ Settings menu
* 👤 Custom player name
* 📊 Dynamic game state management
* 🧩 Modular JavaScript architecture

---

## 🐯 Animal Cards

Every animal has a different power and can dramatically change the queue.

| Power | Animal        | Ability                                                    |
| ----: | ------------- | ---------------------------------------------------------- |
|     1 | 🦡 Weasel     | Removes the two strongest cards in the queue               |
|     2 | 🐒 Monkey     | A second Monkey triggers a special group effect            |
|     3 | 🦘 Kangaroo   | Jumps 1–2 positions forward                                |
|     4 | 🦜 Parrot     | Removes the two strongest cards while staying in the queue |
|     5 | 🦥 Sloth Bear | Stays in place and interacts with Lion/Hippo               |
|     6 | 🦭 Seal       | Reverses the entire queue                                  |
|     7 | 🦓 Zebra      | Blocks Hippo and Crocodile                                 |
|     8 | 🦒 Giraffe    | Moves one position forward                                 |
|     9 | 🐍 Snake      | Sorts the queue from strongest to weakest                  |
|    10 | 🐊 Crocodile  | Eats weaker animals in front of it                         |
|    11 | 🦛 Hippo      | Pushes through weaker animals                              |
|    12 | 🦁 Lion       | Moves to the front and scares away Monkeys                 |

The abilities are designed to interact with one another, creating situations where a seemingly weak card can become extremely valuable.

---

## 🧭 Navigation Architecture

**Menu-type destinations default to popups over Home, not separate
pages** — see `AGENTS.md` rule 4. Profile, Settings, Card Guide,
About, and How-to-Play are all genuine `.modal`/`.modal-content`
popups defined right in `index.html` and wired via
`js/ui/modal-ui.js` — quick lookups/tweaks that shouldn't unload Home
underneath them. The one thing that's a real top-level page is
**Choose Bot Difficulty**: it's a step in actually starting a match,
not a menu lookup, so it needs genuine Back/refresh/direct-URL
support and gets its own document.

| Page                  | Destination                | Reached from                              |
|------------------------|-----------------------------|---------------------------------------------|
| `index.html`           | Home (+ its popups: Profile, Settings, Card Guide, About, How-to-Play) | — |
| `bot-difficulty.html`  | Choose Bot Difficulty      | Home → Play vs Bot                           |
| `game.html`            | Gameplay                    | `bot-difficulty.html` → Let's Play!         |
| `coming-soon.html`     | Shop / Tournament / Leaderboard (`?feature=`) | Home's bottom nav |

**There is no separate Game Modes page.** Home's Start Game section
(`index.html`) is a **tab bar** — Play vs Bot / Rank / Friendly — not
three separate Home buttons. Switching tabs only swaps which panel is
shown in place (no navigation). Only **Play vs Bot** is active:
picking it is a real page navigation straight to
`bot-difficulty.html` — a top-level destination and sibling of Home,
not a panel rendered inside it. That page shows each seat's avatar +
name read-only (sourced from the one authoritative profile) alongside
editable bot difficulty and per-seat color, then a Start button
(`confirmDiffBtn`) that hands off to `game.html` exactly as before,
dealing the same 1 human + 3 bots as always. Because it's a real page,
browser Back, refresh, and direct URL access all work for free, and
leaving it fully unmounts it. **Rank** and **Friendly** are real,
switchable tabs — their panel is visible and reachable — but neither
has a game flow or backend yet, so their panel content honestly reads
Coming Soon rather than starting a fake match. See
`js/ui/homeGameStart-ui.js`, `js/bot-difficulty-main.js`, and
`js/ui/home-ui.js`.

**Home's menu popups share their underlying widgets/persistence with
`game.html`'s in-game equivalents**, rather than duplicating them —
only the surrounding shell differs:
* Profile (`#profileModal`) is Home-only; the same
  `js/services/profile.js` state it edits is read everywhere else
  (Home's chip, Choose Bot Difficulty's read-only display).
* Settings (`#settingsModal`) and Card Guide (`#helpModal`) use the
  exact same markup shape, widgets, and persistence
  (`js/ui/cardColor-ui.js`, `js/ui/cardGuidance-ui.js`,
  `js/services/soundManager.js`, `js/game/help.js`) as `game.html`'s
  own Pause → Settings and topbar Help/Card Guide modals — checking
  an ability or tweaking a setting mid-match doesn't unload the
  active game either.
* About Developer is reached from inside Settings (`#settingsAboutBtn`
  opens `#aboutModal` nested on top of `#settingsModal` — the same
  nested-popup pattern Card Guide's card-detail view uses over
  `#helpModal`), not its own top-level Menu entry. Feedback and the
  How-to-Play tutorial remain Home-only, brief dismissible overlays.

**Every Home popup shares one lifecycle.** Clicking a popup's backdrop
or pressing Escape closes the topmost open one, focus moves into the
popup on open and back to whatever triggered it on close, and Tab
stays trapped inside the topmost popup while it's open — handled once,
centrally, in `js/ui/modal-ui.js`, on top of each popup's own close
button. Individual popups (like Card Guide's nested card-detail view)
can still layer their own close wiring on top of this without
conflicting with it.

**Profile's Achievements section** (`#profileAchievements` in
`index.html`'s Profile popup) is now backed by a real achievement
system — see 🏆 Achievements below.

**Player identity and settings are shared, not duplicated.** The
player's profile (`js/services/profile.js`) and persisted settings
(sound, step-guidance, card colors, language) live in `localStorage`
and are read independently by whichever screen needs them — nothing
is passed between pages except the one thing that has to be (the
chosen bot difficulties, handed from `bot-difficulty.html` to
`game.html` via `sessionStorage` right before navigating).

## 🐼 Startup — Splash → Loading → Home

`index.html` boots behind a Splash/Loading overlay (`#startupScreen`,
`js/ui/startup-ui.js`) instead of appearing bare while
`js/home-main.js` is still initializing. This wraps Home's real boot
sequence — it doesn't duplicate it:

1. **Splash** — the Jolly Panda logo (`config.json` →
   `branding.developerLogo`, not a hardcoded path) fades and scales
   in, shown for a short minimum duration (900ms) so it doesn't just
   flash by.
2. **Loading** — only shown if `js/home-main.js`'s `bootHome()` (i18n
   → modals/profile → Home wiring → icons — the same sequence that
   ran directly before this feature) is genuinely still running once
   the splash's minimum time is up. A real spinner + status text, no
   fake progress percentage — there's nothing measurable to show one
   for.
3. **Ready** — the overlay fades out and is removed from the DOM;
   Home underneath has been booting the whole time regardless, so
   there's no separate "reveal" step and no reload.
4. **Error** — if `bootHome()` throws (e.g. `config.json`/`i18n.json`
   failed to fetch), shows a plain error state with a **Retry**
   button that re-invokes `bootHome()`.

Known limitation: Retry re-runs `bootHome()`'s full sequence from the
top, including any earlier steps that already succeeded. In practice
this only matters if a step fails *after* an earlier step has already
attached DOM listeners — the two fetch-based steps (i18n, then
config/icons) are the realistic failure points, and both fail before
any listener wiring happens.

## 🏠 Home Screen

`index.html` **is** Home — the app's landing screen and only entry
point, and a navigation destination like any other (see
🧭 Navigation Architecture above). It never initializes gameplay.

* **Start Game tabs — Play vs Bot / Rank / Friendly** (see
  `.home-gamestart` / `.home-tabs`) — a tab bar, not three separate
  Home buttons and not an intermediate Game Modes screen. Only
  **Play vs Bot** is active: its button navigates to its own
  top-level page, `bot-difficulty.html` — gameplay is unchanged
  (still always 1 human + 3 bots). **Rank** and **Friendly** are
  selectable tabs whose panel says Coming Soon; see
  `js/ui/homeGameStart-ui.js`.
* **Secondary row** — Card Guide, Settings, and How to Play
  (tutorial) — each opens its own popup modal over Home
  (`#helpModal`, `#settingsModal`, `#tutorialModal`). About Developer
  is no longer a separate secondary-row entry — it's reached from
  inside Settings (see below).
* **Profile chip** — shows the player's current avatar + name (top of
  Home); tapping it opens the Profile popup (`#profileModal`) to
  change either. This is the one place identity is edited — the chip
  itself just displays it.
* **Bottom navigation** — Store, Tournament, and Leaderboard each
  navigate to `coming-soon.html?feature=...`, a real, reachable,
  clearly-labeled future-state page rather than a Home-local toast.
  No purchasing, ranking, or matchmaking is implemented yet.
  **Lucky Wheel** is also a Coming Soon placeholder here, but —
  because it's a new Menu-type feature, not a conversion of an
  existing page — it follows AGENTS.md rule 4's stated default
  instead: a genuine popup (`#luckyWheelModal`), not a
  `coming-soon.html` navigation. No wheel-spinning, reward
  calculation, or currency logic exists yet; opening it only shows a
  Coming Soon illustration/badge/copy. See
  `js/ui/home-ui.js`/`index.html`'s `#luckyWheelModal` comment for
  exactly what a future real implementation would replace
  (`#luckyWheelBody`'s contents only — the popup shell/wiring stays).
* **Coin pill** — a small balance indicator in the top-right, shown as
  `0` since there's no coin economy yet.

Home is implemented in `js/home-main.js` + `js/ui/home-ui.js` +
`js/ui/homeGameStart-ui.js` (tab switching) + `js/ui/modal-ui.js`
(shared modal open/close) + `js/ui/profile-ui.js` (Profile popup) +
`js/game/help.js` (Card Guide popup). Play vs Bot's own page is
implemented in `bot-difficulty.html` + `js/bot-difficulty-main.js`.
See `docs/ARCHITECTURE_PLAN.md` for the fuller
design this follows, including later phases (a real Store/economy,
Achievements, Quests, Leaderboard, and a real Rank/Friendly game
flow) — each of those, per the navigation architecture above, would
default to a Home popup unless it's genuinely a step in
starting/continuing a match (in which case it'd get its own top-level
page, like Choose Bot Difficulty did).

## 🧠 Core Gameplay

### 1. Start the Game

From Home's Start Game tabs, the **Play vs Bot** tab (the only active
one — Rank and Friendly are Coming Soon) navigates to
`bot-difficulty.html` to choose each opponent's difficulty and every
seat's color — there's no separate Game Modes page to pass through
first. The human player's name and avatar are shown read-only there,
sourced from their Profile (Home's `#profileModal` popup) rather than
being editable in here — new players get a sensible default profile
immediately, and can customize it any time.

Each game contains:

* 1 human player
* 3 AI opponents

Every player receives a deck containing **12 unique animals**.

---

### 2. Draw Cards

Players start with a hand of cards drawn from their personal deck.

After playing a card, another card is drawn when available.

---

### 3. Play a Card

During a player's turn, they select one animal from their hand.

The animal is added to the **back of the shared queue**.

Its special ability is then triggered.

---

### 4. Resolve Animal Ability

Animal abilities can:

* Move cards
* Remove cards
* Eat cards
* Reverse the queue
* Sort the queue
* Block other animals
* Jump forward
* Move to the front
* Affect multiple animals simultaneously

This makes queue management the central strategic mechanic of the game.

---

### 5. Resolve the Queue

When the queue reaches five animals:

```text
┌──────────────────────────────────────┐
│             QUEUE OF 5               │
├──────────────────────────────────────┤
│  1  │  2  │  3  │  4  │  5          │
└──────────────────────────────────────┘
   ↓      ↓                   ↓
 PARTY  PARTY              TRASH
```

The first two animals enter their owners' parties.

The final animal is eliminated and sent to the trash.

The middle animals remain in the queue.

---

### 6. End of the Game

The game ends when all players have used their available animals.

Any remaining animals in the queue are resolved.

The player with the largest party wins.

---

## 🤖 AI System

Wild Guest List includes three AI difficulty levels.

### 🟢 Easy

The AI chooses a card randomly.

This mode is suitable for:

* New players
* Casual games
* Learning the mechanics

### 🟡 Medium

The AI has a **50% chance** of selecting its best evaluated card and a **50% chance** of making a random choice.

### 🔴 Hard

The AI chooses its best evaluated card **85% of the time**, with a **15% chance** of making a random choice.

The AI evaluates cards based on factors such as:

* Card power
* Queue size
* Position of cards
* Opponent cards in the queue
* Strategic abilities
* Potential future value

This creates opponents that are stronger without making their behavior completely predictable.

---

## 📖 Tutorial & Walkthrough

The game includes an integrated learning system designed to teach the mechanics while playing.

The tutorial introduces:

1. Welcome to Wild Guest List
2. Animal cards
3. Playing an animal
4. Special animal powers
5. Queue resolution
6. Winning the game

There is also an interactive first-time walkthrough explaining:

* Game controls
* Player hand
* Opponents
* Queue
* Party
* Trash
* Match Standings
* Game log
* Playing cards
* Animal abilities
* Queue resolution
* Winning conditions

The tutorial system is data-driven through:

```text
data/tutorial.json
```

---

## 🌍 Localization

Wild Guest List includes an internationalization system.

The current localization architecture supports:

* 🇬🇧 English
* 🇮🇷 Persian
* 🇸🇦 Arabic
* 🇹🇷 Turkish

UI strings are managed through:

```text
data/i18n.json
```

Animal-specific translations are stored directly in:

```text
data/cardInfo.json
```

The language system also supports RTL layouts for languages such as Persian and Arabic.

---

## 🏗️ Project Architecture

The game is built using **Vanilla JavaScript with ES Modules**.

No game engine or frontend framework is required.

The codebase is divided into independent systems:

```text
Game State
    │
    ├── Players
    ├── Queue
    ├── Trash
    ├── Round
    └── Game Status
          │
          ▼
     Turn Manager
          │
          ├── Human Player
          └── AI Player
                 │
                 ▼
            AI Decision
                 │
                 ▼
          Play Animal Card
                 │
                 ▼
          Ability System
                 │
                 ▼
          Queue Manager
                 │
                 ├── Party
                 └── Trash
```

---

## 📁 Project Structure

```text
WildGuestList/
│
├── index.html          (Home — landing page; also hosts its menu popups: Profile, Settings, Card Guide, About, How-to-Play)
├── bot-difficulty.html  (Choose Bot Difficulty — a real top-level page reached from Home's Play vs Bot)
├── game.html            (Gameplay — the board; all game init lives here)
├── coming-soon.html      (shared "not built yet" page, ?feature=...)
│
├── css/
│   └── style.css
│
├── data/
│   ├── cardInfo.json
│   ├── config.json
│   ├── i18n.json
│   └── tutorial.json
│
├── js/
│   ├── home-main.js       (Home bootstrap — index.html; also boots Profile/Settings/Card Guide popups)
│   ├── bot-difficulty-main.js (Choose Bot Difficulty bootstrap — bot-difficulty.html)
│   ├── game-main.js       (Gameplay bootstrap — game.html)
│   ├── coming-soon-main.js
│   ├── cards.js
│   ├── player.js
│   ├── i18n.js
│   │
│   ├── abilities/
│   │   ├── abilities.js
│   │   └── helpers/
│   │       ├── chooser.js
│   │       ├── followHelpers.js
│   │       ├── queue.js
│   │       └── trash.js
│   │
│   ├── ai/
│   │   └── ai.js
│   │
│   ├── constants/
│   │   ├── cardIds.js
│   │   └── playerTypes.js
│   │
│   ├── game/
│   │   ├── deck.js
│   │   ├── gameOver.js
│   │   ├── gameState.js
│   │   ├── help.js         (Card Guide — shared by Home's #helpModal popup and game.html's in-game Help modal)
│   │   ├── queueManager.js
│   │   ├── scoreManager.js
│   │   └── turnManager.js
│   │
│   ├── services/
│   │   ├── achievements.js  (the achievement system — progress/persistence/unlocking)
│   │   ├── dataLoader.js
│   │   ├── logger.js
│   │   ├── profile.js   (the one authoritative player profile)
│   │   └── soundManager.js
│   │
│   └── ui/
│       ├── achievementNotification-ui.js (unlock toast)
│       ├── endgame-ui.js
│       ├── game-ui.js
│       ├── home-ui.js
│       ├── icon-ui.js
│       ├── kangaroo-ui.js
│       ├── leaderboard-ui.js
│       ├── log-ui.js
│       ├── mobile-ui.js
│       ├── homeGameStart-ui.js (Home's Play vs Bot / Rank / Friendly tab bar)
│       ├── modal-ui.js    (Home's popup modals: Profile, Settings, Card Guide, About, Feedback, Tutorial — plus Game's own in-game Settings/Help)
│       ├── orientation-ui.js (landscape-only gate — every top-level page)
│       ├── pause-ui.js
│       ├── profile-ui.js  (Profile popup content — name + avatar; opened from Home's profile chip)
│       ├── tutorial-ui.js
│       ├── ui.js
│       └── walkthrough.js
│
└── assets/
    ├── fonts/
    │   ├── files/          (self-hosted .woff2 files)
    │   └── fonts.css
    ├── sound/
    │   └── background.mp3
    └── img/
        ├── branding/        (banner, favicon, logos)
        ├── cards/           (01-weasel.png … 12-lion.png)
        ├── avatars/         (boy.png, girl.png)
        └── icons/           (UI icons, referenced via data/config.json)
```

This list highlights the files most relevant to the Home/Game split —
several smaller supporting modules (presentation helpers, additional
`ui/` files, etc.) exist alongside these but aren't enumerated here.

All folder and file names under `assets/` use lowercase kebab-case with no
spaces, so every path is safe to reference directly in code/URLs. Icon and
card image paths are never hardcoded in JS — they're looked up from
`data/config.json` (`icons`) and `data/cardInfo.json` (`image`) respectively.

---

## 🧩 Main Systems

### Game State

Located at:

```text
js/game/gameState.js
```

The central game state contains:

* Players
* Queue
* Trash
* Logs
* Current player
* Round
* Last ability
* Game-over state
* Winner

---

### Turn Manager

```text
js/game/turnManager.js
```

Responsible for:

* Starting turns
* Playing cards
* Drawing cards
* Triggering abilities
* Resolving the queue
* Checking game-over conditions
* Moving to the next player

---

### Ability System

```text
js/abilities/abilities.js
```

Contains the behavior of the animal cards.

Helper modules handle operations such as:

```text
moveCard()
swapCards()
sendToTrash()
moveFollowersBehind()
chooseKangarooJump()
```

This keeps individual card behaviors separated from general queue manipulation.

---

### Achievement System

```text
js/services/achievements.js
js/ui/profile-ui.js          (renders the list — Profile → Achievements)
js/ui/achievementNotification-ui.js  (unlock toast)
```

A reusable, data-driven achievement system — not a one-off hardcoded
implementation for its initial 10 achievements. Adding achievement #11
means adding one entry to `ACHIEVEMENT_DEFS` in `achievements.js` (+ its
icon in `data/config.json` → `icons`, its title/description in
`data/i18n.json`) — no new UI, storage, or modal code.

* **Definitions** live in `achievements.js` (`id`, `category`, `type`
  `"binary"`/`"count"`, `target`, i18n keys). Thresholds
  (`requiredCount`/`requiredUniqueAbilities`/`requiredPlayerCount`) are
  overridable from `data/config.json` → `achievements` so they can be
  retuned without editing code — `config.json` only ever holds these
  static thresholds/icons, never a player's live progress.
* **Progress** is per-player, persisted to `localStorage`
  (`wgl_achievements`), following the exact same pattern as
  `js/services/profile.js` (module state + `subscribeAchievements()`).
* **Event-driven, not UI-coupled.** Achievement logic never reads UI
  state — it's fed by the three existing authoritative points gameplay
  already funnels through: `js/game/turnManager.js`'s ability/queue
  capture batches (`beginCapture()`/`endCapture()` in
  `js/presentation/events.js`, already consumed exactly once per real
  play) and `js/game/gameOver.js`'s `finishGame()` (the single
  authoritative, already double-call-guarded game result). No new
  events were invented — see the file's own comments for exactly which
  existing event each achievement reuses (e.g. "No Escape" reuses the
  `CARD_REACTED`/`"block"` event a Zebra already emits against a
  Crocodile, rather than a new escape mechanic).
* **Session-only tracking** (e.g. Strategist's unique-abilities-in-one-
  winning-game count) resets every new game via `notifyGameStarted()`
  and is never persisted — only the final unlocked/progress state is.
* **Unlock notification** is a non-blocking toast
  (`js/ui/achievementNotification-ui.js`) mirroring `#feedbackToast`'s
  existing lifecycle in `js/ui/feedback-ui.js`, not a second
  notification framework.
* **Known limitation — Duel Master:** this achievement ("win a
  2-player Duel") is fully wired end-to-end, but the game currently
  always deals exactly 1 human + 3 bots — there is no 2-player Duel
  mode in the project. It will unlock correctly the moment
  `gameState.players.length === 2` for a human win; that condition
  just can't occur yet.

See `tests/achievements.test.mjs` (`tests/README.md` explains why
plain `node:test` — the project has no existing test framework) for
the full set of unlock/non-unlock conditions this covers.

---

### AI

```text
js/ai/ai.js
```

The AI evaluates cards using the current game state and selects cards according to the selected difficulty.

---

### Data Layer

Game data is separated from the JavaScript logic.

```text
data/cardInfo.json
data/config.json
data/i18n.json
data/tutorial.json
```

This makes it easier to modify:

* Card information
* Translations
* Tutorial content
* Icons
* Audio
* Game configuration

without changing the core game logic.

---

## 🚀 Running Locally

Wild Guest List is a static web game, but it should be served through a local HTTP server because the game loads JSON files using JavaScript modules and `fetch()`.

### Option 1 — VS Code

Use a local server extension such as **Live Server**.

Open:

```text
index.html
```

and launch it through the local server.

---

### Option 2 — Python

If Python is installed:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

---

## 🌐 Deployment

The game does not require a backend.

It can be deployed to:

* GitHub Pages
* Cloudflare Pages
* Netlify
* Vercel
* Any static web server

Simply deploy the complete project while preserving the directory structure.

In particular, make sure these directories remain available:

```text
data/
js/
css/
assets/
```

---

## 🎨 Assets

Game artwork is located inside:

```text
assets/img/
```

Animal card artwork is stored in:

```text
assets/img/Card avatars/
```

UI icons are stored in:

```text
assets/img/icons/
```

The project uses custom animal artwork together with UI assets designed specifically for the game interface.

---

## 🔊 Audio

Audio configuration is managed through:

```text
data/config.json
```

The sound system is implemented in:

```text
js/services/soundManager.js
```

The architecture supports effects such as:

* Card played
* Queue full
* Party join
* Trash
* Turn notification
* Victory
* Defeat
* Background music

---

## 📱 Responsive Design

The game includes dedicated mobile UI logic:

```text
js/ui/mobile-ui.js
js/ui/orientation-ui.js  (landscape-only enforcement — see below)
```

The interface adapts game controls and panels for smaller screens while maintaining the core gameplay experience.

### Orientation Gate — landscape only

Wild Guest List is designed for landscape orientation, especially on
touch devices. A single, reusable gate (`js/ui/orientation-ui.js`) is
wired into every real top-level page (`index.html`, `game.html`,
`bot-difficulty.html`, `cards.html`, `game-modes.html`,
`coming-soon.html` — each includes the same `#orientationGate` markup
and calls `initOrientationGate()`, synchronously, before that page's
own boot sequence):

```text
Application
  ↓
Orientation Check   (matchMedia — reactive, not polled)
  ↓
Landscape?
├── Yes → Application
└── No  → Rotate Device Screen
```

* **Detection** is `(pointer: coarse)` (touch-primary — phones and
  tablets) combined with `(orientation: portrait)` — not user-agent
  sniffing, and not a raw screen-size threshold, so it never blocks
  desktop (even a narrow/tall browser window) while still correctly
  covering tablets in portrait.
* **Reacts immediately** via `MediaQueryList`'s own `change` event
  (with `orientationchange`/`resize` as a defensive fallback) — rotate
  the device either direction and the gate shows/hides itself with no
  polling and no `transform: rotate(...)` trick.
* **True orientation lock** (`screen.orientation.lock("landscape")`) is
  attempted as a progressive enhancement where supported; the reactive
  overlay above is the universal, reliable mechanism everywhere else
  (notably iOS Safari, which doesn't implement that API at all).
* **Never destroys game state.** The gate is a full-screen overlay
  (its own top-most layer, above every `.modal` and `#startupScreen`)
  that simply blocks pointer events from reaching whatever's
  underneath — nothing underneath is torn down, reset, or reinitialized.
  On `game.html` specifically, it also pauses the turn timer while
  blocking (reusing the existing `js/game/turnTimer.js`
  pause/resume — the same mechanism the Pause panel uses — via
  `onOrientationBlocked()`/`onOrientationUnblocked()`) and auto-resumes
  only if the gate itself was what paused it, never a game the player
  paused manually.
* **Accessible**: `role="status"`/`aria-live="polite"` (same pattern as
  `#startupScreen`), with focus moved into the gate's own message while
  shown and restored to whatever was focused once it hides.

See `tests/orientation.test.mjs` (`tests/README.md`) for the covered
scenarios (desktop/mobile/tablet × portrait/landscape, live rotation in
both directions, no duplicate initialization).

---

## 🛠️ Development

The project intentionally avoids a large framework or game engine.

Development is based on:

* HTML
* CSS
* Vanilla JavaScript
* ES Modules
* JSON data files

This makes the project lightweight and easy to deploy.

### Recommended development workflow

```text
1. Update game/data logic
        ↓
2. Test locally
        ↓
3. Test desktop UI
        ↓
4. Test mobile UI
        ↓
5. Test all AI difficulties
        ↓
6. Test localization
        ↓
7. Commit changes
        ↓
8. Deploy
```

---

## 🗺️ Roadmap

The Home screen now reserves navigation entries (shown as "Coming
Soon") for several of these — Online multiplayer, a Store, Tournament,
Leaderboard, and Profile — so they can be built in without reshaping
the app's navigation later. See `docs/PRODUCT_ROADMAP.md` for the
phased plan. Potential future improvements include:

* 🌐 Online multiplayer
* 👥 Real-time player matches
* 🏆 Global leaderboard
* 🎨 Additional animal cards
* 🃏 Additional game modes
* 🧠 More advanced AI
* 🎵 Expanded sound effects
* 🎭 Additional visual effects
* 📊 Player statistics
* 💾 Persistent game progress
* 📱 Progressive Web App support

---

## 🎯 Design Philosophy

Wild Guest List is designed around a simple principle:

> **Easy to learn, difficult to master.**

The basic rules can be explained in a few minutes, but the interaction between animal abilities creates a deeper strategic layer.

Players need to think about:

* Which card to play
* When to trigger a queue resolution
* Which animals should reach the party
* Which opponents should be disrupted
* How abilities will interact
* How the queue may change before resolution

---

## 🔖 Version

**Current version:** 1.23.0

The version number is defined in a single place: `data/config.json` → `app.version`. It is rendered on-screen wherever `[data-app-version]` appears — Home's Settings popup (`index.html` `#settingsModal`) and the in-game Pause → Settings modal (`game.html`) both have one, populated at runtime by `js/ui/icon-ui.js`. Do not hardcode a version number anywhere else — update `data/config.json` and everything else stays in sync automatically.

See `AGENTS.md` for the rule that keeps this number (and this README) current as work is done.

---

## 👨‍💻 Credits

**Wild Guest List**

Designed and developed by **Usef / Jolly Panda**.

An indie game project focused on experimenting with:

* Card game design
* AI decision making
* Queue-based mechanics
* Data-driven game systems
* Modular JavaScript architecture
* Interactive tutorials
* Localization

---

## 📄 License

This project is an original game project.

Unless otherwise specified, the source code, artwork, game design, and other project assets are not licensed for redistribution or commercial use without permission from the developer.

---

## 🐾 Wild Guest List

**Build your guest list. Manipulate the queue. Outsmart the wild.**

🎉 **Who will make it to the party?**
