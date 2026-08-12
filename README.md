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
* 🏆 Leaderboard
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

## 🧠 Core Gameplay

### 1. Start the Game

The player enters a name and chooses the difficulty of each opponent.

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
* Leaderboard
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
├── index.html
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
│   ├── main.js
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
│   │   ├── help.js
│   │   ├── queueManager.js
│   │   ├── scoreManager.js
│   │   └── turnManager.js
│   │
│   ├── services/
│   │   ├── dataLoader.js
│   │   ├── logger.js
│   │   └── soundManager.js
│   │
│   └── ui/
│       ├── endgame-ui.js
│       ├── game-ui.js
│       ├── icon-ui.js
│       ├── kangaroo-ui.js
│       ├── leaderboard-ui.js
│       ├── log-ui.js
│       ├── mobile-ui.js
│       ├── modal-ui.js
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
```

The interface adapts game controls and panels for smaller screens while maintaining the core gameplay experience.

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

Potential future improvements include:

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

**Current version:** 1.10.1

The version number is defined in a single place: `data/config.json` → `app.version`. It is rendered on-screen in the Settings modal (`data-app-version` in `index.html`, populated at runtime by `js/ui/icon-ui.js`). Do not hardcode a version number anywhere else — update `data/config.json` and everything else stays in sync automatically.

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
