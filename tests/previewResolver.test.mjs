// ══════════════════════════════════════════════════════════
// Ability Preview Resolver — logic tests (tests/previewResolver.test.mjs)
//
// Exercises js/abilities/previewResolver.js directly (pure logic, no
// DOM) — same node:test + node:assert/strict approach as the rest of
// this project's tests (see tests/README.md), with `fetch` polyfilled
// to serve the project's own real data/cardInfo.json (needed by
// js/constants/cardIds.js) and data/i18n.json unmodified.
//
// These tests double as the "does Preview match real gameplay?" check
// called for throughout the feature brief: several assert the SAME
// resolveAbility() rules previewAbility() runs against a shadow Queue
// really do produce the actions we expect (Escape, Defend, Attach,
// MoveToSlot, Remove, Stay).
//
// Run with:  node --test tests/*.test.mjs
// (from the project root, so the "./data/..." fetches below resolve.)
// ══════════════════════════════════════════════════════════

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

globalThis.fetch = async (url) => {
    const rel = String(url).replace(/^\.\//, "");
    const filePath = path.join(ROOT, rel);
    const body = await readFile(filePath, "utf8");
    return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(body),
    };
};

class MemoryStorage {
    constructor() { this._data = new Map(); }
    getItem(key) { return this._data.has(key) ? this._data.get(key) : null; }
    setItem(key, value) { this._data.set(key, String(value)); }
    removeItem(key) { this._data.delete(key); }
    clear() { this._data.clear(); }
}
globalThis.localStorage = new MemoryStorage();

const { previewAbility } = await import("../js/abilities/previewResolver.js");
const { PREVIEW_ACTIONS } = await import("../js/abilities/previewActions.js");

// Card powers, per data/cardInfo.json (id === power for every card —
// see js/services/dataLoader.js).
const WEASEL = 1, KANGAROO = 3, SLOTH_BEAR = 5, ZEBRA = 7, SNAKE = 9, HIPPO = 11, LION = 12;

let uidCounter = 0;
function makeCard(power, owner) {
    uidCounter += 1;
    return { id: power, power, owner, uid: uidCounter, name: `card${power}`, animal: "", translations: {} };
}

function makeGameState(queue) {
    const owner = { id: "p1", name: "Player" };
    return { queue, players: [owner], round: 1, currentPlayer: 0, logs: [], lastAbility: null, gameOver: false, winner: null };
}

let owner;
beforeEach(() => {
    owner = { id: "p1", name: "Player" };
});

test("Weasel removes the two strongest, the weakest stays (STAY)", async () => {
    const weak   = makeCard(2, owner);
    const medium = makeCard(3, owner);
    const strong = makeCard(4, owner);
    const gameState = makeGameState([weak, medium, strong]);
    const dragged = makeCard(WEASEL, owner);

    const result = await previewAbility(dragged, gameState);

    assert.equal(result.canEnterQueue, true);
    const byUid = new Map(result.queueActions.map(a => [a.uid, a.action]));
    assert.equal(byUid.get(strong.uid).type, PREVIEW_ACTIONS.REMOVE);
    assert.equal(byUid.get(medium.uid).type, PREVIEW_ACTIONS.REMOVE);
    assert.equal(byUid.get(weak.uid).type, PREVIEW_ACTIONS.STAY);
});

test("a duplicate Lion never enters the Queue — Escape, no queue overlays", async () => {
    const existingLion = makeCard(LION, owner);
    const tiger = makeCard(6, owner);
    const gameState = makeGameState([existingLion, tiger]);
    const draggedLion = makeCard(LION, owner);

    const result = await previewAbility(draggedLion, gameState);

    assert.equal(result.canEnterQueue, false);
    assert.equal(result.cardAction.type, PREVIEW_ACTIONS.ESCAPE);
    assert.deepEqual(result.queueActions, []);

    // The real Queue must be completely untouched by computing a preview.
    assert.equal(gameState.queue.length, 2);
    assert.equal(gameState.queue[0], existingLion);
});

test("Zebra defends against a Hippo pushing through — Defend, Hippo itself doesn't move", async () => {
    const zebra = makeCard(ZEBRA, owner);
    const gameState = makeGameState([zebra]);
    const draggedHippo = makeCard(HIPPO, owner);

    const result = await previewAbility(draggedHippo, gameState);

    assert.equal(result.canEnterQueue, true);
    assert.equal(result.cardAction, null); // Hippo never moved — nothing to show on it
    assert.equal(result.queueActions.length, 1);
    assert.equal(result.queueActions[0].action.type, PREVIEW_ACTIONS.DEFEND);
});

