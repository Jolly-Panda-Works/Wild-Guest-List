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
* **Currency pills (Coins + Gems)** — a small balance indicator in the
  top-right for each currency (`js/ui/profile-ui.js`
  `updateHomeCurrencyDisplay()`/`initHomeCurrencyDisplay()`), backed by
  a real, persisted balance on the player profile
  (`js/services/profile.js` `getCoins()`/`getGems()`/`setCoins()`/
  `setGems()`) rather than a hardcoded `0`. Both still show `0` for
  every player today because nothing earns, spends, exchanges, or
  rewards either currency yet — this is intentionally foundation only.
  Icons resolve through `data/config.json` (`icons.coin`/`icons.gem`),
  not hardcoded emoji. See `docs/ECONOMY_PLAN.md` for the eventual
  server-authoritative coin ledger this is a client-side placeholder
  for, same as the rest of the Player Profile today.

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

The Game Result screen (`#endGameScreen`, `js/ui/endgame-ui.js`) then
shows Win/Lose and the final Leaderboard (`#finalScores`), with two
primary actions below it:

* **Play Again** — reloads `game.html`, reusing this match's bot
  difficulties (still sitting in `sessionStorage`) so a rematch with
  the same setup starts immediately, with no reconfiguration step.
  This is a full reload, so it's the existing Game Start system
  running again unmodified (see `js/game-main.js`) — transient state
  (queue/party/trash/turn/ability/winner/game result/achievement
  session tracking) is rebuilt fresh; persistent data (Profile,
  Achievements, Settings — all `localStorage`) is untouched.
* **Return to Home** — navigates to `index.html`, the same real
  page-navigation pattern the in-game Pause panel's Home button uses
  (`js/ui/pause-ui.js`). The match is already finalized by
  `finishGame()` before this screen can ever be shown, so there's
  nothing left to finalize on the way out.

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
* **Presentation — Achievement Collection.** Profile → Achievements
  (`#profileAchievements` in `index.html`, rendered by
  `js/ui/profile-ui.js` `renderAchievements()`) is a card grid, not a
  plain list: a header summary + overall-progress bar (real
  unlocked/total data, never hardcoded), an optional "Recently
  Unlocked" featured card that only appears once a real unlock exists,
  client-side category filter tabs (Progression/Gameplay/Modes — pure
  display filtering, no change to achievement state), and a responsive
  card grid (2 columns on mobile landscape, more on wider viewports).
  This is presentation only — it reads the exact same
  `getAchievements()`/`subscribeAchievements()` API as before and
  never touches unlock conditions, progress calculation, or
  persistence. The locked-state lock badge resolves through
  `data/config.json` → `icons.lockClosed`, same config-driven pattern
  as every other icon in the project.
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

### Orientation — landscape-only on touch devices

Wild Guest List is **landscape-only on touch devices**. A phone or
tablet (coarse pointer) held in portrait is blocked by
`js/ui/orientation-ui.js`'s gate: the normal app UI is hidden and a
"Please rotate your device" overlay (`#orientationGate`, present on
every top-level page) is shown instead. Rotating to landscape clears
the gate automatically and reactively (via `matchMedia`, not a CSS
`transform: rotate()` hack) — nothing underneath is destroyed or
reset while blocked. Desktop/laptop (fine pointer) is never gated,
regardless of window shape.

This project briefly supported both orientations on mobile (portrait
layouts adapting instead of gating) — that approach has been
superseded by the landscape-only policy above; every mobile screen
(Home, Game Mode Selection, Choose Bot Difficulty, Settings, Profile,
Card Guide, Achievements, Game, Game Result, and every popup) is
designed for landscape only, and there is deliberately no
mixed-orientation system (e.g. portrait Home + landscape Game). See
`tests/orientation.test.mjs` for the current gating behavior across
every pointer/orientation combination.

Do not re-enable a both-orientations mode without updating the gate,
`tests/orientation.test.mjs`, and this section together.

### Panel Architecture — Header / Scrollable Body / Fixed Footer

Every full-screen panel (`.screen-content`) and popup
(`.modal-content`) follows the same structure, so a primary action
button can never scroll out of reach on a short or narrow screen:

```text
┌─────────────────────────────┐
│ Header                Close │   ← flex: 0 0 auto, never scrolls
├─────────────────────────────┤
│                             │
│  Scrollable Content/Body    │   ← flex: 1 1 auto, overflow-y: auto
│                             │
├─────────────────────────────┤
│ Fixed Action Footer         │   ← flex: 0 0 auto, always visible
└─────────────────────────────┘
```

- **Full-screen panels** (Choose Bot Difficulty, End Game): opt into
  `.screen-content--panel` + `.screen-panel-header` /
  `.screen-panel-scroll` / `.screen-panel-footer`.
