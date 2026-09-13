// ══════════════════════════════════════════════════════════
// Tabletop gameplay layout — regression tests
// (tests/tabletopLayout.test.mjs)
//
// Task: redesign the gameplay screen into a tabletop-style layout —
// opponents seated left/top/right of the board (not one shared row),
// plus a persistent, collapsible Game Log (top-left) and Chat
// (bottom-left) on Desktop/Tablet (fine-pointer, ≥601px). Touch/mobile
// keeps its original single-row opponents and popup-only Log/Chat
// entirely unchanged.
//
// Covers:
//   1. renderOtherPlayers() (js/ui/game-ui.js) assigns each opponent to
//      exactly one of the three fixed slots (#oppSlotLeft/Top/Right)
//      by seat order and count — 1→top, 2→left+right, 3→left+top+right
//      — and never leaves a slot with more than one opponent, or
//      renders anything into an unused slot.
//   2. game.html has exactly one persistent #gameLog panel and three
//      fixed opponent slot containers, and both #gameLog/#chatPanel
//      are marked `.collapsible-panel` with a `.panel-collapse-btn`.
//   3. renderLog() (js/ui/log-ui.js) writes the same generated markup
//      into both the popup's #mobileLogContent and the persistent
//      panel's #gameLogContent — one render, two targets, no
//      duplicated log logic.
//   4. The Desktop/Tablet-only grid (css/style.css's
//      `@media (min-width: 601px) and (pointer: fine)` block) actually
//      places #gameLog/.opp-slot[data-slot]/#chatPanel/#centerArea
//      onto named grid areas, and #otherPlayers unwraps via
//      `display: contents` so its slot children participate in that
//      grid directly.
//
// This project has no DOM/layout test harness (see tests/README.md).
// Point 1 and 3 exercise the real functions against a minimal
// hand-rolled DOM stub (same pattern as tests/cardPowerDisplay.
// test.mjs); points 2 and 4 assert at the markup/CSS-source level,
// consistent with tests/desktopPartyTrash.test.mjs.
//
// Run with:  node --test tests/tabletopLayout.test.mjs
// (from the project root, so the "./data/..." fetches below resolve.)
// ══════════════════════════════════════════════════════════

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Minimal DOM stub (same shape as tests/cardPowerDisplay.test.mjs) ──
class FakeClassList {
    constructor() { this._set = new Set(); }
    add(c) { this._set.add(c); }
    remove(c) { this._set.delete(c); }
    contains(c) { return this._set.has(c); }
    toggle(c) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); return this._set.has(c); }
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
    closest() { return null; }
}
globalThis.HTMLElement = FakeElement;
globalThis.Element = FakeElement;

