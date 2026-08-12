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
    AI_THINKING_DELAY_MIN_MS,
    AI_THINKING_DELAY_MAX_MS
}
from "../constants/playerTypes.js";

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

import { getHandCardElement, getOpponentHandBackElement, renderTurnTimer }
from "../ui/game-ui.js";

import { startTurnTimer, stopTurnTimer } from "./turnTimer.js";

import { director } from "../presentation/director.js";
import { beginCapture, endCapture } from "../presentation/events.js";

import { shouldShowGuidance, buildGuidancePayload, showCardGuidance }
from "../ui/cardGuidance-ui.js";

import { playSound } from "../services/soundManager.js";

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

    addLog(
        gameState,
        player,
        "logTurn", {}
    );

    // Every turn — human and AI alike — is capped by the same countdown
    // (see js/game/turnTimer.js): if nobody has played a card by the
    // time it reaches 0, one is chosen at random for them, exactly like
    // the AI's own fallback below. For the AI this is mostly a safety
    // net, since its "thinking" delay normally plays a card well inside
    // the window; for the human it's the actual clock.
    startTurnTimer({
        onTick: renderTurnTimer,
        onExpire: () => {
            if (director.isBusy()) return; // a play is already underway
            const index = getRandomCardIndex(player, gameState);
            playCard(player, index, gameState);
        },
    });

    if(player.id === "p1"){

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

    // Reflect the turn hand-off immediately — before the "thinking" delay
    // and before any card is played — so the current-turn highlight (see
    // renderOtherPlayers) lights up the moment it becomes this bot's
    // turn, not only once its card is already mid-flight into the queue
    // (which is when playCard()'s own updateNonBoardUI calls would
    // otherwise first run).
    updateNonBoardUI(gameState);

    setTimeout(async ()=>{

        const index =
            getRandomCardIndex(player, gameState);

        await playCard(
            player,
            index,
            gameState
        );

    }, AI_THINKING_DELAY_MIN_MS + Math.random() * (AI_THINKING_DELAY_MAX_MS - AI_THINKING_DELAY_MIN_MS));
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
        stopTurnTimer();
        nextTurn(gameState);
        return;
    }

    if (director.isBusy()) {
        // Guards against the same turn being kicked off twice (e.g. a
        // stray double call) — the lock below is the primary defense,
        // this is belt-and-suspenders at the entry point.
        return;
    }

    // A card is definitely being played now — stop the countdown right
    // away so it never keeps visibly ticking (or fires a redundant
    // random pick) during the animation that follows, regardless of
    // whether this play came from a human click, the AI's own decision,
    // or the timer's own onExpire fallback calling back into here.
    stopTurnTimer();

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

        // Tag every event from this capture with the ability that caused
        // it (the card being played is always the actor here, even for
        // events about a different, affected card) — this is what lets
        // the presenter pick a per-animal visual style (see
        // js/presentation/abilityPresentations.js) instead of guessing
        // from a generic reason/cause string alone.
        abilityEvents.forEach(evt => { evt.abilityPower = card.power; });

        if (abilityEvents.length > 0) {
            playSound("abilityActivated");
        }
        // Dim the rest of the queue while an ability's effects play out,
        // so the eye is drawn to whichever card(s) are actually involved
        // instead of the whole row competing for attention at once. The
        // played card itself (`focus`) always stays highlighted, even if
        // its own ability only affects other cards.
        await director.run(abilityEvents, { dim: true, focus: card });

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
