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
 * Freeze / game-runtime state (RUNNING / PAUSED / STEP_BY_STEP) is
 * tracked here too, not in a separate module, so it's the single source
 * of truth for every entry point that can (re)start a countdown or
 * decide whether ANY gameplay is currently allowed to progress —
 * including a brand new turn's own startTurnTimer() call (see the note
 * below), the AI's thinking-delay callback, and the "point of no
 * return" gameplay mutations in turnManager.js (ability resolution,
 * queue resolution, card draw, turn advance), all of which await
 * waitUntilResumed() before doing anything a Pause or the in-game
 * Step-by-Step walkthrough shouldn't let through.
 *
 * Two independent callers can each hold gameplay frozen — the Pause
 * panel (js/ui/pause-ui.js, reason "pause") and the walkthrough
 * (js/ui/walkthrough.js, reason "tutorial", held only while its box is
 * actually visible and waiting on a "Next" click — not during its
 * "let the game play out until the queue fills" phase, which is by
 * design). js/game-main.js's portrait-orientation gate also freezes
 * gameplay this same way, sharing the "pause" reason bucket with the
 * Pause panel (with its own external bookkeeping to avoid stealing or
 * dropping a pause the OTHER of the two didn't start — see that file),
 * rather than needing a third reason string here. Reasons live in a
 * Set rather than one shared boolean so one of them clearing (e.g. the
 * walkthrough finishing) never accidentally resumes gameplay the OTHER
 * one is still explicitly holding frozen (e.g. the player also has
 * Pause open) — see isPaused()/getGameRuntimeState() and
 * pauseTurnTimer()/resumeTurnTimer() below.
 *
 * Without a shared freeze flag, pausing mid-animation would freeze the
 * *current* turn's countdown correctly, but the *next* turn beginning
 * right after would call startTurnTimer() fresh and start ticking again
 * completely unaware the game was still frozen — which is what made the
 * on-screen timer (and, before this, the Queue/ability/AI pipeline too)
 * look like it "kept going" even with the Pause panel or the walkthrough
 * box open.
 */

let intervalId = null;
let pausedSecondsLeft = null;
let activeOnTick = null;
let activeOnExpire = null;
let freezeReasons = new Set();

export const GAME_STATE = Object.freeze({
    RUNNING: "RUNNING",
    PAUSED: "PAUSED",
    STEP_BY_STEP: "STEP_BY_STEP",
});

/** True while ANY freeze reason (Pause and/or the walkthrough's visible
 *  box) is currently held. This is the one predicate every gameplay-
 *  driving call site checks — directly, or via waitUntilResumed() below
 *  — before doing anything the player didn't just explicitly trigger
 *  themselves. */
export function isPaused() {
    return freezeReasons.size > 0;
}

/** Which specific frozen state is active, for anything that cares WHY
 *  (not just whether). "pause" wins the label if both happen to be held
 *  at once, since the Pause panel is the one actually covering the
 *  screen in that case. */
export function getGameRuntimeState() {
    if (freezeReasons.has("pause")) return GAME_STATE.PAUSED;
    if (freezeReasons.has("tutorial")) return GAME_STATE.STEP_BY_STEP;
    return GAME_STATE.RUNNING;
}

/**
 * Resolves immediately if gameplay can already proceed; otherwise waits,
 * re-checking periodically, until every freeze reason clears. This is
 * what lets an action already scheduled before Pause/the walkthrough
 * engaged (a queued Queue resolution, an AI's already-elapsed "thinking"
 * delay, a turn advance) remain pending and run exactly once after
 * Resume, instead of executing silently underneath the overlay or being
 * lost entirely.
 */
export function waitUntilResumed() {
    if (!isPaused()) return Promise.resolve();
    return new Promise(resolve => {
        const check = () => {
            if (!isPaused()) { resolve(); return; }
            setTimeout(check, 300);
        };
        check();
    });
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

    if (isPaused()) {
        // A new turn is starting while gameplay is still frozen (Pause
        // and/or the walkthrough — e.g. the previous turn's card was
        // still animating when one of them engaged, and only just
        // finished). Record the full starting value and stop here —
        // resumeTurnTimer() picks this up and starts the countdown for
        // real once every freeze reason clears, instead of ticking away
        // unseen behind the overlay.
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
 * genuinely ending. Also records the freeze reason so any turn which
 * starts while still frozen (see startTurnTimer() above) begins frozen
 * too, instead of only the turn that was already running when this was
 * called. Safe to call any time, including when no timer is running,
 * and safe to call more than once for the same reason (e.g. moving
 * between two walkthrough steps that both freeze) — a Set only ever
 * holds one entry per reason.
 *
 * @param {"pause"|"tutorial"} [reason]
 */
export function pauseTurnTimer(reason = "pause") {
    freezeReasons.add(reason);
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

/**
 * Clears one freeze reason. Only actually resumes the countdown once
 * EVERY reason has cleared — e.g. closing the walkthrough while Pause
 * is also open leaves the game frozen until Pause is separately
 * resumed, and vice versa. Continues from the exact second the
 * countdown was frozen at (or, if a new turn started while frozen,
 * from a full TURN_TIMER_SECONDS) rather than restarting from scratch.
 * No-op if the given reason wasn't held, or if another reason still is.
 *
 * @param {"pause"|"tutorial"} [reason]
 */
export function resumeTurnTimer(reason = "pause") {
    freezeReasons.delete(reason);
    if (freezeReasons.size > 0) return; // still frozen for another reason

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
