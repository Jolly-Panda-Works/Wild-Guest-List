/**
 * Animation Director.
 *
 * Owns:
 *  - the "is an animation sequence in progress" input lock
 *  - sequential playback of semantic event bundles produced by
 *    abilities.js / queueManager.js, handed off to whatever presenter
 *    is configured (game-ui.js registers itself on module load)
 *
 * The Director never touches gameState and never decides WHAT happened —
 * it only asks the presenter to show something that already happened.
 * If the presenter throws or can't find a DOM element for an event, the
 * Director logs it and moves on to the next event rather than stalling
 * the turn — the underlying game state is already correct regardless of
 * whether the animation played.
 */

class Director {
    constructor() {
        this._busy = false;
        this._presenter = null;
    }

    /** Registered once by game-ui.js. */
    configure(presenter) {
        this._presenter = presenter;
    }

    isBusy() {
        return this._busy;
    }

    lock() {
        this._busy = true;
        document.body?.classList.add("gameplay-locked");
    }

    unlock() {
        this._busy = false;
        document.body?.classList.remove("gameplay-locked");
    }

    /**
     * Animate a just-played card leaving the hand and joining the back of
     * the queue. Kept separate from run() because it needs the specific
     * source element the click/AI-pick came from, which isn't something
     * pure game logic (addToQueue) knows about.
     */
    async presentCardEnteredQueue(card, sourceEl, toIndex) {
        if (!this._presenter?.cardEnteredQueue) return;
        try {
            await this._presenter.cardEnteredQueue(card, sourceEl, toIndex);
        } catch (e) {
            console.error("[director] cardEnteredQueue presentation failed, continuing", e);
        }
    }

    /** Play a bundle of semantic events, strictly in order. */
    async run(events) {
        if (!this._presenter?.handle || !events || events.length === 0) return;
        for (const evt of events) {
            try {
                await this._presenter.handle(evt);
            } catch (e) {
                console.error("[director] failed to animate event, skipping to next", evt, e);
            }
        }
    }
}

export const director = new Director();
