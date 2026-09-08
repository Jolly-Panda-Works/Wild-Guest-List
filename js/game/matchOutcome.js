// matchOutcome.js — the single authoritative match-result calculation.
//
// Card Power has been fully removed from victory determination (see
// docs/PROJECT_AUDIT.md's "Known Issues" — the old rule was "winner =
// highest party.length, tie-broken by sum of card power", duplicated
// across js/game/gameOver.js, js/ui/endgame-ui.js and
// js/game/scoreManager.js). The only metric that decides a match now
// is Party Card Count. There is no secondary/hidden tie-breaker of any
// kind — two or more players tied for the highest Party Card Count
// produce a DRAW, full stop.
//
// This does NOT touch the unrelated `power` field still carried by
// each card object (data/cardInfo.json) — that field is the card's
// identity/strength ranking used by the ability system (js/abilities/
// abilities.js's switch-on-power dispatch, js/ai/ai.js's play
// evaluation, js/services/dataLoader.js's id mapping). Removing it
// would break every animal ability; only its use as a victory/score
// metric is removed here.

/** Per-player result label, exposed for any future reward system to
 *  key off of (see js/game/gameOver.js's finishGame() header comment —
 *  the reward/economy system itself is out of scope here). */
export const MATCH_RESULT = Object.freeze({
    WINNER: "WINNER",
    DRAW:   "DRAW",
    LOSS:   "LOSS",
});

/**
 * Resolves a finished match into a discriminated union:
 *   { type: "WIN",  winnerId: string }      — exactly one player has
 *                                              the highest Party Card
 *                                              Count.
 *   { type: "DRAW", playerIds: string[] }   — two or more players
 *                                              share the highest Party
 *                                              Card Count.
 *
 * `players` must already reflect the final, completed hand — this is
 * only ever called from js/game/gameOver.js's finishGame(), once
 * isGameOver(gameState) is true (every player's hand/deck are empty).
 *
 * Deliberately deck/card-agnostic: it only reads `player.party.length`
 * and `player.id`, so it stays correct once players can build their
 * own decks (see README.md § Roadmap) — nothing here depends on a
 * specific card, card count per animal, or fixed deck composition.
 */
export function determineMatchOutcome(players) {
    const maxPartyCardCount = Math.max(...players.map(player => player.party.length));

    const leaders = players.filter(
        player => player.party.length === maxPartyCardCount
    );

    if (leaders.length === 1) {
        return {
            type: "WIN",
            winnerId: leaders[0].id,
        };
    }

    return {
        type: "DRAW",
        playerIds: leaders.map(player => player.id),
    };
}

/** Classifies a single player against an already-resolved outcome —
 *  the one place that turns { type, ... } into the WINNER/DRAW/LOSS
 *  label shown on the leaderboard/final-results screen, so every
 *  consumer reads the same classification instead of re-deriving it. */
export function getPlayerResult(player, outcome) {
    if (outcome.type === "WIN") {
        return player.id === outcome.winnerId ? MATCH_RESULT.WINNER : MATCH_RESULT.LOSS;
    }
    return outcome.playerIds.includes(player.id) ? MATCH_RESULT.DRAW : MATCH_RESULT.LOSS;
}
