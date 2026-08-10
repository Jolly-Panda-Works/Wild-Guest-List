# PRODUCT_ROADMAP.md — Wild Guest List

Covers: phased roadmap, prioritization, implementation task breakdown, acceptance criteria, testing strategy, observability, and the executive summary.
Companion documents: `PROJECT_AUDIT.md`, `ARCHITECTURE_PLAN.md`, `ECONOMY_PLAN.md`, `UI_UX_PLAN.md`

Priority: **P0** critical / blocking · **P1** high · **P2** medium · **P3** low
Effort: **S** small (part of a day) · **M** medium (a few days) · **L** large (1–2 weeks) · **XL** (multi-week, likely needs sub-tasks)

---

## Phase 0 — Foundation / Refactoring

Prerequisite cleanup and seam-introduction from `ARCHITECTURE_PLAN.md` §8 Step A. No visible feature change; makes everything after this safe to build.

| Task | What changes | Where | Why | Depends on | Priority | Effort |
|---|---|---|---|---|---|---|
| 0.1 Extract `MatchController` from `main.js` | Split app-bootstrap concerns from match-start concerns | `js/main.js` → new `js/app/matchController.js` | Home screen needs to start/stop a match without being the app's only entry point | — | P0 | M |
| 0.2 Convert `gameState` singleton to a factory | `js/game/gameState.js` becomes `createMatchState()` | `js/game/gameState.js`, all importers | Enables >1 match to exist later (even just Home → "start new game" without reload) | 0.1 | P0 | M |
| 0.3 Introduce `InputProvider` abstraction for Kangaroo choice | Remove direct `ui/kangaroo-ui.js` import from `abilities/helpers/chooser.js` | `js/abilities/helpers/chooser.js` | Decouples engine from DOM so it's portable server-side later | — | P1 | S |
| 0.4 Consolidate log-text templates | Merge duplicated map in `ui/log-ui.js` into `services/logger.js`; `log-ui.js` imports it | `js/services/logger.js`, `js/ui/log-ui.js` | Removes drift risk before new log types (quest/reward) are added | — | P1 | S |
| 0.5 Fix untranslated log call | Convert the raw-string `addLog` call to a proper key+params | `js/abilities/helpers/followHelpers.js` | i18n consistency (audit finding) | 0.4 | P2 | S |
| 0.6 Remove dead code | Delete empty `scoreManager.js`; remove dead `closeToturial` listener | `js/game/scoreManager.js`, `js/ui/modal-ui.js` | Cleanup, zero risk | — | P3 | S |
| 0.7 Create real `scoring.js` | Single source for party-power calculation, replacing copy-paste across `leaderboard-ui.js`/`endgame-ui.js`/`gameOver.js` | new `js/game/scoring.js` | Removes duplication; needed as the shared basis for server-side reward validation later | 0.6 | P1 | S |
| 0.8 Consolidate local settings | One `localSettings.js` module replacing 3 scattered `localStorage` keys; persist sound toggle | new `js/services/localSettings.js`, `js/i18n.js`, `js/services/soundManager.js`, `js/ui/tutorial-ui.js`, `js/ui/walkthrough.js` | Fixes inconsistent persistence (audit finding) | — | P2 | M |
| 0.9 HTML-escape player-typed name | Escape before any render path | `js/ui/game-ui.js`, `js/i18n.js` (playerDisplayName) | Closes stored/reflected-XSS risk before names become persistent/public | — | P1 | S |
| 0.10 Source version string from config | Single value, not hardcoded in `index.html` | `data/config.json` or new `data/appMeta.json`, `index.html`/settings render | Prevents drift between displayed version and actual build | — | P3 | S |
| 0.11 Split CSS incrementally: extract theme tokens file | Pull `:root` tokens into `css/tokens.css`, imported first | `css/style.css` → `css/tokens.css` | Groundwork so new screens' stylesheets can share tokens without duplicating the monolith | — | P2 | S |

**Acceptance criteria (Phase 0, representative):**
- "After 0.1–0.2, a full manual playthrough (all 3 AI difficulties, all 12 abilities triggered at least once) behaves identically to pre-refactor behavior — no observable regression."
- "After 0.8, toggling sound off and reloading the page keeps sound off."
- "After 0.9, a player name containing `<script>` or `<img onerror=...>` renders as inert text everywhere it's displayed, never executes."

