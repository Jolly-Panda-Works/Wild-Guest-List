import { PLAYER_TYPES } from "../../constants/playerTypes.js";


import { openKangarooChoice } 
from "../../ui/kangaroo-ui.js";


/**
 * `preview = true` is set only by the Ability Preview system (see
 * ../previewResolver.js) when it runs this exact same ability code
 * against a throwaway queue clone to compute what WOULD happen. It must
 * never open the real chooser UI — during a drag this can be
 * recalculated, and it must never require/await human interaction. It
 * deterministically returns the farthest legal jump instead, which is a
 * simplification: the human's *actual* jump distance is only decided
 * (via the real UI, below) once the card has actually entered the Queue
 * and this same function runs again for real. See docs/deliverable notes
 * on Kangaroo for this known Preview/Execution nuance.
 */
export async function chooseKangarooJump(player, maxJump, { preview = false } = {}){

    if(preview)
        return maxJump;

    if(!player)
        return 1;



    if(player.type === PLAYER_TYPES.AI){


        const jump =
            Math.floor(
                Math.random() * maxJump
            ) + 1;


        return jump;

    }



    return await openKangarooChoice(maxJump);

}