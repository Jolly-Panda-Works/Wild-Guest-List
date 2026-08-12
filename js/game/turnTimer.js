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
 *
 * Pause is tracked here (not in the Pause UI module) so it's the single
 * source of truth for every entry point that can (re)start a countdown —
 * including a brand new turn's own startTurnTimer() call, which happens
 * whenever one turn's card finishes animating and hands off to the next
 * player. Without that, pausing mid-animation would freeze the *current*
 * turn's countdown correctly, but the *next* turn beginning right after
 * would call startTurnTimer() fresh and start ticking again completely
 * unaware the game was still paused — which is what made the on-screen
 * timer look like it "kept going" even with the pause panel open.
 */

let intervalId = null;
let pausedSecondsLeft = null;
let activeOnTick = null;
let activeOnExpire = null;
let isPausedFlag = false;

export function isPaused() {
    return isPausedFlag;
}

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

    const secondsAtStart = TURN_TIMER_SECONDS;
    onTick?.(secondsAtStart);

    if (isPausedFlag) {
        // A new turn is starting while the game is still paused (e.g. the
        // previous turn's card was still animating when Pause was
        // clicked, and only just finished). Record the full starting
        // value and stop here — resumeTurnTimer() picks this up and
        // starts the countdown for real once the player actually resumes,
        // instead of ticking away unseen behind the pause panel.
        pausedSecondsLeft = secondsAtStart;
        return;
    }

    let secondsLeft = secondsAtStart;

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
 * genuinely ending. Also marks the game paused so that any turn which
 * starts while still paused (see startTurnTimer() above) begins frozen
 * too, instead of only the turn that was already running when Pause was
 * clicked. Safe to call any time, including when no timer is running.
 */
export function pauseTurnTimer() {
    isPausedFlag = true;
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

/**
 * Resumes a countdown previously frozen by pauseTurnTimer(), continuing
 * from the exact second it was paused at (or, if a new turn started
 * while paused, from a full TURN_TIMER_SECONDS) rather than restarting
 * from scratch. No-op if nothing was paused.
 */
export function resumeTurnTimer() {
    isPausedFlag = false;

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
