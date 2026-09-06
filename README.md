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
│   ├── game/
│   │   ├── deck.js
│   │   ├── gameOver.js
│   │   ├── gameState.js
│   │   ├── help.js         (Card Guide — shared by Home's #helpModal popup and game.html's in-game Help modal)
│   │   ├── queueManager.js
│   │   ├── scoreManager.js  (party-count/power ranking math — shared by leaderboard-ui.js's Match Standings and game-ui.js's opponent rank badges)
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
  icon+label language `#mobileSideRail`'s buttons already use) that
  flank the Queue in source order
  (`#queueWithIcons`/`.queue-icon-entry`/`.queue-icon-exit`, built in
  `renderQueue()` — `js/ui/game-ui.js`). In Mobile Portrait
  specifically, `#queueWithIcons` switches from a row (icons flanking
  the Queue left/right, still the Desktop/tablet arrangement) to a
  column, so Party renders as a full-width button above the Queue and
  Trash as one below it — no DOM reordering needed, since the door
  icon already comes before `#queueInner` and the trash icon after it
  in source order; only the flex-direction and each icon's own
  internal layout change for this viewport. Clicking either still
  reuses the exact same `#partyArea`/`#trashArea` popups and
  one-open-at-a-time toggle group in `js/ui/mobile-ui.js`'s
  `initMobileTabs()`. These buttons are Mobile-Portrait-only (see
  `.queue-icon`'s `display: none` base rule and its portrait-layer
  override): on Desktop, Party and Trash are already their own
  always-visible sidebar panels, so a second, Queue-adjacent way to
  reach the exact same popups was just clutter, not a real Desktop
  feature. Because those icons are created the first time the Queue
  renders, `initMobileTabs()` is called after the first `updateUI()`
  in `js/game-main.js` rather than before it. The old
  `#mobileTabs`/`#partyTab`/`#trashTab` markup is still present in
  `game.html` (it's also targeted by `js/ui/walkthrough.js`'s
  width-based `<=600px` mobile tier), but it plays no part in the
  Portrait rail and falls back to its base `display: none` there.

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

**Current version:** 1.32.1

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
