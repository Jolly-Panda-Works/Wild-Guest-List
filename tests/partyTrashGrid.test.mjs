// ══════════════════════════════════════════════════════════
// Party/Trash popup card grid — regression tests
// (tests/partyTrashGrid.test.mjs)
//
// Bug: on Mobile Portrait, cards inside the Party and Trash popups
// (#partyCards / #trashCards, css/style.css) had unwanted horizontal
// gaps between cards in the same row, and the grid as a whole was
// centered instead of starting from the top-left.
//
// Root causes (two, compounding):
//   1. `grid-template-columns: repeat(auto-fill, minmax(60px, 70px))`
//      let each column grow up to 70px to soak up leftover
//      container width, while the card itself was a fixed 62px —
//      leaving up to 8px of unclaimed space inside every track,
//      which showed up as inconsistent gaps between cards from row
//      to row (varying with how much leftover width each row's
//      auto-fill pass had to distribute).
//   2. `justify-content: center` centered the whole grid (occupied
//      tracks + any unfilled trailing auto-fill tracks) instead of
//      packing it against the top-left, contradicting the required
//      top-left alignment.
//   3. (Secondary, same family of bug) `.card` had no
//      `box-sizing: border-box`, so its rendered width was
//      62px content + 2px border = 64px — 2px wider than its own
//      62px track — letting cards overflow their track slightly.
//
// Fix: a single `--pt-card-w` custom property, set once on
// `#partyCards`/`#trashCards` and read by both
// `grid-template-columns` (exact, non-elastic track width) and
// `.card`'s `width` (border-box), so the track and the card can never
// diverge again at any breakpoint. `justify-content`/`align-content`
// changed to `start` for true top-left packing.
//
// This project has no DOM/layout test harness (see tests/README.md),
// so — consistent with the pattern used for the other CSS-only fixes
// in this codebase — this test asserts the fix at the CSS-source
// level: the shared rule uses a fixed (non-minmax/elastic) track
// width equal to the card's own declared width, top-left alignment,
// and border-box sizing. A real visual check across the phone widths
// in the ticket's Validation section was done by manual review (see
// the Final Report for this task).
//
// Run with:  node --test tests/partyTrashGrid.test.mjs
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

// Extracts the declaration block `{ ... }` for the first rule whose
// selector text contains `selectorSubstr`, scoped to search starting
// at `fromIndex` (so callers can pick a specific occurrence among
// several same-named rules across breakpoints).
function findDeclBlock(source, selectorSubstr, fromIndex = 0) {
    const selIdx = source.indexOf(selectorSubstr, fromIndex);
    if (selIdx === -1) return null;
    const openIdx = source.indexOf("{", selIdx);
    const closeIdx = source.indexOf("}", openIdx);
    if (openIdx === -1 || closeIdx === -1) return null;
    return { block: source.slice(openIdx + 1, closeIdx), endIndex: closeIdx };
}

test("shared #partyCards/#trashCards rule packs to top-left, not centered", () => {
    const found = findDeclBlock(css, "#partyCards,\r\n#trashCards {");
    assert.ok(found, "expected the shared #partyCards, #trashCards rule to exist");

    assert.match(
        found.block,
        /justify-content:\s*start\s*;/,
        "grid should be justify-content: start (top-left), not centered as a block"
    );
    assert.doesNotMatch(
        found.block,
        /justify-content:\s*center\s*;/,
        "grid must not center itself horizontally — this is the exact alignment regression"
    );
});

test("grid column width is a fixed size (no elastic minmax slack)", () => {
    const found = findDeclBlock(css, "#partyCards,\r\n#trashCards {");
    assert.ok(found);

    // The bug was `minmax(60px, 70px)` — two different bounds letting
    // the track grow independently of the card's own fixed width.
    // The column definition itself must not contain a minmax() with
    // two differing bounds.
    const minmaxMatch = found.block.match(/grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(([^,]+),\s*([^)]+)\)\)/);
    if (minmaxMatch) {
        assert.equal(
            minmaxMatch[1].trim(),
            minmaxMatch[2].trim(),
            `grid-template-columns must not use an elastic minmax() with different min/max ` +
            `(found minmax(${minmaxMatch[1].trim()}, ${minmaxMatch[2].trim()})) — that slack is exactly what caused uneven horizontal gaps between cards`
        );
    }

    // Whatever the column size expression is, it must be the same
    // custom property the .card rule uses for its own width — single
    // source of truth, so they can't drift apart again.
    assert.match(
        found.block,
        /--pt-card-w:\s*[^;]+;/,
        "expected a shared --pt-card-w custom property defining the column/card width once"
    );
    assert.match(
        found.block,
        /grid-template-columns:\s*repeat\(auto-fill,\s*var\(--pt-card-w\)\)/,
        "grid-template-columns should size its tracks from --pt-card-w directly"
    );
});

test(".card width uses the same --pt-card-w variable as the grid track, with border-box sizing", () => {
    const found = findDeclBlock(css, "#partyCards .card,\r\n#trashCards .card {");
    assert.ok(found, "expected the shared #partyCards .card, #trashCards .card rule to exist");

    assert.match(
        found.block,
        /width:\s*var\(--pt-card-w\)\s*;/,
        ".card width should read the same --pt-card-w variable as the grid's column width"
    );
    assert.match(
        found.block,
        /box-sizing:\s*border-box\s*;/,
        ".card must be border-box so its border doesn't push its rendered width past its own grid track"
    );
});

test("every breakpoint that resizes the party/trash card resizes --pt-card-w instead of overriding .card's width directly", () => {
    // Find every place `#partyCards .card` (or the pair with
    // #trashCards) sets a `width:` — after the fix, any width
    // declaration there should just read --pt-card-w (as the base
    // rule does); none of them should set a literal pixel/clamp width
    // of their own, because that's what let the grid track and the
    // card's actual width drift apart at a given breakpoint.
    const cardRuleRe = /#partyCards \.card,?\s*#trashCards \.card\s*\{([^}]*)\}/g;
    let match;
    let checked = 0;
    while ((match = cardRuleRe.exec(css)) !== null) {
        checked++;
        const widthDecls = match[1].match(/width:\s*[^;]+;/g) || [];
        for (const decl of widthDecls) {
            assert.match(
                decl,
                /width:\s*var\(--pt-card-w\)/,
                `found a #partyCards/#trashCards .card rule setting a literal width instead of var(--pt-card-w): "${decl.trim()}" — ` +
                `this reintroduces a track/card size mismatch at that breakpoint`
            );
        }
    }
    assert.ok(checked >= 3, `expected to find the base rule plus at least two breakpoint overrides (found ${checked})`);
});
