import { TURN_TIMER_SECONDS } from "../constants/turnTimer.js";

/**
 * Per-turn countdown watchdog.
 *
 * Ticks once a second from TURN_TIMER_SECONDS down to 0. If it ever
 * reaches 0, onExpire() fires — turnManager.js responds to that by
 * playing a random card for whoever's turn it currently is, exactly the
 * same fallback the AI already uses when it "decides" what to play.
 *
 * Applies uniformly to every player, human and AI alike (see
 * startTurn() in turnManager.js, which starts this for both). In
 * practice it's mostly a safety net for the AI — its own much shorter
 * "thinking" delay normally plays a card well before ten seconds are
 * up — but for the human player it's the actual clock.
 *
 * Only one countdown is ever active at a time: starting a new one always
 * stops whatever was still running, so callers never have to remember
 * to stop the previous turn's timer themselves before starting the next.
 */

let intervalId = null;
let pausedSecondsLeft = null;
let activeOnTick = null;
let activeOnExpire = null;

/**
 * @param {Object} options
 * @param {(secondsLeft: number) => void} [options.onTick] - called
 *        immediately with the starting value, then again every second
 *        (including the final call with 0).
 * @param {() => void} [options.onExpire] - called once, right after the
 *        onTick(0) call, if the countdown ever reaches 0 on its own.
 *        Never called if stopTurnTimer() stops it first.
 */
export function startTurnTimer({ onTick, onExpire } = {}) {
    stopTurnTimer();

    activeOnTick = onTick;
    activeOnExpire = onExpire;
    pausedSecondsLeft = null;

    let secondsLeft = TURN_TIMER_SECONDS;
    onTick?.(secondsLeft);

    intervalId = setInterval(() => {
        secondsLeft -= 1;

        if (secondsLeft <= 0) {
            stopTurnTimer();
            onTick?.(0);
            onExpire?.();
            return;
        }

        pausedSecondsLeft = secondsLeft;
        onTick?.(secondsLeft);
    }, 1000);
}

/** Safe to call any time, including when no timer is running. */
export function stopTurnTimer() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

/**
 * Freezes the countdown at whatever second it's currently on, without
 * losing that value — unlike stopTurnTimer(), which is meant for a turn
 * genuinely ending. Used by the Pause panel so the countdown can never
 * expire (and auto-play a random card) while the player is looking at
 * the pause overlay instead of the board. Safe to call when no timer is
 * running or the timer is already paused.
 */
export function pauseTurnTimer() {
    if (intervalId === null) return;
    clearInterval(intervalId);
    intervalId = null;
}

/**
 * Resumes a countdown previously frozen by pauseTurnTimer(), continuing
 * from the exact second it was paused at rather than restarting from
 * TURN_TIMER_SECONDS. No-op if nothing was paused.
 */
export function resumeTurnTimer() {
    if (pausedSecondsLeft === null || intervalId !== null) return;

    let secondsLeft = pausedSecondsLeft;

    intervalId = setInterval(() => {
        secondsLeft -= 1;

        if (secondsLeft <= 0) {
            stopTurnTimer();
            pausedSecondsLeft = null;
            activeOnTick?.(0);
            activeOnExpire?.();
            return;
        }

        pausedSecondsLeft = secondsLeft;
        activeOnTick?.(secondsLeft);
    }, 1000);
}