---

## Phase 1 — Home & Navigation

| Task | What | Depends on | Priority | Effort |
|---|---|---|---|---|
| 1.1 Build App Shell skeleton (routing between Home / active match) | New `js/app/shell.js` + minimal client-side view switching | 0.1 | P0 | M |
| 1.2 Home screen layout: banner, Online/Offline buttons, secondary nav row | Per `UI_UX_PLAN.md` §2 | 1.1 | P0 | M |
| 1.3 Online Game button — visibly present, clearly disabled | Per brief §4 | 1.2 | P0 | S |
| 1.4 Offline Game button → launches existing `MatchController` flow unchanged | 0.1, 1.1 | P0 | S |
| 1.5 Consistent header component shared between Home and in-game top bar | Per brief §4 | 1.2 | P1 | M |
| 1.6 Coin pill component (static/placeholder value until Phase 4 wires real data) | Per `UI_UX_PLAN.md` §4 | 1.2 | P0 | S |
| 1.7 Bottom nav: Store / Tournament / Leaderboard entries, latter two as "coming soon" placeholders | Per brief §4, §15–16 | 1.2 | P0 | S |
| 1.8 Rename in-match "Leaderboard" → "Match Standings" (label + i18n key only) | Per `UI_UX_PLAN.md` §3 | — | P1 | S |
| 1.9 Loading/error/disabled state primitives (shared CSS/JS) | Per `UI_UX_PLAN.md` §11 | 1.1 | P1 | M |

**Acceptance criteria:**
- "Launching the app shows Home, not the splash-to-difficulty flow directly; tapping Offline Game reproduces today's exact splash→difficulty→match sequence with no behavior change."
- "Online Game button is visible and clearly labeled unavailable; it does not error or silently do nothing when tapped."
- "Tournament and Leaderboard nav entries are reachable and show a clear 'coming soon' state, not a broken link or blank screen."

---

## Phase 2 — Player Profile

*(Requires backend Auth/Identity + Profile boundaries from `ARCHITECTURE_PLAN.md` §3 to exist first — this phase includes minimal backend setup, not just client UI.)*

```text
2.1  Stand up backend service skeleton + DB (empty, deployed, not yet called by client)
2.2  Auth/Identity: minimal account/session mechanism (server-issued, unforgeable identity)
2.3  Create Profile domain model (server): PlayerProfile, PlayerStats
2.4  Create PublicProfile server-side view/DTO, computed from PlayerProfile+PlayerStats
2.5  Username uniqueness validation (server-side constraint + reservation strategy — see below)
2.6  Username change flow (client form + server validation, race-condition safe)
2.7  Avatar ownership validation (server checks requested avatar is in caller's inventory before equipping) — depends on Phase 3's inventory existing; can stub to "default avatars only" until then
2.8  Profile statistics: gamesPlayed/wins/losses incremented server-side on GameResult (stub GameResult recording if Rewards/Phase 5 isn't live yet — increment on client-reported, server-validated match completion)
2.9  Profile UI (client): view + edit name/avatar, stats display
2.10 Public Profile UI (client): read-only preview view
2.11 Tests: username uniqueness race condition, public/private field separation
```

**Username uniqueness — recommended strategy:** enforce a DB-level unique constraint (case-insensitive) on the canonical username column; on change request, attempt the update inside a transaction and catch the constraint violation as the uniqueness signal (rather than "check then write," which race-conditions under concurrent requests) — return a clear "taken" error to the client on conflict. For "reservation while typing" UX (live availability check), treat that as advisory-only (a fast read-only lookup for UX feedback), with the transactional constraint as the actual source of truth at submit time.

**Acceptance criteria:**
- "Player can change their username; the server verifies uniqueness; duplicate usernames (case-insensitive) are rejected with a clear error; the new username is reflected in all future games and on the public profile."
- "Two simultaneous requests to claim the same username result in exactly one success and one clear rejection, never two successes."
- "Public profile view never displays fields designated private in `ARCHITECTURE_PLAN.md` §7.2."

Priority: **P0** (blocks everything identity-dependent — Store, Inventory, Coins, Quests all need a stable player ID). Effort: **XL** (spans backend bring-up).

---

## Phase 3 — Customization (Inventory)

