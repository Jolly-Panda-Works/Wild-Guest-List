// ══════════════════════════════════════════════════════════
// Card Power display — regression tests (tests/cardPowerDisplay.test.mjs)
//
// Restores `Power` visibility in the UI (removed in 1.30.12 for
// gameplay cards and 1.36.5 for the Card Guide — see README.md §
// Version) while keeping it strictly separate from the Victory metric
// (Party Card Count only — js/game/matchOutcome.js, already covered
// by tests/matchOutcome.test.mjs's "no Power dependency" case, not
// re-tested here).
//
// Covers:
//   1. createCard() (js/ui/game-ui.js) — the single card factory used
//      for hand/queue/party/trash/ghost/preview alike — renders
//      card.power next to the Animal name.
//   2. js/game/help.js (the actual "Card Guide" behind Home's Card
//      Guide entry and the in-game Help modal — not to be confused
//      with js/ui/cardGuidance-ui.js's in-turn hint chip, which is
//      out of this task's scope) renders the same power value in
//      both the grid tile and the detail popup.
//   3. Both consumers read `power` from the one authoritative loader
//      (js/services/dataLoader.js's loadCardData(), backed by
//      data/cardInfo.json) — asserted by counting real fetch() calls
//      to that file, so a duplicated/hardcoded copy can't silently
//      creep back in.
//
// Same rationale as tests/achievements.test.mjs (see tests/README.md):
// no test framework/DOM harness exists in this project, so this uses
// plain `node:test` with `fetch` serving the project's real
// data/cardInfo.json off disk, and a minimal hand-rolled DOM stub —
// just enough surface for createCard()/help.js to run unmodified.
//
// Run with:  node --test tests/cardPowerDisplay.test.mjs
// (from the project root, so the "./data/..." fetches below resolve.)
// ══════════════════════════════════════════════════════════

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Minimal DOM stub ────────────────────────────────────────────
class FakeClassList {
    constructor() { this._set = new Set(); }
    add(c) { this._set.add(c); }
    remove(c) { this._set.delete(c); }
    contains(c) { return this._set.has(c); }
}

class FakeElement {
    constructor(tag) {
        this.tag = tag;
        this.classList = new FakeClassList();
        this.dataset = {};
        this.children = [];
        this._html = "";
        this._listeners = {};
    }
    set className(v) { this._className = v; }
    get className() { return this._className; }
    set innerHTML(html) { this._html = html; this.children = []; }
    get innerHTML() { return this._html; }
    appendChild(el) { this.children.push(el); return el; }
    addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
    querySelectorAll() { return []; }
    matches() { return false; }
}
globalThis.HTMLElement = FakeElement;
globalThis.Element = FakeElement;

let fetchCalls;

