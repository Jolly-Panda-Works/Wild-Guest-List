# ARCHITECTURE_PLAN.md — Wild Guest List

Covers: target architecture, domain boundaries, data model, JSON/configuration architecture, and migration strategy.
Companion documents: `PROJECT_AUDIT.md` (current state), `ECONOMY_PLAN.md`, `UI_UX_PLAN.md`, `PRODUCT_ROADMAP.md`

---

## 1. Guiding Principles

1. **Keep the existing game engine.** `abilities/`, `game/`, `ai/`, and the card data model are well-factored and should be *reused*, not rewritten. They need an adapter layer, not a replacement.
2. **No microservices.** One backend service (a modular monolith) is more than sufficient at this stage. Split out a separate service only if a specific piece (e.g., payments) needs independent scaling, deployment cadence, or compliance isolation — not preemptively.
3. **Server owns everything with stakes.** Coins, purchases, entitlements, quest progress, match results, and leaderboard scores are computed and stored server-side. The client renders and requests; it never asserts truth.
4. **Everything content-shaped stays JSON-driven**, following the pattern the project already uses for cards/translations/tutorial content.
5. **Offline bot play keeps working the whole time.** Nothing in this plan requires taking the existing single-player experience offline during migration.

## 2. Target High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (browser / eventually app wrapper)                  │
│                                                               │
│  App Shell            Home · Profile · Store · Settings ·   │
│  (new)                Customization · Quests (nav only for   │
│                        Leaderboard/Tournament placeholders)  │
│        │                                                     │
│  Game Engine (existing, reused)                              │
│  gameState / turnManager / abilities / ai / queueManager     │
│        │                                                     │
│  Session/Match Adapter (new) ── wraps engine per-match        │
│        │                                                     │
│  API Client (new) ── fetch wrapper, auth token, retries      │
└───────────────────────────┬───────────────────────────────────┘
                             │ HTTPS/JSON (REST) — same-origin or CORS
