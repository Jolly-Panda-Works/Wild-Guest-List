// ══════════════════════════════════════════════════════════
// Reward Popup dev trigger — tests (tests/rewardPopupDevTrigger.test.mjs)
//
// Two things matter most here:
//   1. The test snapshots are self-consistent: their `.outcome` is
//      always computed through the SAME resolver a real match uses
//      (js/game/matchOutcome.js), never hand-authored to match
//      whatever label we expect to see.
//   2. The Production safety gate is real: outside a Development
//      environment, initRewardPopupDevTrigger() must not register a
//      keyboard listener or expose the console API — a genuine no-op,
//      not just a hidden feature.
//
// This project has no DOM test harness (see tests/README.md) — like
// achievements.test.mjs/profile.test.mjs/orientation.test.mjs, the
// actual popup rendering (showEndGame() populating #endGameScreen) is
// a "Known gap" here too, verified by manual browser testing instead
// (Ctrl+Alt+R/D/L/O and window.__wglRewardPopupTest on a local
// `python -m http.server` — see README.md § Development/Test Mode).
//
// Run with:  node --test tests/rewardPopupDevTrigger.test.mjs
// (from the project root.)
// ══════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { determineMatchOutcome, getPlayerResult, MATCH_RESULT } from "../js/game/matchOutcome.js";
import { SCENARIOS, buildTestSnapshot } from "../js/dev/rewardPopupDevTrigger.js";

// ── Snapshot builder (pure, no DOM) ─────────────────────────────
test("every scenario's snapshot has 4 players with the exact configured Party Card Counts", () => {
    for (const key of Object.keys(SCENARIOS)) {
        const snapshot = buildTestSnapshot(key);
        assert.equal(snapshot.players.length, 4);
        assert.deepEqual(snapshot.players.map(p => p.party.length), SCENARIOS[key]);
        assert.deepEqual(snapshot.players.map(p => p.id), ["p1", "p2", "p3", "p4"]);
    }
});

test("each scenario's outcome is derived from the real resolver, not hand-authored", () => {
    for (const key of Object.keys(SCENARIOS)) {
        const snapshot = buildTestSnapshot(key);
        // Recompute independently straight from the same counts and
        // compare — proves buildTestSnapshot() didn't just invent an
        // outcome object matching the scenario's name.
        const expected = determineMatchOutcome(snapshot.players);
        assert.deepEqual(snapshot.outcome, expected);
    }
});

test("\"win\" scenario: p1 is WINNER, everyone else is LOSS", () => {
    const { players, outcome } = buildTestSnapshot("win");
    const [p1, p2, p3, p4] = players;
    assert.equal(getPlayerResult(p1, outcome), MATCH_RESULT.WINNER);
    assert.equal(getPlayerResult(p2, outcome), MATCH_RESULT.LOSS);
    assert.equal(getPlayerResult(p3, outcome), MATCH_RESULT.LOSS);
    assert.equal(getPlayerResult(p4, outcome), MATCH_RESULT.LOSS);
});

test("\"draw\" scenario: p1 is DRAW (tied for the lead)", () => {
    const { players, outcome } = buildTestSnapshot("draw");
    const [p1, p2] = players;
    assert.equal(outcome.type, "DRAW");
    assert.equal(getPlayerResult(p1, outcome), MATCH_RESULT.DRAW);
    assert.equal(getPlayerResult(p2, outcome), MATCH_RESULT.DRAW);
});

test("\"loss\" scenario: p1 is LOSS with a unique other winner", () => {
    const { players, outcome } = buildTestSnapshot("loss");
    const [p1] = players;
    assert.equal(outcome.type, "WIN");
    assert.equal(getPlayerResult(p1, outcome), MATCH_RESULT.LOSS);
});

test("\"lossToDraw\" scenario: p1 is LOSS while two other players DRAW for the lead", () => {
    const { players, outcome } = buildTestSnapshot("lossToDraw");
    const [p1, p2, p3] = players;
    assert.equal(outcome.type, "DRAW");
    assert.equal(getPlayerResult(p1, outcome), MATCH_RESULT.LOSS);
    assert.equal(getPlayerResult(p2, outcome), MATCH_RESULT.DRAW);
    assert.equal(getPlayerResult(p3, outcome), MATCH_RESULT.DRAW);
});

test("an unknown scenario key returns null instead of throwing or guessing", () => {
    assert.equal(buildTestSnapshot("not-a-real-scenario"), null);
});

// ── Production safety gate ──────────────────────────────────────
// Stubs just enough of `document`/`window` to prove the gate itself —
// not a DOM harness. A real call would additionally reach into
// js/ui/endgame-ui.js (document.getElementById, fetch for icons,
// etc.) — see the "Known gap" note above for why that part is
// verified manually instead.
test("outside Development: init() registers no keyboard listener and exposes no console API", async () => {
    const { initRewardPopupDevTrigger } = await import(`../js/dev/rewardPopupDevTrigger.js?test=${Date.now()}-a`);

    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    let addEventListenerCalls = 0;
    globalThis.window = { location: { hostname: "wildguestlist.com", protocol: "https:" } };
    globalThis.document = {
        addEventListener: () => { addEventListenerCalls += 1; },
        getElementById: () => null,
    };

    try {
        initRewardPopupDevTrigger();
        assert.equal(addEventListenerCalls, 0, "no keydown listener may be registered outside Development");
        assert.equal(globalThis.window.__wglRewardPopupTest, undefined, "no console API may be exposed outside Development");
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    }
});

test("inside Development (localhost): init() registers the keyboard listener and exposes the console API", async () => {
    const { initRewardPopupDevTrigger } = await import(`../js/dev/rewardPopupDevTrigger.js?test=${Date.now()}-b`);

    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    let addEventListenerCalls = 0;
    globalThis.window = { location: { hostname: "localhost", protocol: "http:" } };
    globalThis.document = {
        addEventListener: () => { addEventListenerCalls += 1; },
        getElementById: () => null,
    };

    try {
        initRewardPopupDevTrigger();
        assert.equal(addEventListenerCalls, 1, "exactly one keydown listener should be registered in Development");
        assert.equal(typeof globalThis.window.__wglRewardPopupTest, "object");
        assert.equal(typeof globalThis.window.__wglRewardPopupTest.win, "function");
        assert.equal(typeof globalThis.window.__wglRewardPopupTest.draw, "function");
        assert.equal(typeof globalThis.window.__wglRewardPopupTest.loss, "function");
        assert.equal(typeof globalThis.window.__wglRewardPopupTest.lossToDraw, "function");
    } finally {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    }
});
