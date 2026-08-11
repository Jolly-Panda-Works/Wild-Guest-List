import { emit, EVENTS } from "../../presentation/events.js";

// moveCard() is only ever called by Kangaroo's ability today, so it emits
// the Kangaroo-specific CARD_JUMPED event directly rather than the generic
// CARD_MOVED -- this is what lets the presentation layer give Kangaroo its
// own distinct "hop" animation instead of a flat slide.
export function moveCard(
    queue,
    from,
    to
){

    const card = queue[from];

    const result = queue.splice(from,1)[0];

    queue.splice(
        to,
        0,
        result
    );

    emit({ type: EVENTS.CARD_JUMPED, card, fromIndex: from, toIndex: to });

}

export function swapCards(
    queue,
    a,
    b
){

    [
        queue[a],
        queue[b]
    ] =
    [
        queue[b],
        queue[a]
    ];

}
