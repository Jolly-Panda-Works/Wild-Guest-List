/**
 * Shared config for the per-turn countdown (see js/game/turnTimer.js and
 * the .turn-timer-label rules in css/style.css) — single source of truth
 * so the interval logic, the displayed starting number, and the color
 * fraction math never drift from each other.
 */
export const TURN_TIMER_SECONDS = 10;
