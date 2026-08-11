/**
 * Semantic gameplay events.
 *
 * Game/ability logic (abilities.js, queueManager.js, and the small set of
 * queue/trash helpers) emits these while it runs. They describe WHAT
 * happened to WHICH card, never HOW it should look — that's the
 * presentation layer's job (see js/presentation/director.js).
 *
 * Emission only ever happens inside a "capture" — a short-lived buffer
 * opened by the orchestrator (turnManager.js) right before it calls into
 * logic that mutates gameState, and closed right after. This keeps the
 * event log a pure, disposable side-channel: gameState stays the single
 * source of truth, and if nothing is capturing, emit() safely no-ops
 * instead of throwing.
 */

export const EVENTS = {
    CARD_JUMPED:                "CARD_JUMPED",                 // Kangaroo only
    CARD_ESCAPED:                "CARD_ESCAPED",                // displaced but stays in the queue
    CARD_MOVED:                  "CARD_MOVED",                  // generic reposition (incl. auto "settle" diffs)
    CARD_REMOVED:                "CARD_REMOVED",                // eliminated from the queue (not by Crocodile)
    CARD_EATEN:                  "CARD_EATEN",                  // eliminated specifically by Crocodile
    QUEUE_FULL:                  "QUEUE_FULL",
    QUEUE_RESOLUTION_STARTED:    "QUEUE_RESOLUTION_STARTED",
    CARD_ENTERED_PARTY:          "CARD_ENTERED_PARTY",
    CARD_REJECTED:                "CARD_REJECTED",
    QUEUE_RESOLUTION_COMPLETED:  "QUEUE_RESOLUTION_COMPLETED",
};

let _buffer = null;
const _animatedUids = new Set();

/** Open a new capture. Any emit() calls until endCapture() land in it. */
export function beginCapture() {
    _buffer = [];
    _animatedUids.clear();
    return _buffer;
}

/**
 * Record a semantic event. Safe to call even when nothing is capturing
 * (drops the event with a console warning) so a missing capture can never
 * throw and break game logic.
 */
export function emit(event) {
    if (!_buffer) {
        console.warn("[events] emit() outside of a capture — dropped:", event);
        return;
    }
    _buffer.push(event);
    if (event.card && event.card.uid != null) {
        _animatedUids.add(event.card.uid);
    }
}

/** Has this card already been given an explicit event in the current capture? */
export function wasAnimated(uid) {
    return _animatedUids.has(uid);
}

/** Close the current capture and return everything emitted into it. */
export function endCapture() {
    const events = _buffer || [];
    _buffer = null;
    return events;
}

export function isCapturing() {
    return _buffer !== null;
}
