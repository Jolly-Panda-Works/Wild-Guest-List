export function sendToTrash(
    card,
    gameState
){

    const index =
        gameState.queue.indexOf(card);

    if(index !== -1){

        gameState.queue.splice(
            index,
            1
        );

    }

    gameState.trash.push(card);
    
}