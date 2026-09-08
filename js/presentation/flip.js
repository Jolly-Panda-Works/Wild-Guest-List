/**
 * Low-level animation primitives (FLIP: First, Last, Invert, Play).
 *
 * These operate on real DOM elements — never clones — so a card's DOM
 * node keeps its identity as it moves between hand / queue / party /
 * trash. Everything here is defensive: a missing or disconnected element
 * resolves immediately rather than throwing, so a presentation-layer bug
 * can never leave the game visually or interactively stuck (see the
 * "Error handling" section of the write-up).
 */

const DEFAULT_DURATION = 420;

export function isReducedMotion() {
    return typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animate `el` from wherever it currently is on screen to wherever it
 * ends up after `mutate()` runs (a reparent, e.g. `slot.appendChild(el)`).
 *
 * @param {HTMLElement} el
 * @param {() => void} mutate  performs the real DOM change synchronously
 * @param {{duration?:number, easing?:string, duringClass?:string, zIndex?:string}} opts
 * @returns {Promise<void>}
 */
export function flip(el, mutate, opts = {}) {
    if (!el || !el.isConnected) {
        try { mutate(); } catch (e) { console.error("[flip] mutate() failed on a missing element", e); }
        return Promise.resolve();
    }

    const first = el.getBoundingClientRect();

    try {
        mutate();
    } catch (e) {
        console.error("[flip] mutate() threw — skipping animation for this card", e);
        return Promise.resolve();
    }

    if (!el.isConnected) {
        // mutate() removed/replaced the node — nothing left to animate.
        return Promise.resolve();
    }

    if (isReducedMotion()) {
        return crossFade(el, opts);
    }

    const duration = opts.duration ?? DEFAULT_DURATION;
    const easing = opts.easing ?? "cubic-bezier(.4,0,.2,1)";
    const last = el.getBoundingClientRect();

    return new Promise(resolve => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            el.style.transition = "";
            el.style.position = "";
            el.style.left = "";
            el.style.top = "";
            el.style.width = "";
            el.style.height = "";
            el.style.margin = "";
            el.style.zIndex = "";
            el.style.transform = "";
            if (opts.duringClass) el.classList.remove(opts.duringClass);
            el.removeEventListener("transitionend", onEnd);
            resolve();
        };
        const onEnd = e => { if (e.target === el) finish(); };

        el.style.position = "fixed";
        el.style.margin = "0";
        el.style.left = `${first.left}px`;
        el.style.top = `${first.top}px`;
        el.style.width = `${first.width}px`;
        el.style.height = `${first.height}px`;
        el.style.zIndex = opts.zIndex ?? "500";
        el.style.transition = "none";
        if (opts.duringClass) el.classList.add(opts.duringClass);

        // Force a reflow so the "first" position is committed before we
        // transition to "last" — otherwise the browser may coalesce the
        // two states and skip the animation entirely.
        void el.offsetWidth;

        requestAnimationFrame(() => {
            el.style.transition =
                `left ${duration}ms ${easing}, top ${duration}ms ${easing}, ` +
                `width ${duration}ms ${easing}, height ${duration}ms ${easing}`;
            el.style.left = `${last.left}px`;
            el.style.top = `${last.top}px`;
            el.style.width = `${last.width}px`;
            el.style.height = `${last.height}px`;

            el.addEventListener("transitionend", onEnd);
            // Safety net: transitionend can fail to fire (e.g. element
            // removed mid-flight by a later event) — never leave the
            // Promise unresolved.
            setTimeout(finish, duration + 150);
        });
    });
}

/**
 * Animate `el` flying from wherever it currently is on screen toward a
 * *visible* target element (e.g. the Party/Trash icon flanking the
 * Queue), shrinking to near-zero scale as it travels, then run
 * `mutate()` to perform the real reparent.
 *
 * This exists alongside `flip()` specifically for destinations whose
 * real resting place is inside a closed popup (`#partyArea`/`#trashArea`,
 * both `display:none` until opened — see css/style.css). Measuring
 * "last" from inside a `display:none` subtree (what `flip()` does)
 * returns an all-zero rect, which reads as the card snapping to the
 * top-left corner instead of visibly entering Party/Trash. Flying
 * toward the always-visible icon button instead gives the player a
 * real, dynamic destination on screen, while `mutate()` still performs
 * the actual DOM move immediately so game state and the DOM never
 * disagree about where the card lives.
 *
 * Pure `transform`/`opacity` (no width/height/left/top interpolation)
 * keeps this cheap enough to run several times back-to-back without
 * jank when multiple cards resolve out of the Queue in one turn.
 *
 * @param {HTMLElement} el
 * @param {() => void} mutate   performs the real reparent synchronously
 * @param {HTMLElement|null} targetEl  the icon/button to fly toward
 * @param {{duration?:number, easing?:string, duringClass?:string, zIndex?:string, endScale?:number, endOpacity?:number}} opts
 * @returns {Promise<void>}
 */
