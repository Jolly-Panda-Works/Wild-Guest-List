
import { CARD_IDS }
from "../../constants/cardIds.js";

import { 
    addLog,
    cardLabel
 }
from "../../services/logger.js";

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

        addLog(
            gameState,
            follower.owner,
            `${cardLabel(follower)} followed ${cardLabel(card)}`
        );

    });

}