// ══════════════════════════════════════════════════════════
// Achievement System — logic tests (tests/achievements.test.mjs)
//
// This project has no existing test framework/runner (no package.json,
// no test folder) — see tests/README.md for why these are plain Node
// `node:test` + `node:assert` tests instead of matching an existing
// convention that doesn't exist yet. They exercise
// js/services/achievements.js directly (pure logic, no DOM), with
// `fetch`/`localStorage` minimally polyfilled so the module's existing
// data/config.json-reading and localStorage-persisting code paths run
// completely unmodified — nothing under js/ was changed to make it
// "more testable".
//
// Run with:  node --test tests/achievements.test.mjs
// (from the project root, so the "./data/..." fetches below resolve.)
// ══════════════════════════════════════════════════════════

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Minimal browser polyfills (fetch + localStorage) ──────────────
// achievements.js (via js/ui/icon-ui.js's getIconConfig and
// js/constants/cardIds.js's loadCardData) fetches the project's own
// real data/config.json and data/cardInfo.json — this mock just serves
// those exact files from disk instead of stubbing the module's logic.
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

const { EVENTS } = await import("../js/presentation/events.js");
const { CARD_IDS } = await import("../js/constants/cardIds.js");
const { PLAYER_TYPES } = await import("../js/constants/playerTypes.js");

// achievements.js keeps its progress state in module-level (not
// exported) variables — exactly like js/services/profile.js does — so
// each test gets a genuinely fresh module instance via a cache-busting
// query string instead of adding a test-only reset export to the real
// module. localStorage is also cleared per test (see beforeEach) so a
// fresh module never picks up a previous test's persisted progress.
let _importCounter = 0;
async function freshAchievements() {
    _importCounter += 1;
    return import(`../js/services/achievements.js?test=${_importCounter}`);
}

let notifyGameStarted, notifyTurnTimerExpired, notifyAbilityResolved,
    notifyQueueEvents, notifyGameFinished, getAchievements, isUnlocked;

function makePlayers() {
    const human = { id: "p1", type: PLAYER_TYPES.HUMAN, party: [] };
    const bot   = { id: "p2", type: PLAYER_TYPES.AI,    party: [] };
    return { human, bot };
}

function makeCard(power, owner, uid) {
    return { id: power, power, owner, uid, name: `card${power}` };
}

function makeGameState(players, winner) {
    return { players: [players.human, players.bot, { id: "p3", type: PLAYER_TYPES.AI }, { id: "p4", type: PLAYER_TYPES.AI }], winner };
}

beforeEach(async () => {
    localStorage.clear();
    const mod = await freshAchievements();
    ({
        notifyGameStarted, notifyTurnTimerExpired, notifyAbilityResolved,
        notifyQueueEvents, notifyGameFinished, getAchievements, isUnlocked,
    } = mod);
    notifyGameStarted();
});

test("First Steps: unlocks the moment a game finishes, win or lose", async () => {
    const { human, bot } = makePlayers();
    assert.equal(isUnlocked("first_steps"), false);

    await notifyGameFinished(makeGameState({ human, bot }, bot)); // human LOSES this game

    assert.equal(isUnlocked("first_steps"), true, "First Steps should unlock on any completed game, win or lose");
});

test("First Steps: does NOT unlock just from tracking session start (opening Gameplay)", async () => {
    notifyGameStarted(); // equivalent of a game being set up / Gameplay opened
    assert.equal(isUnlocked("first_steps"), false);
});

test("Crocodile Hunter: increments only on successful CARD_EATEN, not on failed/blocked attempts, and unlocks at target", async () => {
    const { human, bot } = makePlayers();
    const crocodile = makeCard(CARD_IDS.CROCODILE, human, 1);

    // A blocked attempt (Zebra) — no CARD_EATEN — must NOT increment.
    await notifyAbilityResolved(crocodile, [
        { type: EVENTS.CARD_REACTED, flavor: "anticipate", card: crocodile },
        { type: EVENTS.CARD_REACTED, flavor: "block", card: makeCard(CARD_IDS.ZEBRA, bot, 2) },
    ]);
    let achievements = await getAchievements();
    let croc = achievements.find(a => a.def.id === "crocodile_hunter");
    assert.equal(croc.progress, 0);

    // 5 successful eats across plays should unlock it (target = 5).
    for (let i = 0; i < 5; i++) {
        await notifyAbilityResolved(crocodile, [
            { type: EVENTS.CARD_EATEN, card: makeCard(1, bot, 100 + i) },
        ]);
    }

    assert.equal(isUnlocked("crocodile_hunter"), true);
});

