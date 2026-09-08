export const gameState = {

    players: [],
    queue: [],
    trash: [],

    logs: [],

    currentPlayer: 0,
    round: 1,

    lastAbility: null,

    gameOver: false,
    // Discriminated union set once by js/game/gameOver.js's finishGame():
    //   { type: "WIN",  winnerId: string }
    //   { type: "DRAW", playerIds: string[] }
    // See js/game/matchOutcome.js — Party Card Count is the sole metric,
    // with no Card Power (or any other) tie-breaker.
    outcome: null
};