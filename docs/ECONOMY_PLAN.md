# ECONOMY_PLAN.md — Wild Guest List

Covers: Store & purchasable items, payments (Iranian + international), coin economy, ads/Remove-Ads, daily bot quota, game-end rewards, and the quest system.
Companion documents: `PROJECT_AUDIT.md`, `ARCHITECTURE_PLAN.md` (data model referenced throughout), `PRODUCT_ROADMAP.md`

**Non-negotiable rule threaded through this entire document, per the audit's security findings: the client requests, the server decides. Coins, entitlements, quest completion, and rewards are never computed or trusted from client input.**

---

## 1. Store & Economy — Payment Provider Abstraction

### 1.1 The problem today
No payment code exists. Two very different payment worlds must be supported: Iranian domestic rails (IRR) and international card/wallet processors. These have different APIs, different verification flows, and (for Iran) different regulatory constraints. Coupling either directly into game/UI code would make adding, replacing, or region-splitting providers painful.

### 1.2 Recommended abstraction
```
GameClient → StoreAPI (backend) → PaymentGateway (interface)
                                       ├── IranianProviderAdapter   (e.g. ZarinPal-class gateway)
                                       └── InternationalProviderAdapter (e.g. Stripe-class gateway)
```
- The backend exposes one internal interface, e.g. `PaymentGateway.createOrder()`, `.verifyPayment()`, `.handleWebhook()`, `.refund()`.
- Each provider implements that interface. Game/UI code never talks to a provider directly or knows which one is active — it only talks to the backend's `StoreAPI`.
- Provider selection is a server-side decision (e.g., based on the user's declared region/currency at checkout), never a client-side branch that could be spoofed to request a cheaper/unverified path.

### 1.3 Required flow elements
| Concern | Recommendation |
|---|---|
| **Order creation** | Client requests "buy pack X" → server creates an `Order`/`PaymentTransaction` record in `pending` status *before* redirecting to the provider. Never grant coins on the redirect alone. |
| **Payment verification** | Server verifies with the provider (server-to-server call and/or webhook), never trusts a client-side "success" callback/redirect parameter as proof of payment. |
| **Webhooks** | Dedicated authenticated webhook endpoint per provider; verify signature/secret; make handling idempotent (see below) since providers may retry delivery. |
| **Transaction states** | Recommend: `pending → verifying → succeeded / failed / expired`, plus `refunded` as a terminal state reachable from `succeeded`. Coins are only credited on transition into `succeeded`, exactly once. |
| **Failed payments** | Leave the `Order` in `failed`; do not credit; surface a clear client-side retry path. No partial credit. |
| **Duplicate payments** | Idempotency key per order (client-generated UUID, stored with the order) so a retried request or duplicate webhook cannot credit coins twice. |
| **Idempotency** | Apply at both the order-creation call and the webhook handler — the webhook handler should be safe to receive the same event N times. |
| **Refunds** | Model as a negative `CoinTransaction` (see §3) tied to the original `Purchase`/`PaymentTransaction`; if the user already spent the coins, that's a product-policy decision (block refund, allow negative-adjacent balance, etc.) — flag for product decision, don't silently allow negative balances (see §3). |
| **Fraud prevention** | Rate-limit purchase attempts per user/IP; flag unusual patterns (many failed payments, many refund requests) for manual review; never trust client-declared price — server looks up price server-side from the coin-pack catalog by ID. |
| **Server-side coin awarding** | The *only* code path that increments `CoinBalance` from a purchase is the webhook/verification handler transitioning an order to `succeeded`. No other code path (client request, order creation) may credit coins. |
| **Transaction history** | `CoinTransaction` ledger (see §3) already captures this; the Store's "purchase history" view is a read of that ledger filtered to purchase-type entries. |

## 2. Purchasable Cosmetic Items

Modeled as a **data-driven catalog** (schema in `ARCHITECTURE_PLAN.md` §6.1), not hardcoded per-item UI. The Customization screen and Store screen both render from the same catalog, filtered by category/availability — adding a new cosmetic should require a catalog entry plus an asset, not new UI code.

Ownership (`PlayerInventory`) and the equipped state (`EquippedCustomization`) are modeled as two separate records per `ARCHITECTURE_PLAN.md` §7.1 — owning an item never auto-equips it.

Purchases of cosmetic items with **coins** go through the same `CoinTransaction` ledger as any other coin spend (see §3); purchases with **real money** (if cosmetics are ever sold for real currency, not just coin packs) go through the same Payment flow as §1.

## 3. Coin Economy — Ledger Model

### 3.1 Recommendation: append-only ledger, not just a balance field
```
CoinBalance { userId, balance }              ← current balance, a cached/derived number
CoinTransaction {
  id, userId, amount (+credit / -debit),
  reason ("purchase" | "gameReward" | "questReward" | "refund" | "adminAdjustment"),
  refId (points to the Purchase / GameResult / QuestProgress / etc. that caused it),
  createdAt, resultingBalance
}
```
- Every balance change is an inserted `CoinTransaction` row; `CoinBalance.balance` is either derived by summing the ledger or maintained as a cache updated in the same DB transaction as the ledger insert (recommended for read performance, as long as it's done atomically).
- This gives auditability for free ("why does this user have 1,240 coins? read their ledger") and makes fraud investigation and customer support disputes tractable.

### 3.2 Rules
- **Server-authoritative, always.** No client request ever specifies a coin *amount* to credit/debit — it specifies an *action* ("claim quest X", "buy pack Y"), and the server looks up the correct amount from the relevant config/catalog and writes the ledger entry itself.
- **Negative balances prevented** by a DB-level constraint (`CHECK balance >= 0`) plus an application-level check inside the same transaction that debits — reject the debit if it would go negative, rather than trusting a prior read.
- **Duplicate rewards prevented** via idempotency: each `CoinTransaction.refId` should be unique-constrained per `reason` where applicable (e.g., one `gameReward` transaction per `GameResult.id`; one `questReward` transaction per `QuestProgress` claim) so a retried request can't double-grant.
- **Race conditions**: wrap balance-changing operations in a DB transaction with row-level locking (`SELECT ... FOR UPDATE` or the ORM equivalent) on the user's `CoinBalance` row, so two concurrent requests (e.g., double-tap "claim quest" from two tabs) can't both succeed.

## 4. Free Daily Bot Games (Quota)

### 4.1 Requirement
20 free bot games/day; beyond that, additional bot games cost coins.

### 4.2 Design
```
DailyQuota { userId, date (server-defined day boundary), freeGamesUsed }
```
- **Server-side counting only** — never trust a client-reported count. `localStorage` (today's only persistence mechanism, per the audit) must **not** be used for anything quota-related, since it's trivially editable.
- **Daily reset & timezone**: recommend defining "day" as a fixed UTC boundary (00:00 UTC) rather than per-user local time, to avoid ambiguity and abuse via device-timezone manipulation; the client can *display* "resets in X hours" relative to the user's local clock purely for UX, without that being the authoritative boundary. (Flag for product: if UTC-day resets feel unfair to specific regions, a fixed non-UTC "game day" offset is fine too — the key requirement is that it's one fixed server-defined boundary, not client-supplied.)
- **Atomic quota updates**: incrementing `freeGamesUsed` and starting a bot game should happen as one server-side transaction — check current count, and only if under the limit, increment and allow the game to start (or, if over, require a coin spend via the same ledger flow as §3) — to close the race where two near-simultaneous "start game" requests both read "19 used" and both proceed.
- **Multiple devices / abuse**: since the quota is keyed by `userId` (server-side identity) rather than device or `localStorage`, playing from multiple devices naturally shares one quota — no special handling needed beyond ensuring `userId` resolution is itself robust (see Profile/Auth in `ARCHITECTURE_PLAN.md`).
- **Offline manipulation**: because the game itself currently runs entirely client-side, "starting a bot game" needs to become a server-acknowledged action (even if the match play-out stays client-side for now) purely so the quota check has something authoritative to gate. This is a small but real new server touchpoint — flagged here because it's easy to miss (the temptation is to gate quota only at "claim reward" time, which wouldn't actually limit *play*, only *reward-eligible* play — a product decision to make explicitly: does the free quota limit playing bot games at all, or just reward-earning bot games? Recommend the latter is simpler to implement (client keeps playing freely offline, server just refuses/charges coins for reward-eligible games beyond 20/day) and still satisfies the spirit of the requirement without needing a server round-trip to *start* every single offline match).
- **Future changes to the limit**: the "20" should be a single server-side config value (e.g., in a `GameConfig` table/row), not hardcoded in application code, so it can change without a deploy.

## 5. Game End Rewards

### 5.1 Design: config-driven reward table
Schema shape in `ARCHITECTURE_PLAN.md` §6.3 — per game mode, a list of `{ position, coinReward, scoreMultiplier }`, plus optional `conditions` (e.g., minimum player count). No exact values are prescribed here since none exist in the project today; product should define them.

### 5.2 Server-authoritative calculation
- The client reports what happened in a match (or, in the fuller online-mode future, the server *is* the match), but **the server independently determines position/placement and looks up the reward from the config table** — it does not accept a client-declared "I got 1st place, give me the 1st place reward" without validation.
- For **offline bot games** specifically (the only mode that exists today), full server-side re-simulation isn't necessary; a pragmatic middle ground: the client submits the final match state (party contents per player, using the existing deterministic scoring already in `gameOver.js`), the server recomputes the ranking from that submitted state using the same rules (shared/ported scoring logic — this is exactly why keeping `abilities/`/`game/` engine code portable, per `ARCHITECTURE_PLAN.md` §4, matters) and validates it's plausible (e.g., total cards across all parties+trash equals 48, no duplicate card instances) before granting a reward. This is not full anti-cheat, but it closes the trivial "POST `{winner: me}`" attack.
- All reward grants flow through the `CoinTransaction` ledger (§3) with `reason: "gameReward"` and `refId` = the `GameResult.id`, idempotent per result.

## 6. Daily Quest System

### 6.1 Scope for this phase
Build the **architecture** to support Daily, Weekly, and Seasonal quests; only **Daily** is active. Weekly/Seasonal exist as a `type` value and are simply never populated with `active: true` entries yet.

### 6.2 Design
Schema shape in `ARCHITECture_PLAN.md` §6.4 (quest ID, type, description, target, reward, start/end date, active flag, game-mode restriction). Runtime progress is tracked separately from the definition:
```
QuestProgress { userId, questId, progress, completedAt, claimedAt }
```
- **Data-driven, no logic changes to add a quest**: a quest's "target" is a generic `{ metric, count, gameMode? }` shape (e.g., `gamesWon >= 3`, `cardsPlayed >= 20`). The quest engine listens for the small set of metric-relevant events the game already produces (game finished, card played, etc.) and increments matching active quests' progress server-side — new quests that reuse an existing metric need zero code changes, only a new catalog entry.
- **Completion vs. claim are separate states**: a quest can be `completed` (target reached) without coins having been granted yet; `claimedAt` is set only when the player explicitly claims, and *that* action is what writes the `CoinTransaction` (idempotent per `QuestProgress.id`, same pattern as §5.2).
- **Daily reset**: quest progress resets the same way the daily quota does (§4) — one fixed server-defined day boundary, not client time.
- **Game mode restrictions**: honored by only counting progress from matches in the quest's allowed `gameMode` (or all modes, if unrestricted).

## 7. Ads & Remove Ads Entitlement

| Concern | Recommendation |
|---|---|
| **Entitlement architecture** | `AdFreeEntitlement { userId, active, purchaseId }` — a boolean-ish entitlement flag on the user, set `true` the moment the corresponding `Purchase`/`PaymentTransaction` succeeds (same verified-payment flow as §1), never client-settable. |
| **Payment verification** | Identical flow to §1 — Remove Ads is just another purchasable SKU, not a special case. |
| **Persistence** | Server-side field on the user record; client fetches it as part of profile/session bootstrap and caches it, refreshing after any purchase. |
| **Restoration across devices** | Because the entitlement is tied to `userId` (not device), logging in on a new device and re-fetching profile data restores it automatically — no separate "restore purchases" flow needed as long as auth/identity is account-based rather than device-local. |
| **Ad visibility** | Client checks the cached entitlement flag before rendering the home banner slot; if `active === true`, render nothing in that slot. |
| **Future platforms** | Keep the entitlement check at the account level (not ad-SDK level) so it applies uniformly if/when native app wrappers or other ad networks are introduced later — the ad SDK is swappable, the entitlement source of truth (server) is not. |

## 8. Testing Strategy — Economy-Specific

(General testing strategy is in `PRODUCT_ROADMAP.md` §Testing; this section highlights what needs *extra* rigor because money is involved, per the brief's explicit instruction.)

- **Ledger correctness**: automated tests asserting balance == sum(transactions) after every operation type (purchase, reward, quest claim, refund).
- **Idempotency**: automated tests that fire the same webhook / same claim request twice (and concurrently) and assert only one credit occurs.
- **Concurrency**: tests simulating simultaneous requests against the same user's balance (double-spend attempts) to verify row-locking prevents over-spend or double-credit.
- **Negative balance prevention**: test that a debit exceeding balance is rejected atomically, not partially applied.
- **Payment sandbox coverage**: every provider integration tested against its official sandbox/test-mode for success, failure, timeout, and webhook-retry scenarios before going live.
- **Quota/quest reset boundary tests**: tests around the exact day-boundary instant to confirm no double-reset or missed-reset off-by-one.
- **Fraud/abuse simulation**: basic tests for rapid repeated purchase attempts, mismatched idempotency keys, and tampered client-declared amounts (server should ignore/reject, not just "usually work").

## 9. Observability — Economy-Specific

(General observability is in `PRODUCT_ROADMAP.md` §Observability.)

- **Economy monitoring**: dashboards/alerts on daily coin issuance vs. redemption, unusual per-user velocity (many transactions in a short window), and ledger/balance drift (a balance that ever disagrees with its ledger sum is a bug to alert on immediately).
- **Payment monitoring**: success/failure/timeout rates per provider, webhook delivery lag, refund volume.
- **Reward monitoring**: rewards granted per game mode over time, to catch a misconfigured reward table (e.g., an accidental 100x multiplier) quickly.
- **Quest monitoring**: completion and claim rates per quest, to catch quests that are miscounted (never completing, or completing instantly).

---

*See `PRODUCT_ROADMAP.md` for how this fits into the phased roadmap (Phases 4–8), and `ARCHITECTURE_PLAN.md` §7 for the full data model these entities belong to.*
