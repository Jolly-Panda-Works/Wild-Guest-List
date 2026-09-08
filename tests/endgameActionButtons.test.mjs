// ══════════════════════════════════════════════════════════
// Win Popup (#endGameScreen) action buttons — equal size,
// single-row regression tests
// (tests/endgameActionButtons.test.mjs)
//
// Bug: Return to Home / Play Again in the Win Popup's
// `.endgame-actions` row (game.html, styled in css/style.css) were
// not reliably the same size. `.endgame-actions` was `display: flex`
// and each `.screen-btn` was `flex: 1 1 160px` — with equal
// flex-grow this only produces equal widths as long as neither
// button's own content needs more than its equal share. Flex items
// default to `min-width: auto`, which resolves to the content's own
// min-content width, so once one label needed more room than the
// other (e.g. "Return to Home" vs "Play Again" in English, or
// "العودة إلى الرئيسية" vs "العب مجدداً" in Arabic — see
// data/i18n.json), that button could grow wider (or, if it wrapped
// to two lines, taller) than its sibling — exactly the "buttons
// aren't the same size" bug, worst at narrow Mobile widths. A
// `@media (max-width: 420px)` rule also stacked the row into a
// column, which also contradicts "buttons must stay in one row".
//
// Fix:
//   1. `.endgame-actions` -> `display: grid;
//      grid-template-columns: repeat(2, minmax(0, 1fr));` — grid
//      tracks split the row exactly in half regardless of content;
//      `minmax(0, 1fr)` (not bare `1fr`) is what stops a track's
//      automatic content-based minimum from ever winning.
//   2. Each `.endgame-actions .screen-btn` gets a fixed `height`
//      (not `min-height`) and `width: 100%; min-width: 0;` so
//      neither dimension can be pushed around by content.
//   3. The label span (`.endgame-btn-label`, new in game.html)
//      truncates with an ellipsis (`overflow: hidden; text-overflow:
//      ellipsis; white-space: nowrap;`) instead of wrapping or
//      overflowing, so a long translation can never change the
//      button's size.
//   4. The `@media (max-width: 420px)` column-stack override was
//      removed; a same-media-query rule now only tightens
//      gap/padding/icon size so the row still fits without
//      overflowing the popup, per the "must stay one row, must not
//      overflow" requirements.
//
// This project has no DOM/layout test harness (see tests/README.md),
// so — consistent with the pattern used for the other CSS-only fixes
// in this codebase — this test asserts the fix at the CSS/HTML
// source level.
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

test("game.html: Return to Home and Play Again are both still real buttons inside .endgame-actions with unchanged ids/click targets", () => {
    assert.match(
        gameHtml,
        /<div class="endgame-actions">/,
        "expected the .endgame-actions row to still exist"
    );
    assert.match(
        gameHtml,
        /<button id="returnHomeBtn" type="button" class="screen-btn endgame-btn-secondary">/,
        "returnHomeBtn's id/type/class must be unchanged so its click wiring in js/ui/*.js keeps working"
    );
    assert.match(
        gameHtml,
        /<button id="playAgainBtn" type="button" class="screen-btn endgame-btn-primary">/,
        "playAgainBtn's id/type/class must be unchanged so its click wiring in js/ui/*.js keeps working"
    );
});

test("game.html: both action button labels use .endgame-btn-label for consistent truncation", () => {
    const labelRe = /<span class="endgame-btn-label" data-i18n="(endReturnHome|playAgain)">/g;
    const matches = [...gameHtml.matchAll(labelRe)].map((m) => m[1]);
    assert.deepEqual(
        matches.sort(),
        ["endReturnHome", "playAgain"].sort(),
        "expected both endReturnHome and playAgain labels to carry .endgame-btn-label"
    );
});

test(".endgame-actions is a two-column grid with content-independent equal tracks", () => {
    const found = findDeclBlock(css, ".endgame-actions {");
    assert.ok(found, "expected an .endgame-actions rule to exist");

    assert.match(
        found.block,
        /display:\s*grid\s*;/,
        "expected .endgame-actions to use CSS Grid, not flex (flex's default min-width:auto is what let a longer label win extra width)"
    );
    assert.match(
        found.block,
        /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*;/,
        "expected exactly two equal minmax(0, 1fr) tracks, so content can never expand one column past its equal share"
    );
});

test(".endgame-actions .screen-btn has a fixed height and full-width/min-width:0 so content can't resize it", () => {
    const found = findDeclBlock(css, ".endgame-actions .screen-btn {");
    assert.ok(found, "expected an .endgame-actions .screen-btn rule to exist");

    assert.match(
        found.block,
        /height:\s*50px\s*;/,
        "expected a fixed (not min-) height so a wrapped/taller label can't grow the button"
    );
    assert.doesNotMatch(
        found.block,
        /min-height/,
        "height must be a hard fixed value, not min-height, or content could still push the button taller"
    );
    assert.match(
        found.block,
        /width:\s*100%\s*;/,
        "expected the button to fill its equal grid column"
    );
    assert.match(
        found.block,
        /min-width:\s*0\s*;/,
        "expected min-width: 0 so the button's own content min-content width can never override the equal grid column width"
    );
    assert.match(
        found.block,
        /box-sizing:\s*border-box\s*;/,
        "border-box keeps padding/border from pushing the rendered size past the fixed height/100% width"
    );
});

test(".endgame-btn-label truncates instead of wrapping or growing the button", () => {
    const found = findDeclBlock(css, ".endgame-btn-label {");
    assert.ok(found, "expected an .endgame-btn-label rule to exist");

    assert.match(found.block, /overflow:\s*hidden\s*;/);
    assert.match(found.block, /text-overflow:\s*ellipsis\s*;/);
    assert.match(found.block, /white-space:\s*nowrap\s*;/);
});

test("very narrow Mobile (max-width: 420px) keeps the action buttons in one row instead of stacking", () => {
    const narrowMediaRe = /@media \(max-width: 420px\)\s*\{/g;
    let match;
    let sawEndgameActionsRule = false;
    let sawColumnStack = false;

    while ((match = narrowMediaRe.exec(css)) !== null) {
        const openIdx = css.indexOf("{", match.index);
        let depth = 1;
        let i = openIdx + 1;
        while (depth > 0 && i < css.length) {
            if (css[i] === "{") depth++;
            else if (css[i] === "}") depth--;
            i++;
        }
        const block = css.slice(match.index, i);
        if (block.includes(".endgame-actions")) {
            sawEndgameActionsRule = true;
            if (/\.endgame-actions\s*\{[^}]*flex-direction:\s*column/.test(block)) {
                sawColumnStack = true;
            }
        }
    }

    assert.ok(sawEndgameActionsRule, "expected a max-width: 420px rule touching .endgame-actions (spacing tune-down)");
    assert.equal(
        sawColumnStack,
        false,
        "the narrow-width rule must not stack .endgame-actions into a column — the buttons must stay in one row at every Mobile width"
    );
});