```text
3.1  Create CosmeticItem catalog schema + seed data (per ARCHITECTURE_PLAN.md §6.1)
3.2  Create PlayerInventory model (server) — ownership only
3.3  Create EquippedCustomization model (server) — separate from ownership
3.4  Equip/unequip endpoint — validates the item is owned before allowing equip
3.5  Customization UI: tabbed categories, owned/locked states (per UI_UX_PLAN.md §7)
3.6  In-game identity reflects equipped customization (card color/pattern, avatar) — reads from Profile/Inventory, no duplicated identity data in the game engine (per brief §9)
3.7  Tests: cannot equip an unowned item (server-enforced even if client is bypassed)
```

**Acceptance criteria:**
- "Attempting to equip an item not present in the player's inventory is rejected server-side regardless of what the client UI sends."
- "Owning an item never automatically changes what's equipped."
- "During a match, the player's displayed name/avatar/card styling comes from their profile/equipped-customization data, not a value re-entered or duplicated per match."

Priority: **P1**. Effort: **L**. Depends on: Phase 2.

---

## Phase 4 — Store & Economy

```text
4.1  CoinBalance + CoinTransaction ledger models (server) — per ECONOMY_PLAN.md §3
4.2  Coin pack catalog schema + seed data (per ARCHITECTURE_PLAN.md §6.2)
4.3  Purchase model + "buy cosmetic with coins" flow (ledger debit, ownership grant) — no real money yet
4.4  Store UI: coin packs section (purchase button stubbed until Phase 5 payments) + cosmetics section (live)
4.5  Coin pill wired to real balance (replaces Phase 1's placeholder)
4.6  Ledger correctness tests: balance == sum(transactions), negative-balance prevention, idempotent debits
```

**Acceptance criteria:**
- "Buying a cosmetic with coins debits the ledger exactly once, grants inventory ownership, and the displayed balance updates to match the server's authoritative value (not a client-optimistic guess that could drift)."
- "A purchase request for an item costing more than the player's current balance is rejected server-side."

Priority: **P0** (economy foundation blocks Payments/Rewards/Quests). Effort: **L**. Depends on: Phase 2, 3.

---

## Phase 5 — Payments

```text
5.1  PaymentGateway interface (server) — per ECONOMY_PLAN.md §1.2
5.2  Iranian provider adapter (sandbox integration)
5.3  International provider adapter (sandbox integration)
5.4  Order creation endpoint + PaymentTransaction model
5.5  Webhook endpoints (per provider) + signature verification + idempotent handling
5.6  Failed/duplicate payment handling, refund flow
5.7  Store UI: real "Buy Coins" flow wired to Order creation
5.8  Fraud/rate-limit guardrails on purchase attempts
5.9  Payment sandbox test suite (success/fail/timeout/webhook-retry per provider)
```

**Acceptance criteria:**
- "A successful payment credits coins exactly once, verified server-side against the provider, never on a client-reported success alone."
- "The same webhook event delivered twice results in exactly one coin credit."
- "A failed or abandoned payment credits nothing and leaves a clear, retryable state for the user."

Priority: **P1** (real-money — high value, but gated on Store/Economy foundation being solid first). Effort: **XL**. Depends on: Phase 4.

---

## Phase 6 — Ads

```text
6.1  Home banner ad slot (client) — third-party ad SDK integration, scope TBD by product
6.2  AdFreeEntitlement model (server) + purchase SKU
6.3  Settings UI: "Remove Ads" purchase entry
6.4  Ad-slot visibility check reads entitlement (hide banner if active)
6.5  Cross-device restoration test (entitlement follows account, not device)
```

Priority: **P2**. Effort: **M**. Depends on: Phase 5 (reuses payment flow), Phase 2 (entitlement tied to account).

---

## Phase 7 — Rewards

```text
7.1  Reward table config schema + seed data (per ARCHITECTURE_PLAN.md §6.3)
7.2  GameResult submission endpoint (client reports match outcome; server validates plausibility per ECONOMY_PLAN.md §5.2)
7.3  Server-side reward calculation + CoinTransaction grant (idempotent per GameResult)
7.4  Game-End UI: rewards section per placement (per UI_UX_PLAN.md §10)
7.5  Tests: server-recomputed ranking matches client-submitted state; implausible submissions rejected; duplicate submission doesn't double-grant
```