- **Popups**: opt into `.modal-content > .modal-header` /
  `.modal-body` / `.modal-footer`. A form-based popup (Feedback) wraps
  `.modal-body`/`.modal-footer` in an intermediate `.modal-form`
  wrapper instead, since a `<button type="submit">` must be a
  descendant of its `<form>`.
- On Home (`index.html`), Settings, Profile, Card Guide, About
  Developer, Lucky Wheel and Feedback now all opt into this
  Header/Body architecture and share one visual template — see
  "Home menu popups — standardized on the Tutorial Popup" below.
  Popups that still don't opt in (game.html's own Pause, Kangaroo,
  Card detail, Game Log, Card Guidance, and its own separate
  Settings/Card Guide/About/Feedback instances) are unaffected —
  `.modal-content` scrolls as a single box, exactly as before, since
  a plain flex column with block children lays out identically to
  the old block flow.

### Home menu popups — standardized on the Tutorial Popup

Home's standard menu-type popups — Settings, Profile, Card Guide,
About Developer, Lucky Wheel, Feedback (`#settingsModal`,
`#profileModal`, `#helpModal`, `#aboutModal`, `#luckyWheelModal`,
`#feedbackModal` in `index.html`) — share one visual template
instead of each having its own slightly different chrome: the
Tutorial Popup's (`#tutorialModal`) glass background/border/radius/
shadow, a header with the title on the left and the close (X) button
on the right at a consistent height, consistent horizontal padding,
and a single scrollable body under a fixed header. This is done by
adding a `.menu-popup` modifier class to `.modal-content` and opting
each popup into the `.modal-header`/`.modal-body` architecture above
(see `css/style.css` "MAIN MENU POPUP STANDARDIZATION") — not a
second design system. About Developer and Lucky Wheel, which
previously used a corner-pinned close button with a centered title
below an avatar, were restructured to the same header-row markup as
every other popup.

