# Animal Abilities

**Source of truth for this document:** `js/abilities/abilities.js` (ability dispatch + effects), `js/abilities/helpers/*.js` (shared movement/removal primitives), `js/game/queueManager.js` (Queue → Party/Trash resolution), `js/game/turnManager.js` (when abilities fire relative to a turn), `data/cardInfo.json` (Power/id/flavor text), `js/services/dataLoader.js` (id ↔ Power mapping), `js/game/deck.js` (deck composition), `js/game-main.js` (player count).

Everywhere this document says "the code," it means the files above, inspected directly — not `data/cardInfo.json`'s description strings or `README.md`'s summary table, both of which are simplified marketing copy and are, in one case (Monkey), demonstrably wrong about what the implementation actually does. Discrepancies are called out explicitly where found.

---

## Overview

### The Queue / Party / Trash loop

- A player plays one card from their hand; it is pushed to the back of the shared `gameState.queue` (`queueManager.js#addToQueue`).
- That card's ability resolves **immediately**, synchronously with the play (`turnManager.js#playCard` → `abilities.js#resolveAbility`), before the queue-full check.
- Once `gameState.queue.length >= 5`, the queue resolves (`queueManager.js#resolveQueue`):
  - `queue.shift()` (front) → that card's **owner's `party`**.
  - `queue.shift()` (new front) → that card's **owner's `party`**.
  - `queue.pop()` (back) → the shared `gameState.trash`.
  - The two cards left in the middle stay in the queue and slide up to the front for the next round.