**Acceptance criteria:**
- "A completed offline bot match's placement is independently validated server-side before any coin reward is granted."
- "Submitting the same GameResult twice grants reward exactly once."
- "4th place (per current game rules) receives no coin reward, matching the configured reward table."

Priority: **P1**. Effort: **L**. Depends on: Phase 4, Phase 0.7 (shared scoring logic).

---

## Phase 8 — Daily Quests

```text
8.1  Quest definition schema + seed data (Daily only active; per ARCHITECTURE_PLAN.md §6.4)
8.2  QuestProgress model + event-driven progress tracking (per ECONOMY_PLAN.md §6.2)
8.3  Daily reset job (server-defined day boundary)
8.4  Claim endpoint (idempotent, ledger-integrated)
8.5  Quests UI: active quest list, progress, claim affordance, reset countdown
8.6  Weekly/Seasonal nav placeholders ("coming soon"), type supported but inactive
8.7  Free daily bot quota (20/day) — DailyQuota model + atomic check, per ECONOMY_PLAN.md §4
8.8  Tests: reset-boundary correctness, no double-progress-counting, quota atomicity under concurrent requests
```

Priority: **P1** (quota, P2 for full quest UI polish). Effort: **L**. Depends on: Phase 2, Phase 4.

---

## Phase 9 — Leaderboard *(future — not implemented this cycle)*

Architecture-only for now: reserve backend module boundary and nav entry (done in Phase 1.7). When picked up: global/weekly/monthly/friends scopes, server-side aggregation, cursor-based pagination for scale. Depends on Phase 2 (stats) and Phase 7 (results) existing first.

## Phase 10 — Online Game *(future — not implemented this cycle)*

Architecture-only for now. The existing game engine (`abilities/`, `game/`, `ai/`) is designed to be portable to a server host per `ARCHITECTURE_PLAN.md` §4; when picked up, this phase is primarily "run the existing engine server-side + add a real-time transport (WebSocket-class) + matchmaking," not a rule-engine rewrite.

## Phase 11 — Tournament *(future — not implemented this cycle)*

Architecture-only for now: reserve nav entry (done in Phase 1.7) and backend module boundary. Depends on Phase 10 (needs real matches to bracket) and Phase 4/5 (entry fees/rewards).

---

## Prioritization Summary Table

| Phase | Priority | Effort | Key dependency |
|---|---|---|---|
| 0 — Foundation | P0/P1 mixed (see tasks) | M (aggregate) | none |
| 1 — Home & Navigation | P0 | M | Phase 0 |
| 2 — Profile | P0 | XL | Phase 0 |
| 3 — Customization | P1 | L | Phase 2 |
| 4 — Store & Economy | P0 | L | Phase 2, 3 |
| 5 — Payments | P1 | XL | Phase 4 |
| 6 — Ads | P2 | M | Phase 2, 5 |
| 7 — Rewards | P1 | L | Phase 4, 0.7 |
| 8 — Daily Quests | P1 | L | Phase 2, 4 |
| 9 — Leaderboard | *deferred* | — | Phase 2, 7 |
| 10 — Online Game | *deferred* | — | Phase 1–8 groundwork |
| 11 — Tournament | *deferred* | — | Phase 10 |

**Recommended build order:** 0 → 1 → 2 → 4 → 3 → 7 → 5 → 8 → 6, i.e., get identity and the coin ledger solid before real money touches it, and before quests/rewards depend on it. This diverges slightly from the brief's default Phase numbering (which lists Customization before Store) because Store's coin-purchase flow and Customization's equip flow both need the ledger/inventory foundation from Phase 4 either way — building Store's cosmetics-with-coins path first surfaces ledger issues earlier, when less depends on it.

---

## Testing Strategy (General)

*(Economy-specific extra rigor is detailed in `ECONOMY_PLAN.md` §8.)*

