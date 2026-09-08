import { addLog } from "../services/logger.js";
import { showEndGame } from "../ui/endgame-ui.js";
import { notifyGameFinished } from "../services/achievements.js";
import { determineMatchOutcome } from "./matchOutcome.js";

export function isGameOver(gameState){

    return gameState.players.every(
        player =>
            player.hand.length === 0 &&
            player.deck.length === 0
    );

}

export function finishGame(gameState){

    if(gameState.gameOver)
        return;

    // Party Card Count is the sole victory metric — see
    // js/game/matchOutcome.js. There is no Card Power (or any other)
    // tie-breaker: a shared highest count is a real DRAW, not resolved
    // by any hidden score.
    const outcome = determineMatchOutcome(gameState.players);

    gameState.gameOver = true;

    gameState.outcome = outcome;

    if (outcome.type === "WIN") {

        const winner = gameState.players.find(
            player => player.id === outcome.winnerId
        );

        addLog(
            gameState,
            winner,
            "logWon", {}
        );

    } else {

        addLog(
            gameState,
            null,
            "logDraw", {}
        );

    }

    // Achievement evaluation happens only here, off the authoritative,
    // once-only game result — never from UI state. Deliberately not
    // awaited: finishGame() itself stays synchronous (as it always was)
    // and the achievement/unlock-notification UI updates independently
    // a moment later.
    notifyGameFinished(gameState);

    showEndGame(gameState);
}
