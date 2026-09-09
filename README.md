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
* 🥇 Live rank badges on opponent seats (mirrors Match Standings)
* 🔮 Drag-to-play with a live Ability Preview (see cards' effects before you play them)
* 🎉 Party and Trash systems
* 🏆 Match Standings (live in-match score panel)
* 📜 Game log
* 📖 Interactive tutorial
* 🎓 First-time gameplay walkthrough
* 🌍 Multi-language support
* 🚀 Real asset-preload loading screen (splash + progress bar, no mid-game reloads)
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
| `index.html`           | Home (+ its popups: Profile, Settings, Card Guide, About, How-to-Play, Store/Tournament/Leaderboard/Lucky Wheel Coming Soon) | — |
| `bot-difficulty.html`  | Choose Bot Difficulty      | Home → Play vs Bot                           |
| `game.html`            | Gameplay                    | `bot-difficulty.html` → Let's Play!         |
| `coming-soon.html`     | Shop / Tournament / Leaderboard (`?feature=`) | Unlinked from Home; still reachable by direct URL |

**There is no separate Game Modes page.** Home's Start Game section
(`index.html`) is a **two-level tab bar**, not three separate Home
buttons:

* **Primary tabs** — **Play vs Bot** / **Play vs Human**. Switching
  primary tabs only swaps which panel is shown in place (no
  navigation). **Play vs Bot** is the default tab, since it's the
  only fully playable game type today.
* **Play vs Bot's panel** — three selectable bot-count options,
  **1 Bot / 2 Bots / 3 Bots**. Each option both selects and starts:
  tapping it stores the chosen count (`sessionStorage`,
  `wgl_selectedBotCount`) and navigates straight to
  `bot-difficulty.html` — a top-level destination and sibling of
  Home, not a panel rendered inside it — showing exactly that many
  bot rows. That page shows each seat's avatar + name read-only
  (sourced from the one authoritative profile) alongside editable bot
  difficulty and per-seat color, then a Start button
  (`confirmDiffBtn`) that hands off to `game.html` exactly as before.
  **3 Bots** is marked selected by default and is still exactly the
  original 1 human + 3 bots match; **1 Bot** and **2 Bots** deal in
  fewer bot seats the same way (`js/bot-difficulty-main.js` builds
  only the selected number of seats, `js/game-main.js` reads however
  many bot difficulties actually came through the handoff and deals
  in that many players — see both files' module comments). Because
  `bot-difficulty.html` is a real page, browser Back, refresh, and
  direct URL access all work for free, and leaving it fully unmounts
  it.
* **Play vs Human's panel** — **Rank** and **Friendly**, real and
  visible options — but neither has a game flow or backend yet, so
  tapping either honestly opens the shared `#comingSoonModal` (same
  pattern as Store/Tournament/Leaderboard below) instead of starting
  a fake match.

See `js/ui/homeGameStart-ui.js` (primary tab switching),
`js/ui/home-ui.js` (bot-count buttons + Rank/Friendly wiring), and
`js/bot-difficulty-main.js`.

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

## 🐼 Startup / Loading Screen — Splash+Progress → Home

`index.html` boots behind a Splash overlay (`#startupScreen`,
`js/ui/startup-ui.js`) instead of appearing bare while
`js/home-main.js` is still initializing. This wraps Home's real boot
sequence — it doesn't duplicate it:

1. **Splash+Progress** — the splash image (`config.json` →
   `branding.splash`, not a hardcoded path) fades and scales in
   immediately, with a progress bar, percentage, and a rotating
   gameplay hint (`data/i18n.json`'s `startupHint1`..`startupHint6`)
   underneath. The bar/percentage are driven by real numbers, not a
   simulated animation: `js/home-main.js`'s `bootHome()` now takes an
   `onProgress(loaded, total)` callback and forwards it into
   `js/services/assetPreloader.js`'s `preloadAllImages()`, which
   fetches and `decode()`s every image the game will ever show
   before boot finishes — see § Asset Preloading below. A short
   500ms floor keeps the splash from flashing by instantly on an
   already-cached repeat visit; it's a minimum display time, not an
   artificial delay.
2. **Ready** — once both the image preload and the rest of
   `bootHome()` (i18n → modals/profile → Home wiring → icons) have
   resolved, the overlay fades out and is removed from the DOM; Home
   underneath has been booting the whole time regardless, so there's
   no separate "reveal" step and no reload.
3. **Error** — if `bootHome()` throws (e.g. `config.json`/`i18n.json`
   failed to fetch), shows a plain error state with a **Retry**
   button that re-invokes `bootHome()`.

Known limitation: Retry re-runs `bootHome()`'s full sequence from the
top, including any earlier steps that already succeeded. In practice
this only matters if a step fails *after* an earlier step has already
attached DOM listeners — the two fetch-based steps (i18n, then
config/icons) are the realistic failure points, and both fail before
any listener wiring happens.

### Asset Preloading (`js/services/assetPreloader.js`)

Preloads and decodes every image the game can ever display — icons,
card art, branding, avatars — during the Startup screen above, so the
Queue, Hand, and Opponent cards never have to fetch or decode an image
for the first time mid-match. The image list is never hand-maintained:
it's assembled from the project's own existing manifests rather than a
second copy of them —

* `data/config.json`'s `icons` map (filtered to actual image paths,
  the same test `js/ui/icon-ui.js`'s `loadIcons()` already uses, so
  this list can't drift from what actually renders as an `<img>`) and
  its `branding` entries (`developerLogo`, `splash`).
* `data/cardInfo.json`'s card art, via the existing
  `js/services/dataLoader.js`'s `loadCardData()` — reused, not
  re-fetched.
* `js/constants/avatars.js`'s `PLAYER_AVATARS`.
* Three static paths not in any manifest (the Home banner image and
  the small header logo, both referenced directly from HTML/CSS) —
  the one narrow exception to "never hand-maintained" above, at the
  top of `assetPreloader.js` as `STATIC_IMAGE_PATHS`.

Each image is loaded via a real `Image()` (not a mere `fetch()`), and
`.decode()`d when the browser supports it, so the preload guarantees a
paint-ready decoded bitmap, not just a downloaded file sitting in the
HTTP cache — and every `Image()` object is kept referenced for the
page's lifetime so the browser has no reason to evict that decoded
bitmap later. A missing/broken image resolves instead of rejecting
(same fallback philosophy as `loadIcons()`), so one bad asset path
can never block the whole game from starting.

## 🏠 Home Screen

`index.html` **is** Home — the app's landing screen and only entry
point, and a navigation destination like any other (see
🧭 Navigation Architecture above). It never initializes gameplay.

* **Start Game tabs — Play vs Bot / Play vs Human** (see
  `.home-gamestart` / `.home-tabs`) — a two-level tab bar, not three
  separate Home buttons and not an intermediate Game Modes screen.
  **Play vs Bot** is the default primary tab; its panel holds three
  bot-count options (**1 Bot / 2 Bots / 3 Bots**, `.home-bot-options`)
  that each select-and-start a match with that many bot seats — see
  `js/ui/home-ui.js`, `js/bot-difficulty-main.js`, `js/game-main.js`.
  **Play vs Human**'s panel holds **Rank** and **Friendly**
  (`.home-human-options`), both honest Coming Soon options that open
  `#comingSoonModal` instead of starting a fake match. Primary tab
  switching itself lives in `js/ui/homeGameStart-ui.js`.
* **Secondary row** — Card Guide, Settings, and How to Play
  (tutorial) — each opens its own popup modal over Home
  (`#helpModal`, `#settingsModal`, `#tutorialModal`). About Developer
  is no longer a separate secondary-row entry — it's reached from
  inside Settings (see below).
* **Profile chip** — shows the player's current avatar + name (top of
  Home); tapping it opens the Profile popup (`#profileModal`) to
  change either. This is the one place identity is edited — the chip
  itself just displays it.
* **Bottom navigation** — Store, Tournament, and Leaderboard are all
  Menu-type lookups (per AGENTS.md rule 4), so tapping one opens the
  shared `#comingSoonModal` popup instead of navigating anywhere —
  a real, reachable, clearly-labeled Coming Soon message (feature
  name + icon + short copy) rather than a Home-local toast, but
  without a full-page unload/reload for a placeholder. Title and icon
  are set per feature at click time (`openComingSoon()` in
  `js/ui/home-ui.js`); the message itself reuses the same
  `comingSoonText` copy the standalone `coming-soon.html` page already
  used. `coming-soon.html?feature=...` is unchanged and still works by
  direct URL/refresh — it's just no longer linked from here. No
  purchasing, ranking, or matchmaking is implemented yet.
  **Lucky Wheel** is also a Coming Soon placeholder here, following
  the same popup default, but keeps its own dedicated
  `#luckyWheelModal` rather than the shared `#comingSoonModal` — its
  body content is more custom (an illustration + Coming Soon badge
  laid out specifically for a future wheel), and it was already built
  before Store/Tournament/Leaderboard were converted to popups. No
  wheel-spinning, reward calculation, or currency logic exists yet;
  opening it only shows a Coming Soon illustration/badge/copy. See
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

From Home's Start Game tabs, the **Play vs Bot** tab (the only fully
playable primary type — Play vs Human's Rank/Friendly are Coming
Soon) offers **1 Bot / 2 Bots / 3 Bots**; picking one navigates to
`bot-difficulty.html` (dealing in exactly that many bot seats) to
choose each opponent's difficulty and every seat's color — there's no
separate Game Modes page to pass through first. The human player's
name and avatar are shown read-only there, sourced from their Profile
(Home's `#profileModal` popup) rather than
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

During a player's turn, they **drag** one animal from their hand onto
the Queue (dropping anywhere over the Queue works — where you drop
never affects placement).

While dragging, an **Ability Preview** appears: full-card overlays on
whichever Queue cards the dragged animal would affect (and, if
relevant, on the dragged card itself — e.g. it won't enter at all, or
it'll jump to a specific slot), computed from the exact same rules
real execution uses. Releasing over the Queue actually plays the card;
releasing anywhere else cancels the drag with no effect. See
`js/abilities/previewResolver.js` and `js/ui/previewOverlay-ui.js`
under **Ability Preview System** below.

The animal is added to the **back of the shared queue**.

Its special ability is then triggered.

Bots preview their chosen card the same way — the same Preview
Resolver, briefly shown on the board — before actually playing it, so
watching a Bot's turn reads the same way a human's drag does.

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

The player with the most Party cards wins — Party Card Count is the
*only* victory metric (`js/game/matchOutcome.js`'s
`determineMatchOutcome()`). If two or more players are tied for the
highest Party Card Count, the match is a **Draw** between them — there
is no secondary tie-breaker (no Card Power, no card rarity, no turn
count, nothing hidden or random) and no Sudden Death round. A tie for
any place *below* the lead never creates a Draw; only a tie for the
single highest count does.

The Reward Popup (`#endGameScreen`, `js/ui/endgame-ui.js`) then
shows Win/Draw/Lose and the final Leaderboard (`#finalScores`), with
every player explicitly labeled `WINNER`, `DRAW`, or `LOSS`, with two
primary actions below it:

* **Play Again** — reloads `game.html`, reusing this match's bot
  difficulties (still sitting in `sessionStorage`) so a rematch with
  the same setup starts immediately, with no reconfiguration step.
  This is a full reload, so it's the existing Game Start system
  running again unmodified (see `js/game-main.js`) — transient state
  (queue/party/trash/turn/ability/match outcome/achievement
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
├── coming-soon.html      (shared "not built yet" page, ?feature=...; no longer linked from Home's bottom nav, still reachable by direct URL — see § Home Screen)
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
│   │   ├── previewActions.js  (Ability Preview action enum — Stay/MoveBack/Remove/Defend/MoveToSlot/Attach/Escape)
│   │   ├── previewResolver.js (Ability Preview Resolver — shared by Player drag and Bot; see § Ability Preview System)
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
│   │   ├── playerTypes.js
│   │   ├── preview.js      (Ability Preview / drag-to-play timing & thresholds)
│   │   └── rank.js         (shared rank-medal icon list, read by scoreManager.js)
│   │
│   ├── dev/
│   │   └── rewardPopupDevTrigger.js  (Development-only: preview the real Reward Popup without finishing a match — see § Development/Test Mode. Gated by js/services/devEnv.js; a genuine no-op in Production)
│   │
│   ├── game/
│   │   ├── deck.js
│   │   ├── gameOver.js
│   │   ├── gameState.js
│   │   ├── help.js         (Card Guide — shared by Home's #helpModal popup and game.html's in-game Help modal)
│   │   ├── matchOutcome.js  (single authoritative WIN/DRAW resolver — Party Card Count only, no Card Power or any other tie-breaker)
│   │   ├── queueManager.js
│   │   ├── scoreManager.js  (party-count ranking math — shared by leaderboard-ui.js's Match Standings and game-ui.js's opponent rank badges)
│   │   └── turnManager.js
│   │
│   ├── services/
│   │   ├── achievements.js  (the achievement system — progress/persistence/unlocking)
│   │   ├── assetPreloader.js  (preloads/decodes every game image on the Startup screen — see § Startup / Loading Screen)
│   │   ├── dataLoader.js
│   │   ├── devEnv.js     (runtime Development-vs-Production detection — no bundler/NODE_ENV in this project, so this reads the page's actual hostname/protocol instead)
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
│       ├── homeGameStart-ui.js (Home's Play vs Bot / Play vs Human primary tab bar)
│       ├── modal-ui.js    (Home's popup modals: Profile, Settings, Card Guide, About, Feedback, Tutorial — plus Game's own in-game Settings/Help)
│       ├── orientation-ui.js (portrait-only gate — every top-level page)
│       ├── pause-ui.js
│       ├── previewOverlay-ui.js (Ability Preview's visual layer — full-card overlays; see § Ability Preview System)
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

### Ability Preview System

```text
js/abilities/previewActions.js    (action enum: Stay/MoveBack/Remove/Defend/MoveToSlot/Attach/Escape)
js/abilities/previewResolver.js   (previewAbility() — the shared resolver)
js/ui/previewOverlay-ui.js        (full-card overlays — visual layer only)
js/constants/preview.js           (drag-start threshold, Bot preview duration)
```

Before a card actually enters the Queue, both the human player (via
drag) and the Bot (before executing its chosen card) show what it
would do — without touching real game state. `previewAbility(card,
gameState)` is the single place that answers this: it runs the exact
same `resolveAbility()` real execution uses, but against a disposable
clone of the Queue (`{ queue: [...gameState.queue, card], trash: [],
logs: [] }` — new arrays, but the same card object references, since
nothing in `abilities.js` ever mutates a card's own fields), captures
the same events real turns emit via `presentation/events.js`'s
`beginCapture()`/`endCapture()`, and classifies the outcome per card:

* **Stay** — no effect; no overlay is shown.
* **Move Back** — displaced by another card's ability (e.g. pushed
  back by a Hippo, or bumped by a Lion rushing to the front).
* **Remove** — will be sent to the Trash (Weasel/Parrot/Crocodile/
  Monkey's group effect).
* **Defend** — Zebra specifically, blocking a Hippo or Crocodile.
* **Move To Slot** — an ability relocates a card to a known slot
  (Snake's sort, Seal's reverse, or the dragged card's own
  self-relocation — Lion's rush, Hippo's push, Kangaroo's jump,
  Giraffe's hop — each carries its real destination slot number,
  never a hardcoded one).
* **Attach** — Sloth Bear sticking directly behind whichever card just
  passed over it (already a real, positional gameplay rule — see
  `helpers/followHelpers.js` — not a Preview-only visual).
* **Escape** — the dragged/selected card itself will not enter the
  Queue at all (a duplicate Lion bouncing off the one already there).

Because Preview and real execution share the exact same
`resolveAbility()` call, they cannot drift into two different rule
sets — there's only one gameplay-rule implementation, ever.

`js/ui/previewOverlay-ui.js` turns a Preview result into the actual
full-card overlays (dim + blur the card underneath, a large action
icon, the destination slot number for Move To Slot) — it owns no
gameplay rules itself, just presentation, and pools one overlay
element per card rather than creating/destroying them repeatedly.

The Preview is computed once per drag (it depends only on the dragged
card and the current Queue, never on pointer position) — see
`wireHandCardDrag()` in `js/ui/game-ui.js` for the player flow, and
`previewThenPlayCard()` in `js/game/turnManager.js` for the Bot flow,
which briefly shows a small preview badge (`showBotPreviewBadge()`)
next to the Bot's seat before calling the same `playCard()` used
everywhere else.

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
  card grid (2 columns on mobile portrait, more on wider viewports).
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
js/ui/orientation-ui.js  (portrait-only enforcement — see below)
```

The interface adapts game controls and panels for smaller screens while maintaining the core gameplay experience.

### Orientation — portrait-only on touch devices

Wild Guest List is **portrait-only on touch devices**. A phone or
tablet (coarse pointer) held in landscape is blocked by
`js/ui/orientation-ui.js`'s gate: the normal app UI is hidden and a
"Please rotate your device" overlay (`#orientationGate`, present on
every top-level page) is shown instead. Rotating to portrait clears
the gate automatically and reactively (via `matchMedia`, not a CSS
`transform: rotate()` hack) — nothing underneath is destroyed or
reset while blocked. Desktop/laptop (fine pointer) is never gated,
regardless of window shape.

This project was previously landscape-only on touch devices (gating
portrait instead) — that approach has been superseded by the
portrait-only policy above; every mobile screen (Home, Game Mode
Selection, Choose Bot Difficulty, Settings, Profile, Card Guide,
Achievements, Game, Game Result, and every popup) is designed for
portrait only, and there is deliberately no mixed-orientation system
(e.g. landscape Home + portrait Game). See
`tests/orientation.test.mjs` for the current gating behavior across
every pointer/orientation combination.

The Game Board screen's mobile layout (`css/style.css`'s "PORTRAIT-ONLY
MOBILE — GAME BOARD LAYOUT LAYER", keyed on
`(pointer: coarse) and (orientation: portrait)`) needed a real
redesign rather than a simple flip: portrait's scarce dimension is
width, landscape's was height, so card/UI sizing switched from
height-driven (`dvh`) clamps to width-driven (`dvw`) ones, and the
Leaderboard/Log/Chat rail moved from a column beside the board (spending
landscape's spare width) to a row above it (spending portrait's spare
height instead). Home and Choose Bot Difficulty needed no equivalent
override — their base layout is already a vertical `flex-direction:
column` stack sized for a normal-width column, which is exactly what a
portrait phone already is; the old landscape layer only overrode them
because landscape's short height forced everything into a compact
grid, a constraint portrait doesn't have.

Do not re-enable a landscape-locked mode without updating the gate,
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

- **Full-screen panels** (Choose Bot Difficulty, Reward Popup): opt into
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
"no-scroll" layer (see § Mobile portrait — game board layout layer
below, landscape-oriented at the time) had `.modal-content >
.modal-body { overflow-y: hidden }`,
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

### Mobile portrait — game board layout layer

On top of the general Panel Architecture above, `css/style.css`'s
**"PORTRAIT-ONLY MOBILE — GAME BOARD LAYOUT LAYER"** section (keyed on
`(pointer: coarse) and (orientation: portrait)`, with additional
`max-width` tiers for narrow and smallest phones) adapts the Game
Board screen specifically for a portrait phone.

- **Why a separate layer, keyed on width tiers, not the existing
  `max-width: 600px` mobile rules**: this layer is the Game Board
  screen's own layout (`#pageLayout` swapping from its desktop grid to
  a single mobile column, `#gameLayout`'s rail, card sizing, the
  Leaderboard/Party/Trash popups) — concerns the general mobile rules
  were never responsible for. It targets a touch device now guaranteed
  portrait by the orientation gate, and adds its own width tiers
  because portrait's scarce dimension is width: a phone at, say,
  360px wide needs smaller cards than one at 430px even though both
  are portrait, the same way the old landscape-only design needed
  separate height tiers because height was its scarce dimension.
- **Home and Choose Bot Difficulty are *not* overridden here** — this
  is the main structural difference from the old landscape-only
  design, which forced both into a compact, height-constrained grid.
  Their base rules (a plain `flex-direction: column` stack with
  `overflow-y: auto`, sized for a normal-width column) already fit a
  portrait phone directly, the same layout a narrow desktop window
  already uses via the existing `max-width: 600px` rules. Portrait has
  height to spare, so there's no "everything must fit without
  scrolling" pressure the way there was in landscape.
- **Game Board**: `#gameLayout` drops its rail-beside-board grid in
  favor of a single flex column, since portrait can't spare the width
  for a permanent second column the way landscape could spare the
  height. Leaderboard, Log, and Chat are the same three compact
  buttons as before (`#mobileSideRail`; Leaderboard opens
  `#mobileLeaderboard`, Log opens the shared `#logModal`, Chat shows
  "Coming Soon"), now laid out as a horizontal row stacked ABOVE the
  play area instead of a vertical column beside it. Party and Trash
  are still not rail buttons — they open from the Party and Trash
  buttons (the same `icons.party`/`icons.trash` image assets used by
  the Party/Trash Area headers themselves, not emoji, each now paired
  with a visible i18n label — "Party"/"Trash" — in the same
  icon+label language `#mobileSideRail`'s buttons already use), grouped
  together as one row directly above the Queue
  (`#queuePartyTrashRow`/`.queue-icon-entry`/`.queue-icon-exit`, built
  in `renderQueue()` — `js/ui/game-ui.js`), per the gameplay screen's
  layout spec. `#queueWithIcons` wraps exactly two children in Mobile
  Portrait — `#queuePartyTrashRow` (the button row) then `#queueInner`
  (the Queue) — stacked with `flex-direction: column`; each button
  itself is `flex: 1 1 0` inside that row, so Party and Trash always
  split it evenly regardless of screen width. On Desktop/tablet
  (`.queue-icon`'s base `display: none`), the empty row wrapper simply
  collapses to nothing next to the Queue — no separate desktop-only
  markup branch needed. Clicking either button still reuses the exact
  same `#partyArea`/`#trashArea` popups and one-open-at-a-time toggle
  group in `js/ui/mobile-ui.js`'s `initMobileTabs()`. Because those
  icons are created the first time the Queue renders,
  `initMobileTabs()` is called after the first `updateUI()` in
  `js/game-main.js` rather than before it. The old
  `#mobileTabs`/`#partyTab`/`#trashTab` markup is still present in
  `game.html` (it's also targeted by `js/ui/walkthrough.js`'s
  width-based `<=600px` mobile tier), but it plays no part in the
  Portrait rail and stays hidden there (see § Version 1.32.1's bugfix
  for the CSS rule that used to defeat that). Desktop shows the same
  two icons too now, arranged differently — see § Desktop —
  Party/Trash flank the Queue below (this used to say the icon row
  simply collapsed to nothing on Desktop; that was true only before
  that section's change).

  Each opponent seat in `#otherPlayers` (built by `renderOtherPlayers()`
  in `js/ui/game-ui.js`) shows, next to the player's name, the same
  rank medal (🥇/🥈/🥉/4th) currently shown for that player in the
  Match Standings/Leaderboard popup — both read the standings through
  `js/game/scoreManager.js` so the two can never disagree — plus an
  explicit hand-card count alongside the existing deck count, since
  the face-down card-backs alone can be hard to count at the small
  sizes Mobile Portrait uses.

  The main gameplay column (`#centerArea`, now the only column) stacks
  Other Players / Queue / Player Hand in that same source order as
  before — the DOM order was never landscape-specific, so it needed no
  change. What did change is the sizing basis: card and layout
  dimensions that used to be height-driven (`dvh`-based clamps, since
  landscape's scarce dimension was height) are now width-driven
  (`dvw`-based clamps), since portrait's scarce dimension is width.
  Queue cards are still sized smaller than Player Hand's, which keeps
  the same visual priority the landscape design had — Player Hand
  reads as the more important, larger element of the two.
- **Popups** (Leaderboard/Party/Trash) keep the same tap-to-open
  overlay architecture and the same `margin: auto 0` centered-shrink
  approach as before, just re-proportioned for portrait: more room is
  given top/bottom (portrait's abundant dimension) and less left/right
  (portrait's scarce one) — the inverse of the old landscape
  proportions.
- Card Guide's `#animalGrid` and Achievements' `.ach-grid` keep no
  scrolling/`max-height` of their own — both size to their full
  content height and rely entirely on the popup's own `.modal-body`
  to scroll (see the 1.30.6/1.30.13 fix notes below). Their content
  length depends on how much a player has unlocked / the current card
  set, so an unusually long list scrolls via `.modal-body` instead of
  being silently clipped — there is no independent safety net on the
  grid itself, since that's exactly what caused the nested-scroll bugs
  those fixes address. None of this changed with the portrait
  conversion.

Real-device/browser QA against this layer hasn't been done as part
of this change (this environment can't render a browser) — see
Known Issues below.

### Desktop — Party/Trash flank the Queue

Desktop no longer shows `#partyArea`/`#trashArea` as permanent big
sidebars either — `#gameLayout`'s grid is a single `1fr` column now
(it used to be `clamp(180px, 22vw, 280px) 1fr clamp(180px, 22vw,
280px)`, one side column each for Party and Trash), and
`#partyArea`/`#trashArea` default to `display: none` as a centered,
fixed-position popup everywhere, Desktop included (see the "PARTY /
TRASH" section in `css/style.css`) — the same popup, toggled by the
same `.mobile-open` class, that Mobile Portrait already used. Reached
the same way Mobile Portrait reaches it, too: no second popup
implementation was built. What differs from Mobile Portrait is only
how the two buttons are arranged around the Queue and how the popup
itself is sized/positioned, both purely presentational:

- **Buttons flank the Queue instead of stacking above it.**
  `#queuePartyTrashRow` (the wrapper `renderQueue()` — `js/ui/game-
  ui.js` — builds around `#queueDoorIcon`/`#queueTrashIcon`, the exact
  same elements Mobile Portrait uses) is unwrapped via `display:
  contents` on Desktop (`@media (min-width: 601px) and (pointer:
  fine)`), so its two icon children become direct flex items of
  `#queueWithIcons` alongside `#queueInner`. `order` then places the
  Party icon before the Queue and the Trash icon after it — flanking
  both sides — instead of Mobile Portrait's single row above the
  Queue. No JS or markup change was needed for this: same DOM, same
  click/keyboard wiring (`js/ui/mobile-ui.js`'s `initMobileTabs()`,
  already unconditional — never gated to mobile), only the CSS
  differs. Each button is a small icon+label control (`clamp(56px,
  6vw, 76px)` wide) that reads as a compact button flanking the Queue
  rather than eating into its own space.
- **The popup itself renders as a centered floating card** on Desktop
  (`top/left: 50%` + `translate(-50%, -50%)`) rather than Mobile's
  edge-anchored sheet (`top/left/right/bottom` band with `margin: auto
  0`) — a better fit for a wide, mouse-driven viewport. The narrower/
  touch breakpoints each restate their own `transform: none` to
  cancel the Desktop default's `transform`, since a property set by
  an earlier, unqualified rule otherwise still applies underneath a
  later media-scoped rule that doesn't happen to touch that same
  property.
- **Shaped to match the Pause popup, on every layout** (1.37.1,
  widened to Mobile in 1.37.2): `#partyArea`/`#trashArea` now use the
  same border/border-radius (`var(--radius-md)`)/background
  (`rgba(10,31,15,0.82)`)/blur (`blur(18px)`)/box-shadow as
  `#pauseModal`'s `.modal-content.small-popup`, instead of the base
  (still-shared-with-`#chatPanel`) `--bg-panel`/`--radius-lg` look —
  Desktop's version (below) also matches Pause's *width*; the
  ≤600px-width and touch+portrait tiers keep their own tuned
  edge-anchored position/size, restyled in place with the same
  border/background/radius (added as a dedicated `#partyArea,
  #trashArea` rule right after each tier's existing position rule, so
  `#mobileLeaderboard` — sharing that position rule but not asked to
  match Pause — is left alone).
- **Desktop's popup is also sized to match Pause** (1.37.1): the
  Desktop-only override at the bottom of the `@media (min-width:
  601px) and (pointer: fine)` block gives `#partyArea`/`#trashArea`
  the exact same width basis as `#pauseModal`'s `.modal-content.small-
  popup` (`width: min(350px, 92vw)`) and the same padding as
  `.modal-content`, instead of the old `min(420px, 92vw)`. Height is
  fixed (`height: min(600px, 80vh)`, with the old content-driven
  `max-height` explicitly cleared) rather than shrinking to whatever's
  inside, and taller than the old auto-sized version — Party/Trash can
  hold far more cards over a game than Pause's four fixed actions ever
  need to size around, so a consistent, roomier box reads better than
  one that changes height as cards accumulate. This particular
  width/height override is scoped to just the Desktop media block —
  Mobile keeps its own tuned position/size, only borrowing Pause's
  *shape* per the point above, not its dimensions.
- **Trash sits with extra breathing room from the right edge** of the
  Queue row (`margin-right: clamp(16px, 4vw, 56px)` on
  `#queueTrashIcon`, added alongside the `order` rule) — without it,
  `#queueInner`'s `flex: 1` pushes Trash flush against the row's own
  right edge. Party's spacing on the left is unchanged; only Trash
  needed the wider margin.
- **The popup's close (X) button is shown again**, scoped to just
  `#partyArea`/`#trashArea` (`.panel-close`/`.mobile-only-btn` default
  to `display: none`, "shown only on mobile", since Desktop never
  opened these as a popup before). Re-clicking the same flanking icon,
  and clicking the popup's own empty background (both already wired
  in `initMobileTabs()`), still work as backup close paths, same as
  Mobile — the visible X is just the expected affordance for a
  centered Desktop modal on top of those.
- **Notification badges** — `#partyIconBadge`/`#trashIconBadge`, small
  circular counts absolutely-positioned on each flanking icon (and, on
  Mobile Portrait, on the same row-above-the-Queue icons too) — show
  how many cards have entered Party/Trash so far. They're driven by
  the real DOM contents of `#partyCards`/`#trashCards`: `renderParty()`
  /`renderTrash()` (`js/ui/game-ui.js`) rebuild those from `gameState`
  on every full render and then read the resulting child count back
  off; the Director's own mid-turn card-move animations
  (`onEnteredParty`/`onRejected`/`onRemoved`, same file — these append
  the real moved card into `#partyCards`/`#trashCards` one at a time,
  independent of any full render, since "the Director never touches
  gameState") call the same refresh right after their own append, so
  the count stays live during an animated turn too, not just after a
  full re-render. The `hidden` attribute (not an empty/zero badge)
  drops the badge entirely at a count of `0`.
- `#gameLayout`'s Tablet-width override (`601px`–`1024px`) used to
  restate its own three-column `grid-template-columns`; it now just
  inherits the base single column and only re-declares the tighter
  `gap` Tablet needs.

Real-device/browser QA against this hasn't been done as part of this
change (this environment can't render a browser) — see Known Issues
below. `tests/desktopPartyTrash.test.mjs` covers the CSS/JS-source
invariants above (no DOM/layout harness exists in this project — see
`tests/README.md`).

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
sheet. Since portrait phones are almost always under 600px **wide**,
this bottom-sheet treatment is what actually reaches real mobile
players; the centered-dialog treatment with the portrait-specific
sizing described above mostly applies to small non-touch
windows/narrow desktop tablets that fall above the 600px breakpoint.

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

### Development/Test Mode — previewing the Reward Popup

The Reward Popup is the end-of-match results screen (`#endGameScreen`,
`js/ui/endgame-ui.js`'s `showEndGame()`) — normally only reachable by
actually finishing a 12-card match. In Development, it can be opened
directly instead, without playing a full game:

| Trigger | Scenario |
|---|---|
| `Ctrl+Alt+R` | You **WINNER** |
| `Ctrl+Alt+D` | You **DRAW** (tied for the lead) |
| `Ctrl+Alt+L` | You **LOSS** |
| `Ctrl+Alt+O` | You **LOSS**, while two other players **DRAW** for the lead |
| `Escape` | Dismiss the test popup (only the one just opened this way) without reloading |

If a keyboard combo conflicts with your OS/browser, the same four
scenarios are also available from the browser console:

```js
__wglRewardPopupTest.win();
__wglRewardPopupTest.draw();
__wglRewardPopupTest.loss();
__wglRewardPopupTest.lossToDraw();
__wglRewardPopupTest.close();
```

This opens the exact same `showEndGame()` component/state flow a real
match end uses — never a separate mock popup — with a throwaway,
predictable test snapshot (fixed Party Card Counts, run through the
same `determineMatchOutcome()` resolver a real match uses, see
`js/game/matchOutcome.js`). It never touches the real, live
`gameState` (`js/game/gameState.js`) and deliberately skips
`js/game/gameOver.js`'s `finishGame()`/achievement persistence, so it
cannot corrupt an in-progress match or move real, saved
achievement/profile progress.

**Development-only, by design:** the trigger (`js/dev/rewardPopupDevTrigger.js`)
is gated behind `js/services/devEnv.js`'s `isDevEnvironment()`, which
checks the page's actual runtime origin (`localhost` / `127.0.0.1` /
`0.0.0.0` / `::1` / a `file:` URL) rather than a hardcoded flag —
this project has no bundler/build step (see § Running Locally /
Deployment above), so there's no `NODE_ENV` to read and nothing a
build could strip; this is the equivalent check for a zero-build
static app. On a real deployment (GitHub Pages, Netlify, Vercel, or
any real domain) that check is always `false`, so `initRewardPopupDevTrigger()`
becomes a total no-op: no keyboard listener is registered, no
`window.__wglRewardPopupTest` is exposed, and no trigger of any kind
exists in the shipped UI. See `tests/devEnv.test.mjs` and
`tests/rewardPopupDevTrigger.test.mjs` for automated coverage of both
the scenario data and this Production safety gate.

To remove this feature entirely: delete `js/dev/` and the one
`import`/`initRewardPopupDevTrigger()` call pair in `js/game-main.js`.
Nothing else in the codebase depends on it.

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

**Current version:** 1.43.0

**Feature — Game page layout finalized: Round removed, Game State reworked, Standings/Chat become popups, Opponents always one row (1.43.0):**
The Game page (`game.html`) now matches the finalized layout spec:
- **Round removed entirely.** `#roundInfo` and its divider are gone from
  the markup, and `renderCurrentTurn()` (`js/ui/game-ui.js`) no longer
  computes or displays it. No secondary game-state value replaced it.
- **Game State** (`#gameState`) now shows only whose turn it is and the
  remaining turn timer — a display-only element (`pointer-events: none`
  in CSS, in addition to having no click handler) that can never open a
  popup. It shows a per-seat icon (the `⭐ yourTurn` icon for the human
  player, the same per-difficulty bot icon used in the Opponent Row for
  bots) next to text like "YOUR TURN" / "BOT 2'S TURN" (new
  `gameStateYourTurn`/`gameStateOpponentTurn` i18n keys), plus a thin
  timer-progress fill bar tinted with the same safe→danger color the
  timer number already used.
- **Utility Buttons** (Standings / Game Log / Chat) sit above Game
  State on every layout now, not just Mobile Portrait — this reuses the
  existing rail buttons (`#leaderboardBtn`/`#railLogBtn`/`#railChatBtn`,
  `#mobileSideRail`) rather than adding new ones. The header's old
  `#logBtn` next to Pause was removed as a redundant second entry point.
- **Standings and Chat are real popups on every layout**, including
  Desktop. The old permanent `#leftSidebar` (an always-visible
  Leaderboard panel plus a "Coming Soon" Chat panel) is gone;
  `#mobileLeaderboard` and `#chatPanel` now use the same `.mobile-open`
  popup toggle Party/Trash already used (`js/ui/mobile-ui.js`'s
  `initMobileTabs()`), shaped to match the Pause popup on Desktop. Chat
  itself is still unimplemented — its content remains the "Coming Soon"
  placeholder — only how it's reached changed.
- **Opponents are always exactly one horizontal row** above the Game
  Table, never a per-side layout, never beside You. `renderOtherPlayers()`
  now renders a flat, dynamic list of `.other-player-slot` elements
  directly into `#otherPlayers` (replacing the old fixed
  `#topPlayer`/`#leftPlayer`/`#rightPlayer` trio), and `#otherPlayers`'s
  own base CSS rule sets `display: flex; flex-direction: row` so this
  holds at every breakpoint (a couple of narrower, non-touch tiers had
  previously stacked them into a column).
- Party/Trash's existing popup-flanking-the-Queue behavior (introduced
  in 1.42.x) is unchanged.

**Feature — Card Power restored to the Animal Cards on the table and the Card Guide (1.42.0):**
`Power` (the numeric gameplay stat behind ability dispatch, queue
sorting, ability targeting, and AI evaluation — `data/cardInfo.json`,
`js/abilities/abilities.js`, `js/ai/ai.js`) is visible again next to
the Animal name on every in-play card. `createCard()`
(`js/ui/game-ui.js`, the single factory used for Hand/Queue/Party/
Trash/drag-ghost/preview cards alike) now renders a `.card-power`
readout in the card footer beside `.card-name`, reversing the 1.30.12
cleanup that removed it from the card face. The Card Guide
(`js/game/help.js`) shows the same value in both its grid tiles
(`.help-card-power`) and its card-detail popup (`.power-badge` next
to the `<h2>` name), reversing 1.36.5's removal there.

Both surfaces read `card.power` straight from the one authoritative
loader, `js/services/dataLoader.js`'s `loadCardData()` — the Card
Guide previously ran its own independent `fetch("./data/cardInfo.json")`
and now goes through that same cached loader instead, so gameplay and
the Card Guide can never disagree on a card's Power, and there is no
second copy of the card data anywhere. Nothing about this touches
Victory: **Party Card Count remains the sole Victory Metric**
(`js/game/matchOutcome.js`) — Power is displayed purely as a Card
Gameplay Attribute readout and plays no part in Win/Draw/Loss,
scoring, or leaderboard ranking, which were already fully decoupled
from Power back in 1.38.0 and stay that way (see
`tests/matchOutcome.test.mjs`'s "no Power dependency" case). The
in-turn ability-guidance chip (`js/ui/cardGuidance-ui.js`) and the
tutorial's ability-examples mock-up (`js/ui/tutorial-ui.js`) are
unchanged — out of scope for this pass.

CSS-only changes support the new layout: `.card-footer`/
`.help-card-footer` switch from `justify-content: center` to
`justify-content: space-between` (with a small `gap`) now that each
holds two children, `.card-name`/`.help-card-name` gain
`flex: 1 1 auto; min-width: 0` so a long Animal name still ellipsizes
instead of pushing Power out of the footer, and `.card-power`/
`.help-card-power`/`.power-badge` join the existing "numbers always
LTR" selector list so the digit never reverses under the Persian/
Arabic RTL layout.

**Style — Reward Popup action buttons now visually match the Pause Popup, via shared-component reuse (1.41.1):**
The Reward Popup (`#endGameScreen`, `js/ui/endgame-ui.js` — the screen
shown at the end of every match) previously styled its two actions,
**Return to Home** and **Play Again**, as filled/outlined pill
buttons (`.screen-btn` + `.endgame-btn-primary`/`.endgame-btn-secondary`)
in a two-column grid — a different visual pattern from the Pause
Popup's icon-over-label actions. Both buttons now reuse the Pause
Popup's exact existing button implementation instead — no new/parallel
CSS was written: the same `.pause-actions` row, `.pause-action`
button, `.pause-action-icon.top-btn` icon box, and
`.pause-action-label` label classes the Pause Popup (`#pauseModal`)
already uses. That gives the Reward Popup's buttons the same size,
height/width, border-radius, typography, icon alignment, spacing, and
hover/active states as the Pause Popup's, on both Mobile and Desktop,
with zero duplicated styling.

Only presentation changed: `#returnHomeBtn`/`#playAgainBtn` keep
their ids, `type="button"`, and click wiring (`js/game-main.js`)
exactly as before — same two buttons, same behavior. The old
`.endgame-btn-primary`/`.endgame-btn-secondary`/`.endgame-btn-icon`/
`.endgame-btn-label` rules (the duplicated button styling) were
removed from `css/style.css`; `.endgame-actions` remains as a
Reward-Popup-scoped layout hook only, carrying no button visuals of
its own. `tests/endgameActionButtons.test.mjs` was rewritten to
assert the new shared-component markup instead of the old grid/
equal-width regression it used to guard.

**Feature — Play vs Bot's 1/2/3-Bot options are now pure selectors, with a separate Play button to start the match (1.41.0):**
Tapping **1 Bot / 2 Bots / 3 Bots** (`.home-bot-options`) on Home's Play
vs Bot panel no longer starts a match by itself. The three options are
now a radiogroup of pure selectors (`role="radio"`/`aria-checked`,
exactly one `.home-bot-option--selected` at a time, same orange
active/inactive styling as before) — selecting one only changes which
count is selected. **1 Bot** ships selected by default (previously 3
Bots). A new, separate, full-width **Play** button
(`#homeBotPlayBtn`, `.home-bot-play-btn`) sits directly below the
three options, reusing the existing orange `.home-primary-btn`/
`.home-play-btn` CTA styling unchanged; it's the only control that
starts a match, using whichever bot count is currently selected. The
handoff to `bot-difficulty.html` is otherwise unchanged: Play still
stores the selected count in the same `wgl_selectedBotCount`
sessionStorage key (`js/ui/home-ui.js`), read the same way by
`js/bot-difficulty-main.js`. Play vs Human's **Rank**/**Friendly**
options (`.home-human-options`) are untouched — still Coming Soon
selectors that open `#comingSoonModal`, never start a fake match. Logo
size and the rest of the existing visual style are unchanged.

New localization key `homeBotPlayBtn` ("Play") added for all four
supported languages (en/fa/ar/tr).

**Feature — Home's Start Game restructured into Play vs Bot / Play vs Human, with selectable 1/2/3-Bot matches (1.40.0):**
Home's Start Game tab bar is now two levels instead of one flat
Play vs Bot / Rank / Friendly row. The primary level is
**Play vs Bot** (default) / **Play vs Human**. Play vs Bot's panel now
offers three selectable, self-starting options — **1 Bot / 2 Bots /
3 Bots** (`.home-bot-options`, reusing the existing
`playWith1Bot`/`playWith2Bots`/`playWith3Bots` icons) — instead of one
big button; **3 Bots** ships selected by default and is still exactly
the original 1 human + 3 bots match. Play vs Human's panel holds
**Rank** and **Friendly** (`.home-human-options`), both honest Coming
Soon options that open the shared `#comingSoonModal` instead of a
Rank/Friendly-specific panel. The visual language (dark theme, orange
accent, card/border/radius styling, logo size) is unchanged.

Game-state side: `js/bot-difficulty-main.js` now builds only the
selected number of bot rows (reading a new `wgl_selectedBotCount`
sessionStorage handoff from `js/ui/home-ui.js`, defaulting to 3 if
missing/invalid), and `js/game-main.js` now deals in however many bot
difficulties actually came through the `wgl_pendingDifficulties`
handoff (1–3) instead of always assuming exactly 3 — reusing the
existing player/difficulty architecture (`Player`, `PLAYER_TYPES`,
`gameState.players`) rather than introducing a parallel one. The
existing 3-bot flow is unchanged end-to-end. 1-Bot and 2-Bot matches
reuse the same generic engine (queue/party/trash resolution,
abilities, scoring) that already only reads `gameState.players`
rather than assuming a fixed seat count.

Also fixed: an unwanted translucent-white fill behind Home's profile
chip avatar (`.home-profile-chip-avatar`) that showed through the
avatar artwork's transparent areas as a light box instead of the dark
menu background — removed, background is now `transparent`. And the
four Coming Soon cards (Store/Tournament/Leaderboard/Lucky Wheel) now
reserve the same two-line title height (`.home-bottom-label`) so
Lucky Wheel's wrapping two-line title no longer pushes its icon out of
vertical alignment with the other three single-line cards.

New localization keys (`gameModesPlayVsHuman`,
`homePlayWith1Bot`/`2Bots`/`3Bots`) added for all four supported
languages (en/fa/ar/tr); `Rank`/`Friendly` reuse the existing
`homeTabRank`/`homeTabFriendly` keys.

**Fix — Give/Send Feedback button now genuinely centered in the Reward Popup (1.39.1):**
The Reward Popup's `#endgameFeedbackBtn` ("Give Feedback") sat flush
to the left edge of its footer on every viewport — the `display:flex;
justify-content: center` previously declared directly on the button
only centered its own icon+label *inside* its own already-content-sized
box, which had no effect on where that box sat within the footer.
Fixed at the layout-container level instead: `#endGameScreen
.screen-panel-footer` is now a flex column with `align-items: center`
(`css/style.css`), which centers the feedback button — the only
footer child without an explicit `width: 100%` — through real
flexbox, not a hardcoded margin/left/transform, so it stays centered
at any popup or viewport width, Desktop and Mobile alike.
`.endgame-actions` (Return to Home / Play Again) is unaffected since
it keeps its own explicit full-width sizing. The button's own
size/padding/font (`.feedback-link-btn`) and its click behavior are
completely untouched — only its position within the footer changed.
CSS-only change; no JS/behavior touched.

**Feature — Development/Test Mode for the Reward Popup (1.39.0):**
Added a Development-only way to preview the real end-of-match Reward
Popup (`#endGameScreen`, `js/ui/endgame-ui.js`'s `showEndGame()`)
without playing a full 12-card match — see § Development/Test Mode
above for the full trigger list
(`Ctrl+Alt+R`/`D`/`L`/`O` and `window.__wglRewardPopupTest`). New
files: `js/services/devEnv.js` (runtime Development-vs-Production
detection — this project has no bundler/`NODE_ENV`, so it reads the
page's actual hostname/protocol instead of a hardcoded flag) and
`js/dev/rewardPopupDevTrigger.js` (the trigger itself, wired into
`js/game-main.js` with a single import + init call). It opens the
exact same `showEndGame()` component/state flow a real match end
uses — never a mock popup — with a throwaway, predictable test
snapshot whose outcome is computed through the same
`determineMatchOutcome()` resolver a real match uses
(`js/game/matchOutcome.js`), so the popup's WINNER/DRAW/LOSS labels
are never hand-authored. It never touches the real, live `gameState`
and deliberately bypasses `js/game/gameOver.js`'s `finishGame()`/
achievement persistence, so it cannot corrupt an in-progress match or
move real, saved achievement/profile progress. On a real deployment
(any real domain — see § Deployment) `isDevEnvironment()` always
returns `false`, so the whole feature becomes a genuine no-op: no
keyboard listener, no console global, no trigger of any kind exists in
Production. Covered by `tests/devEnv.test.mjs` and
`tests/rewardPopupDevTrigger.test.mjs`.

**Feature — Card Power removed from victory; real Draw outcome added (1.38.0):**
The match result used to be "highest Party count, ties broken by the
sum of each party's card Power" (duplicated across
`js/game/gameOver.js`, `js/ui/endgame-ui.js`, and
`js/game/scoreManager.js` — see the "Cleanup — Power stat removed from
Animal Ability Cards (1.36.5)" entry below, which explicitly called out
this end-of-game score as a separate, at-the-time-unremoved feature).
That hidden tie-breaker is now gone entirely: **Party Card Count is the
only metric that decides a match.** A new single authoritative resolver,
`js/game/matchOutcome.js`'s `determineMatchOutcome()`, returns a
discriminated union — `{ type: "WIN", winnerId }` when exactly one
player has the highest Party Card Count, or `{ type: "DRAW", playerIds
}` when two or more players share it — with **no** secondary numeric
tie-breaker of any kind (no Power, no card rarity, no turn count, no
random value) and no Sudden Death round. `gameState.winner` (a single
Player object) is replaced by `gameState.outcome` (this discriminated
union); `js/game/gameOver.js`'s `finishGame()` sets it and logs either
`logWon` or the new `logDraw`. `js/ui/endgame-ui.js`'s final-results
screen now labels every player `WINNER`, `DRAW`, or `LOSS`
(`endResultWinner`/`endResultDraw`/`endResultLoss`, replacing the old
`endPower` score column and its now-unused `power` icon in
`data/config.json`), and its title/text (`endWinTitle`/`endDrawTitle`/
`endLoseTitle`, plus matching body text) adapt to whichever of the
three the human player got. `js/game/scoreManager.js`'s
`getRankedPlayers()` (the Match Standings / opponent rank-badge
ranking, shared with `js/ui/leaderboard-ui.js` and `js/ui/game-ui.js`)
now sorts by Party Card Count alone — its dead, never-displayed
`getPartyScore()` export was also removed. `js/services/achievements.js`'s
Wild Champion/Strategist win-checks now read `gameState.outcome.type
=== "WIN"`, so a Draw correctly never counts as a win. None of this
touches the unrelated, load-bearing `power` field each card still
carries (`data/cardInfo.json`) — that's the animal's identity/strength
ranking the ability system dispatches on (`js/abilities/abilities.js`,
`js/ai/ai.js`, `js/services/dataLoader.js`) and is unaffected. The
victory rule reads only `player.id`/`player.party.length`, so it stays
correct once players can build their own decks (see Roadmap below) —
nothing depends on a specific card, card count per animal, or fixed
deck composition. The reward/economy system that will eventually
consume `WINNER`/`DRAW`/`LOSS` is intentionally out of scope here — no
coins, gems, XP, or reward UI were added.

**Fixed — "Send Feedback" button not centered in the Feedback popup on Mobile (1.37.8):**
`#feedbackSubmitBtn`'s `.feedback-modal-footer` (`.modal-content > .modal-footer`)
is `display: flex; flex-direction: column`, so the footer's cross axis
is horizontal. Below the 600px breakpoint, the generic
`.screen-btn { max-width: 300px; }` mobile rule also applied to this
button, capping its width below the footer's own available width
(the feedback popup's `.small-popup` runs up to `min(350px, 92vw)`,
wider than 300px once its padding is subtracted on most phones).
Once the button's cross-size stopped resolving to `auto`, flexbox's
default `align-items: stretch` no longer filled the footer, and with
no alignment override the button fell back to the flex line's start
edge — flush-left in English/Turkish, flush-right in Farsi/Arabic —
instead of sitting centered. Fixed by adding `align-self: center` to
`.feedback-submit-btn` — pure flexbox alignment on the project's
existing layout system, no hardcoded margins/left/transform. Centers
correctly at any popup or viewport width, Mobile and Desktop alike;
above 300px-wide footers the button still renders at its previous
full width (just centered instead of pinned to the start edge), so
the size/padding/font-size fixed in the prior task, and the button's
`type="submit"`/click→`feedback-ui.js` submit behavior, are
unchanged.

**Fixed — Win Popup action buttons not equal size (1.37.7):**
`#endGameScreen`'s `.endgame-actions` row (Return to Home / Play
Again) switched from `display: flex` (`flex: 1 1 160px` per button)
to `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));`.
Flex's default `min-width: auto` let a button's own label win extra
width over its equal flex-grow share once that label needed more room
than the other (e.g. `endReturnHome` vs `playAgain`, longer still in
some locales — see `data/i18n.json`), and if a label ever wrapped it
also grew that button taller — so the two buttons weren't reliably
the same size, worst on narrow Mobile widths. Grid's `minmax(0, 1fr)`
tracks split the row exactly in half regardless of content; each
`.endgame-actions .screen-btn` also got a fixed `height: 50px` (not
`min-height`) plus `width: 100%; min-width: 0;`, and its label
(`.endgame-btn-label`, new span class in `game.html`) now truncates
with an ellipsis instead of wrapping or overflowing — so no label,
short or long, in any locale, can change either button's width or
height. The `@media (max-width: 420px)` rule that used to stack the
row into a column was removed (the buttons must stay in one row at
every Mobile width per the requirement); that breakpoint now only
tightens gap/padding/icon size so both equally-sized buttons keep
fitting inside the popup without overflowing it. `#returnHomeBtn`/
`#playAgainBtn` ids, classes, and their click handlers
(`js/game-main.js`) are unchanged — only sizing/layout changed.
Desktop is visually unchanged (it already rendered in one row; it
just now gets guaranteed-equal widths instead of coincidentally equal
ones).

**Fixed — Party/Trash notification badge crowding on Mobile Portrait (1.37.6):**
On Mobile Portrait, the live card-count badges on the Party and Trash
buttons (`#partyIconBadge`/`#trashIconBadge`, `.queue-icon-badge`) sit
at `top: -6px` on their own `.queue-icon` button — standard
corner-badge positioning, unchanged. The Party/Trash button row
(`#queuePartyTrashRow`/`.queue-party-trash-row`) is the first element
inside `#queueWithIcons`, directly below the Other Players row with
only `#centerArea`'s 6px column `gap` between them, so that 6px badge
overhang exactly canceled the 6px gap and left the badges touching the
Other Players row above at every Mobile Portrait width/aspect ratio.
Fixed with a `margin-top: 10px` on `.queue-party-trash-row` itself
(inside the `@media (pointer: coarse) and (orientation: portrait)`
block) — scoped to the row that actually owns the badges, not to
`#queueArea`/`#centerArea` (shared with the unrelated Hand section).
Badge-to-icon offset, count logic (`renderParty()`/`renderTrash()` in
`js/ui/game-ui.js`), and popup open/close behavior are all unchanged;
Desktop (`@media (min-width: 601px) and (pointer: fine)`) is untouched.

**Removed — "Hold to Show Hint" (Card Help long-press) (1.37.5):**
The Card Help discoverability system — holding a card (pointer, touch,
or keyboard Enter/Space) to open the Card Information modal, plus the
one-time bubble teaching players about it — has been removed
completely. Deleted `js/ui/longPress.js` (the reusable long-press
gesture handler), `js/ui/cardHelpHint.js` (the discoverability hint
bubble + its `wgl_cardHelpLongPressHintShown` persistence), and
`js/constants/longPress.js` (its duration/threshold config), along
with `wireCardHelpLongPress()`, the keyboard hold handler, and the
`.card-help-affordance` badge in `js/ui/game-ui.js`; `openCardInfoByPower()`/
`ensureHelpCardsLoaded()` in `js/game/help.js` (only ever called by the
long-press gesture — Card Information stays fully reachable through
the existing Help/Card Guide modal grid, unaffected); the
`dismissCardHelpHint()`/`maybeShowCardHelpHint()` call sites in
`js/game/turnManager.js` and `js/game-main.js`; the `.long-press-active`
and `.card-help-hint*`/`.card-help-affordance` CSS (rules + keyframes)
in `css/style.css`; and the `cardHelpHintText`/`cardHelpHintLabel` i18n
keys (all 4 locales). The Ability Preview system (`js/abilities/
previewResolver.js`, `js/ui/previewOverlay-ui.js`) and every other
existing hint/guidance system (`js/ui/cardGuidance-ui.js`,
`js/ui/tutorial-ui.js`, `js/ui/walkthrough.js`) are untouched —
`tests/previewResolver.test.mjs` still passes in full, confirming no
Ability Preview regression.

**Fix — Desktop drag only worked from a card's top-right corner (1.37.5):**
`wireHandCardDrag()` (`js/ui/game-ui.js`) has always attached its
`pointerdown` handler directly to the whole card element with no
target/area restriction, so architecturally a drag should already
start from anywhere on the card. The actual cause: `<img
class="card-image">` — which covers most of a card's visible area —
is natively drag-and-drop-able by default in every browser, so a
press-and-drag starting over the image was hijacked by the browser's
own native image-drag instead of reaching our pointer handlers; only
the small non-image slivers of the card (e.g. the top-right corner,
where the now-removed Card Help affordance badge used to sit) were
ever free of that interference. Fixed by adding `draggable="false"` to
the `<img>` in `createCard()`, plus a `-webkit-user-drag: none;
user-select: none;` CSS safety net on `.card` and all of its children
(also stops the card's own text — name, owner badge — from starting a
native text-selection drag instead of our drag). No parallel drag
implementation was introduced; the existing single
pointer-events-based architecture is unchanged. Mobile's existing
`touch-action: pan-x` on hand cards (native horizontal hand-scroll
alongside our own vertical/diagonal pointer-driven drag) was reviewed
and needed no change; Ability Preview during drag, Queue drop, and
drag-cancel-doesn't-mutate-state all continue to work exactly as
before.

**Fix — Bot card selection/preview no longer resizes the Bot Section (1.37.4):**
On Mobile (and, more subtly, Desktop) the Bot Section — `#otherPlayers`
and its `#topPlayer`/`#leftPlayer`/`#rightPlayer` seats — visibly
changed size while a Bot selected/previewed/played a card, then
snapped back afterward, shoving the Queue and Player Hand around in
the process. The cause traced to `showBotPreviewBadge()`
(`js/ui/game-ui.js`): the small face-up card it shows next to a Bot's
seat while that Bot's Ability Preview is up (Section 7 of the brief)
was styled `position: absolute`, but was still appended as a real DOM
child of that seat's `.other-player-row` — i.e. still inside the Bot
Section's own layout subtree. Neither `.other-player-row` nor any of
its ancestors up to `#otherPlayers` declare their own `position:
relative`, so the badge had no stable containing block of its own to
size against; and `#otherPlayers` is exactly the kind of flex context
(`flex-wrap: wrap` with `width: auto` seats on Mobile Portrait,
`flex: 1 1 0; min-width: 0` shrinkable equal columns on Desktop) where
inserting/removing *any* child — including one meant to be taken out
of visual flow — still triggers a fresh layout pass for that subtree
and its siblings. That's what let the badge's brief appearance and
disappearance on every single Bot turn perturb the surrounding Bot
Section box, rather than any actual change to its own declared size.

Rather than reach for a bigger `min-height` on the Bot Section (which
would only mask the coupling, not remove it — see this version's
Task brief), `showBotPreviewBadge()`/`clearBotPreviewBadge()` now
follow the exact same pattern already used one screen over for the
human player's own drag preview: `.card-drag-ghost` (see
`wireHandCardDrag` in the same file) has always been appended to
`document.body`, entirely outside `#playerHand`'s own DOM subtree, and
positioned with `transform: translate(...)`. The Bot preview badge now
does the same — appended to `document.body`, `position: fixed`, with
its screen position computed fresh from the target seat's live
`getBoundingClientRect()` (via a new `positionBotPreviewBadge()`
helper) into two CSS custom properties (`--bpb-x`/`--bpb-y`) the badge's
`transform` reads, clamped to stay fully inside the viewport at any
screen size. There is now no DOM relationship whatsoever between the
badge and the Bot Section, so showing or hiding it structurally cannot
reflow `#otherPlayers`, the Queue, or the Player Hand — this isn't a
CSS tuning fix, the coupling that caused it is gone. A `resize`/
`orientationchange` listener (added while the badge is visible, always
removed in `clearBotPreviewBadge()`) keeps it glued to the seat if the
viewport changes mid-preview; nothing is hardcoded to one Mobile
resolution, so this holds across Mobile portrait at any width and
Desktop's own flanking-columns layout equally.

Nothing about *when* or *how long* the Bot's preview shows changed —
`previewThenPlayCard()`/`playCard()` in `js/game/turnManager.js`,
`BOT_PREVIEW_DISPLAY_DURATION_MS`, and the shared Ability Preview
system (`js/ui/previewOverlay-ui.js`'s `showQueuePreview()`, used
identically by the human's drag and the Bot's turn) are all untouched.
Card selection/execution timing, the Director's animation sequencing,
and the human player's drag-and-drop are all unaffected — only where
the Bot's own preview badge lives in the DOM changed.

**Fix — Queue → Party/Trash animation actually flies to the flanking icon instead of the corner (1.37.3):**
`onEnteredParty`/`onRejected`/`onRemoved` (`js/ui/game-ui.js`) used to
animate a resolving card with the same `flip()` FLIP primitive used
for in-queue moves — measure where the element ends up after
reparenting it, then transition to that real rect. That works for
in-queue moves because the destination (`#queue`) is always visible,
but `#partyCards`/`#trashCards` live inside `#partyArea`/`#trashArea`,
popups that are `display: none` until the player opens them (see §
Desktop — Party/Trash flank the Queue above). Measuring a
`display:none` subtree's `getBoundingClientRect()` returns an
all-zero rect, so the card was actually animating a shrink-to-the-
top-left-corner rather than a visible trip toward Party/Trash — on
both Mobile and Desktop, since both hide the popup by default.

Added `flyToTarget()` alongside `flip()` in `js/presentation/flip.js`:
it still performs the real reparent into `#partyCards`/`#trashCards`
synchronously (gameplay/DOM state is correct the instant the flight
starts, same as before — no gameplay logic changed, no new mutation
path), but instead of chasing the hidden container's rect it measures
the always-visible `#queueDoorIcon`/`#queueTrashIcon` flanking the
Queue with a fresh `getBoundingClientRect()` call every time (dynamic,
never hardcoded screen coordinates) and flies the card's real DOM node
there with a pure `transform: translate(...) scale(...)` + opacity
transition down to ~5% scale, fading out as it lands — cheap enough
(no width/height/left/top interpolation) to run several times back-to-
back without jank when a full Queue resolves two cards into Party and
one into Trash in the same turn. `onEnteredParty`/`onRejected`/
`onRemoved` now call `flyToTarget()` with the matching icon instead of
`flip()` with the hidden container. Reduced-motion and "element
already gone" fallbacks are unchanged (same defensive shape as
`flip()` — never stalls a turn on a presentation failure).

The old post-landing beats (`card-party-celebrate`, `card-in-trash`)
played on the card element itself, which — same underlying issue — was
already invisible once the card sat inside the hidden popup. They're
replaced with a new `.queue-icon-receive` bump (`css/style.css`) played
on the icon itself right as the flight lands, so there's now a real,
visible "Party/Trash received it" beat instead of a wasted invisible
one. Added to the existing `prefers-reduced-motion` suppression list
alongside the other flourish-only keyframes.

Sequencing, badges, and everything else are unchanged: the Director
already plays each semantic event (`CARD_ENTERED_PARTY`/
`CARD_REJECTED`/`CARD_REMOVED`/`CARD_EATEN`) strictly one at a time
(`director.run()`'s `for...of` loop), so multiple cards resolving out
of the Queue in one turn already animated in controlled sequence, never
overlapping — that didn't need to change, only where each flight's
target came from. `refreshPartyBadge()`/`refreshTrashBadge()` still
read the real DOM child count of `#partyCards`/`#trashCards` right
after each flight's reparent, so the badges stay correct throughout.
Ability Preview and Drag & Drop are untouched — this only affects the
resolution flight into Party/Trash. Applies identically on Mobile and
Desktop, since both share the exact same `#queueDoorIcon`/
`#queueTrashIcon` elements and only differ in their CSS position.

**Refinement — Party/Trash popup's Pause-matching shape extended to Mobile (1.37.2):**
1.37.1 gave `#partyArea`/`#trashArea` the Pause popup's shape (border/
radius/background/blur/shadow) and size (width/height) on Desktop
only. This follow-up extends just the *shape* — not the size — to
Mobile too: the ≤600px-width tier and the touch+portrait tier each
gain a dedicated `#partyArea, #trashArea { border; background;
border-radius; backdrop-filter; }` rule matching Pause's values,
layered right after their own existing (untouched) edge-anchored
position/size rule. Mobile keeps its own tuned position and
dimensions — only Desktop's popup also matches Pause's width/height
(from 1.37.1) — and `#mobileLeaderboard`, which shares that position
rule with Party/Trash on the touch+portrait tier, was deliberately
left out of the new shape rule; it wasn't asked to match Pause.
`tests/desktopPartyTrash.test.mjs`'s Mobile-tiers test was rewritten
to assert this split explicitly (position/size still tier-specific,
shape now shared with Pause, Leaderboard excluded).

**Refinement — Desktop Party/Trash popup shaped/sized to match Pause, Trash icon given more right-edge spacing (1.37.1):**
Three follow-up tweaks to the 1.37.0 change below, all presentational:
`#partyArea`/`#trashArea` on Desktop now use the exact same shape as
the Pause popup (`#pauseModal`'s `.modal-content.small-popup`) instead
of the panel look they shared with `#chatPanel` — same width basis
(`min(350px, 92vw)`), border, `var(--radius-md)` radius,
`rgba(10,31,15,0.82)` background, `blur(18px)`, and box-shadow/padding.
The popup's height is now fixed (`min(600px, 80vh)`, the old
content-driven `max-height` removed) and larger than before, rather
than shrinking to fit however many cards are currently inside. The
Trash icon flanking the Queue also got its own `margin-right` so it no
longer sits flush against the row's right edge (Party's left-side
spacing is unchanged). All three are scoped to the
`@media (min-width: 601px) and (pointer: fine)` block only — Mobile
Portrait's own popup sizing/positioning rules already restate their
own background/radius/shadow independently, so none of this reaches
them. `tests/desktopPartyTrash.test.mjs` gained three new cases
covering this.

**Feature — Desktop Party/Trash: permanent sidebars replaced by buttons flanking the Queue, plus live notification-count badges (1.37.0):**
Desktop no longer shows `#partyArea`/`#trashArea` as the two big
always-visible sidebar panels either side of the Queue —
`#gameLayout`'s grid drops from three columns
(`clamp(180px, 22vw, 280px) 1fr clamp(180px, 22vw, 280px)`) to a
single `1fr` column, and `#partyArea`/`#trashArea` now default to
`display: none` everywhere (Desktop included) as a centered,
fixed-position popup, toggled by the exact same `.mobile-open` class
Mobile Portrait already used — no second popup implementation. Party
and Trash are reached the same way Mobile already reached them too:
the door/trash icons that flank the Queue (`#queueDoorIcon`/
`#queueTrashIcon`, built once in `renderQueue()` — `js/ui/game-ui.js`
— and wired in `js/ui/mobile-ui.js`'s `initMobileTabs()`, which was
already unconditional, never gated to mobile). On Desktop these are
now unwrapped from their Mobile Portrait row (`#queuePartyTrashRow {
display: contents }`) and placed via `order` — Party before the
Queue, Trash after it — so they flank both sides of the Queue itself
as small, compact icon+label buttons instead of eating into its
space, rather than stacking above it the way Mobile Portrait does.
No gameplay logic changed anywhere in this — purely presentation and
access point, same as the 1.36.12 Log change below. Each button also
now carries a live notification badge (`#partyIconBadge`/
`#trashIconBadge`) showing how many cards have entered that section
so far, read from the real DOM contents of `#partyCards`/
`#trashCards` (never hardcoded): `renderParty()`/`renderTrash()`
refresh it on every full render, and the Director's own mid-turn
card-move handlers (`onEnteredParty`/`onRejected`/`onRemoved`, same
file) refresh it again right after their own append, so the count
stays live during an animated turn too. See § Desktop — Party/Trash
flank the Queue for the full breakdown (popup positioning, the
restored close button, badge details) and `tests/desktopPartyTrash.
test.mjs` for the regression coverage. Mobile Portrait is untouched —
same elements, same row-above-the-Queue arrangement, same popups.

**Refactor — Desktop Chat/Log layout: Log moved from a permanent sidebar panel into a Header popup (1.36.12):**
On Desktop, `#leftSidebar` used to give Log its own permanent panel
(`#gameLog`/`#logEntries`) squeezed between Match Standings and Chat,
leaving Chat a fixed, cramped `height: 140px`. Log now opens from a
new `#logBtn` button in the Header's `#topRight`, right next to
Pause — same `.top-btn` markup, styling, and tooltip pattern
(`data-title-key`) as Pause/Help/Tutorial, so it reflows and scales
identically at every breakpoint. Clicking it opens `#logModal`, the
same popup Mobile Portrait's `#railLogBtn` already used, via the
project's shared `openModal()`/`closeModal()` (`js/ui/modal-ui.js`) —
so Desktop gets the exact same centered, backdrop, focus-trap, and
Escape-to-close behavior every other popup (Settings, Help, etc.)
already has, with no bespoke popup built for it. `#chatPanel` now
takes the freed-up vertical space (`flex: 1` instead of a fixed
140px), with its "Coming Soon" placeholder centered in the larger
area. No Log state or gameplay logging logic changed — `gameState.logs`
and everything that appends to it are untouched; `js/ui/log-ui.js`'s
`renderLog()` still builds identical markup and still writes it into
`#mobileLogContent` (shared by both entry points), it just no longer
also mirrors it into the now-removed `#logEntries` element. The
Walkthrough tutorial's Desktop "Leaderboard & Log" step (step 6,
`js/ui/walkthrough.js`) had its fallback target updated from the
removed `#logEntries` to `#logBtn` for the same reason. Mobile
Portrait is untouched — `#leftSidebar` (including the old `#gameLog`
markup) was already `display: none` there, and `#railLogBtn` opens
the identical `#logModal` it always did.

**Fix — Other Players stacked vertically instead of one row on Desktop (1.36.11):**
`#otherPlayers` (the compact opponent summary row above Party/Trash and
the Queue) had no `display` set outside its two Mobile-only overrides
(plain ≤600px, and the touch+portrait gameplay layer), so on Desktop it
fell back to `display: block` — `#topPlayer`/`#leftPlayer`/`#rightPlayer`
(three plain divs, one per opponent) simply stacked one above another
instead of appearing side by side. Added a new
`@media (min-width: 601px) and (pointer: fine)` rule — scoped to the
same fine/coarse-pointer split the Orientation Gate already uses
(`js/ui/orientation-ui.js`) to define "real Desktop", so it can never
interact with the touch+portrait Mobile layer's own wrapping-chips
treatment — making `#otherPlayers` a `flex-direction: row` with the
three columns sharing width evenly (`flex: 1 1 0`). Each opponent's
avatar, rank badge, name, and card count are all preserved; if a
column gets tight the **name** truncates first via ellipsis (same
priority already used for the human player's own deck name), while the
avatar and the card-count badge keep their own (slightly smaller,
since three now share the room one previously had alone) fixed sizes.
Verified the row fits without overflow at 1024px and every common
desktop/laptop width above it (1280, 1366, 1440, 1600, 1920, 2560).
Mobile (≤600px stacked, and the touch+portrait wrapping-chip layout)
is untouched — the new rule is gated on `(pointer: fine)`, which no
touch device ever matches.

**Fix — Queue Slot too small vs. Player Hand card on Mobile (1.36.10):**
On real touch+portrait phones (`@media (pointer: coarse) and
(orientation: portrait)` — the actual Mobile gameplay layer, since
Mobile landscape is gated behind the "please rotate" screen; see
`js/ui/orientation-ui.js`), the Queue slot sizing rule
(`#queue .card, .queue-slot`) was correctly matched to the Player
Hand's card size, but the *Hand* side of that pairing
(`#playerHand .card-back, .card-back`) targeted a class
(`.card-back`) that nothing in the current DOM actually carries —
`createCard()` (`js/ui/game-ui.js`) puts a plain `.card` class on
every real Hand/Queue/Party/Trash card. With no matching selector,
real Hand cards silently fell through to the larger desktop-tier
`#playerHand .card` rule while the Queue slot rule *did* apply,
leaving the Queue visibly smaller than the Hand on phones. Fixed by
targeting `#playerHand .card` (keeping `.card-back` alongside for any
future face-down element) at both the base Mobile Portrait tier and
its ≤380px narrow-phone tier, so Queue and Hand share the exact same
`clamp()` width/height (and therefore aspect ratio) at every mobile
size — same fix pattern the ≤600px and ≤380px non-portrait tiers
already had correct. Desktop and Tablet sizing are unchanged; the
Queue's existing wrap/scroll behavior and drag-and-drop, Ability
Preview overlay, and drag-ghost sizing were untouched.

**Fix — Player's own rank badge missing next to their in-game name (1.36.9):**
Opponents' compact name tags (`renderOtherPlayers()`, `js/ui/game-ui.js`)
already show a live rank/medal badge — the same standings computation
used by the Match Standings/Leaderboard popup
(`getPlayerRankIndexes()`/`getRankIcon()`,
`js/game/scoreManager.js`) — but the human player's own name tag next
to their hand/deck (`renderPlayerDeckInfo()`) never got the same
treatment; it only ever rendered the avatar and name.

Added a `#playerDeckRankBadge` span to `game.html`'s `#playerDeckInfo`
and wired `renderPlayerDeckInfo()` to populate it through the exact
same `getPlayerRankIndexes()`/`getRankIcon()` call opponents already
use, fed the same live `gameState` already passed into every render.
No new or parallel state: the badge is recomputed on every
`renderGame()`/`renderNonBoard()` pass — the same two render paths
that already refresh the opponents' badges and the player's own name
after every turn — so it always matches current standings and
disappears cleanly when there's no rank to show, never a
hardcoded/stuck value. Reuses the existing `.player-rank-badge` style
verbatim (same 14px medal icon, inline right before the name), so it
inherits the same Mobile/Desktop responsiveness and the name's
existing long-name truncation without any new CSS.

**Fix — Player avatars no longer shown inside a circular frame (1.36.8):**
Three of the game's avatar render surfaces still cropped the player's
avatar illustration into a circle (`border-radius: 50%` +
`overflow: hidden` + `object-fit: cover`): the human player's own
name+avatar tag above their hand in-game
(`.player-deck-avatar-wrap`/`.player-deck-avatar-img`), the
avatar-picker popover's choice buttons (`.avatar-choice`/
`.avatar-choice img`, used on Choose Bot Difficulty/Play vs Bot/Game
Modes), and Home's compact profile chip (`.home-profile-chip-avatar`).
Three siblings had already been fixed to show the full, uncropped
illustration instead — `.player-avatar-display` (Choose Bot
Difficulty's read-only avatar), `.avatar-trigger-btn` (the same
picker's trigger button), and `.profile-avatar-choice` (the Profile
modal's avatar grid, whose own CSS comment already says it "matches
`.player-avatar-display`'s untouched, uncropped look") — this finishes
that same fix everywhere else it hadn't landed yet.

All three now use `object-fit: contain` instead of `cover`, so the
avatar's full illustration shows with its real aspect ratio, no
cropping or distortion, and `border-radius: 0`, so no circular mask
remains. `.player-deck-avatar-wrap` keeps its colored player-identity
border — a separate, meaningful piece of UI (which player this is),
not the circular framing itself — just reshaped from a circle to a
small rounded rectangle (6px corners); `.avatar-choice` keeps its
border/active-state ring the same way. Bot avatars
(`.other-avatar`, an icon glyph, not an image) and the About Developer
panel's photo (`.about-avatar` — the app's creator, not a player)
were already circle-free and untouched. Fixed once, in the single
shared `css/style.css` (no per-page CSS or markup changes, since
there's no separate Avatar component to change — every render site
already reads through this one stylesheet), so every avatar surface
in the game is now consistent on both Mobile and Desktop.

**Cleanup — "Step-by-step Guidance" toggle removed from Settings (1.36.7):**
Settings had two independent ways to opt into the contextual per-card
guidance popups (`js/ui/cardGuidance-ui.js`): a "Step-by-step Guidance"
toggle in every Settings surface (Home's Settings page, its popup on
`index.html`, and `game.html`'s in-game Pause → Settings modal), and a
"Show step-by-step help?" prompt asked once before every new game
starts (`guidancePromptModal` on `game-modes.html`/
`bot-difficulty.html`). Both read and wrote the exact same
`wgl_stepGuidance` localStorage flag via
`isStepGuidanceEnabled()`/`setStepGuidanceEnabled()`, so they always
agreed with each other.

Only the Settings toggle is removed here — the pre-game prompt is a
similar-looking but genuinely independent surface for the same
underlying setting, and per this cleanup's own scope stays exactly as
it was. Removed: the `settings-row`/label/`#stepGuidanceToggle`
checkbox markup from all three Settings surfaces, the
`settingsStepGuidance` i18n key (en/fa/ar/tr), the
`initStepGuidanceToggle()` wiring function and its now-dead
`#stepGuidanceToggle:focus-visible` CSS rule, and its 4 call
sites/imports (`js/home-main.js`, `js/ui/ui.js`, `js/game-main.js`,
`js/settings-main.js`). Left alone, because they're the independent
prompt flow or the shared setting itself, not the Settings option:
`guidancePromptModal`/`guidanceRestartModal` and their i18n strings,
`isStepGuidanceEnabled`/`setStepGuidanceEnabled`/
`isGuidancePromptHidden`/`setGuidancePromptHidden` (still exported
from `js/ui/cardGuidance-ui.js` and used by
`js/game-modes-main.js`/`js/bot-difficulty-main.js`/
`js/ui/playVsBot-ui.js`), and the contextual guidance popups
themselves (`shouldShowGuidance`/`buildGuidancePayload`/
`showCardGuidance`, wired into `js/game/turnManager.js`).

Since the underlying `wgl_stepGuidance`/`wgl_hideGuidancePrompt`
localStorage keys and their reader/writer functions are all still
live (used by the surviving prompt flow), there's no migration
concern at all: an existing player's saved preference keeps applying
exactly as before. The only real-world change is that a player who'd
previously dismissed the pre-game prompt with "don't show again" now
has no remaining UI to change that preference — Settings no longer
offers it, by design, per this cleanup's scope.

**Fix — Cards/Animal Ability page safe-area-aware on Mobile (1.36.6):**
The Cards page (`cards.html` — Home's Card Guide destination, a
top-level `.screen-overlay` page, see § Navigation Architecture) had
only a flat `padding: 20px` on `.screen-content` at `≤600px`, with no
awareness of a device's notch/Dynamic Island or home indicator. On
devices with either, the top of the page (back link/title) could sit
flush against the notch, and the bottom of the scrollable Animal
Ability grid (`#animalGrid`, inside `.screen-content`, which is
already the scroll container via its base rule's `overflow-y: auto`)
could end flush against — or behind — the home indicator, with the
last row never fully clear of it.

Fixed at the shared container instead of per-page, the same approach
1.36.2 used for `.modal`: inside the existing
`@media (max-width: 600px)` rule, `.screen-content`'s padding is now
`max(20px, env(safe-area-inset-top))` on top and
`calc(20px + env(safe-area-inset-bottom, 0px))` on the bottom, instead
of a flat `20px` on every side. Because `.screen-content` is the
scroll container itself, the extra bottom padding is real scrollable
space, not just a static gap — the grid's last row scrolls fully past
the home indicator instead of stopping short of it. `env()` resolves
to `0` on devices without a notch/indicator, so plain phones keep the
exact same `20px` they always had, and Desktop (`>600px`, a separate
rule) is untouched entirely. Left/right stay a flat `20px` — the app
is portrait-only on touch (see the Orientation Gate), where a
notch/indicator only ever intrudes from the top or bottom, never the
sides. Every other `.screen-overlay` page sharing `.screen-content`
(Home, Profile, Settings, Game Modes, Coming Soon) picks up the same
fix for free, with no markup or per-page CSS changes needed.

**Cleanup — Power stat removed from Animal Ability Cards (1.36.5):**
Continuing the presentation-only change from 1.30.12 (which removed the
power digit from in-play cards but deliberately kept it on the Card
Guide and tutorial ability slide "for reference"), the Power stat is
now gone from every remaining Animal Ability Card surface too: the
Card Guide grid tiles and detail popup (`js/game/help.js`,
`.help-card-power`/`.power-badge`), the in-game "here's what just
happened" ability guidance chip (`js/ui/cardGuidance-ui.js`,
`.guide-chip-power`), and the tutorial's ability-examples slide
(`js/ui/tutorial-ui.js`, `.tut-ability-power`) no longer render a
numeric Power value or badge. The now-dead `.help-card-power`/
`.power-badge`/`.guide-chip-power`/`.tut-ability-power` CSS rules were
removed, `.power-badge` was dropped from the LTR-digit-direction
selector list, and the unused `"power"` fields in
`data/tutorial.json`'s diagram data (never read by any diagram
renderer) were deleted along with the stale "A few power examples"
label (now "A few ability examples"). The Card Guide modal's title
changed from "Animal Powers" to "Animal Abilities" in en/ar/tr (fa
already used this wording). None of this touches the load-bearing
`power` field itself — it's still the gameplay stat behind ability
dispatch, queue sorting, scoring, and AI evaluation
(`data/cardInfo.json`, `js/abilities/abilities.js`,
`js/services/dataLoader.js`, `js/game/scoreManager.js`,
`js/ai/ai.js`), nor the separate end-of-game/leaderboard "Power" score
label (`endgame-ui.js`/`leaderboard-ui.js`), which is a distinct
scoring feature, not an Animal Ability Card. No gameplay behavior
changed on either Desktop or Mobile.

**Bugfix — Mobile popup positioning: centered with edge/safe-area margin, not a bottom sheet (1.36.2):**
Every popup (Settings, Profile, Card Guide, About, Lucky Wheel,
Feedback, Tutorial, Log, card detail, Kangaroo, Help, Card Guidance,
Pause — all sharing the `.modal`/`.modal-content` shell, see §
Responsive Design / Panel Architecture) previously became a full-width
"bottom sheet" on Mobile Portrait: anchored to the bottom edge,
touching the left/right edges, only rounded on top. Per the Mobile
Popup Positioning brief, popups must instead be centered both
horizontally and vertically with a guaranteed gap from every edge,
clear the device's notch/home-indicator safe area, and adapt to any
portrait screen size or aspect ratio.

Fixed at the shared container instead of per-popup: `.modal` (the
fixed, `inset:0` backdrop, already `justify-content:center;
align-items:center` from its base rule) now gets `padding:
max(16px, env(safe-area-inset-*))` on all four sides — folding the
edge gap and the safe-area clearance into one calculation, with no
hardcoded coordinates. `.modal-content` sizes itself to
`width:100%; max-width:480px; max-height:100%` — 100% of `.modal`'s
own already-padded content box, not the raw viewport — so it can
never grow past the guaranteed gap; the old slide-up-from-bottom
animation and its bottom-sheet drag-handle affordance are replaced
with a centered fade/scale-in (`prefers-reduced-motion` still
respected).

The same `.modal-content` override lived twice — once for the plain
`≤600px` layer, once for real touch+portrait devices via
`@media (pointer: coarse) and (orientation: portrait)`, which is the
one that actually wins on a real phone — both were updated in lockstep
so neither silently reintroduces edge-to-edge sizing (see § Mobile
portrait). `#logModal`'s own fixed `70vh` height and `.tut-panel`'s
(Tutorial) own unconditional width/height, both of which measured
against the raw viewport instead of `.modal`'s padded box, are now
scoped the same way. The separate Leaderboard/Party/Trash overlay
(`#mobileLeaderboard`/`#partyArea`/`#trashArea`) already centered
itself with edge margin via auto-margins and was left unchanged.
Desktop/landscape popup sizing (`min(700px, 92vw)`, centered) is
untouched — this only affects the Mobile Portrait override layer.

**Style — Queue slots matched to Player Hand card size on mobile (1.36.1):**
On the ≤600px Mobile Portrait layout, `.queue-slot`/`#queue .card` had
its own, separately-tuned size that drifted from `#playerHand .card`
(and `.card-back`) at several breakpoints — most noticeably the main
≤600px tier and the ≤380px-wide touch-portrait tier, where Queue cards
rendered visibly smaller than Hand cards. A third, 320px-class tier
(`@media (pointer: coarse) and (orientation: portrait) and
(max-width: 340px)`) shrank the Queue further still with no matching
Hand override at all. All of these now use the exact same
`clamp()` width/height as the Player Hand card at their tier — the
340px tier's Queue-only override was removed entirely so it falls
back to the shared ≤380px value both elements already use, keeping
Queue and Hand one consistent card size across every mobile size
tested. CSS-only change (`css/style.css`); no JS or markup touched.

**Style — Party/Trash grouped into one row above the Queue (1.33.1):**
Per the gameplay screen's exact layout spec, Party and Trash are now
a single row directly above the Queue in Mobile Portrait, rather than
one above and one below it. `js/ui/game-ui.js`'s `renderQueue()` now
wraps both in `#queuePartyTrashRow` (a new element, `display: flex`
row) placed before `#queueInner`, so `#queueWithIcons` has exactly two
stacked children — the button row, then the Queue — instead of three.
Same ids, same click/keyboard wiring and popups as 1.32.0; only the
grouping and CSS (`.queue-icon` is now `flex: 1 1 0` inside the row
instead of `width: 100%` stacked alone) changed. See § Mobile portrait
— game board layout layer.

**Feature — Real asset-preload loading screen (1.33.0):**
The Startup screen's old spinner-only "Loading..." state (no
measurable progress, per its own code comment) is replaced with a
real one: `js/services/assetPreloader.js` fetches and `decode()`s
every image the game will ever show — icons, card art, branding,
avatars, assembled from the project's existing manifests, not a
hand-maintained list — while the Startup screen shows the splash
image (`config.json` → `branding.splash`, new key) with a progress
bar, live percentage, and rotating gameplay hints underneath, all
driven by real `(loaded, total)` counts from the preloader. Once
preloading finishes during Startup, nothing in the Queue, Hand, or
Opponent cards has to fetch or decode an image for the first time
mid-match. See § Startup / Loading Screen.

**Bugfix — Leaderboard/Party/Trash popups stuck open, legacy Party/Trash tab bar stuck visible (1.32.1):**
Two pre-existing, unrelated legacy `@media (max-width: 600px)` rules
were beating the popup system's own show/hide rules on every narrow
screen, regardless of the `.mobile-open` toggle:
`#mobileLeaderboard { display: block !important }` (two duplicate
copies of an old "inline leaderboard" design, since superseded by the
Leaderboard/Party/Trash popup system — see § Mobile portrait) forced
the Match Standings panel permanently open and unclosable; a plain
(non-`!important`, but still cascade-winning by source order)
`#mobileTabs { display: flex }` similarly force-showed the *old*
`#partyTab`/`#trashTab` tab bar, which the door/trash icons flanking
the Queue superseded. Both are now left unset for `display` in those
old blocks, so the base `display: none` / `.mobile-open` popup rules
(added for 1.32.0's Mobile Portrait redesign, but exposed to this
older, larger latent bug for the first time by real on-device testing
of that work) are the only thing controlling visibility, as intended.

**Feature — Mobile Portrait gameplay screen redesign (1.32.0):**
Party and Trash now render as full-width, labeled buttons stacked
above and below the Queue in Mobile Portrait (`#queueWithIcons`
switches from flanking the Queue left/right to a column — same
elements, same click/keyboard wiring and popups, see § Mobile
portrait — game board layout layer). Each opponent seat also gains a
rank medal next to their name (mirroring their current Match
Standings position) and an explicit hand-card count next to the
existing deck count. The rank math powering both the Match Standings
panel and these new badges was previously duplicated between
`leaderboard-ui.js` and `endgame-ui.js`; it's now consolidated in
`js/game/scoreManager.js` (previously an empty, unused stub) so the
two can never disagree. `endgame-ui.js`'s own final-results medal
display is unchanged.

**Feature — Ability Preview System + drag-to-play (1.31.0):** Hand
cards are no longer played by tapping/clicking — the player drags a
card onto the Queue instead, and a live Preview (full-card overlays
showing exactly what the card would do, computed from the same rules
real execution uses) appears on the affected Queue cards while
dragging. Bots preview their chosen card the same way, through the
same resolver, before playing it. See § Ability Preview System under
Main Systems, and § Core Gameplay → 3. Play a Card. The existing
hold-to-open-Card-Information gesture on hand cards is unchanged.

**Fix — Profile → Achievements had a second, nested scroll container on
Mobile, especially on Android (1.30.13):** `.ach-grid`
(`#profileAchievementsList`, inside Profile's `.modal-body`) kept its
own `max-height` + `overflow-y: auto` — a second independent scroll
container nested inside `.modal-body`'s, the same bug `#animalGrid`
(Card Guide) had already been fixed for in 1.30.6. A swipe starting on
an Achievement card scrolled that small fixed-height box in place
instead of the popup, and achievements past its `max-height` could
become unreachable. `.ach-grid`'s own scrolling/`max-height` (base
rule and both mobile-landscape tiers) is removed so it sizes to its
full content height and contributes to `.modal-body`'s natural
height, exactly like `#animalGrid` already does — `.modal-body` is
now the one and only scroll container for both the Card Guide and
Profile popups. No markup, gameplay, or Desktop behavior changed.

**Style — Animal Cards no longer show the power number on their face
(1.30.12):** The in-play card footer (`createCard()` in
`js/ui/game-ui.js`, used for hand/queue/party/trash alike) previously
showed the animal's power as a bare digit next to its name
(`.card-power`). That digit is now removed from the card face and
`.card-footer` is centered on the name alone; the matching "Your
hand" tutorial mock-up (`renderHandDiagram()` in
`js/ui/tutorial-ui.js`, `.tut-card-power`) was updated to match so it
keeps mirroring the real card. This is presentation-only — `power`
is still the load-bearing gameplay stat behind sorting, strength
comparisons, ability targeting, scoring, and AI evaluation (see
`data/cardInfo.json`, `js/abilities/abilities.js`,
`js/services/dataLoader.js`), and the technical `id` used for animal
identity (`CARD_IDS.*`) is untouched, so none of that logic changed.
The Card Guide grid and the Card Info detail popup (`js/game/help.js`,
`.help-card-power`/`.power-badge`) and the ability-examples tutorial
slide (`.tut-ability-power`) still show the power value on purpose —
it's genuinely useful reference information for learning the game's
strength hierarchy, not a leftover label, so it wasn't "obsolete" and
stayed.

**Fix — Queue door/trash icons showed on Desktop too (1.30.11):** The
Party-door/Trash-exit icons flanking the Queue (`#queueDoorIcon`/
`#queueTrashIcon`, see § Mobile portrait — game board layout layer and
`renderQueue()` in
`js/ui/game-ui.js`) are built unconditionally in JS and had no
viewport gating in CSS at all, so they rendered on Desktop next to a
Queue that already has its own always-visible Party/Trash sidebars —
a redundant, unintended second way to open the same two popups.
`.queue-icon` is now `display: none` by default (Desktop and every
other viewport) and only re-enabled inside the existing
`@media (pointer: coarse) and (orientation: landscape)` Mobile
Landscape layer, rather than `visibility: hidden` (which would have
still reserved their space) or deleting the elements. `#queueInner`
(`flex: 1`) already does the Queue's own centering inside
`#queueWithIcons`, so with the icons hidden the row just naturally
reflows around the Queue alone on Desktop — no leftover gap, no
Desktop-specific CSS needed beyond hiding the icons themselves. The
underlying elements, their click/keyboard wiring
(`js/ui/mobile-ui.js`), and the `#partyArea`/`#trashArea` popups are
all untouched, so Mobile Landscape's interaction is unaffected.
Desktop's own walkthrough targeting was already unaffected before
this fix too — step 5 already targets `#partyCards`/`#trashCards`
directly on Desktop (`isMobile()` decides which), never these icons.

**Fix — Pause and the Step-by-Step walkthrough didn't actually freeze
gameplay (1.30.10):** Pause (js/ui/pause-ui.js) and the in-game
Step-by-Step walkthrough (js/ui/walkthrough.js) both only ever stopped
the visible per-turn countdown (js/game/turnTimer.js) — nothing else in
the pipeline that plays a card (queue entry → ability resolution →
Queue-full → Party/Trash transition → draw → turn advance,
js/game/turnManager.js's playCard()) ever checked either state, so an
already-in-flight card could keep resolving, the Queue could still
fill Party/Trash, and a bot's turn could still begin — all invisibly,
underneath the Pause panel or the walkthrough's box. turnTimer.js's
freeze flag is now a `Set` of independent reasons ("pause",
"tutorial") instead of one boolean — `isPaused()`/`getGameRuntimeState()`
(RUNNING/PAUSED/STEP_BY_STEP) reflect whichever are currently held, and
`waitUntilResumed()` resolves once every reason clears. `playCard()`
now awaits that at each "point of no return" (before resolving a
card's ability, before a full Queue resolves into Party/Trash, before
drawing the next card, before advancing the turn), and the walkthrough
calls the exact same `pauseTurnTimer("tutorial")`/`resumeTurnTimer(
"tutorial")` the Pause panel already used (reason "pause") instead of
a second, competing mechanism — including js/game-main.js's portrait-
orientation gate, which already reused this same architecture before
this fix. A pending action (e.g. a Queue that just hit 5 right as
Pause was clicked) now waits and completes exactly once after Resume,
rather than executing silently or being lost. No card abilities, turn
order, AI difficulty, scoring, or Queue/Party/Trash rules changed —
synchronization only.

**Fix — Party/Trash Area popup: lopsided bottom padding on Mobile
Landscape (1.30.9):** The Mobile Landscape overlay for `#partyArea`/
`#trashArea` (and `#mobileLeaderboard`, which shares the same rule)
is a `position: fixed` box with both `top: 4dvh` and `bottom: 4dvh`
set. With no `margin`/`max-height` override, a box like that either
stretches to fill the whole band (`height: auto`) or — once the
inherited desktop `max-height: calc(100vh - 120px)` clamped it
shorter on most phones — settles anchored to `top` alone. Either way,
Party/Trash's actual content (often just a couple of cards) sat flush
against a small top gap while all the leftover space collected below
it as one large gap. Fix: an explicit `max-height: calc(100dvh - 8dvh)`
(replacing the inherited desktop value, which was tuned for a
different, always-visible sidebar layout) plus `margin: auto 0`
(vertical auto-margins only — the fixed `left`/`right` band keeps the
width unchanged) so the shrink-to-fit box is centered within the band
instead of stretched to fill it, top ≈ bottom either way. Same
treatment applied to the older, non-landscape `max-width: 600px`
version of this popup for consistency (in practice only reachable in
a narrow non-touch desktop window, since touch portrait is gated
behind a rotate overlay). `#partyCards`/`#trashCards` also picked up
`flex: 1 1 auto; min-height: 0` alongside their existing safety-net
`overflow-y: auto`, so that scrollbar can actually engage instead of
silently doing nothing while the parent's `overflow: hidden` clips
the excess — not the primary fix, just insurance against a future
party/trash pile too tall for the band (none exist today: a full
12-card grid fits comfortably at every tested landscape size). No
Party/Trash gameplay, card movement, or animations were touched —
layout/CSS only.

**Style — Store/Tournament/Leaderboard Coming Soon: popup instead of
a page navigation (1.30.8):** Home's bottom-nav Store, Tournament, and
Leaderboard buttons no longer navigate to `coming-soon.html`; per
AGENTS.md rule 4 ("Menu pages default to popups") they now open a
shared `#comingSoonModal` popup instead — the same treatment Lucky
Wheel already had, generalized instead of duplicated. The popup
identifies the selected feature by name + icon (set per feature in
`js/ui/home-ui.js`'s `openComingSoon()`) and reuses the existing
`comingSoonText` copy. It's built from the same `menu-popup` +
`lucky-wheel-panel` classes/markup shape as every other standardized
Home popup, so it inherits the shared modal lifecycle (backdrop/
Escape/focus-trap), Mobile Portrait sizing, and small-window
bottom-sheet treatment for free — no new CSS was needed.
`coming-soon.html`/`js/coming-soon-main.js` are unchanged and still
work by direct URL; they're just no longer linked from Home. No
Store/Tournament/Leaderboard functionality was implemented — still
Coming Soon only.

**Style — Game Header: removed Log and About Developer buttons (1.30.7):**
`game.html`'s in-game top bar (`#topRight`) no longer has its own
`#logBtn`/`#aboutBtn` icon buttons — the header now shows only
Pause / Help / Tutorial. Neither feature was deleted: Game Log
(`#logModal`) is still reachable on Mobile Portrait via the
`#mobileSideRail`'s `#railLogBtn` (see § Mobile portrait — game board
layout layer), and About Developer (`#aboutModal`) is still reachable
from Home's Settings popup (`#settingsAboutBtn`, see § Navigation
Architecture). `#topRight` is a plain flex row with `gap`/
`justify-content: flex-end` and `.top-btn` sizes itself with `clamp()`
rather than a fixed per-button width, so removing two buttons
reflows the remaining three without leaving an empty gap or requiring
new CSS, on both desktop and Mobile Portrait. Known gap: unlike Home,
`game.html`'s own in-game Settings modal (`#settingsModal`) has no
`#settingsAboutBtn`-style link to About Developer, so mid-match there
is currently no in-game entry point to it (only from Home) — see
Known Issues.

**Fix — Card Guide Animal Ability grid: two separate scrollbars on
Mobile (1.30.6):** 1.30.5 fixed the grid collapsing to 0px tall, but
did so by keeping `#animalGrid`'s own `overflow-y: auto` (plus a
`min-height: min-content` patch) — leaving the popup with two nested,
independent scroll containers: the popup's own `.modal-body` and the
grid itself. Visually/behaviourally that reads as two different
scrollbars for what the user experiences as one popup. Fixed by
removing `#animalGrid`'s own scrolling entirely (`overflow: visible`,
its default) so the grid simply sizes to its full content height, and
the **only** scroll container is `.modal-body` — exactly matching
Desktop and the documented Header/Scrollable-Body/Fixed-Footer
architecture. This also happens to be what fixes the original 0-height
collapse: an item with `overflow: visible` gets a normal content-based
automatic minimum size in flexbox, so the min-height patch from 1.30.5
is no longer needed either. Scoped to `#animalGrid` only at the time —
`.ach-grid` (Profile → Achievements) had the identical bug and was
left unrelated UI, untouched; it was fixed the same way in 1.30.13
above.

**Fix — Card Guide Animal Ability grid empty on Mobile (1.30.5,
superseded by 1.30.6 above):** `#animalGrid` (Card Guide's Animal
Ability grid, shared by Home's `#helpModal` popup and `game.html`'s
in-game Help modal) is a flex item of a column flex container
(`.help-body` on `index.html`; `.modal-content.help-layout` directly
on `game.html`). The Mobile Landscape no-scroll layer (see §
Responsive Design above) previously gave it the same plain
`overflow-y: auto` as `.ach-grid`, intended as a harmless fallback
scroll container. It wasn't harmless there: a flex item with
`overflow` other than `visible` loses its content-based "automatic
minimum size" and gets an automatic min-height of `0` instead. On the
short mobile-landscape heights this layer targets (568×320 up to
932×430), the modal's combined content (intro text + divider + title +
grid) is taller than the space available, so the flex-shrink algorithm
was free to shrink `#animalGrid` all the way to `0px` tall — its cards
still rendered at full size but were entirely clipped by their own
zero-height, `overflow:auto` box, i.e. invisible. This never showed on
Desktop (the layer is scoped to `pointer: coarse` + `orientation:
landscape`).

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
