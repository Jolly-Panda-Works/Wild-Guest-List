import { resolveAbility }
from "../abilities/abilities.js";

import {
    addToQueue,
    resolveQueue
}
from "./queueManager.js";

import { drawCard }
from "./deck.js";

import { updateUI }
from "../ui/ui.js";

import { getRandomCardIndex }
from "../ai/ai.js";

import {
    isGameOver,
    finishGame
}
from "./gameOver.js";

import { 
    addLog,
    cardLabel 
}
from "../services/logger.js";

import {
    resolveRemainingQueue
}
from "./queueManager.js";

import { notifyCardPlayed, isWalkthroughActive } from "../ui/walkthrough.js";

export function startTurn(gameState){

    const player =
        gameState.players[
            gameState.currentPlayer
        ];

    if(
        player.hand.length === 0 &&
        player.deck.length === 0
    ){

        addLog(
            gameState,
            player,
            "logNoCards", {}
        );

        nextTurn(gameState);

        return;
    }

    if(player.id === "p1"){

        addLog(
            gameState,
            player,
            "logTurn", {}
        );

        updateUI(gameState);

        return;
    }

    addLog(
        gameState,
        player,
        "logTurn", {}
    );

    setTimeout(async ()=>{

        const index =
            getRandomCardIndex(player, gameState);

        await playCard(
            player,
            index,
            gameState
        );

    },1000);
}


function wait(ms){

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );

}

export async function playCard(
    player,
    index,
    gameState
){

    if(
        index === -1 ||
        player.hand.length === 0
    ){
        nextTurn(gameState);
        return;
    }

    const card =
        player.hand.splice(index, 1)[0];



    // ورود به صف
    addToQueue(
        card,
        gameState
    );

    addLog(
        gameState,
        player,
        "logPlayed", { card: cardLabel(card) }
    )

    // Notify walkthrough that a card was played (human only)
    if (player.id === "p1" && isWalkthroughActive()) {
        notifyCardPlayed();
    }

    updateUI(gameState);

    await wait(100);

    await resolveAbility(
        card,
        gameState
    );

    updateUI(gameState);

    await wait(1000);



    // فقط اگر هنوز 5 کارت یا بیشتر در صف بود
    if(gameState.queue.length >= 5){

        await resolveQueue(gameState);

        updateUI(gameState);

        await wait(1200);

    }



    // کشیدن کارت جدید
    drawCard(player);

    updateUI(gameState);

    await wait(300);



    // پایان بازی؟
    if(isGameOver(gameState)){

        resolveRemainingQueue(
            gameState
        );

        updateUI(gameState);

        finishGame(
            gameState
        );

        return;

    }



    // نوبت بعد
    nextTurn(gameState);

}



function nextTurn(gameState){

    if(
        isGameOver(gameState)
    ){

        finishGame(gameState);

        return;

    }

    gameState.currentPlayer++;

    if(
        gameState.currentPlayer >=
        gameState.players.length
    ){

        gameState.currentPlayer = 0;

        gameState.round++;

    }

    startTurn(gameState);

}

