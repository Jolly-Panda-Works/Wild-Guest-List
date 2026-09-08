// ══════════════════════════════════════════════════════════
// Leaderboard Party column icon — header, not per-row — regression
// tests (tests/leaderboardPartyHeaderIcon.test.mjs)
//
// Change: the `partyEmoji` icon used to repeat next to every
// player's Party count in js/ui/leaderboard-ui.js's
// renderLeaderboard() (`.lb-cards`, one per row). It now renders
// once, in the Party column's header cell (`.lb-cards-header`),
// with each row showing only the plain numeric count. This applies
// to both the Desktop leaderboard (#leaderboardRows) and the Mobile
// Standings popup (#mobileLeaderboardInline) since both are filled
// by the same headerHTML/rowsHTML strings.
//
// This project has no DOM/layout test harness (see tests/README.md),
// so — consistent with the pattern used for
// tests/leaderboardRankBadge.test.mjs — this asserts the fix at the
// JS/CSS source level rather than rendering the page.
//
// Run with:  node --test tests/leaderboardPartyHeaderIcon.test.mjs
// (from the project root.)
// ══════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let leaderboardJs;
let css;

test.before(async () => {
    leaderboardJs = await readFile(path.join(ROOT, "js/ui/leaderboard-ui.js"), "utf8");
    css = await readFile(path.join(ROOT, "css/style.css"), "utf8");
});

test("row markup (.lb-cards) shows only the numeric Party count — no partyEmoji icon", () => {
    const match = leaderboardJs.match(/<span class="lb-cards"[^>]*>([^<]*(?:<span[^>]*><\/span>)?[^<]*)<\/span>/);
    assert.ok(match, "expected a .lb-cards span in the row template");

    // Must not contain a data-icon of any kind (the old
    // `<span data-icon="partyEmoji"></span>` used to sit right after
    // the count here).
    assert.doesNotMatch(
        match[1],
        /data-icon/,
        "the per-row Party cell must not render an icon anymore — only the count"
    );

    // The interpolated `${count}` template expression must still be
    // the only dynamic content (ranking/count logic itself is
    // untouched — this is presentation-only).
    assert.match(match[1].trim(), /^\$\{count\}$/, "the row must render exactly the numeric count, nothing else");
});

test("header markup has a dedicated Party column cell carrying the partyEmoji icon", () => {
    const match = leaderboardJs.match(
        /<span class="lb-cards-header"[^>]*title="\$\{t\("endParty"\)\}"[^>]*>\s*<span data-icon="partyEmoji"><\/span>\s*<\/span>/
    );
    assert.ok(match, "expected the header's Party column to carry the partyEmoji icon via a .lb-cards-header cell");
});

test("headerHTML is shared by both Desktop (#leaderboardRows) and Mobile (#mobileLeaderboardInline)", () => {
    // Both targets are filled from the same `headerHTML + rowsHTML`
    // string built once per render — not two separate templates —
    // so the header-icon fix automatically covers both layouts.
    assert.match(
        leaderboardJs,
        /desktopRows\.innerHTML = headerHTML \+ rowsHTML/,
        "expected the Desktop leaderboard to be filled from the shared headerHTML"
    );
    assert.match(
        leaderboardJs,
        /mobileInline\.innerHTML = headerHTML \+ rowsHTML/,
        "expected the Mobile leaderboard to be filled from the same shared headerHTML"
    );
});

test("ranking/score inputs (getRankedPlayers, getPartyScore) are still used unmodified", () => {
    // Presentation-only change: the data layer calls that decide
    // ranking and the displayed score must be untouched.
    assert.match(leaderboardJs, /const sorted = getRankedPlayers\(gameState\);/);
    assert.match(leaderboardJs, /const score = getPartyScore\(p\);/);
    assert.match(leaderboardJs, /const count = p\.party\.length;/);
});

test("CSS: .lb-cards-header right-aligns the header icon above the right-aligned row numbers", () => {
    const ruleMatch = css.match(/\.lb-cards-header\s*\{([^}]*)\}/);
    assert.ok(ruleMatch, "expected a .lb-cards-header rule in css/style.css");
    assert.match(
        ruleMatch[1],
        /justify-content:\s*flex-end/,
        "expected the header icon to be right-aligned, matching .lb-cards' text-align: right"
    );
});

test("CSS: the 4-column Party header/row grid layout is unchanged (icon added inside the existing column, no new track)", () => {
    // There are two `.leaderboard-header, .leaderboard-row` rules in
    // the file (an older 3-track one, superseded later in the
    // cascade by the "LEADERBOARD updated rows (4-col)" rule that
    // actually applies) — target the real 4-col one specifically.
    const sectionIdx = css.indexOf("LEADERBOARD updated rows (4-col)");
    assert.ok(sectionIdx !== -1, "expected the 4-col leaderboard section comment");
    const ruleMatch = css
        .slice(sectionIdx)
        .match(/\.leaderboard-header,\s*\.leaderboard-row\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*([^;]+);/);
    assert.ok(ruleMatch, "expected the applied 4-col leaderboard grid rule");
    const tracks = ruleMatch[1].trim().split(/\s+/).filter(Boolean);
    assert.equal(tracks.length, 4, "the Party icon must live inside the existing Party column, not add a 5th grid track");
});
