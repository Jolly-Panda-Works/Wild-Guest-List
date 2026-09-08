// Centralized Ability Preview / drag-to-play configuration. Keep every
// duration/threshold used by the feature defined ONLY here — see
// js/ui/game-ui.js (player drag) and js/game/turnManager.js (Bot preview).

/** Pointer movement (px) from press-start required before a Hand card
 *  press turns into an actual drag, rather than being treated as a
 *  plain tap/click. Small enough that a drag feels immediate, large
 *  enough that a stationary press/tap doesn't jitter into an
 *  accidental drag. */
export const DRAG_START_THRESHOLD_PX = 8;

/** How long the Bot's Ability Preview stays visible on the board before
 *  it actually plays the card (Section 7 of the brief — "wait a short
 *  configurable duration"). */
export const BOT_PREVIEW_DISPLAY_DURATION_MS = 1100;
