import { PLAYER_TYPES } from "../../constants/playerTypes.js";


import { openKangarooChoice } 
from "../../ui/kangaroo-ui.js";


export async function chooseKangarooJump(player, maxJump){



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