import { CARDS } from "../cards.js";


export function createDeck(player){

    const deck=[];


    for(let i=1;i<=12;i++){

        const card =
            structuredClone(CARDS[i]);

        card.owner = player;

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