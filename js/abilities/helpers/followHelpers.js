
import { CARD_IDS }
from "../../constants/cardIds.js";

import { 
    addLog,
    cardLabel
 }
from "../../services/logger.js";

import { emit, EVENTS }
from "../../presentation/events.js";

export function moveFollowersBehind(
    card,
    gameState
){

    const queue =
        gameState.queue;

    const cardIndex =
        queue.indexOf(card);

    if(cardIndex === -1)
        return;

    const followers =
        queue.filter(
            (c,index)=>
                c.id === CARD_IDS.SLOTH_BEAR &&
                index > cardIndex
        );

    followers.forEach(follower=>{

        const index =
            queue.indexOf(follower);

        if(index === cardIndex + 1)
            return; // already stuck right behind — nothing to animate

        // Cards currently sitting between the host and the follower's old
        // spot are about to be bumped back one slot each to make room for
        // the follower snapping in right behind the host. Capture them —
        // with the slot they're vacating — before mutating the queue, so
        // each can be animated clearing out of the way. Without this they
        // never get their own reposition event, so the follower's flight
        // lands squarely on top of a card that visually never moved.
        const displaced = [];
        for(let i = cardIndex + 1; i < index; i++){
            displaced.push({ card: queue[i], fromIndex: i });
        }

        queue.splice(index,1);

        queue.splice(
            cardIndex + 1,
            0,
            follower
        );

        // Let every bumped card visibly settle into its new (one-back)
        // slot first...
        displaced.forEach(({ card: other, fromIndex })=>{
            emit({ type: EVENTS.CARD_MOVED, card: other, fromIndex, toIndex: fromIndex + 1, reason: "settle" });
        });

        // ...then snap the Sloth Bear into the now-vacated slot right
        // behind its host — a quick, tight motion distinct from a card
        // being pushed or settling on its own.
        emit({ type: EVENTS.CARD_MOVED, card: follower, fromIndex: index, toIndex: cardIndex + 1, reason: "stick" });

        addLog(
            gameState,
            follower.owner,
            `${cardLabel(follower)} followed ${cardLabel(card)}`
        );

    });

}