export function flyToTarget(el, mutate, targetEl, opts = {}) {
    if (!el || !el.isConnected) {
        try { mutate(); } catch (e) { console.error("[flyToTarget] mutate() failed on a missing element", e); }
        return Promise.resolve();
    }

    const first = el.getBoundingClientRect();

    try {
        mutate();
    } catch (e) {
        console.error("[flyToTarget] mutate() threw — skipping animation for this card", e);
        return Promise.resolve();
    }

    if (!el.isConnected) {
        // mutate() removed/replaced the node — nothing left to animate.
        return Promise.resolve();
    }

    if (isReducedMotion()) {
        return crossFade(el, opts);
    }

    const targetRect = targetEl && targetEl.isConnected ? targetEl.getBoundingClientRect() : null;
    const hasRealTarget = !!targetRect && (targetRect.width > 0 || targetRect.height > 0);

    const duration = opts.duration ?? DEFAULT_DURATION;
    const easing = opts.easing ?? "cubic-bezier(.4,0,.2,1)";
    const endScale = opts.endScale ?? 0.05;
    const endOpacity = opts.endOpacity ?? 0.15;

    // dx/dy in terms of the two rects' centers, so cards of any size fly
    // toward the icon's true center rather than its top-left corner.
    let dx = 0, dy = 0;
    if (hasRealTarget) {
        const firstCenterX = first.left + first.width / 2;
        const firstCenterY = first.top + first.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        dx = targetCenterX - firstCenterX;
        dy = targetCenterY - firstCenterY;
    }
    // No visible icon found (e.g. a layout tier that hides it, see
    // .queue-icon's base rule) — still shrink-and-fade in place rather
    // than skip the animation, so the card never just vanishes instantly.

    return new Promise(resolve => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            el.style.transition = "";
            el.style.position = "";
            el.style.left = "";
            el.style.top = "";
            el.style.width = "";
            el.style.height = "";
            el.style.margin = "";
            el.style.zIndex = "";
            el.style.transform = "";
            el.style.opacity = "";
            el.style.pointerEvents = "";
            if (opts.duringClass) el.classList.remove(opts.duringClass);
            el.removeEventListener("transitionend", onEnd);
            resolve();
        };
        const onEnd = e => { if (e.target === el) finish(); };

        el.style.position = "fixed";
        el.style.margin = "0";
        el.style.left = `${first.left}px`;
        el.style.top = `${first.top}px`;
        el.style.width = `${first.width}px`;
        el.style.height = `${first.height}px`;
        el.style.zIndex = opts.zIndex ?? "600";
        el.style.pointerEvents = "none";
        el.style.transition = "none";
        el.style.transform = "translate(0px, 0px) scale(1)";
        el.style.opacity = "1";
        if (opts.duringClass) el.classList.add(opts.duringClass);

        // Force a reflow so the start state is committed before we
        // transition, same reasoning as flip() above.
        void el.offsetWidth;

        requestAnimationFrame(() => {
            el.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
            el.style.transform = `translate(${dx}px, ${dy}px) scale(${endScale})`;
            el.style.opacity = String(endOpacity);

            el.addEventListener("transitionend", onEnd);
            // Safety net: transitionend can fail to fire (e.g. element
            // removed mid-flight by a later event) — never leave the
            // Promise unresolved.
            setTimeout(finish, duration + 150);
        });
    });
}

function crossFade(el, opts = {}) {
    // Reduced-motion fallback for a FLIP move: no positional animation,
    // just a short opacity blip so the change still reads as a distinct
    // step. The ability-specific `duringClass` (if any) is still applied
    // briefly — its @keyframes motion is suppressed globally under
    // reduced motion (see css/style.css), but any static styling on that
    // class (a glow, a tint) still shows, keeping abilities visually
    // distinguishable rather than making every move look identical.
    return new Promise(resolve => {
        el.style.transition = "";
        el.style.opacity = "0.35";
        if (opts.duringClass) el.classList.add(opts.duringClass);
        requestAnimationFrame(() => {
            el.style.transition = `opacity 140ms ease`;
            el.style.opacity = "1";
            setTimeout(() => {
                el.style.transition = "";
                el.style.opacity = "";
                if (opts.duringClass) el.classList.remove(opts.duringClass);
                resolve();
            }, 160);
        });
    });
}

/** Brief in-place reaction (shake / recoil / anticipation) before a bigger
 *  move. Under reduced motion this still applies `className` — just for a
 *  much shorter beat — rather than skipping it outright: the @keyframes
 *  motion itself is suppressed globally (see css/style.css), but any
 *  static glow/tint baked into that class still flashes briefly, so
 *  different abilities still read differently instead of all collapsing
 *  into "nothing happened here". */
export function playBeat(el, className, duration = 260) {
    return new Promise(resolve => {
        if (!el || !el.isConnected) { resolve(); return; }
        const d = isReducedMotion() ? Math.min(duration, 90) : duration;
        el.classList.add(className);
        setTimeout(() => { el.classList.remove(className); resolve(); }, d);
    });
}

export function wait(ms) {
    if (isReducedMotion()) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
}
