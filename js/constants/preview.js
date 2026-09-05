// Centralized Ability Preview / drag-to-play configuration. Keep every
// duration/threshold used by the feature defined ONLY here — see
// js/ui/game-ui.js (player drag) and js/game/turnManager.js (Bot preview).

/** Pointer movement (px) from press-start required before a Hand card
 *  press turns into an actual drag, rather than being left for the
 *  existing long-press-to-Card-Info gesture (js/ui/longPress.js) to
 *  interpret. Intentionally smaller than
 *  LONG_PRESS_MOVE_THRESHOLD_PX (js/constants/longPress.js) so a real
 *  drag starts slightly before long-press's own move-cancel kicks in,
 *  instead of the two fighting over the same small movement window. */
export const DRAG_START_THRESHOLD_PX = 8;

/** How long the Bot's Ability Preview stays visible on the board before
 *  it actually plays the card (Section 7 of the brief — "wait a short
 *  configurable duration"). */
export const BOT_PREVIEW_DISPLAY_DURATION_MS = 1100;
