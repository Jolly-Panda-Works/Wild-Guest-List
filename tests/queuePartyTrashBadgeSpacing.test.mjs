// ══════════════════════════════════════════════════════════
// Party/Trash notification badge — top clearance regression tests
// (tests/queuePartyTrashBadgeSpacing.test.mjs)
//
// Bug: on Mobile Portrait (@media (pointer: coarse) and
// (orientation: portrait)), the live card-count badges on the Party
// and Trash buttons (#partyIconBadge/#trashIconBadge, both
// `.queue-icon-badge`, rendered by renderQueue() in
// js/ui/game-ui.js) sat flush against / overlapping the Other
// Players row above them.
//
// Root cause: `.queue-icon-badge` is `position: absolute; top: -6px`
// against its own `.queue-icon` button — a standard corner-badge
// treatment, same offset used on Desktop, and correct relative to its
// immediate parent. The bug was one level up: the Party/Trash row
// (#queuePartyTrashRow / .queue-party-trash-row) is the very first
// child of #queueWithIcons, sitting directly under #otherPlayers with
// only #centerArea's 6px column `gap` between them. That 6px badge
// overhang exactly canceled the 6px gap, leaving zero clearance
// between the badge and the row above it at every Mobile Portrait
// width/aspect ratio.
//
// Fix: a `margin-top` was added to `.queue-party-trash-row` itself —
// the row that actually owns the badges — instead of touching
// #queueArea or #centerArea, both of which are shared with the
// unrelated Hand section further down the column.
//
// This project has no DOM/layout test harness (see tests/README.md),
// so — consistent with the pattern used for the other CSS-only fixes
// in this codebase (see tests/leaderboardRankBadge.test.mjs) — this
// test asserts the fix at the CSS-source level.
//
// Run with:  node --test tests/queuePartyTrashBadgeSpacing.test.mjs
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

test.before(async () => {
    css = await readFile(path.join(ROOT, "css/style.css"), "utf8");
});

// Isolates the declaration block `{ ... }` for the first rule whose
// selector text contains `selectorSubstr`, scoped to search starting
// at `fromIndex` (so callers can pick a specific occurrence among
// several same-named rules across breakpoints).
function findDeclBlock(source, selectorSubstr, fromIndex = 0) {
    const selIdx = source.indexOf(selectorSubstr, fromIndex);
    if (selIdx === -1) return null;
    const openIdx = source.indexOf("{", selIdx);
    const closeIdx = source.indexOf("}", openIdx);
    if (openIdx === -1 || closeIdx === -1) return null;
    return { block: source.slice(openIdx + 1, closeIdx), endIndex: closeIdx, selIdx };
}

// Finds the `@media (pointer: coarse) and (orientation: portrait)`
// block that actually opens a rule (not an earlier comment that just
// mentions the query by name), and returns its full text by tracking
// brace depth from the opening `{`.
function findMobilePortraitBlock(source, fromIndex = 0) {
    const mediaOpenerRe = /@media \(pointer: coarse\) and \(orientation: portrait\)\s*\{/g;
    mediaOpenerRe.lastIndex = fromIndex;
    const openerMatch = mediaOpenerRe.exec(source);
    assert.ok(openerMatch, "expected a Mobile Portrait media query to exist in css/style.css");

    const mediaStart = openerMatch.index;
    const openIdx = source.indexOf("{", mediaStart);
    let depth = 1;
    let i = openIdx + 1;
    while (depth > 0 && i < source.length) {
        if (source[i] === "{") depth++;
        else if (source[i] === "}") depth--;
        i++;
    }
    return { block: source.slice(mediaStart, i), endIndex: i };
}

test("Mobile Portrait: .queue-party-trash-row reserves top clearance for its own badge overhang", () => {
    const found = findDeclBlock(css, ".queue-party-trash-row {");
    assert.ok(found, "expected a .queue-party-trash-row rule to exist");

    // The badge overhangs its .queue-icon parent by 6px (top: -6px on
    // .queue-icon-badge — see the next test). The row that wraps both
    // Party/Trash icons must add strictly more than that as its own
    // top margin/padding, or the badge will still touch whatever sits
    // above #queueWithIcons (currently #otherPlayers, separated only
    // by #centerArea's 6px gap).
    const marginMatch = found.block.match(/margin-top:\s*([\d.]+)px\s*;/);
    const paddingMatch = found.block.match(/padding-top:\s*([\d.]+)px\s*;/)
        || found.block.match(/padding:\s*([\d.]+)px[^;]*;/);

    assert.ok(
        marginMatch || paddingMatch,
        "expected .queue-party-trash-row to declare a margin-top or padding-top reserving space for its badge overhang"
    );

    const clearance = Number((marginMatch || paddingMatch)[1]);
    assert.ok(
        clearance > 6,
        `expected .queue-party-trash-row's top clearance (${clearance}px) to exceed the 6px badge overhang — ` +
        `otherwise the badge still touches the element above it, the exact regression being fixed`
    );
});

test("Mobile Portrait: .queue-icon-badge keeps its own absolute offset against its .queue-icon parent unchanged", () => {
    const { block: mobileBlock } = findMobilePortraitBlock(css);
    const found = findDeclBlock(mobileBlock, ".queue-icon-badge {");
    assert.ok(found, "expected a .queue-icon-badge rule inside the Mobile Portrait media query");

    assert.match(
        found.block,
        /position:\s*absolute\s*;/,
        "badge must stay absolutely positioned against its .queue-icon parent (which is position: relative)"
    );
    assert.match(
        found.block,
        /top:\s*-6px\s*;/,
        "badge's own corner offset relative to its .queue-icon parent should be unchanged by this fix"
    );
    assert.match(
        found.block,
        /right:\s*-6px\s*;/,
        "badge's own corner offset relative to its .queue-icon parent should be unchanged by this fix"
    );
});

test(".queue-icon (badge's direct parent) stays position: relative on Mobile Portrait, so the badge's offset resolves against the button, not a distant ancestor", () => {
    const { block: mobileBlock } = findMobilePortraitBlock(css);
    const found = findDeclBlock(mobileBlock, ".queue-icon {");
    assert.ok(found, "expected a .queue-icon rule inside the Mobile Portrait media query");
    assert.match(
        found.block,
        /position:\s*relative\s*;/,
        ".queue-icon must be position: relative for the badge's absolute offset to be scoped to it"
    );
});

test("Desktop Party/Trash badge rule is untouched by this fix", () => {
    // Desktop's own `.queue-icon-badge` (inside `@media (min-width:
    // 601px) and (pointer: fine)`) must keep its original -6px/-6px
    // corner offset — this task is scoped to Mobile Portrait only.
    const desktopMediaRe = /@media \(min-width: 601px\) and \(pointer: fine\)\s*\{/;
    const openerMatch = desktopMediaRe.exec(css);
    assert.ok(openerMatch, "expected the Desktop media query to exist");

    const mediaStart = openerMatch.index;
    const openIdx = css.indexOf("{", mediaStart);
    let depth = 1;
    let i = openIdx + 1;
    while (depth > 0 && i < css.length) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
        i++;
    }
    const desktopBlock = css.slice(mediaStart, i);

    const found = findDeclBlock(desktopBlock, ".queue-icon-badge {");
    assert.ok(found, "expected a .queue-icon-badge rule inside the Desktop media query");
    assert.match(found.block, /top:\s*-6px\s*;/);
    assert.match(found.block, /right:\s*-6px\s*;/);
});
