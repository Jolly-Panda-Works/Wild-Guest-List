// ══════════════════════════════════════════════════════════
// Desktop Party/Trash flanking-the-Queue layout — regression tests
// (tests/desktopPartyTrash.test.mjs)
//
// Task: Desktop no longer shows the big always-visible #partyArea/
// #trashArea sidebars in #gameLayout's grid. Instead it reuses the
// exact same door/trash icons Mobile Portrait already built
// (#queueDoorIcon/#queueTrashIcon inside #queueWithIcons, see
// renderQueue() in js/ui/game-ui.js) — now also shown on Desktop,
// flanking either side of the Queue — and the exact same
// #partyArea/#trashArea popups (toggled via `.mobile-open`, see
// js/ui/mobile-ui.js's initMobileTabs()) instead of a second,
// desktop-only popup implementation.
//
// This project has no DOM/layout test harness (see tests/README.md),
// so — consistent with the pattern used for tests/partyTrashGrid.
// test.mjs — this asserts the fix at the CSS/JS source level rather
// than rendering the page.
//
// Run with:  node --test tests/desktopPartyTrash.test.mjs
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
let gameUiJs;
let gameHtml;

test.before(async () => {
    css = await readFile(path.join(ROOT, "css/style.css"), "utf8");
    gameUiJs = await readFile(path.join(ROOT, "js/ui/game-ui.js"), "utf8");
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
    return { block: source.slice(openIdx + 1, closeIdx), endIndex: closeIdx, startIndex: selIdx };
}

test("game.html no longer has a permanent big Party/Trash sidebar markup outside the Queue", () => {
    // The elements themselves (#partyArea/#trashArea) still exist —
    // they're reused as the popup content — but there must be no
    // separate, second implementation of a Party/Trash popup anywhere.
    assert.equal(
        (gameHtml.match(/id="partyArea"/g) || []).length,
        1,
        "expected exactly one #partyArea element (reused as popup content, not duplicated)"
    );
    assert.equal(
        (gameHtml.match(/id="trashArea"/g) || []).length,
        1,
        "expected exactly one #trashArea element (reused as popup content, not duplicated)"
    );
});

test("#gameLayout base rule is a single-column grid (no permanent Party/Trash side columns)", () => {
    const found = findDeclBlock(css, "#gameLayout {");
    assert.ok(found, "expected a base #gameLayout rule");
    assert.match(
        found.block,
        /grid-template-columns:\s*1fr\s*;/,
        "expected #gameLayout's base grid-template-columns to be a single 1fr track now that Party/Trash aren't permanent side columns"
    );
    assert.doesNotMatch(
        found.block,
        /clamp\(180px/,
        "base #gameLayout must not still reserve a clamp(180px...) side column for Party/Trash"
    );
});

test("#partyArea/#trashArea default to hidden (popup), not an always-visible panel", () => {
    const found = findDeclBlock(css, "#partyArea,\r\n#trashArea {", css.indexOf("PARTY / TRASH"));
    assert.ok(found, "expected the Party/Trash popup base rule (after the PARTY / TRASH section header)");
    assert.match(
        found.block,
        /display:\s*none\s*;/,
        "#partyArea/#trashArea must be hidden by default so Desktop doesn't show them as permanent panels"
    );
    assert.match(
        found.block,
        /position:\s*fixed\s*;/,
        "#partyArea/#trashArea must be a fixed-position popup by default (Desktop included)"
    );
});

test("#partyArea.mobile-open/#trashArea.mobile-open reveals the popup — same toggle class Mobile already used", () => {
    assert.match(
        css,
        /#partyArea\.mobile-open,\s*\r?\n#trashArea\.mobile-open\s*\{\s*\r?\n\s*display:\s*flex\s*;/,
        "expected .mobile-open to reveal #partyArea/#trashArea — the exact same class js/ui/mobile-ui.js's initMobileTabs() already toggles for Mobile, reused rather than a second popup mechanism"
    );
});

test("no leftover 3-column grid-template-columns for #gameLayout at any breakpoint", () => {
    const matches = css.match(/#gameLayout\s*\{[^}]*grid-template-columns:[^;]*;/g) || [];
    for (const m of matches) {
        assert.doesNotMatch(
            m,
            /clamp\(1[68]0px/,
            `found a #gameLayout rule still reserving old Party/Trash side-column widths: "${m.trim()}"`
        );
    }
});

test("Desktop (min-width: 601px, pointer: fine) re-enables the shared .queue-icon buttons and flanks the Queue with them", () => {
    // Search for the literal rule opener (trailing "{"), not just the
    // media-query text — that text also appears inside a few comments
    // elsewhere in the file, referring back to this same block.
    const desktopMediaIdx = css.indexOf("@media (min-width: 601px) and (pointer: fine) {");
    assert.ok(desktopMediaIdx !== -1, "expected the existing real-Desktop media scope to exist");

    // Scope the search to that media block only (up to its closing brace
    // at the same nesting level — approximate by taking a generous slice).
    const scoped = css.slice(desktopMediaIdx, desktopMediaIdx + 6000);

    assert.match(
        scoped,
        /#queuePartyTrashRow\s*\{\s*\r?\n\s*display:\s*contents\s*;/,
        "expected #queuePartyTrashRow to be unwrapped via display: contents on Desktop, so its two icon children become direct flex items of #queueWithIcons"
    );
    assert.match(
        scoped,
        /#queueDoorIcon\s*\{\s*order:\s*1\s*;/,
        "expected the Party (door) icon to be ordered before the Queue on Desktop"
    );
    assert.match(
        scoped,
        /#queueInner\s*\{\s*order:\s*2\s*;/,
        "expected the Queue itself to sit between the two icons on Desktop"
    );
    assert.match(
        scoped,
        /#queueTrashIcon\s*\{\s*order:\s*3\s*;/,
        "expected the Trash icon to be ordered after the Queue on Desktop"
    );
    assert.match(
        scoped,
        /\.queue-icon\s*\{[^}]*display:\s*flex\s*;/,
        "expected .queue-icon to be re-enabled (display: flex) on Desktop — same component Mobile already built, just made visible here too"
    );
});

test("renderQueue() reuses the existing party/trash icon assets and adds a notification-badge element for each", () => {
    assert.match(
        gameUiJs,
        /queueDoorIcon[^]*?data-icon="party"/,
        "expected the Party icon to keep using the existing 'party' icon asset (data-icon=\"party\")"
    );
    assert.match(
        gameUiJs,
        /queueTrashIcon[^]*?data-icon="trash"/,
        "expected the Trash icon to keep using the existing 'trash' icon asset (data-icon=\"trash\")"
    );
    assert.match(
        gameUiJs,
        /id="partyIconBadge"\s+class="queue-icon-badge"/,
        "expected a partyIconBadge notification-badge element on the Party icon"
    );
    assert.match(
        gameUiJs,
        /id="trashIconBadge"\s+class="queue-icon-badge"/,
        "expected a trashIconBadge notification-badge element on the Trash icon"
    );
});

test("Desktop Party/Trash popup is shaped like the Pause popup: same width basis, same border/radius/background/shadow, fixed and taller height", () => {
    const desktopMediaIdx = css.indexOf("@media (min-width: 601px) and (pointer: fine) {");
    assert.ok(desktopMediaIdx !== -1, "expected the existing real-Desktop media scope to exist");
    const scoped = css.slice(desktopMediaIdx, desktopMediaIdx + 9000);

    const found = findDeclBlock(scoped, "#partyArea,\r\n    #trashArea {", scoped.indexOf("shaped to match the Pause popup"));
    assert.ok(found, "expected a Desktop-scoped #partyArea/#trashArea popup-shape rule");

    // Same width basis as Pause's .small-popup (min(350px, 92vw)).
    assert.match(found.block, /width:\s*min\(350px,\s*92vw\)\s*;/, "expected the same width as the Pause popup's .small-popup");

    // Fixed (not shrink-to-fit) and taller than the pre-fix auto-sized version.
    assert.match(found.block, /height:\s*min\(600px,\s*80vh\)\s*;/, "expected a fixed, larger height instead of a content-driven max-height");
    assert.match(found.block, /max-height:\s*none\s*;/, "expected max-height to be cleared so the fixed height isn't also capped by the old value");

    // Same shape as Pause's .modal-content.
    assert.match(found.block, /border:\s*1px solid var\(--border\)\s*;/, "expected the same border as Pause's .modal-content");
    assert.match(found.block, /border-radius:\s*var\(--radius-md\)\s*;/, "expected the same border-radius as Pause's .modal-content");
    assert.match(found.block, /background:\s*rgba\(10,\s*31,\s*15,\s*0\.82\)\s*;/, "expected the same background color as Pause's .modal-content");
    assert.match(found.block, /box-shadow:\s*0 20px 60px rgba\(0,0,0,\.6\)\s*;/, "expected the same box-shadow as Pause's .modal-content");
});

test("Trash icon has extra spacing from the right edge of the Queue row (Party's left-side gap is unchanged)", () => {
    const desktopMediaIdx = css.indexOf("@media (min-width: 601px) and (pointer: fine) {");
    const scoped = css.slice(desktopMediaIdx, desktopMediaIdx + 9000);

    const found = findDeclBlock(scoped, "#queueTrashIcon {");
    assert.ok(found, "expected a Desktop-scoped #queueTrashIcon rule");
    assert.match(found.block, /order:\s*3\s*;/, "expected the Trash icon to stay ordered after the Queue");
    assert.match(found.block, /margin-right:\s*clamp\(/, "expected extra right-side margin on the Trash icon");

    assert.doesNotMatch(
        scoped.slice(scoped.indexOf("#queueDoorIcon"), scoped.indexOf("#queueDoorIcon") + 60),
        /margin-right/,
        "the Party icon's spacing should be unchanged — only Trash needed the extra right margin"
    );
});

test("Mobile's own Party/Trash popup position/size is untouched by the Desktop-only width/height override, but now shares the same Pause shape", () => {
    // The ≤600px width tier and the touch+portrait tier keep their own
    // tuned edge-anchored position/size (top/left/right/bottom) —
    // confirms the Desktop-only width/height override doesn't leak
    // into them via the cascade.
    const narrowTierMatch = css.match(/#partyArea, #trashArea \{\s*\r?\n\s*display: none;\s*\r?\n\s*position: fixed;\s*\r?\n\s*top: 20px; left: 12px; right: 12px; bottom: 20px;/);
    assert.ok(narrowTierMatch, "expected the ≤600px-width tier's own #partyArea/#trashArea position/size rule to still exist, untouched");

    const portraitTierMatch = css.match(/#mobileLeaderboard, #partyArea, #trashArea \{\s*\r?\n\s*display: none;\s*\r?\n\s*position: fixed;\s*\r?\n\s*top: 8dvh; left: 4vw; right: 4vw; bottom: 8dvh;/);
    assert.ok(portraitTierMatch, "expected the touch+portrait tier's own #mobileLeaderboard/#partyArea/#trashArea position/size rule to still exist, untouched");

    // Both tiers now also give #partyArea/#trashArea (but not
    // #mobileLeaderboard, in the portrait tier's case) the same
    // Pause-matching shape as Desktop.
    const narrowShapeIdx = css.indexOf("#partyArea, #trashArea {", narrowTierMatch.index);
    const narrowShape = findDeclBlock(css, "#partyArea, #trashArea {", narrowTierMatch.index);
    assert.match(narrowShape.block, /border:\s*1px solid var\(--border\)\s*;/, "expected the ≤600px tier's popup to gain the Pause-matching border");
    assert.match(narrowShape.block, /background:\s*rgba\(10,\s*31,\s*15,\s*0\.82\)\s*;/, "expected the ≤600px tier's popup to use the same background as Pause");
    assert.match(narrowShape.block, /border-radius:\s*var\(--radius-md\)\s*;/, "expected the ≤600px tier's popup to use the same radius as Pause");

    const portraitShapeIdx = css.indexOf("#partyArea, #trashArea {", portraitTierMatch.index + portraitTierMatch[0].length);
    assert.ok(portraitShapeIdx !== -1, "expected a dedicated Party/Trash-only shape rule after the touch+portrait tier's shared position rule");
    const portraitShape = findDeclBlock(css, "#partyArea, #trashArea {", portraitTierMatch.index + portraitTierMatch[0].length);
    assert.match(portraitShape.block, /border:\s*1px solid var\(--border\)\s*;/, "expected the touch+portrait tier's popup to gain the Pause-matching border");
    assert.match(portraitShape.block, /background:\s*rgba\(10,\s*31,\s*15,\s*0\.82\)\s*;/, "expected the touch+portrait tier's popup to use the same background as Pause");
    assert.match(portraitShape.block, /border-radius:\s*var\(--radius-md\)\s*;/, "expected the touch+portrait tier's popup to use the same radius as Pause");

    // #mobileLeaderboard itself must NOT have picked up this shape —
    // only Party/Trash were asked to match Pause.
    const mobileLbBlock = css.slice(portraitTierMatch.index, portraitShapeIdx);
    assert.doesNotMatch(
        mobileLbBlock,
        /#mobileLeaderboard\s*\{[^}]*background:\s*rgba\(10,\s*31,\s*15,\s*0\.82\)/,
        "the Leaderboard popup should not have been restyled to match Pause — only Party/Trash were asked for"
    );
});

test("Party/Trash badges are driven by the real party/trash DOM contents, never a hardcoded number", () => {
    assert.match(
        gameUiJs,
        /function refreshPartyBadge\(\)\s*\{\s*\r?\n\s*const party = document\.getElementById\("partyCards"\);\s*\r?\n\s*setQueueIconBadge\("partyIconBadge",\s*party \? party\.children\.length : 0\);/,
        "expected refreshPartyBadge() to read the live count from #partyCards' actual children, not a hardcoded value"
    );
    assert.match(
        gameUiJs,
        /function refreshTrashBadge\(\)\s*\{\s*\r?\n\s*const trash = document\.getElementById\("trashCards"\);\s*\r?\n\s*setQueueIconBadge\("trashIconBadge",\s*trash \? trash\.children\.length : 0\);/,
        "expected refreshTrashBadge() to read the live count from #trashCards' actual children, not a hardcoded value"
    );

    // Every place a card is actually appended to #partyCards/#trashCards
    // (full render AND every mid-turn Director animation path) must also
    // refresh the corresponding badge, so it can never go stale.
    const partyAppendCount = (gameUiJs.match(/party\.appendChild/g) || []).length;
    const partyRefreshCount = (gameUiJs.match(/refreshPartyBadge\(\)/g) || []).length;
    assert.ok(
        partyRefreshCount >= 3,
        `expected refreshPartyBadge() to be called at every #partyCards mutation site (renderParty() + both onEnteredParty() branches); found ${partyRefreshCount} call(s) against ${partyAppendCount} append site(s)`
    );

    const trashAppendCount = (gameUiJs.match(/trash\.appendChild/g) || []).length;
    const trashRefreshCount = (gameUiJs.match(/refreshTrashBadge\(\)/g) || []).length;
    assert.ok(
        trashRefreshCount >= 4,
        `expected refreshTrashBadge() to be called at every #trashCards mutation site (renderTrash() + onRemoved() + both onRejected() branches); found ${trashRefreshCount} call(s) against ${trashAppendCount} append site(s)`
    );
});
