import { 
    addLog,
    cardLabel
} from "../services/logger.js";

import { 
    notifyQueueWillResolve,
    notifyQueueResolved,
    isWalkthroughActive
} from "../ui/walkthrough.js";

import { emit, EVENTS } from "../presentation/events.js";

export function addToQueue(card, gameState){
    gameState.queue.push(card);
}

/**
 * resolveQueue now returns a Promise so turnManager can await it.
 * During walkthrough step 9, it pauses BEFORE resolving until the player
 * dismisses the walkthrough box, then finishes resolving.
 *
 * It also emits the semantic QUEUE_FULL -> ... -> QUEUE_RESOLUTION_COMPLETED
 * event sequence the presentation layer plays back (see js/presentation) --
 * the mutation logic itself (shift/shift/pop) is unchanged.
 */
export async function resolveQueue(gameState){
    if(gameState.queue.length < 5) return;

    // ── Walkthrough: pause BEFORE resolve, show step 9 with card names ──
    if (isWalkthroughActive()) {
        await notifyQueueWillResolve(gameState.queue);
    }

    const beforeOrder = gameState.queue.map(c => c.uid);
    emit({ type: EVENTS.QUEUE_FULL, queueSnapshot: gameState.queue.slice() });

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

    emit({ type: EVENTS.QUEUE_RESOLUTION_STARTED });
    emit({ type: EVENTS.CARD_ENTERED_PARTY, card: first,  order: 1 });
    emit({ type: EVENTS.CARD_ENTERED_PARTY, card: second, order: 2 });
    emit({ type: EVENTS.CARD_REJECTED, card: trash });

    // The two cards left behind slide from wherever they were (index 2/3)
    // into the front of the queue (index 0/1).
    gameState.queue.forEach((card, toIndex) => {
        const fromIndex = beforeOrder.indexOf(card.uid);
        if (fromIndex !== -1 && fromIndex !== toIndex) {
            emit({ type: EVENTS.CARD_MOVED, card, fromIndex, toIndex, reason: "settle" });
        }
    });

    emit({ type: EVENTS.QUEUE_RESOLUTION_COMPLETED });

    // ── Walkthrough step 9 done: unblock game ──
    if (isWalkthroughActive()) {
        notifyQueueResolved();
    }
}

export function resolveRemainingQueue(gameState){
    while(gameState.queue.length > 0){
        if(gameState.queue.length <= 2){
            // Achievement metadata only (Last One Standing) — purely
            // descriptive, same as the existing `order` field, and does
            // not change the shift/push mutation logic below at all.
            const soleSurvivor = gameState.queue.length === 1;
            while(gameState.queue.length > 0){
                const card = gameState.queue.shift();
                card.owner.party.push(card);
                emit({ type: EVENTS.CARD_ENTERED_PARTY, card, order: "final", soleSurvivor });
            }
        } else {
            const first  = gameState.queue.shift();
            const second = gameState.queue.shift();
            first.owner.party.push(first);
            second.owner.party.push(second);
            emit({ type: EVENTS.CARD_ENTERED_PARTY, card: first,  order: 1 });
            emit({ type: EVENTS.CARD_ENTERED_PARTY, card: second, order: 2 });
            while(gameState.queue.length > 0){
                const card = gameState.queue.shift();
                gameState.trash.push(card);
                emit({ type: EVENTS.CARD_REJECTED, card });
            }
        }
    }
}