function stubFetch() {
    globalThis.fetch = async (url) => {
        const rel = String(url).replace(/^\.\//, "");
        const filePath = path.join(ROOT, rel);
        const body = await readFile(filePath, "utf8");
        return { ok: true, status: 200, json: async () => JSON.parse(body) };
    };
}

let elementsById;
function stubDocument() {
    elementsById = {
        oppSlotLeft:  new FakeElement("div"),
        oppSlotTop:   new FakeElement("div"),
        oppSlotRight: new FakeElement("div"),
        otherPlayers: new FakeElement("div"),
        mobileLogContent: new FakeElement("div"),
        gameLogContent:   new FakeElement("div"),
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

function makePlayer(id, { hand = [], deck = [], party = [], difficulty } = {}) {
    return { id, name: id, hand, deck, party, difficulty };
}

function makeGameState(playerIds) {
    return {
        currentPlayer: 0,
        players: playerIds.map(id => makePlayer(id, { hand: [{}], deck: [{}, {}] })),
    };
}

// ── 1. Slot assignment by opponent count ────────────────────────

test("renderOtherPlayers(): 1 opponent (2-player game) goes to the top slot only", async () => {
    const { renderOtherPlayers } = await import("../js/ui/game-ui.js");
    await renderOtherPlayers(makeGameState(["p1", "p2"]));

    assert.equal(elementsById.oppSlotTop.children.length, 1, "expected exactly one opponent in the top slot");
    assert.equal(elementsById.oppSlotLeft.children.length, 0, "left slot must stay empty with only 1 opponent");
    assert.equal(elementsById.oppSlotRight.children.length, 0, "right slot must stay empty with only 1 opponent");
    assert.equal(elementsById.oppSlotTop.children[0].dataset.slot, "top");
});

test("renderOtherPlayers(): 2 opponents (3-player game) flank left/right, top stays empty", async () => {
    const { renderOtherPlayers } = await import("../js/ui/game-ui.js");
    await renderOtherPlayers(makeGameState(["p1", "p2", "p3"]));

    assert.equal(elementsById.oppSlotLeft.children.length, 1, "expected the first opponent (seat order) in the left slot");
    assert.equal(elementsById.oppSlotRight.children.length, 1, "expected the second opponent in the right slot");
    assert.equal(elementsById.oppSlotTop.children.length, 0, "top slot must stay empty with exactly 2 opponents — no empty seat is rendered there");
});

test("renderOtherPlayers(): 3 opponents (4-player game) seat left/top/right in seat order, one each", async () => {
    const { renderOtherPlayers } = await import("../js/ui/game-ui.js");
    await renderOtherPlayers(makeGameState(["p1", "p2", "p3", "p4"]));

    assert.equal(elementsById.oppSlotLeft.children.length, 1, "expected p2 (first opponent) in the left slot");
    assert.equal(elementsById.oppSlotTop.children.length, 1, "expected p3 (second opponent) in the top slot");
    assert.equal(elementsById.oppSlotRight.children.length, 1, "expected p4 (third opponent) in the right slot");

    // Seat order, not just count: the player IDs actually land in the
    // documented left→top→right order, not some other permutation.
    assert.match(elementsById.oppSlotLeft.children[0].innerHTML, /data-player="p2"/);
    assert.match(elementsById.oppSlotTop.children[0].innerHTML, /data-player="p3"/);
    assert.match(elementsById.oppSlotRight.children[0].innerHTML, /data-player="p4"/);
});

test("renderOtherPlayers(): re-rendering clears all three slots first (no stale/duplicate opponents across turns)", async () => {
    const { renderOtherPlayers } = await import("../js/ui/game-ui.js");
    await renderOtherPlayers(makeGameState(["p1", "p2", "p3", "p4"]));
    await renderOtherPlayers(makeGameState(["p1", "p2", "p3", "p4"]));

    assert.equal(elementsById.oppSlotLeft.children.length, 1);
    assert.equal(elementsById.oppSlotTop.children.length, 1);
    assert.equal(elementsById.oppSlotRight.children.length, 1);
});

// ── 2. game.html markup ──────────────────────────────────────────

let gameHtml;
let css;
let logUiJs;
let gameUiJsSource;

test.before(async () => {
    gameHtml = await readFile(path.join(ROOT, "game.html"), "utf8");
    css = await readFile(path.join(ROOT, "css/style.css"), "utf8");
    logUiJs = await readFile(path.join(ROOT, "js/ui/log-ui.js"), "utf8");
    gameUiJsSource = await readFile(path.join(ROOT, "js/ui/game-ui.js"), "utf8");
});

test("game.html: exactly one persistent #gameLog panel and three fixed opponent slots exist", () => {
    assert.equal((gameHtml.match(/id="gameLog"/g) || []).length, 1, "expected exactly one #gameLog panel");
    assert.match(gameHtml, /id="oppSlotLeft"[^>]*data-slot="left"/);
    assert.match(gameHtml, /id="oppSlotTop"[^>]*data-slot="top"/);
    assert.match(gameHtml, /id="oppSlotRight"[^>]*data-slot="right"/);
});

test("game.html: #gameLog and #chatPanel are both collapsible-panel with a collapse toggle button", () => {
    const gameLogBlock = gameHtml.slice(gameHtml.indexOf('id="gameLog"'), gameHtml.indexOf('id="gameLog"') + 700);
    assert.match(gameLogBlock, /class="collapsible-panel"/);
    assert.match(gameLogBlock, /class="panel-collapse-btn/);

    const chatBlock = gameHtml.slice(gameHtml.indexOf('id="chatPanel"'), gameHtml.indexOf('id="chatPanel"') + 700);
    assert.match(chatBlock, /class="collapsible-panel"/);
    assert.match(chatBlock, /class="panel-collapse-btn/);
});

// ── 3. renderLog() feeds both surfaces from one render ───────────

test("renderLog(): writes the same markup into #mobileLogContent and #gameLogContent", async () => {
    const { renderLog } = await import("../js/ui/log-ui.js");
    const gameState = { logs: [{ textKey: "logPlayed", params: { card: "Lion" }, playerId: "p1", playerName: "Alice" }] };

    renderLog(gameState);

    assert.ok(elementsById.mobileLogContent.innerHTML.length > 0, "expected #mobileLogContent to be populated");
    assert.equal(
        elementsById.mobileLogContent.innerHTML,
        elementsById.gameLogContent.innerHTML,
        "expected the persistent panel to receive the exact same generated markup as the popup — one render, no duplicated log logic"
    );
});

test("log-ui.js: only one buildHTML()-equivalent render path feeds both targets (no second, hand-rolled markup builder)", () => {
    // Guards against a future edit accidentally growing a second,
    // divergent markup builder for the persistent panel instead of
    // reusing the one this task wired up: exactly one reference to
    // #gameLogContent, and both targets are assigned from the same
    // `html` variable rather than each calling buildHTML() themselves.
    const gameLogRefs = (logUiJs.match(/getElementById\(["']gameLogContent["']\)/g) || []).length;
    assert.equal(gameLogRefs, 1, "expected exactly one reference to #gameLogContent");

    const buildCalls = (logUiJs.match(/buildHTML\(\)/g) || []).length;
    assert.equal(buildCalls, 1, "expected buildHTML() to be invoked exactly once per render, shared by both targets");
});

// ── 4. Desktop/Tablet grid places the Left Utility Column, opponents, and board ─────

test("Desktop/Tablet grid (min-width: 601px, pointer: fine) places the Left Utility Column/opponents/board on named grid areas", () => {
    const desktopMediaIdx = css.indexOf("@media (min-width: 601px) and (pointer: fine) {");
    assert.ok(desktopMediaIdx !== -1, "expected the existing real-Desktop media scope to exist");
    const scoped = css.slice(desktopMediaIdx, desktopMediaIdx + 19500);

    assert.match(scoped, /#gameLayout\s*\{[^}]*display:\s*grid\s*;/, "expected #gameLayout to become a CSS Grid on Desktop/Tablet");
    assert.match(scoped, /#otherPlayers\s*\{\s*\r?\n\s*display:\s*contents\s*;/, "expected #otherPlayers to unwrap via display: contents so its slots place independently");
    assert.match(scoped, /\.opp-slot\[data-slot="left"\]\s*\{[^}]*grid-area:\s*oppLeft\s*;/);
    assert.match(scoped, /\.opp-slot\[data-slot="top"\]\s*\{[^}]*grid-area:\s*oppTop\s*;/);
    assert.match(scoped, /\.opp-slot\[data-slot="right"\]\s*\{[^}]*grid-area:\s*oppRight\s*;/);
    assert.match(scoped, /#leftUtilityColumn\s*\{[^}]*grid-area:\s*utility\s*;/, "expected the Log+Chat wrapper to be its own dedicated grid area");
    assert.match(scoped, /#centerArea\s*\{[^}]*grid-area:\s*board\s*;/);
});

test("game.html: no opponent slot is nested inside #leftUtilityColumn (Log/Chat's height changes can never move a player)", () => {
    const utilityStart = gameHtml.indexOf('id="leftUtilityColumn"');
    assert.ok(utilityStart !== -1, "expected #leftUtilityColumn to exist");
    // #leftUtilityColumn's own closing </div> is the one right after
    // #chatPanel's closing </div> — slice up to #otherPlayers (the
    // next sibling section) as a generous, simple upper bound.
    const otherPlayersStart = gameHtml.indexOf('id="otherPlayers"', utilityStart);
    const utilityBlock = gameHtml.slice(utilityStart, otherPlayersStart);

    assert.doesNotMatch(utilityBlock, /id="oppSlotLeft"/);
    assert.doesNotMatch(utilityBlock, /id="oppSlotTop"/);
    assert.doesNotMatch(utilityBlock, /id="oppSlotRight"/);
});

test("#chatPanel's persistent panel is not later re-fixed-and-centered by the Standings popup rule in the same block", () => {
    // Regression guard: the pre-existing Desktop popup rule used to be
    // `#mobileLeaderboard, #chatPanel { position: fixed; ... }`. Chat
    // is a persistent panel now, not a popup, so it must not appear in
    // that selector list anymore — otherwise the later rule would win
    // the cascade and silently pull Chat back into a centered popup.
    const desktopMediaIdx = css.indexOf("@media (min-width: 601px) and (pointer: fine) {");
    const scoped = css.slice(desktopMediaIdx, desktopMediaIdx + 19500);
    assert.doesNotMatch(
        scoped,
        /#mobileLeaderboard,\s*\r?\n?\s*#chatPanel\s*\{/,
        "expected #chatPanel to no longer be grouped with #mobileLeaderboard's fixed-centered popup rule on Desktop/Tablet"
    );
});

test(".opp-slot:empty is hidden so no empty opponent seat is ever rendered, on any layout", () => {
    assert.match(css, /\.opp-slot:empty\s*\{\s*\r?\n\s*display:\s*none\s*;/);
});

// ── 5. Game Log fixed height + internal scroll (Layout Corrections) ─

test("#gameLog gets a fixed, non-content-driven flex-basis on Desktop/Tablet, not an auto-sized/content-driven height", () => {
    const desktopMediaIdx = css.indexOf("@media (min-width: 601px) and (pointer: fine) {");
    const scoped = css.slice(desktopMediaIdx, desktopMediaIdx + 19500);

    assert.match(scoped, /#gameLog\s*\{[^}]*flex:\s*0\s+0\s+\d+%\s*;/, "expected #gameLog to have a fixed flex-basis (flex: 0 0 N%), not flex-grow based on content");
    assert.doesNotMatch(scoped, /#gameLog\s*\{[^}]*max-height\s*:/, "the work order explicitly asked not to solve this with a bare max-height on the panel itself");
});

test("#gameLog's scrollable body has overflow-y: auto and min-height: 0 (flex child that can actually shrink and scroll)", () => {
    assert.match(css, /#gameLog \.panel-collapse-body\s*\{[^}]*overflow-y:\s*auto\s*;/s);
    assert.match(css, /#gameLog \.panel-collapse-body\s*\{[^}]*min-height:\s*0\s*;/s);
});

test("renderLog(): newest entry renders first (at the top), oldest last — gameState.logs itself is left in its original order", async () => {
    const { renderLog } = await import("../js/ui/log-ui.js");
    const gameState = {
        logs: [
            { textKey: "logPlayed", params: { card: "Oldest" }, playerId: "p1" },
            { textKey: "logPlayed", params: { card: "Newest" }, playerId: "p1" },
        ],
    };
    const originalOrder = gameState.logs.map(e => e.params.card).join(",");

    renderLog(gameState);

    const html = elementsById.gameLogContent.innerHTML;
    assert.ok(html.indexOf("Newest") < html.indexOf("Oldest"), "expected the newest entry to appear before the oldest entry in the rendered markup");
    assert.equal(gameState.logs.map(e => e.params.card).join(","), originalOrder, "expected gameState.logs itself to be left in its original (append) order — only the rendered markup is reversed");
});

// ── 6. Turn indicator lives above the opponents, not the board ──

test("game.html: #gameState (turn indicator) is a direct #gameLayout child, directly before #otherPlayers", () => {
    const gameLayoutIdx = gameHtml.indexOf('id="gameLayout"');
    const gameStateIdx = gameHtml.indexOf('id="gameState"');
    const otherPlayersIdx = gameHtml.indexOf('id="otherPlayers"');
    const centerAreaIdx = gameHtml.indexOf('id="centerArea"');
    assert.ok(gameLayoutIdx !== -1 && gameStateIdx !== -1 && otherPlayersIdx !== -1 && centerAreaIdx !== -1);
    assert.ok(gameStateIdx > gameLayoutIdx, "expected #gameState to be nested inside #gameLayout");
    assert.ok(gameStateIdx < otherPlayersIdx, "expected #gameState to come before #otherPlayers (i.e. above the opponents)");
    assert.ok(otherPlayersIdx < centerAreaIdx, "expected #otherPlayers to still come before #centerArea (the board)");
});

// ── 7. Standalone Leaderboard panel removed from the gameplay screen ─

test("game.html: the standalone Leaderboard button/panel no longer exists on the gameplay screen", () => {
    assert.doesNotMatch(gameHtml, /id="leaderboardBtn"/);
    assert.doesNotMatch(gameHtml, /id="mobileLeaderboard"/);
    assert.doesNotMatch(gameHtml, /id="mobileLeaderboardInline"/);
});

test("game.html: every player already has a live rank badge beside their name (local player + opponents) — not re-implemented, just verified intact", () => {
    assert.match(gameHtml, /id="playerDeckRankBadge"/, "expected the local player's existing rank badge slot beside #playerDeckName");
    const gameUiJs_ = gameUiJsSource;
    assert.match(gameUiJs_, /getPlayerRankIndexes\(gameState\)/, "expected renderPlayerDeckInfo()/renderOtherPlayers() to keep computing rank live from gameState, never a hard-coded number");
});
