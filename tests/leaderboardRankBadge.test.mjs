// ══════════════════════════════════════════════════════════
// Leaderboard rank-medal badge — regression tests
// (tests/leaderboardRankBadge.test.mjs)
//
// Bug: on Mobile Portrait (@media (pointer: coarse) and
// (orientation: portrait)), the medal/rank icon rendered by
// js/ui/leaderboard-ui.js's renderLeaderboard() (`.lb-rank`, the
// 1st of 4 grid items: rank, name, cards, score) never appeared
// next to the player's name in the Match Standings table, no
// matter which rank the player was in.
//
// Root cause: css/style.css's `#mobileLeaderboard .leaderboard-row`
// rule inside that media query declared
// `grid-template-columns: 1fr 44px 44px` — only 3 tracks for 4 grid
// items. CSS Grid places extra items into an implicit extra ROW
// rather than a 4th column, so `.lb-rank` never landed in a visible
// column next to `.lb-name`. The desktop/base rule (4941) and the
// tablet/mobile-landscape rule (5043) both already used 4 tracks —
// only this one `!important` mobile-portrait override had regressed
// back to 3.
//
// This project has no DOM test harness (see tests/README.md), so —
// consistent with the "Known gaps" pattern already used for
// achievements/profile/orientation — this test proves the fix at
// the two levels that are actually checkable without one:
//   1. The CSS itself: the mobile-portrait rule must declare a grid
//      track for every column the row markup actually renders.
//   2. The ranking data layer that feeds both the Match Standings
//      table and the gameplay opponent badges (js/game/
//      scoreManager.js) still maps rank → medal → null correctly.
// A real visual/DOM check was done by manual review (see the Final
// Report for this task) confirming the medal now renders inline
// with the name at every rank on a Mobile Portrait viewport.
//
// Run with:  node --test tests/leaderboardRankBadge.test.mjs
// (from the project root.)
// ══════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── 1. CSS regression guard ─────────────────────────────────────
// Isolates the `@media (pointer: coarse) and (orientation: portrait)`
// block, then within it the `#mobileLeaderboard .leaderboard-row`
// rule, and asserts its grid-template-columns has one track per
// column actually used by the row markup in leaderboard-ui.js
// (rank, name, cards, score — 4 columns).
test("mobile-portrait leaderboard row grid has a column for every field (rank, name, cards, score)", async () => {
    const css = await readFile(path.join(ROOT, "css/style.css"), "utf8");

    // Match the real rule opener (`... portrait) {`), not an earlier
    // comment elsewhere in the file that merely mentions this media
    // query by name (with a trailing backtick, no brace) while
    // explaining unrelated history.
    const mediaOpenerRe = /@media \(pointer: coarse\) and \(orientation: portrait\)\s*\{/;
    const openerMatch = mediaOpenerRe.exec(css);
    assert.ok(openerMatch, "expected the Mobile Portrait media query to exist in css/style.css");
    const mediaStart = openerMatch.index;

    // Find the matching closing brace for this media block by
    // tracking brace depth from its opening `{`.
    const openIdx = css.indexOf("{", mediaStart);
    let depth = 1;
    let i = openIdx + 1;
    while (depth > 0 && i < css.length) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
        i++;
    }
    const mediaBlock = css.slice(mediaStart, i);

    const ruleMatch = mediaBlock.match(
        /#mobileLeaderboard \.leaderboard-header,\s*#mobileLeaderboard \.leaderboard-row\s*{([^}]*)}/
    );
    assert.ok(ruleMatch, "expected a #mobileLeaderboard .leaderboard-row rule inside the Mobile Portrait media query");

    const declBlock = ruleMatch[1];
    const gridMatch = declBlock.match(/grid-template-columns:\s*([^;]+);/);
    assert.ok(gridMatch, "expected grid-template-columns to be declared on the mobile-portrait leaderboard row");

    // Count column tracks (e.g. "20px 1fr 40px 44px" -> 4), ignoring
    // a trailing !important.
    const tracks = gridMatch[1]
        .replace(/!important/i, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    assert.equal(
        tracks.length,
        4,
        `expected 4 grid columns (rank, name, cards, score) but found ${tracks.length}: "${gridMatch[1].trim()}" — ` +
        `this is the exact regression that hid the rank medal on Mobile Portrait`
    );
});

// ── 2. Ranking data layer (shared by the table and the gameplay
//    opponent badges) still maps rank -> medal correctly. Note: this
//    game seats at most 4 players, and RANK_ICONS has an entry for
//    all four ("rankFourth" for last place) — there is no "5th
//    place", so unlike a generic leaderboard there's no rank that
//    legitimately falls through to `null` here. That's existing,
//    intentional behavior (see js/constants/rank.js) and out of
//    scope for this fix; only getRankIcon() falling back to null for
//    an out-of-range index is exercised below. ──
test("scoreManager rank->medal mapping: every seat (1st-4th) gets its medal", async () => {
    const { RANK_ICONS } = await import("../js/constants/rank.js");
    const { getPlayerRankIndexes, getRankIcon } = await import("../js/game/scoreManager.js");

    assert.deepEqual(RANK_ICONS, ["rankGold", "rankSilver", "rankBronze", "rankFourth"]);

    const gameState = {
        players: [
            { id: "p1", party: [{ power: 1 }, { power: 1 }] },       // 2 cards -> 2nd
            { id: "p2", party: [{ power: 3 }, { power: 3 }, { power: 3 }] }, // 3 cards -> 1st
            { id: "p3", party: [{ power: 1 }] },                     // 1 card -> 3rd
            { id: "p4", party: [] },                                 // 0 cards -> 4th
        ],
    };

    const ranks = getPlayerRankIndexes(gameState);

    assert.equal(getRankIcon(ranks.get("p2")), "rankGold");
    assert.equal(getRankIcon(ranks.get("p1")), "rankSilver");
    assert.equal(getRankIcon(ranks.get("p3")), "rankBronze");
    assert.equal(getRankIcon(ranks.get("p4")), "rankFourth");

    // An index past the last seat (would only happen with >4 players,
    // which this game never has) still degrades to no medal rather
    // than throwing or reusing a stale icon.
    assert.equal(getRankIcon(4), null);
});

// ── 3. Standings recompute live from current state — a mid-game
//    score change reorders who gets which medal, exactly as the
//    original ticket's live-update requirement describes ──
test("rank recomputes from current state after a score change (no stale/cached rank)", async () => {
    const { getPlayerRankIndexes, getRankIcon } = await import("../js/game/scoreManager.js");

    const gameState = {
        players: [
            { id: "A", party: [{ power: 1 }, { power: 1 }, { power: 1 }] }, // leading: gold
            { id: "B", party: [{ power: 1 }, { power: 1 }] },               // silver
            { id: "C", party: [{ power: 1 }] },                             // bronze
        ],
    };

    let ranks = getPlayerRankIndexes(gameState);
    assert.equal(getRankIcon(ranks.get("A")), "rankGold");
    assert.equal(getRankIcon(ranks.get("C")), "rankBronze");

    // C takes a clear lead mid-game — same gameState object, mutated
    // in place, the way turnManager.js mutates it during play.
    gameState.players[2].party.push({ power: 1 }, { power: 1 }, { power: 1 });

    ranks = getPlayerRankIndexes(gameState);
    assert.equal(getRankIcon(ranks.get("C")), "rankGold", "C should now be gold after taking the lead");
    assert.equal(getRankIcon(ranks.get("A")), "rankSilver", "A should have dropped to silver");
});
