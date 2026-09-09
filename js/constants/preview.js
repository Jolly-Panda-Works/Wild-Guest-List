// Centralized Ability Preview / drag-to-play configuration. Keep every
// duration/threshold used by the feature defined ONLY here — see
// js/ui/game-ui.js (player drag) and js/game/turnManager.js (Bot preview).

/** Pointer movement (px) from press-start required before a Hand card
 *  press turns into an actual drag, rather than being treated as a
 *  plain tap/click. Small enough that a drag feels immediate, large
 *  enough that a stationary press/tap doesn't jitter into an
 *  accidental drag. */
export const DRAG_START_THRESHOLD_PX = 8;

// NOTE: BOT_PREVIEW_DISPLAY_DURATION_MS used to live here — how long
// the Bot's Queue Ability Preview stayed visible BEFORE it played its
// card. It's gone: the Preview now appears only once the card itself
// is visible on the opponent's deck (js/game/turnManager.js's
// previewThenPlayCard(), driven by the onRevealed hook in
// js/ui/game-ui.js's cardEnteredQueue()), and stays up for exactly as
// long as that deck reveal's own hold phase — T.opponentHold in
// js/ui/game-ui.js — rather than a separate timer here.
