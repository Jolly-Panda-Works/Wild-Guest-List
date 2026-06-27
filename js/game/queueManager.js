import { 
    addLog,
    cardLabel
} from "../services/logger.js";

import { 
    notifyQueueWillResolve,
    notifyQueueResolved,
    isWalkthroughActive
} from "../ui/walkthrough.js";

export function addToQueue(card, gameState){
    gameState.queue.push(card);
}

/**
 * resolveQueue now returns a Promise so turnManager can await it.
 * During walkthrough step 9, it pauses BEFORE resolving until the player
 * dismisses the walkthrough box, then finishes resolving.
 */
export async function resolveQueue(gameState){
    if(gameState.queue.length < 5) return;

    // ── Walkthrough: pause BEFORE resolve, show step 9 with card names ──
    if (isWalkthroughActive()) {
        await notifyQueueWillResolve(gameState.queue);
    }

    // ── Now actually resolve ──
    const first  = gameState.queue.shift();
    const second = gameState.queue.shift();
    const trash  = gameState.queue.pop();

    first.owner.party.push(first);
    second.owner.party.push(second);
    gameState.trash.push(trash);

    addLog(gameState, first.owner,  "logEnteredParty", { card: cardLabel(first) });
    addLog(gameState, second.owner, "logEnteredParty", { card: cardLabel(second) });
    addLog(gameState, trash.owner,  "logSentToTrash",  { card: cardLabel(trash) });

    // ── Walkthrough step 9 done: unblock game ──
    if (isWalkthroughActive()) {
        notifyQueueResolved();
    }
}

export function resolveRemainingQueue(gameState){
    while(gameState.queue.length > 0){
        if(gameState.queue.length <= 2){
            while(gameState.queue.length > 0){
                const card = gameState.queue.shift();
                card.owner.party.push(card);
            }
        } else {
            const first  = gameState.queue.shift();
            const second = gameState.queue.shift();
            first.owner.party.push(first);
            second.owner.party.push(second);
            while(gameState.queue.length > 0){
                const card = gameState.queue.shift();
                gameState.trash.push(card);
            }
        }
    }
}