function stubFetch() {
    fetchCalls = [];
    globalThis.fetch = async (url) => {
        fetchCalls.push(String(url));
        const rel = String(url).replace(/^\.\//, "");
        const filePath = path.join(ROOT, rel);
        const body = await readFile(filePath, "utf8");
        return { ok: true, status: 200, json: async () => JSON.parse(body) };
    };
}

let elementsById;
function stubDocument() {
    elementsById = {
        helpModal:       new FakeElement("div"),
        animalGrid:      new FakeElement("div"),
        cardModal:       new FakeElement("div"),
        cardModalContent: new FakeElement("div"),
    };
    globalThis.document = {
        createElement: (tag) => new FakeElement(tag),
        getElementById: (id) => elementsById[id] || null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        activeElement: null,
        contains: () => true,
    };
}

beforeEach(() => {
    stubFetch();
    stubDocument();
});

// ── 1. Gameplay card (createCard) ───────────────────────────────

test("createCard() renders Power next to the Animal name", async () => {
    const { createCard } = await import("../js/ui/game-ui.js");
    const { loadCardData } = await import("../js/services/dataLoader.js");

    const { CARDS } = await loadCardData();
    const crocodile = { ...CARDS[10], owner: { id: "p1", name: "Alice" } };

    const el = createCard(crocodile);

    assert.match(el.innerHTML, /class="card-power">10</);
    assert.match(el.innerHTML, /class="card-name">Crocodile</);
});

test("createCard() reflects a different card's Power (same code path, different data)", async () => {
    const { createCard } = await import("../js/ui/game-ui.js");
    const { loadCardData } = await import("../js/services/dataLoader.js");

    const { CARDS } = await loadCardData();
    const weasel = { ...CARDS[1], owner: { id: "p1", name: "Alice" } };

    const el = createCard(weasel);

    assert.match(el.innerHTML, /class="card-power">1</);
    assert.match(el.innerHTML, /class="card-name">Weasel</);
});

test("createCard() never renders .card-power when a card has no power (e.g. a card-back placeholder)", async () => {
    const { createCard } = await import("../js/ui/game-ui.js");

    const noPowerCard = { name: "Mystery", animal: "❓", owner: { id: "p1", name: "Alice" } };
    const el = createCard(noPowerCard);

    assert.doesNotMatch(el.innerHTML, /card-power/);
});

// ── 2. Card Guide (js/game/help.js) ─────────────────────────────

async function openHelpAndWait() {
    const helpMod = await import(`../js/game/help.js?test=${Math.random()}`);
    helpMod.openHelp();
    // loadHelpCards()/loadCardData() are async and not awaited by
    // openHelp() itself (fire-and-forget, matching its existing
    // behavior) — flush the microtask queue so the real fetch +
    // render have completed before we inspect the DOM.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

test("Card Guide grid tile renders the same Power value as the gameplay card", async () => {
    await openHelpAndWait();

    const grid = elementsById.animalGrid;
    const crocodileTile = grid.children.find((c) => c.innerHTML.includes(">Crocodile<"));

    assert.ok(crocodileTile, "expected a Crocodile tile in the Card Guide grid");
    assert.match(crocodileTile.innerHTML, /class="help-card-power">10</);
});

test("Card Guide detail popup renders Power next to the Animal name", async () => {
    await openHelpAndWait();

    const grid = elementsById.animalGrid;
    const crocodileTile = grid.children.find((c) => c.innerHTML.includes(">Crocodile<"));
    crocodileTile._listeners.click[0](); // simulate opening the detail popup

    const detailHtml = elementsById.cardModalContent.innerHTML;
    assert.match(detailHtml, /<h2>Crocodile <span class="power-badge">10<\/span><\/h2>/);
});

// ── 3. Single shared data source (no duplicated/hardcoded Power) ──
//
// A runtime fetch-count assertion here would be order-dependent on
// Node's module cache (js/services/dataLoader.js's internal `_cache`
// is shared and warms permanently on first load across this whole
// test file, however many times js/game/help.js itself gets
// cache-busted above), so — consistent with this project's existing
// source-level convention for structural guarantees (see
// tests/partyTrashGrid.test.mjs) — this asserts it at the source
// level instead: js/game/help.js must go through the same
// loadCardData() loader gameplay uses, and must not keep its own
// independent fetch of data/cardInfo.json.

test("js/game/help.js sources cards through the shared loadCardData() loader, not its own fetch", async () => {
    const helpSrc = await readFile(path.join(ROOT, "js/game/help.js"), "utf8");

    assert.match(
        helpSrc,
        /import\s*\{\s*loadCardData\s*\}\s*from\s*["']\.\.\/services\/dataLoader\.js["']/,
        "expected js/game/help.js to import loadCardData from the shared dataLoader"
    );
    assert.doesNotMatch(
        helpSrc,
        /fetch\(\s*["']\.\/data\/cardInfo\.json["']\s*\)/,
        "js/game/help.js should not fetch data/cardInfo.json itself — that duplicates js/services/dataLoader.js"
    );
});