| Layer | Approach |
|---|---|
| **Unit tests** | Game engine (`abilities/`, `game/`, `ai/`) — currently has zero coverage despite being the most stable, highest-value code to protect. Start here in Phase 0; every one of the 12 abilities and queue-resolution edge cases deserves a deterministic unit test (seed the RNG or bypass it for AI-choice-independent logic). |
| **Integration tests** | Backend module boundaries (Profile↔Auth, Economy↔Payments, Quests↔Economy) — verify cross-module contracts once the backend exists. |
| **API tests** | Every new endpoint: happy path, validation failures, auth failures, idempotency where applicable. |
| **Game logic tests** | Extend unit tests to full-match simulations (scripted play sequences) to catch regressions in turn/queue/gameOver interaction. |
| **Economy tests** | Per `ECONOMY_PLAN.md` §8 — ledger correctness, concurrency, idempotency. |
| **Payment tests** | Sandbox-mode coverage per provider, all transaction-state transitions. |
| **Reward tests** | Server-side recomputation matches expected reward table output for a range of match outcomes. |
| **Quest tests** | Progress-tracking correctness per metric type, reset-boundary correctness. |
| **UI tests** | Component-level tests for new shared components (Button, Modal shell, Coin pill, etc.) — reasonable to introduce once the design system components from `UI_UX_PLAN.md` §16 exist, rather than testing one-off markup. |
| **End-to-end tests** | Critical user journeys: Home → Offline Game → full match → reward → claim; Store purchase (sandbox payment) → inventory updated → equip. |
| **Security tests** | Username uniqueness race conditions, unescaped-input regression test (per Phase 0.9), unauthorized equip/claim attempts, tampered client-declared amounts rejected. |

**Practical note given current state:** the project has zero test infrastructure today (per audit §8/§9). Phase 0 should include standing up a basic test runner for the existing game engine before any economy code is written — the game engine is exactly the kind of pure, deterministic logic that's cheap to test well and expensive to regress silently.

## Observability (General)

*(Economy-specific monitoring is detailed in `ECONOMY_PLAN.md` §9.)*

- **Logging**: structured server-side logging (request ID, user ID where applicable, action) for every state-changing endpoint; avoid over-logging read-only traffic.
- **Error tracking**: a standard error-tracking service (Sentry-class or equivalent) on both client and server, so JSON-fetch failures and other currently-silent failure modes (audit §13) become visible instead of invisible.
- **Analytics**: basic funnel events (Home → mode selected → match started → match completed → reward claimed; Store viewed → item viewed → purchase started → purchase completed) to inform future prioritization — avoid over-instrumenting every click.
- **Economy monitoring**: per `ECONOMY_PLAN.md` §9.
- **Payment monitoring**: per `ECONOMY_PLAN.md` §9.
- **Reward monitoring**: per `ECONOMY_PLAN.md` §9.
- **Quest monitoring**: per `ECONOMY_PLAN.md` §9.
- **Game performance monitoring**: client-side render timing for the board (already animation-heavy) as more screens compete for attention; server-side latency/error-rate on new endpoints.

**Explicitly avoid:** building a full observability stack before there's traffic to observe. Start with error tracking + basic structured logs (cheap, immediately useful); add dashboards and alerting thresholds once real usage patterns exist to calibrate them against.

---

## Final Executive Summary

### Current State
Wild Guest List is a well-built, purely client-side, single-player-vs-bots card game — vanilla JS ES modules, no backend, no build tooling, no persistence beyond a few `localStorage` flags. The game engine (rules, AI, queue resolution) and the data-driven content pattern (cards, translations, tutorial content) are genuine strengths worth preserving. Everything the target product vision needs beyond "play one local bot match" — accounts, coins, purchases, cosmetics, quests, leaderboards, tournaments, online play — requires a backend that does not exist today.

### Biggest Problems
1. No backend / no server authority for anything of value (Critical, blocks the entire target vision).
2. Global singleton `gameState` — can't support more than one match at a time.
3. No player identity or persistence layer — nothing survives a page reload.
4. Zero test coverage on the game engine, the most stable and highest-value code in the project.
5. Duplicated log-text templates between `logger.js` and `log-ui.js`.
6. Inconsistent local settings persistence (sound not saved; 3 separate ad-hoc `localStorage` keys).
7. Unescaped player-name input — low risk today, real risk once names are shown to other players.
8. "Leaderboard" naming collision between the current in-match score panel and the future persistent feature.
9. Dead code (`scoreManager.js`, a broken `closeToturial` DOM reference) — low impact, but a sign of no cleanup process.
10. One monolithic 4,205-line CSS file with no component boundaries, which will get harder to extend as 6+ new screens are added.