┌───────────────────────────┴───────────────────────────────────┐
│  BACKEND (new — single modular service)                       │
│                                                                 │
│  Auth/Identity   Profile   Inventory/Cosmetics   Economy/Ledger│
│  Quotas (daily games)   Rewards   Quests   Payments            │
│  (Leaderboard & Tournament & Online-Match: boundaries reserved,│
│   not implemented yet)                                         │
│                                                                 │
│  Persistence: relational DB (Postgres-class)                   │
└─────────────────────────────────────────────────────────────────┘
```

Nothing here mandates a specific backend language/framework — pick whatever the team is comfortable operating (Node/Express, Python/FastAPI, etc.); the domain boundaries below apply regardless of stack.

## 3. Domain Boundaries

Each boundary below is a logical module (folder/package), not necessarily a separate deployable service.

| Boundary | Responsibility | Client today | Server (new) |
|---|---|---|---|
| **Game Engine** | Card rules, queue resolution, AI, turn sequencing | ✅ exists, reused as-is | Reused for future online mode; for offline bot play, stays client-only |
| **Auth/Identity** | Login/session, device or account binding | ❌ none | New — even a lightweight anonymous-device-ID scheme must be server-issued and unforgeable |
| **Profile** | Display name, avatar, level, stats, public/private split | ❌ none | New |
| **Inventory/Customization** | Ownership + equipped state of cosmetics | ❌ none | New |
| **Economy/Ledger** | Coin balance, all balance-changing transactions | ❌ none | New — server-authoritative, no exceptions |
| **Quota** | Daily free bot games | ❌ none (would be `localStorage`, untrustworthy) | New — server-tracked, atomic |
| **Rewards** | Reward calculation at match end | ❌ client computes winner only, no rewards | New — config-driven, server-calculated |
| **Quests** | Definitions, progress, claim state | ❌ none | New |
| **Payments** | Coin-pack purchases, Remove-Ads entitlement | ❌ none | New — provider-abstracted (see `ECONOMY_PLAN.md`) |
| **Leaderboard** | Aggregated rankings | ❌ none (today's "leaderboard" is just live match score) | Boundary reserved; not implemented (Phase 9) |
| **Tournament** | Brackets, entry, scheduling | ❌ none | Boundary reserved; not implemented (Phase 11) |
| **Online Match** | Real-time PvP session | ❌ none | Boundary reserved; not implemented (Phase 10) |
| **Ads** | Banner display, Remove Ads gating | ❌ none | Mostly client + one entitlement flag from server |

### Why these boundaries, and not fewer/more
Grouping by *who needs to trust the data* keeps this simple: anything that can be freely recomputed from public rules (game moves, AI choices) can stay client-side for offline play; anything that represents value (coins, entitlements, rewards, quest completion, uniqueness) must cross into server-owned boundaries. This avoids "over-engineering into microservices" while still drawing a hard line around money and identity, per the audit's Critical/High security findings.

## 4. What Gets Refactored, Extracted, Reused, Replaced, or Left Untouched

| Area | Action | Notes |
|---|---|---|
| `abilities/`, `game/deck.js`, `game/queueManager.js`, `ai/` | **Reused as-is** | No changes needed for offline mode. For a future online mode, these become the authoritative server-side engine too — same code, different host. |
| `game/gameState.js` (singleton) | **Refactored** | Becomes a factory (`createMatchState()`) owned by a new Match/Session module, so more than one match can exist (needed even just to let the Home screen "start a new game" without a full page reload, let alone future online play). |
| `abilities/helpers/chooser.js` (direct DOM call for Kangaroo choice) | **Refactored** | Replace direct `ui/kangaroo-ui.js` import with an injected `InputProvider` interface. Local play still shows the modal; this is what makes the engine reusable server-side later without pulling in DOM code. |
| `js/main.js` | **Refactored/Split** | Currently mixes app bootstrap and match start. Split into `AppShell` (nav, screens) + `MatchController` (existing splash→difficulty→start flow, reused, now invoked *from* Home's "Offline Game" button instead of being the app's only entry point). |
| `js/i18n.js`, `data/i18n.json`, `data/cardInfo.json`, `data/tutorial.json` | **Reused as-is** | Extend `i18n.json` with new keys for new screens; no structural change needed. |
| `js/services/dataLoader.js` pattern | **Reused/extended** | Same caching-fetch pattern used for new config files (coin packs, cosmetics catalog, reward tables, quest definitions — see §6). |
| `ui/*.js` (game board rendering) | **Left untouched** | The in-match board UI doesn't need to change for this phase. |
| `ui/leaderboard-ui.js` | **Renamed/reframed only** | Keep the component (it's a fine "match standings" widget) but rename/relabel to avoid collision with the new persistent Leaderboard feature (naming fix, not a rewrite). |
| `js/game/scoreManager.js` (dead file) | **Replaced** | Delete the empty stub; introduce a real `scoring.js` (client) and a server-side equivalent so party-power calculation isn't copy-pasted across `leaderboard-ui.js`/`endgame-ui.js`/`gameOver.js` (fixes the audit's duplication finding while adding server-side reward calc). |
| `services/logger.js` vs `ui/log-ui.js` duplication | **Refactored** | Consolidate the `textKey → string` template map into one module (`logger.js`), imported by both, removing drift risk before new log types (quest complete, reward granted) are added. |
| CSS (`css/style.css`) | **Refactored incrementally** | Not replaced. As each new screen (Home, Profile, Store, Customization) is built, its styles move into a new file (`css/home.css`, etc.) imported alongside the existing sheet, so the monolith stops growing without a risky big-bang split. |
| Player name input handling | **Refactored** | HTML-escape before render (fixes the audit's unescaped-input finding) as part of Profile work, since usernames become persistent and eventually public. |
| Everything else in `js/` | **Left untouched** | No reason to touch working, isolated modules (sound manager, tutorial, walkthrough, mobile UI) for this phase. |

**Explicitly not doing:** rewriting the game engine, adopting a frontend framework, or splitting the backend into multiple services. None of the audit findings justify that cost.

## 5. State Management (Target)

- **Client:** keep `gameState` as the in-memory shape for an active match (its structure doesn't need to change), but stop it being a module-level singleton — construct one per match via a factory, owned by a `MatchController`. Add a separate, small **`AppState`** (new) for cross-screen concerns: current player profile (cached from server), coin balance (cached, refreshed after transactions), settings (language, sound — now consistently persisted).
- **Server:** the source of truth for anything in the Economy/Inventory/Profile/Quest boundaries. Client-side caches of these are always "last known, may be stale — refresh on screen focus / after mutations," never authoritative.
- **Local settings module (new):** replace the three scattered `localStorage` keys (`wgl_lang`, `tutorialSeen`, `walkthroughSeen`) plus the never-persisted sound toggle with one `localSettings.js` module owning a single namespaced key (e.g. `wgl_settings_v1`) — small fix, but removes a real inconsistency called out in the audit.

## 6. JSON / Configuration Architecture

Extend the existing "content lives in JSON, not JS" pattern used by `cardInfo.json`/`i18n.json`/`tutorial.json`. All new catalogs below should be **server-served** (not static files) once the backend exists, but authored/shaped as JSON either way, and cached client-side the same way `dataLoader.js` already caches card data. Every schema below includes a `schemaVersion` field — missing from today's JSON files — so future field additions don't break older cached clients.

### 6.1 Cosmetic Item Catalog
```json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "card_pattern_gold_01",
      "type": "cardPattern",           // avatar | cardColor | cardPattern | gameTheme | ...
      "name": "Golden Weave",
      "description": "A shimmering gold card back pattern.",
      "price": { "amount": 500, "currency": "coins" },
      "assetRef": "assets/cosmetics/patterns/gold_01.png",
      "availability": "store",         // store | eventOnly | unlockOnly | discontinued
      "rarity": "epic",                // common | rare | epic | legendary
      "unlockRequirements": null,      // e.g. { "type": "questReward", "questId": "..." } or null
      "metadata": { "releaseSeason": "2026-08" }
    }
  ]
}
```

### 6.2 Coin Packs
```json
{
  "schemaVersion": 1,
  "packs": [
    {
      "id": "pack_small",
      "coins": 500,
      "bonusCoins": 0,
      "priceIRR": 250000,          // null if not offered to Iranian users
      "priceUSD": 4.99,            // null if not offered to international users
      "sku": "coins.small",
      "active": true
    }
  ]
}
```

### 6.3 Reward Table (see `ECONOMY_PLAN.md` §4 for full detail)
```json
{
  "schemaVersion": 1,
  "rewardTables": [
    {
      "gameMode": "offlineBot",
      "positions": [
        { "position": 1, "coinReward": 50, "scoreMultiplier": 1.5 },
        { "position": 2, "coinReward": 25, "scoreMultiplier": 1.2 },
        { "position": 3, "coinReward": 10, "scoreMultiplier": 1.0 },
        { "position": 4, "coinReward": 0,  "scoreMultiplier": 1.0 }
      ],
      "conditions": { "minPlayers": 4 }
    }
  ]
}
```
*(Values above are illustrative placeholders, not final numbers — per the brief, exact values are not invented.)*

### 6.4 Daily Quest Definitions (see `ECONOMY_PLAN.md` §6 for full detail)
```json
{
  "schemaVersion": 1,
  "quests": [
    {
      "id": "win_3_offline",
      "type": "daily",                 // daily | weekly | seasonal
      "active": true,
      "description": { "key": "questWin3Offline" },
      "target": { "metric": "gamesWon", "count": 3, "gameMode": "offlineBot" },
      "reward": { "coins": 30 },
      "startAt": null,
      "endAt": null,
      "gameModeRestriction": "offlineBot"
    }
  ]
}
```

### 6.5 Game Modes (new — currently implicit/hardcoded as "1 human + 3 bots")
```json
{
  "schemaVersion": 1,
  "modes": [
    { "id": "offlineBot", "playerCount": 4, "botsOnly": true, "active": true },
    { "id": "onlineRanked", "playerCount": 4, "botsOnly": false, "active": false }
  ]
}
```

All of the above are **recommendations for shape**, not an implementation instruction for this phase — no code should be written against them yet per the brief.

## 7. Data Model (Target)

Entity names are suggestions; adapt to whatever ORM/DB conventions the team already uses. "Client" = safe to cache/read client-side. "Server" = authoritative, write-controlled server-side.

| Entity | Key fields (illustrative) | Authoritative on | Persisted |
|---|---|---|---|
| **User** | id, authIdentifier, createdAt, status | Server | Yes |
| **PublicProfile** | userId, displayName, avatarItemId, level, publicStats{...} | Server | Yes (derived view of Profile) |
| **PlayerProfile** (private) | userId, displayName (source of truth), settings, email/authMeta | Server | Yes |
| **PlayerStats** | userId, gamesPlayed, wins, losses, byGameMode{...} | Server | Yes, server-incremented only |
| **PlayerInventory** | userId, ownedItemIds[] | Server | Yes |
| **EquippedCustomization** | userId, category → itemId map (avatar, cardColor, cardPattern, gameTheme) | Server | Yes — separate from ownership by design (see §7.1) |
| **CosmeticItem** | id, type, name, price, assetRef, rarity, unlockRequirements | Server (content) | Yes (catalog, admin-managed) |
| **CoinBalance** | userId, balance | Server | Yes — **never client-writable** |
| **CoinTransaction** | id, userId, amount (+/-), reason, refId, createdAt | Server | Yes — append-only ledger, never mutated/deleted |
| **Purchase** | id, userId, itemId or packId, coinCost or moneyCost, status | Server | Yes |
| **PaymentTransaction** | id, userId, provider, providerRef, amount, currency, status, idempotencyKey | Server | Yes |
| **AdFreeEntitlement** | userId, active, purchaseId, restoredOnDevices[] | Server | Yes |
| **DailyQuota** | userId, date, freeGamesUsed | Server | Yes — reset logic server-side, timezone-aware (UTC day boundary recommended; see `ECONOMY_PLAN.md` §5) |
| **Game / GameResult** | id, mode, players[], startedAt, endedAt, resultSummary | Server (once online/rewarded) | Yes, once rewards attach to results; offline-only bot games may remain client-ephemeral until a reward is claimed |
| **Reward** | id, gameResultId, userId, coins, scoreMultiplier, grantedAt | Server | Yes |
| **Quest / QuestProgress** | quest: id/type/target/reward/active; progress: userId, questId, progress, completedAt, claimedAt | Server | Yes |
| **Leaderboard** (future, boundary only) | scope, period, entries[] | Server | Derived/cached, not a primary write target |
| **Tournament** (future, boundary only) | id, entryFee, bracket, schedule, status | Server | Yes, once built |

### 7.1 Why ownership and equipped state are separate
Per the brief's explicit instruction: owning an item must never imply it's equipped. `PlayerInventory` (what you own) and `EquippedCustomization` (what's currently active, one item per category) are modeled as two independent tables/documents so that, e.g., unlocking a new avatar never silently changes what's displayed, and "reset to default" or "un-equip" is just clearing one field rather than mutating ownership.

### 7.2 Public vs. private profile split
- **Public** (safe to show other players): display name, avatar, level, total games, wins, win rate, per-mode headline stats you choose to expose.
- **Private** (never exposed to other players): auth identifiers, exact loss counts if you consider them sensitive to the player, device/session metadata, coin balance (recommend keeping balance private — a common pattern; expose only if the product explicitly wants "richest player" style features later), full transaction history.
- Implementation-wise: `PublicProfile` should be a server-computed *view* of `PlayerProfile` + `PlayerStats`, not a second source of truth that can drift — compute it on read or update it transactionally alongside the private record, don't hand-sync two independent tables.

## 8. Migration Strategy

The existing game must remain playable at every step. No "rewrite everything," no downtime.

### Step A — Introduce the seams, no visible change
- Extract `MatchController` from `main.js`; wrap `gameState` in a factory. **Risk:** low — pure refactor, same behavior. **Test:** manual full playthrough + all 3 AI difficulties, all 12 abilities triggered at least once (existing manual QA process, since no automated tests exist yet — see `PRODUCT_ROADMAP.md` §Testing).
- Introduce `InputProvider` abstraction for the Kangaroo choice (and any other future human-input-mid-ability cases). **Risk:** low. **Rollback:** revert one file; behavior is identical to today if the DOM-backed provider is the only one wired up.
- Fix the duplicated log-template map, the dead `scoreManager.js` file, the `closeToturial` dead wire, and the untranslated log string. **Risk:** near-zero, no behavior change intended. **Test:** trigger each ability once, confirm log text still renders identically (now in one place).

### Step B — Stand up the backend, additive only
- New backend service, new DB, deployed independently. **Nothing in the existing static site calls it yet.** Zero risk to the live game.
- Build Auth/Identity + Profile first (needed by everything else). **Dependency:** none. **Test:** backend-only integration tests (new).

### Step C — Home screen & navigation (client)
- Add the Home screen and shell navigation *around* the existing game (Offline Game button launches the exact same `MatchController` flow as today). **Risk:** low-medium — this is the first visible restructuring of the entry flow. **Rollback:** feature-flag the new Home screen; fall back to splash-screen-first if needed. **Test:** manual — confirm Offline Game still produces byte-for-byte the same match experience as before.

### Step D — Profile, Store, Customization, Economy, Payments, Ads, Rewards, Quests
- Each is additive: a new screen + new backend endpoints. None of them modify the game engine. Order and dependencies are detailed in `PRODUCT_ROADMAP.md`. **Common risk:** payment integration bugs — mitigated by idempotency keys and a staging/sandbox provider environment before going live (see `ECONOMY_PLAN.md` §Testing).

### Step E — Leaderboard / Tournament / Online Game
- Out of scope to implement now. This plan only reserves their boundaries (empty nav entries, unused backend module folders) so adding them later doesn't require reshaping Steps A–D.

### General rollback posture
Because every step after Step A is *additive* (new screens/endpoints behind new nav entries, nothing removed or rewired until it's ready), rollback at any point is "hide the new nav entry / stop deploying the new backend module" — the offline game keeps working unmodified throughout.

---

*Continue to `ECONOMY_PLAN.md` for Store, Payments, Coins, Ads, Rewards, and Quests; `UI_UX_PLAN.md` for the UI/UX audit, redesign plan, and design system; `PRODUCT_ROADMAP.md` for phasing, task breakdown, and testing/observability strategy.*
