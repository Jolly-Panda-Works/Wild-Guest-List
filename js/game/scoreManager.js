// scoreManager.js — shared party-count standings ranking logic.
//
// This used to be a dead, empty stub (see docs/ARCHITECTURE_PLAN.md §4,
// "game/scoreManager.js (dead file) — Replaced"). The party-count sort
// it describes was instead copy-pasted between js/ui/leaderboard-ui.js
// and js/ui/endgame-ui.js. This file is that real, single implementation —
// leaderboard-ui.js and the Opponent rank badges in game-ui.js both read
// standings through here now, so a player's rank can never disagree
// between the two. (endgame-ui.js's final-results screen keeps its own
// top-3-only medal display as a deliberate, different presentation for
// that screen and is unchanged.)
//
// Card Power has been fully removed as a ranking input (see
// js/game/matchOutcome.js) — Party Card Count is the only metric, with
// no secondary/hidden tie-breaker. Players tied on Party Card Count
// simply keep their existing relative order (stable sort) rather than
// being split apart by any score.

import { RANK_ICONS } from "../constants/rank.js";

export { RANK_ICONS };

// Players sorted into current standings order: most party members
// first. No tie-breaker of any kind — see module comment above.
export function getRankedPlayers(gameState) {
    return [...gameState.players].sort((a, b) => b.party.length - a.party.length);
}

// Map<playerId, 0-based rank index> for O(1) per-player lookups, e.g.
// when rendering a rank badge onto each opponent card individually.
export function getPlayerRankIndexes(gameState) {
    const ranked = getRankedPlayers(gameState);
    const ranks = new Map();
    ranked.forEach((player, index) => ranks.set(player.id, index));
    return ranks;
}

// The medal icon key for a given 0-based rank index, or null once
// standings run past the known medal tiers.
export function getRankIcon(rankIndex) {
    return RANK_ICONS[rankIndex] ?? null;
}
