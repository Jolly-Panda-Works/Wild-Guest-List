// ══════════════════════════════════════════════════════════
// Reward Popup (#endGameScreen) action buttons — visual parity
// with the Pause Popup, via shared-component reuse
// (tests/endgameActionButtons.test.mjs)
//
// The screen shown at the end of every match is referred to
// throughout the docs/codebase as the "Reward Popup"
// (#endGameScreen, game.html).
//
// Task: the Reward Popup's Return to Home / Play Again buttons must
// be visually identical to the Pause Popup's actions (size, height,
// width, border/radius, typography, icon alignment, spacing,
// hover/active state) — reusing the Pause Popup's existing shared
// button implementation rather than duplicating similar-looking CSS
// under a second set of class names.
//
// Fix: the Reward Popup's two buttons now use the exact same classes
// as the Pause Popup's actions — `.pause-action` (button),
// `.pause-action-icon.top-btn` (icon), `.pause-action-label` (label)
// — inside a `.pause-actions` row, instead of the old
// `.screen-btn`/`.endgame-btn-primary`/`.endgame-btn-secondary`
// pattern. No new button-visual CSS was added for the Reward Popup;
// `.endgame-actions` (still present as a second class on the row)
// is kept purely as a page-scoped layout hook, and carries no
// button styling of its own. Button ids, `type="button"`, and click
// wiring (js/game-main.js) are unchanged — only presentation moved.
//
// This project has no DOM/layout test harness (see tests/README.md),
// so — consistent with the pattern used for other CSS-only fixes in
// this codebase — this test asserts the fix at the CSS/HTML source
// level.
//
// Run with:  node --test tests/endgameActionButtons.test.mjs
// (from the project root.)
// ══════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let css;
let gameHtml;

test.before(async () => {
    css = await readFile(path.join(ROOT, "css/style.css"), "utf8");
    gameHtml = await readFile(path.join(ROOT, "game.html"), "utf8");
});

// Extracts the declaration block `{ ... }` for the first rule whose
// selector text contains `selectorSubstr`, scoped to search starting
// at `fromIndex`.
function findDeclBlock(source, selectorSubstr, fromIndex = 0) {
    const selIdx = source.indexOf(selectorSubstr, fromIndex);
    if (selIdx === -1) return null;
    const openIdx = source.indexOf("{", selIdx);
    const closeIdx = source.indexOf("}", openIdx);
    if (openIdx === -1 || closeIdx === -1) return null;
    return { block: source.slice(openIdx + 1, closeIdx), endIndex: closeIdx };
}

test("game.html: the Reward Popup still has exactly two action buttons, same ids/click targets, inside a .pause-actions row", () => {
    assert.match(
        gameHtml,
        /<div class="pause-actions endgame-actions">/,
        "expected the Reward Popup's actions row to reuse .pause-actions (Pause Popup's shared row) alongside the .endgame-actions layout hook"
    );
    assert.match(
        gameHtml,
        /<button id="returnHomeBtn" type="button" class="pause-action">/,
        "returnHomeBtn's id/type must be unchanged so its click wiring in js/game-main.js keeps working, and it must reuse .pause-action — not a duplicated button style"
    );
    assert.match(
        gameHtml,
        /<button id="playAgainBtn" type="button" class="pause-action">/,
        "playAgainBtn's id/type must be unchanged so its click wiring in js/game-main.js keeps working, and it must reuse .pause-action — not a duplicated button style"
    );
});

test("game.html: both Reward Popup buttons reuse the Pause Popup's exact icon/label markup", () => {
    const endGameIdx = gameHtml.indexOf('id="endGameScreen"');
    assert.ok(endGameIdx !== -1, "expected an #endGameScreen element to exist");
    const nextSectionIdx = gameHtml.indexOf('id="tutorialModal"', endGameIdx);
    const endGameSection = gameHtml.slice(endGameIdx, nextSectionIdx === -1 ? undefined : nextSectionIdx);

    const iconRe = /<span class="pause-action-icon top-btn" data-icon="(home|pauseRestart)"><\/span>/g;
    const icons = [...endGameSection.matchAll(iconRe)].map((m) => m[1]);
    assert.deepEqual(
        icons.sort(),
        ["home", "pauseRestart"].sort(),
        "expected both Reward Popup icons to use .pause-action-icon.top-btn — the same icon-box implementation as the Pause Popup's actions"
    );

    const labelRe = /<span class="pause-action-label" data-i18n="(endReturnHome|playAgain)">/g;
    const labels = [...endGameSection.matchAll(labelRe)].map((m) => m[1]);
    assert.deepEqual(
        labels.sort(),
        ["endReturnHome", "playAgain"].sort(),
        "expected both endReturnHome and playAgain labels to carry .pause-action-label — the same label implementation as the Pause Popup's actions"
    );
});

test("game.html: the Reward Popup defines no separate/duplicated button-visual classes", () => {
    assert.doesNotMatch(
        gameHtml,
        /endgame-btn-(primary|secondary|icon|label)/,
        "the old endgame-btn-* duplicated button-styling classes must be gone from game.html — the Reward Popup now reuses .pause-action instead"
    );
});

test("css/style.css: no separate endgame-btn-* button-visual rules remain (styling comes only from the shared .pause-action implementation)", () => {
    assert.doesNotMatch(
        css,
        /\.endgame-btn-(primary|secondary|icon|label)\s*\{/,
        "expected the old duplicated .endgame-btn-* button-visual rules to be removed — Reward Popup buttons must get their look only from .pause-action/.pause-action-icon/.pause-action-label"
    );
});

test(".pause-action / .pause-action-icon.top-btn / .pause-action-label — the single shared button implementation both popups render through — still exist with their defining properties", () => {
    const actionsFound = findDeclBlock(css, ".pause-actions {");
    assert.ok(actionsFound, "expected a .pause-actions row rule to exist");
    assert.match(actionsFound.block, /display:\s*flex\s*;/, "expected the shared actions row to stay a flex row");
    assert.match(actionsFound.block, /justify-content:\s*center\s*;/, "expected the shared actions row to stay centered");

    const actionFound = findDeclBlock(css, ".pause-action {");
    assert.ok(actionFound, "expected a .pause-action rule to exist");
    assert.match(actionFound.block, /flex-direction:\s*column\s*;/, "expected the shared button to keep its icon-over-label column layout");
    assert.match(actionFound.block, /background:\s*none\s*;/, "expected the shared button to keep its transparent background");
    assert.match(actionFound.block, /border:\s*none\s*;/, "expected the shared button to keep its borderless style");

    const iconFound = findDeclBlock(css, ".pause-action-icon.top-btn {");
    assert.ok(iconFound, "expected the shared icon box to reuse .top-btn sizing (see #topRight .top-btn)");

    const labelFound = findDeclBlock(css, ".pause-action-label {");
    assert.ok(labelFound, "expected a .pause-action-label rule to exist");
    assert.match(labelFound.block, /font-size:\s*13px\s*;/, "expected the shared label typography to be unchanged");
    assert.match(labelFound.block, /font-weight:\s*600\s*;/, "expected the shared label typography to be unchanged");
});
