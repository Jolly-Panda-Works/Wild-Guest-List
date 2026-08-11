import { CARDS } from "../cards.js";

// Monotonically increasing id so every card instance in play has a stable
// identity the presentation layer can use to find its DOM node again
// across turns (cards are plain data objects otherwise, and structuredClone
// gives every player their own copies with no unique id of their own).
let _nextUid = 1;

export function createDeck(player){

    const deck=[];


    for(let i=1;i<=12;i++){

        const card =
            structuredClone(CARDS[i]);

        card.owner = player;
        card.uid = _nextUid++;

        deck.push(card);

    }


    return shuffle(deck);

}



export function drawCard(player){

    if(player.deck.length===0)
        return;


    if(player.hand.length>=4)
        return;


    player.hand.push(
        player.deck.shift()
    );

}



function shuffle(array){

    for(
        let i=array.length-1;
        i>0;
        i--
    ){

        const j=Math.floor(
            Math.random()*(i+1)
        );


        [array[i],array[j]]
        =
        [array[j],array[i]];

    }


    return array;
}