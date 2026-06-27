import { addLog } from "../services/logger.js";
import { showEndGame } from "../ui/endgame-ui.js";

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

    let winner = null;

    let bestPartyCount = -1;

    let bestPower = -1;


    gameState.players.forEach(player => {

        const partyCount =
            player.party.length;

        const powerSum =
            player.party.reduce(
                (sum, card) =>
                    sum + card.power,
                0
            );


        if(
            partyCount > bestPartyCount
        ){

            winner = player;

            bestPartyCount =
                partyCount;

            bestPower =
                powerSum;

        }
        else if(
            partyCount === bestPartyCount &&
            powerSum > bestPower
        ){

            winner = player;

            bestPower =
                powerSum;

        }

    });


    gameState.gameOver = true;

    gameState.winner = winner;

    addLog(
        gameState,
        winner,
        "logWon", {}
    );

    showEndGame(gameState);
}