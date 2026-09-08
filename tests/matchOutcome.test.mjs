// ══════════════════════════════════════════════════════════
// Match outcome / victory resolver — tests (tests/matchOutcome.test.mjs)
//
// Card Power has been fully removed from victory determination (see
// js/game/matchOutcome.js's header comment and docs/PROJECT_AUDIT.md).
// The only metric that decides a match is Party Card Count:
//
//   - A unique highest Party Card Count            -> WIN (one winner)
//   - Two or more players tied for the highest      -> DRAW (everyone
//     Party Card Count                                 at that count)
//   - A tie below first place never creates a Draw — it's just LOSS
//     for everyone not in the lead.
//
// determineMatchOutcome() is pure (no DOM/fetch/localStorage), so no
// polyfills are needed — same "keep it simple" approach as the rest of
// this project's tests (see tests/README.md).
//
// Run with:  node --test tests/matchOutcome.test.mjs
// (from the project root.)
// ══════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { determineMatchOutcome, getPlayerResult, MATCH_RESULT } from "../js/game/matchOutcome.js";

function player(id, partyCardCount) {
    // `power` deliberately included on every party card below (Case 6
    // varies it) — determineMatchOutcome() must never read it.
    return { id, party: Array.from({ length: partyCardCount }, (_, i) => ({ power: i + 1 })) };
}

// ── Case 1 — Single Winner ──────────────────────────────────────
test("Case 1 — single winner: unique highest Party Card Count wins, everyone else loses", () => {
    const players = [player("A", 8), player("B", 7), player("C", 5)];
    const outcome = determineMatchOutcome(players);

    assert.deepEqual(outcome, { type: "WIN", winnerId: "A" });
    assert.equal(getPlayerResult(players[0], outcome), MATCH_RESULT.WINNER);
    assert.equal(getPlayerResult(players[1], outcome), MATCH_RESULT.LOSS);
    assert.equal(getPlayerResult(players[2], outcome), MATCH_RESULT.LOSS);
});

// ── Case 2 — Two-way Draw ────────────────────────────────────────
test("Case 2 — two-way draw: both leaders tied for highest Party Card Count draw", () => {
    const players = [player("A", 8), player("B", 8), player("C", 5)];
    const outcome = determineMatchOutcome(players);

    assert.equal(outcome.type, "DRAW");
    assert.deepEqual(new Set(outcome.playerIds), new Set(["A", "B"]));
    assert.equal(getPlayerResult(players[0], outcome), MATCH_RESULT.DRAW);
    assert.equal(getPlayerResult(players[1], outcome), MATCH_RESULT.DRAW);
    assert.equal(getPlayerResult(players[2], outcome), MATCH_RESULT.LOSS);
});

// ── Case 3 — Three-way Draw ──────────────────────────────────────
test("Case 3 — three-way draw: all three tied leaders draw, the trailing player loses", () => {
    const players = [player("A", 7), player("B", 7), player("C", 7), player("D", 4)];
    const outcome = determineMatchOutcome(players);

    assert.equal(outcome.type, "DRAW");
    assert.deepEqual(new Set(outcome.playerIds), new Set(["A", "B", "C"]));
    for (const p of players.slice(0, 3)) {
        assert.equal(getPlayerResult(p, outcome), MATCH_RESULT.DRAW);
    }
    assert.equal(getPlayerResult(players[3], outcome), MATCH_RESULT.LOSS);
});

// ── Case 4 — Tie Below First Place ──────────────────────────────
test("Case 4 — a tie below first place is NOT a draw: the unique leader still wins outright", () => {
    const players = [player("A", 9), player("B", 7), player("C", 7), player("D", 5)];
    const outcome = determineMatchOutcome(players);

    assert.deepEqual(outcome, { type: "WIN", winnerId: "A" });
    assert.equal(getPlayerResult(players[0], outcome), MATCH_RESULT.WINNER);
    assert.equal(getPlayerResult(players[1], outcome), MATCH_RESULT.LOSS);
    assert.equal(getPlayerResult(players[2], outcome), MATCH_RESULT.LOSS);
    assert.equal(getPlayerResult(players[3], outcome), MATCH_RESULT.LOSS);
});

// ── Case 5 — All Players Equal ───────────────────────────────────
test("Case 5 — every player tied at the same count: everyone draws, nobody loses", () => {
    const players = [player("A", 6), player("B", 6), player("C", 6), player("D", 6)];
    const outcome = determineMatchOutcome(players);

    assert.equal(outcome.type, "DRAW");
    assert.deepEqual(new Set(outcome.playerIds), new Set(["A", "B", "C", "D"]));
    for (const p of players) {
        assert.equal(getPlayerResult(p, outcome), MATCH_RESULT.DRAW);
    }
});

// ── Case 6 — No Power Dependency ─────────────────────────────────
test("Case 6 — no Power dependency: changing/removing card power never changes the outcome", () => {
    const withPower = [
        { id: "A", party: [{ power: 12 }, { power: 1 }] },   // 2 cards, high power
        { id: "B", party: [{ power: 2 }, { power: 3 }] },    // 2 cards, low power
        { id: "C", party: [{ power: 11 }] },                 // 1 card, high power
    ];
    const withoutPower = [
        { id: "A", party: [{}, {}] },       // same counts, power field entirely absent
        { id: "B", party: [{}, {}] },
        { id: "C", party: [{}] },
    ];

    const outcomeWithPower = determineMatchOutcome(withPower);
    const outcomeWithoutPower = determineMatchOutcome(withoutPower);

    // Both A and B have 2 cards (the max) regardless of power -> DRAW,
    // and C (1 card) always loses. Power values above have no bearing
    // at all — the resolver never reads `.power`.
    assert.deepEqual(outcomeWithPower, outcomeWithoutPower);
    assert.equal(outcomeWithPower.type, "DRAW");
    assert.deepEqual(new Set(outcomeWithPower.playerIds), new Set(["A", "B"]));
});

// ── Edge case: nobody placed any cards (defensive, not in the spec examples) ─
test("all players tied at zero Party Cards still resolves to DRAW, not a special-cased no-op", () => {
    const players = [player("A", 0), player("B", 0), player("C", 0)];
    // All tied at 0 -> DRAW, not a special-cased "nobody played anything".
    const outcome = determineMatchOutcome(players);
    assert.equal(outcome.type, "DRAW");
    assert.deepEqual(new Set(outcome.playerIds), new Set(["A", "B", "C"]));
});