This is scoped to `.menu-popup` only and to `index.html`'s markup —
`game.html`'s own Pause, Settings, Card Guide, About, and Feedback
popups (separate elements from Home's, sharing only ids/classes
across pages, never both loaded at once) are untouched, and the
Pause popup in particular was deliberately left alone. How To Play
(`#tutorialModal`) itself is the visual reference and was not
changed. Real-device/browser QA against this hasn't been done as
part of this change (this environment can't render a browser) — see
Known Issues below.

**Fix — internal scroll regression (1.30.4):** opting these popups
into `.modal-body` initially clipped content on Mobile Landscape
(Card Guide's Animal Ability grid, Profile's Achievements section)
instead of making it scrollable, because the Mobile Landscape
"no-scroll" layer (see § Mobile landscape — no-scroll layout layer
below) had `.modal-content > .modal-body { overflow-y: hidden }`,
written back when only Feedback's short, always-fits form used that
architecture. That rule is now `overflow-y: auto` there too, so
every popup's header stays fixed while its `.modal-body` scrolls
internally exactly when its content doesn't fit — the page/body
itself still never scrolls (`html, body { overflow: hidden }` in
that same layer, unchanged). Desktop and mobile-portrait were never
affected — this bug only existed in that one landscape+touch layer.
- All sizing uses `dvh` (with a `vh` fallback for older browsers) and
  `env(safe-area-inset-*)` padding (requires `viewport-fit=cover` in
  the viewport meta tag, present on every page) so mobile
  browser-chrome resizing and device notches/home-indicators never
  cover a button.
- `.screen-content` itself uses `justify-content: safe center` (with
  a `flex-start` fallback via `@supports`) so short content still
  centers, but content taller than the viewport scrolls into view
  from the top instead of being clipped/centered off both edges.

### Mobile landscape — no-scroll layout layer

On top of the general Panel Architecture above, `css/style.css`'s
**"LANDSCAPE-ONLY MOBILE — NO-SCROLL LAYOUT LAYER"** section (keyed on
`(pointer: coarse) and (orientation: landscape)`, with additional
`max-height` tiers for standard and small landscape phones) actively
compacts and re-composes each mobile screen to fit its viewport
without scrolling, rather than relying on `overflow-y: auto` as the
fix:

- **Why a separate layer, keyed on height, not the existing
  `max-width: 600px` mobile rules**: those rules correctly target a
  narrow *portrait* phone, but never fire for a *landscape* phone
  (same device, same short dimension — except now it's the height
  that's small, not the width). Left alone, a landscape phone at
  700–930px wide fell through to the tablet/desktop layout, which
  assumes far more vertical room than a phone in landscape actually
  has. The new layer targets the actual constraint (short viewport +
  touch input) instead of width.
- **Home** is re-composed from a stacked column into a grid with the
  top bar full-width across the top, and a 3-column row below it:
  a left secondary-nav column, a centered Start Game / game-mode-tabs
  column, and a right column holding Store / Tournament / Leaderboard
  / Lucky Wheel (`.home-bottom-nav`, restyled to a compact vertical
  icon+label list here — the `bottom` grid-area name is kept as-is
  purely so `js/ui/home-ui.js`'s existing wiring needs no changes).
  The left and right columns share the exact same `minmax(...)`
  column track width, which is what keeps the center Start Game
  column mathematically centered on the *viewport*, not just on the
  leftover space between two differently-sized side groups (a plain
  `justify-content: space-between` flex row can't guarantee that).
- **Choose Bot Difficulty** compacts row height (avatar, difficulty
  buttons, color picker) so the player row + all 3 bot rows + the
  Play footer are always visible together.
- **Game Board** forces the compact mobile shell regardless of
  viewport width, and its header is scaled up to roughly match Home's
  logo/height/top-padding instead of looking like a shrunken-down
  version of it. Leaderboard, Log, and Chat are three compact buttons
  stacked in a left-side rail (`#mobileSideRail`); Leaderboard opens
  `#mobileLeaderboard`, Log opens the shared `#logModal`, and Chat (a
  future feature) just shows "Coming Soon". Party and Trash are no
  longer separate rail buttons — they open from the Party and Trash
  icons (the same `icons.party`/`icons.trash` image assets used by
  the Party/Trash Area headers themselves, not emoji) that already
  flank the Queue
  (`#queueWithIcons`/`.queue-icon-entry`/`.queue-icon-exit`, built in
  `renderQueue()` — `js/ui/game-ui.js`), reusing the same
  `#partyArea`/`#trashArea` popups and one-open-at-a-time toggle group
  in `js/ui/mobile-ui.js`'s `initMobileTabs()`. Because those icons
  are created the first time the Queue renders, `initMobileTabs()` is
  called after the first `updateUI()` in `js/game-main.js` rather than
  before it. The old `#mobileTabs`/`#partyTab`/`#trashTab` markup is
  still present in `game.html` (it's also targeted by
  `js/ui/walkthrough.js`'s width-based `<=600px` portrait tier), but
  it plays no part in the Landscape rail and falls back to its base
  `display: none` there.

  The main gameplay column (`#centerArea`, beside the rail) stacks
  Other Players / Queue / Player Hand in that order, with a
  responsive gap added below the header so Other Players isn't
  crowding it, and Queue cards sized to ~90% of Player Hand's card
  size (previously much smaller) so the Queue reads as the important
  gameplay element it is, while Player Hand still gets the larger
  flex-basis and card size of the two. An earlier version of this
  layer had a latent bug here: `#otherPlayers` isn't a direct sibling
  of `#mobileLeaderboard`/`#mobileTabs` (it's nested inside
  `#centerArea`), so an `order` value written as if it were faded out
  to have no effect where intended and an unintended one where it
  actually applied — sorting Other Players *after* Queue and Hand
  instead of before them. Fixed by relying on source order (Other
  Players → Queue → Hand are already siblings in that DOM order in
  `game.html`) instead of `order` for those three.
- **Popups** get a taller `max-height` and tighter chrome padding in
  landscape, plus an explicit symmetric `width`/`margin: 0 auto` so
  left/right breathing room stays equal at every landscape size
  instead of relying only on the flex-centering of `.modal`. The
  Pause popup's icons are also grown independently of the top bar's
  small `.top-btn` size, so icon and label read as one balanced
  button instead of a small icon next to full-size text.
- Two screens (Achievements' `.ach-grid`, Card Guide's `#animalGrid`)
  keep `overflow-y: auto` as a deliberate, non-load-bearing safety
  net rather than a primary fix — their content length depends on
  how much a player has unlocked / the current card set, so an
  unusually long list scrolls instead of being silently clipped.

Real-device/browser QA against this layer hasn't been done as part
of this change (this environment can't render a browser) — see
Known Issues below.

### Mobile popups — bottom sheet, not a shrunken dialog

Below the `600px` **width** breakpoint, every `.modal` (Settings,
Profile, Card Guide, About, Lucky Wheel, Feedback, Tutorial, Game
Log, Card detail, etc.) renders as a bottom sheet instead of a
centered dialog: anchored to the bottom edge, full width, rounded top
corners only, a small drag handle for affordance, and a short
slide-up entrance (`prefers-reduced-motion` disables the animation).
This is one shared override on the base `.modal`/`.modal-content`
rules — no per-screen markup changes — so every popup gets it
automatically, and the existing Header/Scrollable Body/Fixed Footer
structure described above is unaffected. `#logModal` keeps its own
shorter height since log entries rarely need a near-full-screen
sheet. Since landscape phones are rarely under 600px **wide**, this
bottom-sheet treatment mostly applies to small windows/narrow tablets
rather than typical mobile landscape widths (667–932px), which get
the centered-dialog treatment with the landscape-specific sizing
described above instead.

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

**Current version:** 1.30.4

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