### Biggest Opportunities
1. The game engine and AI are portable to a server almost as-is — huge head start on future online play.
2. The existing JSON-content pattern (cards/i18n/tutorial) is exactly the right shape to extend for cosmetics/coin-packs/rewards/quests — no new pattern needs to be invented.
3. Strong existing i18n (4 languages incl. 2 RTL) is a real differentiator most projects at this stage lack.
4. Existing mobile UI patterns (tab panels, responsive CSS) are solid and directly reusable for new screens.
5. The card-factory (`createCard()`) pattern is a ready-made template for the design system's other card-shaped components (Store items, Quest cards, Leaderboard rows).
6. A clean domain-boundary split (identity/profile/inventory/economy/payments) lets the backend be built incrementally, feature by feature, without over-engineering into microservices.
7. Server-side reward validation can reuse the existing, already-correct client scoring logic (once consolidated in Phase 0.7) rather than being written from scratch.
8. The existing toast (`showWarning`) and animation (`animateCardPlay`) patterns give new screens a consistent, already-proven interaction language to extend.
9. Nothing about the target vision requires touching the actual game rules — the highest-risk, hardest-to-verify-by-eye code in the project stays untouched throughout this whole roadmap.
10. Because every phase after Phase 0 is additive (new screens/endpoints behind new nav, nothing rewired until ready), the existing offline game can stay live and stable through the entire buildout.

### Recommended Architecture
Keep the existing vanilla-JS client and its game engine unchanged in behavior; wrap it with a new App Shell for navigation. Add one new modular-monolith backend service (no microservices) owning Auth/Identity, Profile, Inventory, Economy/Ledger, Quotas, Rewards, Quests, and Payments as distinct internal modules, all backed by one relational database. Leaderboard, Tournament, and Online Match get reserved boundaries (empty nav entries, unused module folders) but no implementation yet. The core rule threaded through every module: the server is authoritative for anything with stakes; the client requests and displays, never asserts truth.

### Recommended Development Order
Phase 0 (foundation/refactor + first tests) → Phase 1 (Home/Nav) → Phase 2 (Profile/Auth — the identity foundation everything else needs) → Phase 4 (Store & Economy ledger) → Phase 3 (Customization, now that inventory/ledger exist) → Phase 7 (Rewards, reusing the ledger) → Phase 5 (Payments, once the ledger is proven solid) → Phase 8 (Quests) → Phase 6 (Ads). Leaderboard/Tournament/Online Game remain architecture-only until a future cycle.

### Highest-Risk Areas
- **Payments** (Phase 5) — real money, provider-specific edge cases, regulatory considerations for Iranian rails specifically.
- **The coin ledger and its concurrency handling** (Phase 4) — everything else in the economy sits on top of it; bugs here compound.
- **The `gameState` singleton → factory migration** (Phase 0.2) — touches code every other game feature depends on; needs thorough manual regression testing given the current lack of automated coverage.
- **Server-side reward validation from client-submitted match state** (Phase 7) — the trickiest "how much do we trust the client" judgment call in the whole plan; start conservative (plausibility checks) rather than attempting full re-simulation immediately.

### Quick Wins
- Fix the dead `closeToturial` reference and empty `scoreManager.js` file (Phase 0.6) — minutes of work, removes maintenance traps.
- Persist the sound toggle (Phase 0.8) — small, immediately noticeable UX improvement.
- Rename "Leaderboard" → "Match Standings" (Phase 1.8) — cheap now, painful to untangle later.
- Consolidate the duplicated log-template map (Phase 0.4) — small refactor, removes a real drift risk before quest/reward log entries are added.
- HTML-escape the player name input (Phase 0.9) — small, closes a real (if currently low-severity) security gap.

### Long-Term Vision
The domain boundaries drawn in this plan — Identity, Profile, Inventory, Economy, Quests, Rewards, Payments, with Leaderboard/Tournament/Online Match reserved — are exactly the boundaries a full competitive, monetized, social card game needs. Because the game engine was already portable and the content model was already data-driven, the path from "today's local bot game" to "online multiplayer with ranked play, tournaments, a live economy, cosmetics, and seasonal quests" doesn't require revisiting this plan's core architecture — it requires filling in the two boundaries deliberately left empty here (Leaderboard, Tournament, Online Match) on top of a foundation that, if this roadmap is followed, will already be solid, tested, and server-authoritative everywhere it needs to be.
