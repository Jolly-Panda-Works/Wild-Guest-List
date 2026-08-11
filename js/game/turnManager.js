import { resolveAbility }
from "../abilities/abilities.js";

import {
    addToQueue,
    resolveQueue
}
from "./queueManager.js";

import { drawCard }
from "./deck.js";

import { updateUI, updateNonBoardUI }
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

import { getHandCardElement, getOpponentHandBackElement }
from "../ui/game-ui.js";

import { director } from "../presentation/director.js";
import { beginCapture, endCapture } from "../presentation/events.js";

import { shouldShowGuidance, buildGuidancePayload, showCardGuidance }
from "../ui/cardGuidance-ui.js";

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

        // The queue/party/trash board only needs a full (re)build the very
        // first time it's shown; every turn after that it's already
        // correct and incrementally maintained by the Director, so a full
        // rebuild here would just re-trigger every card's enter animation
        // for no reason. Fall back to a full render if the board somehow
        // isn't there yet (e.g. this is genuinely the first paint).
        const boardReady = document.querySelectorAll("#queue .queue-slot").length > 0;
        if (boardReady) {
            updateNonBoardUI(gameState);
        } else {
            updateUI(gameState);
        }

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

/**
 * Plays one card and animates its full consequences (entering the queue,
 * its ability resolving, and — if the queue just filled up — the queue
 * resolving) before handing the turn off. The four previous hardcoded
 * `await wait(ms)` pauses are gone: pacing now comes entirely from the
 * animation Director actually finishing each step
 * (`await director.run(events)` / `await director.presentCardEnteredQueue(...)`),
 * not from a guessed timeout.
 *
 * Game state is mutated by the exact same functions as before
 * (addToQueue / resolveAbility / resolveQueue / resolveRemainingQueue) —
 * only the presentation around those calls has changed. If anything in
 * the animation pipeline throws, the catch block below falls back to an
 * instant full re-render so the game state (already correct) is always
 * reflected and the input lock is always released — the game can never
 * get stuck because a card's DOM element went missing or a transition
 * failed to fire.
 */
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

    if (director.isBusy()) {
        // Guards against the same turn being kicked off twice (e.g. a
        // stray double call) — the lock below is the primary defense,
        // this is belt-and-suspenders at the entry point.
        return;
    }

    // Capture the DOM element the card is visually leaving BEFORE it's
    // spliced out of the hand array / re-rendered.
    const sourceEl = player.id === "p1"
        ? getHandCardElement(index)
        : getOpponentHandBackElement(player);

    director.lock();

    try {

        const card =
            player.hand.splice(index, 1)[0];

        addLog(
            gameState,
            player,
            "logPlayed", { card: cardLabel(card) }
        )

        // Notify walkthrough that a card was played (human only)
        if (player.id === "p1" && isWalkthroughActive()) {
            notifyCardPlayed();
        }

        addToQueue(
            card,
            gameState
        );

        await director.presentCardEnteredQueue(card, sourceEl, gameState.queue.length - 1);
        await updateNonBoardUI(gameState);

        beginCapture();
        const { beforeQueue, afterQueue } = await resolveAbility(
            card,
            gameState
        );
        const abilityEvents = endCapture();
        await director.run(abilityEvents);

        await updateNonBoardUI(gameState);

        // Contextual "here's what that ability did" popup — first-time
        // players / Step-by-step Guidance in Settings, human plays only,
        // at most once per ability. Shown AFTER the ability has already
        // animated (see js/ui/cardGuidance-ui.js) so the player sees the
        // real result before it's explained, then confirms understanding
        // before the turn continues.
        if (player.id === "p1" && shouldShowGuidance(card)) {
            const payload = buildGuidancePayload(card, beforeQueue, afterQueue, abilityEvents);
            await showCardGuidance(payload);
        }

        // فقط اگر هنوز 5 کارت یا بیشتر در صف بود
        if(gameState.queue.length >= 5){

            beginCapture();
            await resolveQueue(gameState);
            await director.run(endCapture());

            await updateNonBoardUI(gameState);

        }

        // کشیدن کارت جدید
        drawCard(player);

        await updateNonBoardUI(gameState);

        // پایان بازی؟
        if(isGameOver(gameState)){

            beginCapture();
            resolveRemainingQueue(
                gameState
            );
            await director.run(endCapture());

            await updateNonBoardUI(gameState);

            finishGame(
                gameState
            );

            return;

        }

        // نوبت بعد
        nextTurn(gameState);

    } catch (err) {

        console.error("[turnManager] animation pipeline error — falling back to an instant full re-render", err);
        // Game state mutations above already happened (they're plain,
        // synchronous, non-throwing array operations); only presentation
        // could have failed here. A full reconcile render guarantees the
        // UI still matches the authoritative state even if some step's
        // animation didn't play.
        await updateUI(gameState);

    } finally {

        director.unlock();

    }

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
