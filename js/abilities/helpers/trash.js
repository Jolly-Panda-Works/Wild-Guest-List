import { emit, EVENTS } from "../../presentation/events.js";

/**
 * Removes a card from the queue and sends it to trash.
 *
 * `cause` is purely descriptive (used by the presentation layer to pick a
 * fitting reaction -- e.g. "eaten" plays a distinct animation from a plain
 * "weaker"/"blocked"/"scared" removal) and has no effect on game rules.
 */
export function sendToTrash(
    card,
    gameState,
    cause = "removed"
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

    emit({
        type: cause === "eaten" ? EVENTS.CARD_EATEN : EVENTS.CARD_REMOVED,
        card,
        fromIndex: index,
        cause
    });

}