test("Sloth Bear sticks behind a Hippo that passes over it — Attach", async () => {
    const slothBear = makeCard(SLOTH_BEAR, owner);
    const gameState = makeGameState([slothBear]);
    const draggedHippo = makeCard(HIPPO, owner);

    const result = await previewAbility(draggedHippo, gameState);

    assert.equal(result.canEnterQueue, true);
    assert.equal(result.queueActions.length, 1);
    assert.equal(result.queueActions[0].action.type, PREVIEW_ACTIONS.ATTACH);
    // Attach is a real gameplay outcome, not just a visual — the real
    // Queue is untouched by the preview itself either way.
    assert.equal(gameState.queue[0], slothBear);
});

test("Snake's full sort — cards that actually move get MoveToSlot with the real destination, others Stay", async () => {
    const high = makeCard(10, owner); // Crocodile's power, but Snake's sort only cares about the number
    const low  = makeCard(2, owner);  // Monkey's power — deliberately alone (no 2nd Monkey), so no group-effect interaction muddies this
    const gameState = makeGameState([high, low]);
    const draggedSnake = makeCard(SNAKE, owner);

    const result = await previewAbility(draggedSnake, gameState);

    assert.equal(result.canEnterQueue, true);
    const byUid = new Map(result.queueActions.map(a => [a.uid, a.action]));

    // Shadow queue before sort: high(10) @0, low(2) @1, Snake(9) @2.
    // After sort (desc by power): high(10) @0 — unchanged — then
    // Snake(9) @1, then low(2) @2 (moved from 1 to 2).
    assert.equal(byUid.get(high.uid).type, PREVIEW_ACTIONS.STAY);
    assert.equal(byUid.get(low.uid).type, PREVIEW_ACTIONS.MOVE_TO_SLOT);
    assert.equal(byUid.get(low.uid).targetSlot, 3);

    assert.equal(result.cardAction.type, PREVIEW_ACTIONS.MOVE_TO_SLOT);
    assert.equal(result.cardAction.targetSlot, 2);
});

test("Kangaroo jumping forward gets an explicit MoveToSlot destination on itself", async () => {
    const a = makeCard(2, owner);
    const b = makeCard(3, owner);
    const gameState = makeGameState([a, b]); // Kangaroo enters at index 2, maxJump = 2
    const draggedKangaroo = makeCard(KANGAROO, owner);

    const result = await previewAbility(draggedKangaroo, gameState);

    assert.equal(result.canEnterQueue, true);
    assert.equal(result.cardAction.type, PREVIEW_ACTIONS.MOVE_TO_SLOT);
    assert.equal(result.cardAction.targetSlot, 1); // jumps the full 2 spaces to the front
});

test("Lion rushing to the front displaces others generically (MoveBack), not MoveToSlot", async () => {
    const a = makeCard(6, owner); // Seal — deliberately not Monkey/Lion so it's a pure "displaced by Lion's rush" case
    const b = makeCard(8, owner); // Giraffe
    const gameState = makeGameState([a, b]);
    const draggedLion = makeCard(LION, owner);

    const result = await previewAbility(draggedLion, gameState);

    assert.equal(result.canEnterQueue, true);
    assert.equal(result.cardAction.type, PREVIEW_ACTIONS.MOVE_TO_SLOT);
    assert.equal(result.cardAction.targetSlot, 1);

    const byUid = new Map(result.queueActions.map(x => [x.uid, x.action]));
    assert.equal(byUid.get(a.uid).type, PREVIEW_ACTIONS.MOVE_BACK);
    assert.equal(byUid.get(b.uid).type, PREVIEW_ACTIONS.MOVE_BACK);
});

test("previewAbility never mutates the real gameState it is given", async () => {
    const a = makeCard(2, owner);
    const b = makeCard(3, owner);
    const gameState = makeGameState([a, b]);
    const dragged = makeCard(WEASEL, owner);
    const snapshotBefore = [...gameState.queue];

    await previewAbility(dragged, gameState);

    assert.deepEqual(gameState.queue, snapshotBefore);
    assert.equal(gameState.queue.length, 2);
});
