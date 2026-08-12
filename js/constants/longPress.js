// Centralized long-press configuration — see js/ui/longPress.js for the
// reusable handler that consumes these. Keep every duration/threshold
// used by long-press anywhere in the app defined ONLY here.

/** Hold duration (ms) required to trigger a long-press. */
export const LONG_PRESS_DURATION_MS = 800;

/** Max pointer movement (px) allowed during a hold before it's cancelled
 *  as an accidental drag/scroll rather than a long-press. */
export const LONG_PRESS_MOVE_THRESHOLD_PX = 12;