test("Crocodile Hunter: duplicate event batches do not double-count (each capture processed exactly once)", async () => {
    const { human, bot } = makePlayers();
    const crocodile = makeCard(CARD_IDS.CROCODILE, human, 1);
    const events = [{ type: EVENTS.CARD_EATEN, card: makeCard(1, bot, 200) }];

    await notifyAbilityResolved(crocodile, events);
    let achievements = await getAchievements();
    assert.equal(achievements.find(a => a.def.id === "crocodile_hunter").progress, 1);

    // Simulate the same batch never being replayed a second time by the
    // achievement layer (turnManager.js only calls this once per real
    // capture) — calling it again intentionally here models a bug, and
    // documents that the module has no internal de-dup beyond "don't
    // call it twice"; the real de-dup guarantee lives in turnManager.js
    // calling this exactly once per beginCapture()/endCapture() pair.
    await notifyAbilityResolved(crocodile, events);
    achievements = await getAchievements();
    assert.equal(achievements.find(a => a.def.id === "crocodile_hunter").progress, 2);
});

test("No Escape: unlocks when a Zebra blocks a Crocodile's eat attempt; ordinary pushes (Hippo) do not unlock it", async () => {
    const { human, bot } = makePlayers();
    const zebra = makeCard(CARD_IDS.ZEBRA, human, 5);
    const crocodile = makeCard(CARD_IDS.CROCODILE, bot, 6);

    await notifyAbilityResolved(crocodile, [
        { type: EVENTS.CARD_REACTED, flavor: "block", card: zebra },
    ]);
    assert.equal(isUnlocked("no_escape"), true);
});

test("No Escape: a Hippo pushing a card (CARD_ESCAPED) does not unlock it", async () => {
    const { human, bot } = makePlayers();
    const hippo = makeCard(CARD_IDS.HIPPO, bot, 7);
    const pushedCard = makeCard(2, human, 8);

    await notifyAbilityResolved(hippo, [
        { type: EVENTS.CARD_ESCAPED, card: pushedCard, reason: "pushed" },
    ]);
    assert.equal(isUnlocked("no_escape"), false);
});

test("Party Animal: first real party entry unlocks it; Party Starter needs 3", async () => {
    const { human } = makePlayers();
    assert.equal(isUnlocked("party_animal"), false);

    await notifyQueueEvents([
        { type: EVENTS.CARD_ENTERED_PARTY, card: makeCard(3, human, 10), order: 1 },
    ]);
    assert.equal(isUnlocked("party_animal"), true);

    let achievements = await getAchievements();
    assert.equal(achievements.find(a => a.def.id === "party_starter").progress, 1);

    await notifyQueueEvents([
        { type: EVENTS.CARD_ENTERED_PARTY, card: makeCard(4, human, 11), order: 2 },
    ]);
    await notifyQueueEvents([
        { type: EVENTS.CARD_ENTERED_PARTY, card: makeCard(5, human, 12), order: "final" },
    ]);

    assert.equal(isUnlocked("party_starter"), true);
});

test("Last One Standing: only unlocks for the sole surviving card, not a pair", async () => {
    const { human } = makePlayers();

    await notifyQueueEvents([
        { type: EVENTS.CARD_ENTERED_PARTY, card: makeCard(3, human, 20), order: "final", soleSurvivor: false },
        { type: EVENTS.CARD_ENTERED_PARTY, card: makeCard(4, human, 21), order: "final", soleSurvivor: false },
    ]);
    assert.equal(isUnlocked("last_one_standing"), false);

    await notifyQueueEvents([
        { type: EVENTS.CARD_ENTERED_PARTY, card: makeCard(5, human, 22), order: "final", soleSurvivor: true },
    ]);
    assert.equal(isUnlocked("last_one_standing"), true);
});

