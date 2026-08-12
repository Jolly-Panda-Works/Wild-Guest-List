
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

        queue.splice(index,1);

        queue.splice(
            cardIndex + 1,
            0,
            follower
        );

        // A quick, tight snap-into-place — Sloth Bear staying "stuck"
        // right behind whoever it's following, distinct from a card
        // being pushed or settling on its own.
        if(index !== cardIndex + 1){
            emit({ type: EVENTS.CARD_MOVED, card: follower, fromIndex: index, toIndex: cardIndex + 1, reason: "stick" });
        }

        addLog(
            gameState,
            follower.owner,
            `${cardLabel(follower)} followed ${cardLabel(card)}`
        );

    });

}