- At end of game, `resolveRemainingQueue()` drains whatever is left: while more than 2 cards remain it repeats the same shift/shift/pop pattern (front two → Party, back → Trash); once 2 or fewer remain, **all** of them go to Party (never Trash), tagged `order: "final"`.
- Win condition (`js/game/matchOutcome.js`): highest `player.party.length` wins; ties on Party Card Count are a full **DRAW** with no secondary tie-breaker (Card Power explicitly plays no role in scoring — see that file's header comment).

### Power's actual role

Every card's `id` is numerically identical to its `power` (`dataLoader.js#loadCardData`), and `abilities.js#resolveAbility` dispatches purely on `switch(card.power)`. In other words, **Power is not just a stat — it is the animal's identity and the ability-dispatch key.** This has two consequences that matter for the tables below:

1. Some abilities read `card.power` at runtime to *compare* against other cards' Power (Weasel, Parrot, Snake, Crocodile, Hippo — marked **Power Dependency: YES** below).
2. Others check a specific animal's identity (`card.id === CARD_IDS.X`) rather than a Power threshold, even though, because id≡power, the two are numerically the same value (Monkey's Croc/Hippo purge, Lion's other-Lion/Monkey checks, Zebra's block checks, Sloth Bear's stickiness). These are marked **Power Dependency: NO** in this document because the code is not doing a *relative/threshold* Power comparison — it is matching a fixed animal identity. This distinction is called out per-ability below since it is easy to conflate the two.

Two cards — **Sloth Bear (5)** and **Zebra (7)** — have **no `case` in the `resolveAbility` switch at all**. Playing either one triggers only the `default: console.log(...)` branch (a dev-console line, no gameplay effect, no log entry, no animation event). Their documented "abilities" are entirely **passive side effects coded inside other animals' abilities** (Hippo's and Crocodile's traversal loops, and Hippo's/Lion's `moveFollowersBehind` call).

`resolveAbility` also sets `gameState.lastAbility = card` for every ability **except** Monkey (`if(card.power !== 2)`). No other code in the repository reads `gameState.lastAbility` — it is inert today (verified by search), so it has no observable gameplay effect. It's called out here purely because it is part of the actual `resolveAbility` implementation and could be a real hook for future systems.

### Player count

The number of players is variable: 1 human + 1–3 AI bots, chosen on Home (`js/game-main.js`), so **2, 3, or 4 players** are all real, reachable configurations. Each player has their own private deck of exactly one copy of each of the 12 animals (`deck.js#createDeck`) — so, e.g., "two Monkeys in the queue at once" requires two *different* players to each have played their own Monkey; it can never come from one player's deck alone.

---

## Current / Implemented Abilities

| Animal | Power | Ability (what it actually does) | Category | Trigger | Target | Power Dependency |
| --- | ---: | --- | --- | --- | --- | --- |
| Weasel | 1 | Removes the 2 highest-Power other cards in the queue | Removal | On Play | Automatic — top 2 by Power (excl. self) | YES |
| Monkey | 2 | Moves itself to the back of the queue; if ≥2 Monkeys are then in the queue, removes **every** Crocodile and Hippo to Trash | Removal, Movement, Conditional Effect | On Play | Self (always) + all Crocodiles/Hippos (conditional) | NO |
| Kangaroo | 3 | Jumps itself 1–2 positions toward the front | Movement | On Play | Self only | NO |
| Parrot | 4 | Removes the 2 highest-Power other cards in the queue (code-identical to Weasel) | Removal | On Play | Automatic — top 2 by Power (excl. self) | YES |
| Sloth Bear | 5 | **No ability of its own.** Passively gets pulled directly behind Hippo/Lion after either resolves, and is passed-through (not blocked) by Hippo | Passive / Movement | Passive (reacts inside Hippo's and Lion's resolution) | N/A (acted upon, not acting) | NO |
| Seal | 6 | Reverses the entire queue order | Queue Manipulation | On Play | All cards in queue (incl. self) | NO |
| Zebra | 7 | **No ability of its own.** Passively stops Hippo/Crocodile from advancing past it | Passive / Protection | Passive (checked inside Hippo's and Crocodile's resolution) | N/A (acted upon, not acting) | NO |
| Giraffe | 8 | Swaps places with the single card immediately in front of it | Movement | On Play | The card immediately in front (automatic) | NO |
| Snake | 9 | Sorts the entire queue by Power, highest → lowest | Queue Manipulation | On Play | All cards in queue (incl. self) | YES |
| Crocodile | 10 | Eats every contiguous card with Power < 10 immediately in front of it, until it hits a Zebra or a Power ≥ 10 card | Removal / Offensive | On Play | Automatic — contiguous run of weaker cards in front | YES |
| Hippo | 11 | Pushes forward past every contiguous card with Power < 11, until it hits a Zebra or a Power ≥ 11 card; pulls all Sloth Bears behind it | Movement / Disruption | On Play | Automatic — contiguous run of weaker cards in front, plus all Sloth Bears in queue | YES |
| Lion | 12 | If another Lion is in the queue, this Lion is trashed instead. Otherwise removes all Monkeys, then moves itself to the front of the queue and pulls all Sloth Bears behind it | Removal / Movement | On Play | Automatic — other Lion (check), all Monkeys, self, all Sloth Bears | NO |

---

## Detailed Ability Information

### Weasel (Power 1)

- **Ability:** Selects the two cards in the queue with the highest Power (excluding Weasel itself), sorted descending, and sends both to `gameState.trash`. Weasel remains in the queue.
- **Category:** Removal.
- **Trigger:** On Play.
- **Target:** Automatic — no player choice. `queue.filter(c => c !== card).sort((a,b) => b.power - a.power).slice(0, 2)`.
- **Effect:** Both targets are spliced out of `gameState.queue` and pushed onto the shared `gameState.trash` (not into any player's Party — they never score for anyone).
- **Power Dependency: YES.** Targets are the two highest-Power *other* cards currently in the queue; there is no fixed Power threshold, it is a relative top-2 selection.
- **Target Count:** Up to 2 cards — fewer if fewer are available (see Edge Cases).
- **Edge cases:**
  - **Weasel is the only card in queue:** `targets` is empty; no removal happens; the "removed" log still fires with an empty target list (`cardLabel` join produces `""`).
  - **Exactly one other card in queue:** only that one card is removed (`.slice(0, 2)` safely returns 1 element).
  - **Power ties:** possible only when two different players' identical animal card are both in the queue simultaneously (each player has one of each animal). `Array.prototype.sort` is a stable sort, so tied cards keep their pre-sort (i.e., queue) relative order — this is JavaScript engine behavior, **not** an explicit tie-break rule written in the code.
  - **Multiplayer:** target selection is queue-wide and ownership-blind — Weasel can and will remove cards belonging to any player, including its own owner's other cards already in the queue, regardless of 2/3/4-player count.

### Monkey (Power 2)

- **Ability:** Always relocates itself to the back of the queue. If, after that move, the queue contains 2 or more Monkeys total, every Crocodile and every Hippo currently in the queue is removed to Trash.
- **Category:** Removal, Movement, Conditional Effect.
- **Trigger:** On Play (both parts run from the same trigger).
- **Target:** Self (unconditional reposition) + all Crocodiles/Hippos in queue (conditional on the ≥2-Monkey check).
- **Effect:**
  1. `queue.splice(index,1); queue.push(card)` — Monkey moves to the back, unconditionally, every time it is played.
  2. If `queue.filter(c => c.id === 2).length >= 2` (2 = Monkey's id/Power), the code walks the queue **back to front** and sends every card with `id === CROCODILE (10)` or `id === HIPPO (11)` to `gameState.trash`.
- **Power Dependency: NO.** Both checks (`id === 2`, `id === 10 || id === 11`) match fixed animal identities, not a relative/threshold Power comparison, even though the numeric values happen to equal those animals' Power.
- **⚠ Discrepancy vs. flavor text:** `data/cardInfo.json`'s description ("...removes all Crocodiles and Hippos and **moves them to the front**") and `README.md`'s summary ("a special group effect") do **not** match the implementation. The code sends matching Crocodiles/Hippos to **Trash**, not to the front of the queue. This documentation reflects the code; the flavor text is stale/inaccurate.
- **Target Count:** unbounded — every Crocodile and every Hippo in the queue at that moment, however many there are.
- **Edge cases:**
  - **Only 1 Monkey in queue after the move:** the removal branch never runs; only the reposition happens, and a "moved to end" log fires instead.
  - **3 or 4 Monkeys simultaneously** (only reachable in 3–4 player games, since each player owns exactly one Monkey): the same `>= 2` check fires; there is no special handling for a 3rd/4th Monkey — the purge is a one-shot boolean condition, not scaled by Monkey count.
  - **Sequential Monkeys:** if Player A's Monkey is played while the queue has 0 other Monkeys, no purge occurs. If Player B's Monkey is played afterward while A's Monkey is still in the queue, B's Monkey play now sees 2 Monkeys and *does* trigger the purge. Each Monkey's own On Play trigger is independently evaluated at the moment it resolves.
  - Crocodiles/Hippos removed this way go to the shared Trash exactly like any other removal — they never enter any player's Party.

### Kangaroo (Power 3)

- **Ability:** Jumps itself forward (toward index 0) by 1 or 2 positions, limited by how far it currently is from the front.
- **Category:** Movement.
- **Trigger:** On Play.
- **Target:** Self only. Cards it hops over receive a purely cosmetic reaction (`CARD_REACTED`, flavor `"hopped-over"`) — no state change.
- **Effect:** `maxJump = min(currentIndex, 2)`. The actual jump distance is resolved by `chooseKangarooJump(owner, maxJump, { preview })`:
  - If called in **Preview** mode (Ability Preview UI, drag-to-play), it always returns `maxJump` — the farthest legal jump — as a deliberate simplification; the real jump is decided again once the card is actually played.
  - If there is no owning player object, it defaults to `1`.
  - If the owner is an AI player, it picks a uniformly random integer in `[1, maxJump]`.
  - If the owner is the human player, it opens an interactive chooser UI and awaits the player's explicit tap/choice.
- **Power Dependency: NO.** Jump distance and eligibility depend only on queue position, never on any card's Power.
- **Edge cases:**
  - **Kangaroo is at index 0 (front) when played:** `maxJump = 0` → the ability logs "can't jump" and does nothing further. (This can only happen if Kangaroo is the very first card of a freshly-started/emptied queue.)
  - **Kangaroo is at index 1:** `maxJump = 1`, forcing a 1-position jump regardless of the theoretical 2-position max.
  - **Kangaroo at index ≥ 2:** the full 1–2 choice is offered.
  - `if(targetIndex < 0) return;` is unreachable in practice — `targetIndex = index - jump` where `jump ≤ maxJump ≤ index`, so it can never go negative. Documented as written, as defensive dead code rather than a real rule.
  - No Zebra interaction — Kangaroo ignores Zebra (unlike Hippo/Crocodile).

### Parrot (Power 4)

- **Ability, Category, Trigger, Target, Effect, Power Dependency, Target Count, Edge cases:** **Identical, line-for-line, to Weasel's implementation.** `abilities.js`'s `parrot()` and `weasel()` functions contain the same logic: excludes self, sorts remaining queue cards by Power descending, removes the top 2 to Trash. See **Weasel** above for the full, verified breakdown (including the empty-target and tie-order edge cases, which apply identically here).
- This is a real, code-level duplication — not an assumption from the (differently worded) flavor text in `data/cardInfo.json`. It is flagged again in **Design Notes** below as something worth a maintainer's attention, without recommending or making any code change here.

### Sloth Bear (Power 5)

- **Ability:** None of its own. There is no `case 5` in `resolveAbility`'s switch — playing Sloth Bear falls through to `default: console.log(...)`, which produces no queue mutation, no log entry, and no animation event.
- **Category:** Passive / Movement (as something *acted upon*, never as an actor).
- **Trigger:** N/A for its own play. Its passive behavior activates as a side effect **inside** Hippo's and Crocodile's resolution loops, and inside `moveFollowersBehind()` (called from Hippo's and Lion's resolution).
- **Target:** N/A — Sloth Bear is never the initiator.
- **Effect (passive, as observed by other animals' code):**
  1. **Inside Crocodile's loop:** Sloth Bear (Power 5 < 10) is eaten exactly like any other sub-10 card if Crocodile reaches it — there is no special exemption for it.
  2. **Inside Hippo's loop:** if the card immediately ahead of Hippo is a Sloth Bear, Hippo still passes it (Power 5 < 11 satisfies the generic push condition regardless of the identity check), but the code emits a distinct `"sticky"` reason instead of the generic `"pushed"` reason — a purely presentational difference; the positional swap itself is identical to pushing past any other sub-11 card.
  3. **`moveFollowersBehind(card, gameState)`** (called unconditionally at the end of both `hippo()` and `lion()`): every Sloth Bear currently positioned *anywhere behind* the mover's **final** index is relocated to snap directly behind it — not only Sloth Bears the mover actually passed over during its own traversal. Crocodile, Snake, Seal, Giraffe, Kangaroo, Weasel, Parrot, and Monkey never call this helper and never trigger it.
- **Power Dependency: NO.** All of the above checks are by identity (`id === SLOTH_BEAR`, `id === LION/HIPPO`) or position, never a Power comparison.
- **Edge cases:**
  - **Multiple Sloth Bears behind the same mover:** `moveFollowersBehind` iterates the followers in queue order but re-reads each follower's *live* index right before splicing it in at `moverIndex + 1`. Because each subsequent insertion happens at the same slot, the **last-processed** Sloth Bear ends up immediately behind the mover, and earlier-processed ones are pushed back one slot each time — the final relative order of 2+ Sloth Bears behind the mover is the **reverse** of their original queue order. This is a real, non-obvious consequence of the loop structure, not an intentional "priority" rule.
  - **Hippo doesn't need to actually move to trigger this:** `moveFollowersBehind(card, gameState)` is called **unconditionally** at the end of `hippo()`, even along the code path where Hippo was blocked immediately (e.g., by a Zebra right in front of it, so `index === startIndex` and no `CARD_MOVED` "push" event fires). Any Sloth Bear positioned after Hippo's (unchanged) position is still pulled in behind it.
  - **A trashed Lion does *not* trigger this:** if Lion is blocked by another Lion, the function `return`s immediately after sending itself to Trash — `moveFollowersBehind` is never reached on that path.

### Seal (Power 6)

- **Ability:** Reverses the entire queue's order in place.
- **Category:** Queue Manipulation.
- **Trigger:** On Play.
- **Target:** All cards currently in the queue, including Seal itself.
- **Effect:** `queue.reverse()` — a full, unconditional in-place reversal. The whole move is captured as one batched `QUEUE_REORDERED` animation event rather than per-card moves.
- **Power Dependency: NO.** No Power values are read or compared; only array order is affected.
- **Edge cases:**
  - **Queue of length 0 or 1 (Seal alone):** `reverse()` is a no-op; no `QUEUE_REORDERED` event is emitted (the computed `moves` list is empty), but the "reversed" log entry still fires unconditionally.
  - Seal's own position flips along with everyone else's.

### Zebra (Power 7)

- **Ability:** None of its own. There is no `case 7` in `resolveAbility`'s switch — same `default` fallthrough as Sloth Bear.
- **Category:** Passive / Protection — but **only** against Crocodile and Hippo specifically.
- **Trigger:** N/A for its own play. Checked inside Crocodile's and Hippo's traversal loops (`previous.id === CARD_IDS.ZEBRA`).
- **Target:** N/A — Zebra is never the initiator.
- **Effect:** When Crocodile's or Hippo's advance reaches a Zebra as the very next card, the loop `break`s immediately: a "stopped" log fires, Zebra itself gets a purely cosmetic `"block"` reaction, and — critically — Zebra is **never itself removed or moved** by this interaction.
- **Power Dependency: NO.** The block is an identity check (`id === ZEBRA`), not a Power comparison, even though it happens to correlate with Zebra's Power (7) being lower than both Crocodile's (10) and Hippo's (11) thresholds.
- **Edge cases / scope:**
  - Zebra provides **no protection whatsoever** against Weasel/Parrot's top-2-Power removal, Monkey's Crocodile/Hippo purge, Snake's full sort, Seal's full reverse, Giraffe's adjacent swap, or Lion's move-to-front — none of those abilities check for Zebra at all, so Zebra can be freely relocated, sorted, reversed, or (if it happens to be one of the two highest-Power cards, which never occurs since its Power is fixed at 7 and there are always higher cards possible, but worth noting the check is purely comparative) is otherwise unprotected.
  - Because Crocodile/Hippo only ever look one step ahead (`queue[index-1]`), Zebra is a guaranteed **full stop** the first time either reaches it — not merely a speed bump that gets "worn down."
  - **Multiple Zebras** (2+ players' Zebras in queue): each independently stops the first Hippo/Crocodile that reaches it; there is no combined or escalating effect coded for multiple Zebras.

### Giraffe (Power 8)

- **Ability:** Swaps places with whichever card is immediately in front of it in the queue.
- **Category:** Movement.
- **Trigger:** On Play.
- **Target:** The single card immediately in front of Giraffe — automatic, no player choice, no Power check.
- **Effect:** `swapCards(queue, index, index-1)` — a plain positional swap. Both cards get a `"hop"`-flavored `CARD_MOVED` event.
- **Power Dependency: NO.** The swap happens unconditionally regardless of the other card's Power — Giraffe will happily swap with a Lion, another Zebra, or anything else.
- **Edge cases:**
  - **Giraffe is at index 0 (front) when played:** `if(index <= 0) return;` — nothing happens at all, not even a "can't move" log (unlike Kangaroo's explicit `logCantJump`). This can only occur if Giraffe is the very first card of a freshly-emptied queue.
  - Giraffe ignores Zebra-blocking entirely (unlike Hippo/Crocodile) — it will swap directly with a Zebra in front of it.

### Snake (Power 9)

- **Ability:** Sorts the entire queue by Power, highest to lowest.
- **Category:** Queue Manipulation.
- **Trigger:** On Play.
- **Target:** All cards in the queue, including Snake itself.
- **Effect:** `queue.sort((a,b) => b.power - a.power)` — descending Power sort, captured as one batched `QUEUE_REORDERED` event.
- **Power Dependency: YES.** This is the clearest full-queue Power comparison in the game — every card's position is decided purely by its Power value relative to every other card in the queue.
- **Edge cases:**
  - **Power ties:** `Array.prototype.sort` is guaranteed stable by the ECMAScript spec, so cards with equal Power keep their pre-sort relative order — again, engine guarantee, not an explicit in-code tie-break rule.
  - **Queue of length 0 or 1:** no-op sort; the "sorted" log still fires.

### Crocodile (Power 10)

- **Ability:** Advances by eating every contiguous card with Power < 10 immediately in front of it, stopping at a Zebra or a card with Power ≥ 10.
- **Category:** Removal / Offensive.
- **Trigger:** On Play.
- **Target:** Automatic — the contiguous run of sub-10-Power cards directly in front of Crocodile, walked one at a time.
- **Effect:** Each eaten card is removed via `sendToTrash(eaten, gameState, "eaten")` (sent to `gameState.trash`, not any player's Party). Crocodile's own position advances as the queue closes up around it.
- **Power Dependency: YES.** The threshold check is `previous.power < 10`, and stopping happens at `previous.power >= 10` (or Zebra). Note the threshold is a **hardcoded literal `10`**, not a dynamic read of `card.power` — functionally equivalent today only because Crocodile's own Power is always 10; documented precisely since the code does not generalize to "target.power < source.power" as written.
- **Target Count:** Unbounded — every contiguous weaker card until the stop condition, not a fixed number.
- **Edge cases (the most intricate in the codebase):**
  - **Blocked by Zebra:** the loop `break`s inside the `if(previous.id === ZEBRA)` branch, which already logs "stopped" and emits a `"block"` reaction on the Zebra. Execution then falls through to the post-loop check below.
  - **Post-loop suppression check:** after the main loop, the code re-reads Crocodile's new position and looks at the card now immediately in front of it (`before`). **If `before.power > 10`** (i.e., the blocking card is Hippo (11) or Lion (12) specifically — not Zebra (7), not another Crocodile (10)), the function `return`s **immediately**, skipping *both* the "recoil" reaction *and* the "ate" log — **even if Crocodile did eat one or more cards earlier in the same traversal.** Net effect: a Crocodile that eats several cards and is then finally stopped by a Hippo or Lion produces **no completion log or animation at all** for that play.
  - **Blocked immediately with nothing eaten, by Hippo/Lion:** same suppression applies — the play produces literally zero log output.
  - **Blocked immediately with nothing eaten, by another Crocodile (Power 10, not > 10):** suppression does *not* apply — the "ate" log still fires, with an **empty target list** (since `eatenList` is empty), because the `before.power > 10` check is false for a Power-10 blocker.
  - **Blocked by Zebra after eating something:** because the Zebra branch already logged "stopped" *and* the post-loop check does not suppress for Zebra (Power 7, not > 10), the "ate" log fires **a second time**, listing whatever was eaten before the Zebra was reached — i.e., **two separate log lines are produced for one Crocodile play** in this specific case.
  - **Blocked by Zebra with nothing eaten:** the "stopped" log fires from the loop, and the "ate" log fires afterward too, with an empty target list — again two log lines for one play.
  - **Croc eats through to the very front of the queue** (`newIndex === 0`): the `if(newIndex > 0)` guard is false, so the suppression check is skipped entirely and the normal recoil + "ate" log always fires.

### Hippo (Power 11)

- **Ability:** Advances by pushing past every contiguous card with Power < 11 immediately in front of it (shifting them back one slot each, not removing them), stopping at a Zebra or a card with Power ≥ 11. Afterward, pulls all Sloth Bears in the queue directly behind itself.
- **Category:** Movement / Disruption.
- **Trigger:** On Play.
- **Target:** Automatic — the contiguous run of sub-11-Power cards directly in front of Hippo, plus (separately) every Sloth Bear anywhere behind Hippo's final position.
- **Effect:** Unlike Crocodile, the cards Hippo pushes past are **not removed** — they are shifted one slot back in the queue and remain there. Hippo itself advances into the vacated slots. See **Sloth Bear** above for the special "sticky" swap flavor and the unconditional `moveFollowersBehind` call (including the edge case where it fires even if Hippo never actually moved).
- **Power Dependency: YES.** The threshold check is `previous.power < 11`; like Crocodile, this is a **hardcoded literal `11`**, not a dynamic read of Hippo's own `card.power`.
- **Target Count:** Unbounded for the push (every contiguous weaker card); the Sloth-Bear pull is likewise unbounded (every Sloth Bear behind Hippo's final position, regardless of count).
- **Edge cases:**
  - **Blocked by Zebra:** loop breaks with a "stopped" log and a "block" reaction on the Zebra, exactly like Crocodile — but Hippo has **no analogous post-loop suppression check**; its own "pushed N cards" log always fires (with `n` possibly `0`), and its `CARD_MOVED` "push" event only fires `if(index !== startIndex)`.
  - **Blocked immediately (Zebra or Power ≥ 11 card right in front):** `passedCount` stays 0; the "pushed 0" log still fires; `moveFollowersBehind` is still called (see Sloth Bear edge case above).
  - Crocodile does **not** call `moveFollowersBehind` — the Sloth-Bear magnet effect is exclusive to Hippo and Lion.

### Lion (Power 12)

- **Ability:** If another Lion is already in the queue, this Lion is trashed and nothing else happens. Otherwise, every Monkey in the queue is removed to Trash, then Lion moves itself to the very front of the queue and pulls all Sloth Bears in the queue directly behind itself.
- **Category:** Removal / Movement.
- **Trigger:** On Play.
- **Target:** Automatic, in sequence — (1) check for another Lion; (2) all Monkeys in queue; (3) self (reposition); (4) all Sloth Bears in queue (via `moveFollowersBehind`).
- **Effect:**
  1. `queue.find(c => c !== card && c.id === LION)` — if found, `sendToTrash(card, ...)` on the **newly played** Lion (the earlier Lion is untouched and stays exactly where it was), log "blocked", and `return` — nothing further in this function runs.
  2. Otherwise, every Monkey (`id === MONKEY`) currently in queue is sent to Trash, in queue order, via `.forEach`.
  3. Lion is spliced out of its current spot and `unshift`ed to index 0 — front of the queue, unconditionally, **ignoring Zebra** (unlike Hippo/Crocodile, Lion never checks for a Zebra blocker).
  4. `moveFollowersBehind(card, gameState)` runs, pulling any Sloth Bears behind Lion's new front position in behind it (see Sloth Bear section for the multi-Sloth-Bear reversal behavior).
- **Power Dependency: NO.** Despite "moves to the front" reading like a Power-supremacy move, every check here (`id === LION`, `id === MONKEY`, `id === SLOTH_BEAR`) is identity-based, not a Power comparison.
- **Edge cases:**
  - **Two Lions "in the queue at once"** requires two different players' Lions, since each player owns exactly one — the check only fires when an *earlier, still-unresolved* Lion (any player's) is already sitting in the queue at the moment a second Lion is played.
  - A blocked/trashed Lion still consumes the turn and enters `gameState.trash` — it just never runs its own Monkey-purge or front-move logic.
  - **Lion already at index 0 when played** (only possible if the queue was otherwise empty): the `CARD_MOVED` "rush" event is skipped (`if(fromIndex !== 0)`), but the "moved to front" log still fires unconditionally.
  - Monkeys are purged **before** Lion physically relocates, so the order of operations never causes Lion to "pass through" a Monkey it's about to remove.

---

## Power Dependency Summary

| Animal | Power Dependency | How Power Is Used |
| --- | --- | --- |
| Weasel | YES | Selects the 2 highest-Power *other* cards in queue (relative comparison, top-2). |
| Monkey | NO | Filters by fixed animal identity (Monkey/Crocodile/Hippo ids), not a Power threshold. |
| Kangaroo | NO | Jump distance/eligibility depends only on queue position. |
| Parrot | YES | Same relative top-2-by-Power selection as Weasel (identical code). |
| Sloth Bear | NO | Has no ability of its own; passive interactions are identity/position-based. |
| Seal | NO | Full reversal; no Power values read. |
| Zebra | NO | Has no ability of its own; blocking check is identity-based (`id === ZEBRA`). |
| Giraffe | NO | Unconditional swap with the adjacent card, regardless of its Power. |
| Snake | YES | Sorts the entire queue by Power, descending. |
| Crocodile | YES | Eats cards with `power < 10` (hardcoded threshold, not a dynamic self-power read). |
| Hippo | YES | Pushes past cards with `power < 11` (hardcoded threshold, not a dynamic self-power read). |
| Lion | NO | Checks are identity-based (other Lion / Monkey / Sloth Bear), not Power comparisons. |

---

## Queue and Party/Trash Interaction Reference

| Animal | Moves self? | Removes other cards (→ Trash)? | Repositions other cards (stay in Queue)? | Can affect its own eventual Queue/Trash/Party fate directly? |
| --- | --- | --- | --- | --- |
| Weasel | No | Yes (top 2, excl. self) | No | No — stays put; fate decided later by normal Queue resolution |
| Monkey | Yes (to back) | Conditionally, all Crocodiles/Hippos | No | Yes — moving itself to the back changes when it will reach the front-of-queue resolution slots |
| Kangaroo | Yes (1–2 toward front) | No | No | Yes — same reasoning as Monkey, in the opposite direction |
| Parrot | No | Yes (top 2, excl. self) | No | No |
| Sloth Bear | No (passive only) | No | No (only gets repositioned by others) | No |
| Seal | Yes (whole-queue reverse) | No | Yes (everyone) | Yes |
| Zebra | No (passive only) | No | No | No |
| Giraffe | Yes (1 position) | No | Yes (the swapped card) | Yes |
| Snake | Yes (whole-queue sort) | No | Yes (everyone) | Yes |
| Crocodile | Yes (advances as it eats) | Yes (unbounded contiguous run) | No | Yes |
| Hippo | Yes (advances as it pushes) | No | Yes (unbounded contiguous run) | Yes |
| Lion | Yes (to front, or to Trash if blocked) | Yes (all Monkeys, conditionally) | No (aside from the Sloth Bear pull) | Yes |

No implemented ability reads from or writes to a card already resolved into a player's **Party** — every ability listed above only ever affects cards still in the shared **Queue** (or sends them to the shared **Trash**). The only two exits from the Queue are the 5-card `resolveQueue()` shift/shift/pop resolution and `resolveRemainingQueue()` at game end; no Animal ability triggers either of those early or skips them.

---

## Design Notes (observations on the current implementation)

These are documentation-accuracy observations only — **no code was changed to produce this document**, per the task's scope restrictions.

- **Weasel and Parrot share identical code.** Their `data/cardIntro.json` flavor text differs ("Clean Strong" vs. "Remove Strongest… Parrot stays"), but `abilities.js`'s `weasel()` and `parrot()` functions are line-for-line the same. Whether this is intentional (Power 1 and Power 4 deliberately sharing an effect) or a leftover from development is outside this document's scope to judge — it is simply recorded as a verified fact of the current code.
- **Monkey's flavor text (`data/cardInfo.json`) and README's summary table both describe Crocodiles/Hippos being "moved to the front,"** which does not match the implementation (`sendToTrash`, i.e., removed). This document's Current/Implemented section follows the code, not the flavor text.
- **Crocodile's post-loop log/animation suppression** (see its Edge Cases above) means some Crocodile plays that visibly ate cards produce no completion log, while others produce a duplicate log. This is a real, reproducible consequence of the current control flow, documented here for accuracy — not a proposal to fix it.
- **`gameState.lastAbility`** is written by `resolveAbility` for every ability except Monkey, but is never read anywhere else in the codebase today (verified by search). It has no observable effect on gameplay currently.

---

## Proposed / Not Implemented Abilities

**None of the abilities in this section exist in the codebase.** They are design proposals only, written to extend the existing Queue/Party/Trash/Power system described above. Implementing any of them is out of scope for this document and would require code changes not made here.

A structural note that applies to all five proposals below: `resolveAbility` dispatches strictly on `switch(card.power)`, and Powers 1–12 are all already occupied by the 12 existing animals (`data/cardInfo.json`). None of these proposals can be slotted in without either (a) extending the Power range beyond 12, or (b) some other dispatch mechanism being added alongside Power. The "Suggested Power" values below (13–17) are placeholders to illustrate the proposal, not a claim that the range is actually extendable today without further design/engineering work.

### Otter

```
Suggested Power: 13
Ability: Move one chosen card from anywhere in the Queue to the back of the Queue.
Category: Queue Manipulation, Target Manipulation
Trigger: On Play
Target: One card in the Queue, chosen by the player who played Otter (any card, including an opponent's or Otter's own player's other cards; not itself)
Effect: The chosen card is removed from its current position and reinserted at the back of the Queue. Otter itself does not move.
Power Dependency: No — the point of the ability is free choice of target regardless of Power; adding a Power restriction would narrow, not deepen, the intended "reposition anything" niche this ability fills (no existing ability lets a player choose an arbitrary target card).
Strategic Purpose: Currently no ability lets a player choose an arbitrary card to reposition — Giraffe/Kangaroo only move themselves, Snake/Seal affect everyone at once. Otter fills a genuine "single-target, player-chosen" gap and lets a player delay an opponent's card that's about to reach the front-two Party slots, or delay their own card if they want it to survive longer before Queue resolution.
Potential Balance Risk: A player-chosen target with no restriction can reliably deny an opponent a Party slot on the turn before a resolution (Queue at 4 cards, opponent's strong card sitting 1st/2nd) by shoving it to the back right before the 5th card lands. This is a strong, precisely-timed disruption tool; consider restricting it to only targeting cards other than the two front-most Queue slots, or giving it a once-per-game feel via a single copy per deck (consistent with every other animal).
```

### Owl

```
Suggested Power: 14
Ability: Reveal the top card of every opponent's deck to Owl's owner only.
Category: Information
Trigger: On Play
Target: All opponents' decks (every other seated player, 1–3 of them depending on match size); Owl's own deck is not revealed (nothing to gain from seeing your own next draw here, since it's about to become known anyway on your next turn)
Effect: No Queue/Party/Trash state changes at all — purely informational. The owner sees (client-side only) which animal is on top of each opponent's deck, until that player's next draw invalidates the reveal.
Power Dependency: No — this ability doesn't touch the Queue or compare Power values at all; it's a look-ahead tool, not a comparison-driven one.
Strategic Purpose: No implemented ability currently gives any player information beyond what's already visible on the board (Queue, Hands are opponent-hidden, Party, Trash). Owl would let the owner plan around, e.g., knowing a Crocodile or Lion is about to enter the Queue from a specific opponent, without changing any game state.
Potential Balance Risk: Because each player has exactly one copy of each animal, seeing an opponent's next card is a very strong signal (full knowledge of their remaining deck order for that one look), stronger than "peek" abilities typically are in games with larger/randomized decks. Consider revealing only a category (e.g., "high Power" vs "low Power") rather than the exact card, or limiting the reveal to a single opponent chosen by Owl's owner rather than all opponents at once, before this is implemented.
```

### Peacock

```
Suggested Power: 15
Ability: Protect one chosen card in the Queue with Power 9 or lower from being removed by any other ability, until it exits the Queue through normal Queue resolution.
Category: Protection
Trigger: On Play
Target: One card currently in the Queue with Power ≤ 9, chosen by the player who played Peacock (can be any player's card, not just the owner's own)
Effect: The target is flagged as protected. For the remainder of its time in the Queue, it cannot be sent to Trash by Weasel, Parrot, Crocodile, Lion's Monkey-purge, or Monkey's Crocodile/Hippo-purge (an ability that would remove it instead has no effect on that specific card, but still resolves normally against any other valid targets it has). The flag has no effect once the card exits the Queue via the normal 5-card resolution (into Party or Trash) — it does not persist afterward, and does not protect it from *becoming* the Trash card in that resolution.
Power Dependency: Yes — capped at Power ≤ 9 specifically so Peacock cannot be used to make Crocodile, Hippo, or Lion permanently un-removable, which would neuter Lion's own-Lion-block and Monkey's purge as counterplay against those specific high-Power threats.
Strategic Purpose: No implemented ability currently grants protection from removal — Zebra's blocking is passive, narrow (Hippo/Crocodile only), and cannot be chosen or aimed. Peacock introduces an active, player-chosen protection tool and a genuine answer to the game's many removal effects (Weasel/Parrot/Crocodile/Lion/Monkey), at the cost of only working on already-weaker cards.
Potential Balance Risk: Stacking multiple Peacocks (2+ players' copies) could protect enough of the Queue that Weasel/Parrot fizzle entirely if both of their would-be top-2 targets are protected (their effect would need a defined fallback — e.g., skip protected cards and take the next-highest unprotected ones, or simply remove fewer than 2). This fallback behavior would need to be nailed down precisely before implementation to avoid ambiguous resolution.
```

### Tortoise

```
Suggested Power: 16
Ability: If Tortoise is the specific card that lands in Trash (not Party) during a 5-card Queue resolution, its owner immediately draws one card, subject to the normal 4-card hand cap.
Category: Resource Manipulation, Conditional Effect
Trigger: On Queue Resolution (specifically: only when Tortoise occupies the "back of queue → Trash" slot at the moment `resolveQueue()` runs its shift/shift/pop)
Target: Self (its own eventual position is what the condition checks — no active targeting of other cards)
Effect: Owner draws 1 card from their own deck, obeying the existing 4-card hand-size cap (`deck.js#drawCard`'s existing rule) — if the hand is already full, the draw simply does nothing, exactly like any other draw attempt today.
Power Dependency: No — the trigger is about queue-resolution *position* (specifically the trash slot), not a Power comparison.
Strategic Purpose: Turns landing in the "unlucky" Trash slot from a pure loss into a minor consolation for one specific animal, giving players a reason to be less afraid of Tortoise ending up there, and adds a first example of a Resource Manipulation ability (currently no ability affects a player's deck/hand at all).
Potential Balance Risk: Since each player has exactly one Tortoise, this can trigger at most once per player per game, so there's no loop/engine risk — but it does require an explicit ruling for `resolveRemainingQueue()` at game end, where the "3rd+ card → Trash" branch can still occur if 3+ cards remain in the final queue. Whether Tortoise's bonus draw should still apply during that end-of-game cleanup (when there may be no deck left to draw from, or no further turns to use the drawn card) needs to be decided explicitly before implementation, since it's meaningfully different from the mid-game case.
```

### Meerkat

```
Suggested Power: 17
Ability: Return one card from the playing player's own Party back to their deck.
Category: Party Manipulation, Resource Manipulation
Trigger: On Play
Target: One card in the playing player's own Party (only reachable if that player has at least 1 card in their Party already); cannot target another player's Party
Effect: The chosen card is removed from `player.party` and placed back into `player.deck` (reshuffled in), making it drawable and playable again later — including re-triggering its ability a second time when eventually replayed.
Power Dependency: No — target selection is "any card currently in your own Party," not filtered by Power.
Strategic Purpose: No implemented ability currently reaches back into a Party pile once cards have left the Queue — every existing ability only affects the Queue or sends cards to Trash. Meerkat introduces the first Party Manipulation ability, giving a way to reclaim an early, low-value Party card for a second use later, or to "undo" an unlucky early resolution.
Potential Balance Risk: Recursion is the core risk category here — returning a high-impact Party card (Lion, Crocodile, Snake) lets a player re-trigger a decisive ability a second time, which could snowball a lead. Since only one Meerkat exists per deck, this is naturally capped at once per player per game, but consider restricting the target further (e.g., only a player's own lowest-Power Party card) before implementation, so it reads as "recover a wasted early play" rather than "replay your best card."
```

---

## Multiplayer Considerations (Proposed Abilities)

All five proposals above are written to behave identically regardless of whether the match has 2, 3, or 4 players:

- **Otter / Peacock:** target selection is always "one specific card the player points at," resolved against whatever the shared Queue contains at that moment — the Queue's contents already scale naturally with player count (more players in the match means more decks feeding the same shared Queue, but the targeting mechanism itself doesn't change).
- **Owl:** explicitly iterates "every other seated player," so it naturally scales from 1 opponent (2-player match) to 3 opponents (4-player match) with no special-casing needed, mirroring how Monkey's Crocodile/Hippo purge and Lion's Monkey purge already iterate "every matching card in queue" regardless of player count.
- **Tortoise:** the Trash slot in a Queue resolution is always exactly one card regardless of player count (`resolveQueue()`'s `pop()` is a single card every time), so this proposal is inherently player-count-agnostic.
- **Meerkat:** scoped to the acting player's own Party only, so opponent count is irrelevant to its resolution.

None of the five proposals require an ambiguous "choose the best/strongest opponent" rule of the kind the task guidance warns against — Otter/Peacock use explicit player choice, Owl/Tortoise/Meerkat have deterministic, count-scaling targets.

---

## Acceptance Checklist (for this document)

- [x] Every currently implemented Animal (all 12) is documented, including the 2 (Sloth Bear, Zebra) with no `case` of their own.
- [x] Every ability's current Power value, trigger, target, effect, and category are documented from the code.
- [x] Power Dependency is stated explicitly (YES/NO) for every implemented and proposed ability, with reasoning.
- [x] Multi-target behavior, target counts, and tie handling are documented, including where tie behavior is JS-engine-guaranteed rather than an explicit in-code rule.
- [x] Queue and Party/Trash interactions are documented per ability, including the flow through `resolveQueue()`/`resolveRemainingQueue()`.
- [x] Edge cases are documented per ability, including two verified discrepancies against `data/cardInfo.json`'s flavor text (Monkey's actual removal-not-move-to-front effect; Weasel/Parrot's code duplication) and Crocodile's log-suppression quirk.
- [x] Proposed abilities are clearly separated under "Proposed / Not Implemented," each with Power, Trigger, Target, Effect, Category, Strategic Purpose, and Balance Risk, and multiplayer behavior is addressed for all five.
- [x] No gameplay or UI code was modified to produce this document.