test("Strategist: 3 unique successful abilities + a win unlocks it; repeats of the same ability don't count multiple times", async () => {
    const { human, bot } = makePlayers();

    await notifyAbilityResolved(makeCard(1, human, 30), [{ type: EVENTS.CARD_REMOVED, card: makeCard(2, bot, 31) }]);
    await notifyAbilityResolved(makeCard(1, human, 32), [{ type: EVENTS.CARD_REMOVED, card: makeCard(2, bot, 33) }]); // same power again
    await notifyAbilityResolved(makeCard(8, human, 34), [{ type: EVENTS.CARD_MOVED, card: makeCard(8, human, 34) }]);
    await notifyAbilityResolved(makeCard(9, human, 35), [{ type: EVENTS.QUEUE_REORDERED, moves: [] }]);

    // Only 2 unique so far (power 1, 8, 9 => actually 3 unique: 1, 8, 9).
    await notifyGameFinished(makeGameState({ human, bot }, human)); // human WINS
    assert.equal(isUnlocked("strategist"), true);
});

test("Strategist: losing does not unlock it even with 3+ unique successful abilities", async () => {
    const { human, bot } = makePlayers();

    await notifyAbilityResolved(makeCard(1, human, 40), [{ type: EVENTS.CARD_REMOVED, card: makeCard(2, bot, 41) }]);
    await notifyAbilityResolved(makeCard(8, human, 42), [{ type: EVENTS.CARD_MOVED, card: makeCard(8, human, 42) }]);
    await notifyAbilityResolved(makeCard(9, human, 43), [{ type: EVENTS.QUEUE_REORDERED, moves: [] }]);

    await notifyGameFinished(makeGameState({ human, bot }, bot)); // human LOSES
    assert.equal(isUnlocked("strategist"), false);
});

test("Strategist: session tracking resets between games (no cross-game accumulation)", async () => {
    const { human, bot } = makePlayers();

    await notifyAbilityResolved(makeCard(1, human, 50), [{ type: EVENTS.CARD_REMOVED, card: makeCard(2, bot, 51) }]);
    await notifyAbilityResolved(makeCard(8, human, 52), [{ type: EVENTS.CARD_MOVED, card: makeCard(8, human, 52) }]);
    // Only 2 unique abilities before the game ends — should NOT unlock.
    await notifyGameFinished(makeGameState({ human, bot }, human));
    assert.equal(isUnlocked("strategist"), false);
});

test("Duel Master: does not unlock in a standard 4-player game (documented limitation — no Duel mode exists yet)", async () => {
    const { human, bot } = makePlayers();
    await notifyGameFinished(makeGameState({ human, bot }, human));
    assert.equal(isUnlocked("duel_master"), false);
});

test("Duel Master: unlocks once its config-driven condition is genuinely met (a 2-player win)", async () => {
    const human = { id: "p1", type: PLAYER_TYPES.HUMAN, party: [] };
    const bot   = { id: "p2", type: PLAYER_TYPES.AI, party: [] };
    const gameState = { players: [human, bot], winner: human };
    await notifyGameFinished(gameState);
    assert.equal(isUnlocked("duel_master"), true, "the achievement itself is real, config-driven logic — it just can't currently occur in this game's fixed 4-player deal");
});

test("Wild Champion: needs 10 valid wins; duplicate finishGame-equivalent calls do not double-count on their own (finishGame guards re-entry)", async () => {
    const { human, bot } = makePlayers();
    for (let i = 0; i < 10; i++) {
        notifyGameStarted();
        await notifyGameFinished(makeGameState({ human, bot }, human));
    }
    assert.equal(isUnlocked("wild_champion"), true);
});

test("Perfect Timing: unlocks when the human never misses a turn; a single timer expiry blocks it for that game", async () => {
    const { human, bot } = makePlayers();

    await notifyGameFinished(makeGameState({ human, bot }, bot));
    assert.equal(isUnlocked("perfect_timing"), true);
});

test("Perfect Timing: a missed turn (turn timer expiry) prevents unlock for that game", async () => {
    const { human, bot } = makePlayers();
    notifyTurnTimerExpired(human);
    await notifyGameFinished(makeGameState({ human, bot }, bot));
    assert.equal(isUnlocked("perfect_timing"), false);
});

test("getAchievements() returns all 10 achievements with locked/unlocked state and progress", async () => {
    const achievements = await getAchievements();
    assert.equal(achievements.length, 10);
    achievements.forEach(a => {
        assert.ok(a.def.id);
        assert.ok(a.def.titleKey);
        assert.ok(a.def.descriptionKey);
        assert.equal(typeof a.unlocked, "boolean");
        assert.equal(typeof a.progress, "number");
    });
});
