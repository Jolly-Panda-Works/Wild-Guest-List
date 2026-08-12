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
    CARD_JUMPED:                "CARD_JUMPED",                 // Kangaroo only — big obvious hop
    CARD_ESCAPED:                "CARD_ESCAPED",                // displaced but stays in the queue
    CARD_MOVED:                  "CARD_MOVED",                  // reposition; `reason` picks the visual flavor (rush/push/hop/settle)
    CARD_REMOVED:                "CARD_REMOVED",                // eliminated from the queue (not by Crocodile); `cause` picks the reaction flavor
    CARD_EATEN:                  "CARD_EATEN",                  // eliminated specifically by Crocodile
    CARD_REACTED:                "CARD_REACTED",                // in-place-only reaction, no reposition (e.g. a block, a satisfied recoil)
    QUEUE_REORDERED:              "QUEUE_REORDERED",             // a whole-queue reshuffle (Snake/Seal) played as one concurrent batch
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
const REPOSITIONING_TYPES = new Set([
    "CARD_JUMPED",
    "CARD_ESCAPED",
    "CARD_MOVED",
]);

export function emit(event) {
    if (!_buffer) {
        console.warn("[events] emit() outside of a capture — dropped:", event);
        return;
    }
    _buffer.push(event);

    // Only mark a card "already handled" if this event actually moved it
    // to its final resting slot. CARD_REACTED is explicitly in-place-only
    // (a block, a recoil) and must NOT suppress the generic settle pass —
    // a card can react in place *and* still need to slide to a new index
    // afterwards (e.g. Crocodile sliding forward once the gap in front of
    // it closes). CARD_REMOVED/CARD_EATEN cards leave the queue array
    // entirely, so marking them is harmless either way, but only actual
    // repositioning events should count here.
    if (REPOSITIONING_TYPES.has(event.type) && event.card && event.card.uid != null) {
        _animatedUids.add(event.card.uid);
    }
    // QUEUE_REORDERED bundles several cards under `moves` instead of a
    // single top-level `card` — mark all of them so the generic settle
    // pass in resolveAbility() doesn't also try to animate them.
    if (Array.isArray(event.moves)) {
        event.moves.forEach(m => { if (m.card?.uid != null) _animatedUids.add(m.card.uid); });
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
