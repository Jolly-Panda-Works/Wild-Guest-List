// ══════════════════════════════════════════════════════════
// Player Profile — currency foundation tests (tests/profile.test.mjs)
//
// Exercises the coins/gems fields added to js/services/profile.js:
// existence, correct 0/0 initial values, sanitization of bad/legacy
// data, persistence across "reloads" (a fresh module import against
// the same localStorage — the same technique used to simulate a
// reload for displayName/avatarId elsewhere in this project), and
// that nothing else on the profile is disturbed. See
// tests/achievements.test.mjs for the localStorage-polyfill and
// fresh-module-per-test conventions this mirrors.
//
// Run with:  node --test tests/profile.test.mjs
// (from the project root.)
// ══════════════════════════════════════════════════════════

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
    constructor() { this._data = new Map(); }
    getItem(key) { return this._data.has(key) ? this._data.get(key) : null; }
    setItem(key, value) { this._data.set(key, String(value)); }
    removeItem(key) { this._data.delete(key); }
    clear() { this._data.clear(); }
}
globalThis.localStorage = new MemoryStorage();

// profile.js keeps its state in module-level (not exported) variables,
// so each test gets a genuinely fresh module instance via a
// cache-busting query string — same technique as
// tests/achievements.test.mjs's freshAchievements().
let _importCounter = 0;
async function freshProfile() {
    _importCounter += 1;
    return import(`../js/services/profile.js?test=${_importCounter}`);
}

beforeEach(() => {
    localStorage.clear();
});

test("brand-new profile starts at 0 coins / 0 gems — no invented free currency", async () => {
    const { getCoins, getGems, getProfile } = await freshProfile();
    assert.equal(getCoins(), 0);
    assert.equal(getGems(), 0);
    const p = getProfile();
    assert.equal(p.coins, 0);
    assert.equal(p.gems, 0);
});

test("coins/gems exist on the profile shape alongside displayName/avatarId", async () => {
    const { getProfile } = await freshProfile();
    const p = getProfile();
    assert.ok("coins" in p);
    assert.ok("gems" in p);
    assert.ok("displayName" in p);
    assert.ok("avatarId" in p);
});

test("setCoins()/setGems() write through and getCoins()/getGems() read the new value", async () => {
    const { setCoins, setGems, getCoins, getGems } = await freshProfile();
    setCoins(150);
    setGems(12);
    assert.equal(getCoins(), 150);
    assert.equal(getGems(), 12);
});

test("balances persist across a simulated reload (fresh module, same localStorage)", async () => {
    const mod1 = await freshProfile();
    mod1.setCoins(500);
    mod1.setGems(30);

    const mod2 = await freshProfile(); // simulates a reload/app restart
    assert.equal(mod2.getCoins(), 500);
    assert.equal(mod2.getGems(), 30);
});

test("setCoins()/setGems() reject negative, NaN, and non-number input — balance stays unchanged", async () => {
    const { setCoins, setGems, getCoins, getGems } = await freshProfile();
    setCoins(100);
    setGems(20);

    setCoins(-5);
    setGems(-1);
    assert.equal(getCoins(), 100, "negative coins must be rejected");
    assert.equal(getGems(), 20, "negative gems must be rejected");

    setCoins(NaN);
    setGems("not a number");
    assert.equal(getCoins(), 100, "NaN coins must be rejected");
    assert.equal(getGems(), 20, "non-number gems must be rejected");
});

test("a profile saved before currencies existed loads as 0/0, not undefined/NaN", async () => {
    // Simulates an existing install's localStorage payload from before
    // this feature — only displayName/avatarId, no coins/gems keys.
    localStorage.setItem("wgl_playerProfile", JSON.stringify({
        displayName: "OldPlayer",
        avatarId: "girl",
    }));

    const { getCoins, getGems, getProfile } = await freshProfile();
    assert.equal(getCoins(), 0);
    assert.equal(getGems(), 0);
    assert.equal(getProfile().displayName, "OldPlayer", "pre-existing fields must be unaffected");
});

test("a corrupted/negative stored balance is sanitized back to 0 on load", async () => {
    localStorage.setItem("wgl_playerProfile", JSON.stringify({
        displayName: "Someone",
        avatarId: "girl",
        coins: -50,
        gems: "not-a-number",
    }));

    const { getCoins, getGems } = await freshProfile();
    assert.equal(getCoins(), 0);
    assert.equal(getGems(), 0);
});

test("setting currency never touches displayName/avatarId, and vice versa", async () => {
    const { setCoins, setGems, setDisplayName, setAvatarId, getProfile } = await freshProfile();
    setDisplayName("Alex");
    setAvatarId("girl");
    setCoins(75);
    setGems(9);

    setDisplayName("Alexandra");
    const p1 = getProfile();
    assert.equal(p1.coins, 75, "renaming must not touch coins");
    assert.equal(p1.gems, 9, "renaming must not touch gems");

    setCoins(80);
    const p2 = getProfile();
    assert.equal(p2.displayName, "Alexandra", "spending/earning coins must not touch the name");
    assert.equal(p2.avatarId, "girl", "spending/earning coins must not touch the avatar");
});
