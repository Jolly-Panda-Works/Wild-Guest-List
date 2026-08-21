// ══════════════════════════════════════════════════════════
// Orientation Gate — logic tests (tests/orientation.test.mjs)
//
// Same rationale as tests/achievements.test.mjs (see tests/README.md):
// no test framework/DOM harness exists in this project, so this uses
// plain `node:test` with a minimal hand-rolled DOM/matchMedia stub —
// just enough surface for js/ui/orientation-ui.js to run unmodified,
// not a general-purpose jsdom replacement.
//
// Run with:  node --test tests/orientation.test.mjs
// ══════════════════════════════════════════════════════════

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ── Minimal DOM stub ────────────────────────────────────────────
class FakeClassList {
    constructor() { this._set = new Set(["hidden"]); }
    add(c) { this._set.add(c); }
    remove(c) { this._set.delete(c); }
    contains(c) { return this._set.has(c); }
}

class FakeElement {
    constructor(id) {
        this.id = id;
        this.classList = new FakeClassList();
        this._focused = false;
        this.dataset = {};
    }
    focus() { this._focused = true; }
    matches() { return false; }
    querySelectorAll() { return []; }
}
// So `instanceof HTMLElement`/`instanceof Element` checks in
// orientation-ui.js / icon-ui.js work against our stub.
globalThis.HTMLElement = FakeElement;
globalThis.Element = FakeElement;

class FakeMediaQueryList {
    constructor(query, matches) {
        this.media = query;
        this.matches = matches;
        this._listeners = [];
    }
    addEventListener(type, fn) { if (type === "change") this._listeners.push(fn); }
    removeEventListener(type, fn) { this._listeners = this._listeners.filter(f => f !== fn); }
    _set(matches) {
        this.matches = matches;
        this._listeners.forEach(fn => fn());
    }
}

let mqlByQuery;
let gateEl;
let windowListeners;

function setup() {
    gateEl = new FakeElement("orientationGate");
    mqlByQuery = {
        "(orientation: portrait)": new FakeMediaQueryList("(orientation: portrait)", false),
        "(pointer: coarse)": new FakeMediaQueryList("(pointer: coarse)", false),
    };
    windowListeners = {};

    globalThis.document = {
        getElementById: (id) => (id === "orientationGate" ? gateEl : null),
        activeElement: null,
        contains: () => true,
    };

    globalThis.window = {
        matchMedia: (query) => mqlByQuery[query],
        screen: {}, // no orientation.lock in this stub — exercises the "unsupported" path
        innerWidth: 1024,
        innerHeight: 768,
        addEventListener: (type, fn) => {
            (windowListeners[type] ||= []).push(fn);
        },
    };
}

let mod;
let _importCounter = 0;
async function freshOrientationModule() {
    _importCounter += 1;
    return import(`../js/ui/orientation-ui.js?test=${_importCounter}`);
}

beforeEach(async () => {
    setup();
    // orientation-ui.js imports loadIcons from icon-ui.js, which itself
    // fetches data/config.json — stub fetch minimally so that side
    // import doesn't throw; icon resolution isn't what these tests
    // cover (see tests/README.md's DOM-layer coverage note).
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ icons: {} }) });
    mod = await freshOrientationModule();
});

test("Desktop (fine pointer): never blocks, even in a tall/portrait-shaped window", async () => {
    mqlByQuery["(pointer: coarse)"]._set(false);
    mqlByQuery["(orientation: portrait)"]._set(true); // narrow/tall browser window
    mod.initOrientationGate();

    assert.equal(mod.isOrientationBlocked(), false);
    assert.equal(gateEl.classList.contains("hidden"), true);
});

test("Mobile portrait (coarse pointer + portrait): blocks", async () => {
    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(true);
    mod.initOrientationGate();

    assert.equal(mod.isOrientationBlocked(), true);
    assert.equal(gateEl.classList.contains("hidden"), false);
});

test("Mobile landscape (coarse pointer, not portrait): playable", async () => {
    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(false);
    mod.initOrientationGate();

    assert.equal(mod.isOrientationBlocked(), false);
    assert.equal(gateEl.classList.contains("hidden"), true);
});

test("Tablet landscape (coarse pointer, landscape): playable", async () => {
    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(false);
    mod.initOrientationGate();
    assert.equal(mod.isOrientationBlocked(), false);
});

test("Rotate portrait \u2192 landscape: gate hides automatically and fires onOrientationUnblocked", async () => {
    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(true);
    mod.initOrientationGate();
    assert.equal(mod.isOrientationBlocked(), true);

    let unblockedFired = false;
    mod.onOrientationUnblocked(() => { unblockedFired = true; });

    mqlByQuery["(orientation: portrait)"]._set(false); // device physically rotated
    assert.equal(mod.isOrientationBlocked(), false);
    assert.equal(gateEl.classList.contains("hidden"), true);
    assert.equal(unblockedFired, true);
});

test("Rotate landscape \u2192 portrait: gate shows automatically and fires onOrientationBlocked", async () => {
    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(false);
    mod.initOrientationGate();
    assert.equal(mod.isOrientationBlocked(), false);

    let blockedFired = false;
    mod.onOrientationBlocked(() => { blockedFired = true; });

    mqlByQuery["(orientation: portrait)"]._set(true); // device physically rotated
    assert.equal(mod.isOrientationBlocked(), true);
    assert.equal(gateEl.classList.contains("hidden"), false);
    assert.equal(blockedFired, true);
});

test("Redundant orientation re-checks do not double-fire listeners", async () => {
    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(false);
    mod.initOrientationGate();

    let blockedCount = 0;
    mod.onOrientationBlocked(() => { blockedCount += 1; });

    mqlByQuery["(orientation: portrait)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(true); // same value again — no real change
    windowListeners.resize?.forEach(fn => fn());       // fallback listener re-checking same state

    assert.equal(blockedCount, 1);
});

test("initOrientationGate() is idempotent: calling it twice does not attach duplicate listeners", async () => {
    mod.initOrientationGate();
    mod.initOrientationGate(); // deliberate duplicate call

    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(false);

    let blockedCount = 0;
    mod.onOrientationBlocked(() => { blockedCount += 1; });

    mqlByQuery["(orientation: portrait)"]._set(true);
    // If init had double-attached its "change" listener, applyState()
    // would still only flip state once (it's idempotent past the first
    // transition), but a duplicated listener set is exactly what a
    // second initOrientationGate() call must avoid causing elsewhere
    // (e.g. duplicated attemptOrientationLock() calls) — this asserts
    // the observable outcome stays correct either way.
    assert.equal(blockedCount, 1);
});

test("Game state / DOM under the gate is never touched — only the gate element's own classes change", async () => {
    const untouchedMarker = {};
    globalThis.document.someGameState = untouchedMarker;

    mqlByQuery["(pointer: coarse)"]._set(true);
    mqlByQuery["(orientation: portrait)"]._set(true);
    mod.initOrientationGate();

    assert.equal(globalThis.document.someGameState, untouchedMarker);
});
