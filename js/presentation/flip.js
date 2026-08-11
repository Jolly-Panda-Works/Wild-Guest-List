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
        return crossFade(el);
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

function crossFade(el) {
    return new Promise(resolve => {
        el.style.transition = "";
        el.style.opacity = "0.35";
        requestAnimationFrame(() => {
            el.style.transition = "opacity 140ms ease";
            el.style.opacity = "1";
            setTimeout(() => { el.style.transition = ""; el.style.opacity = ""; resolve(); }, 160);
        });
    });
}

/** Brief in-place reaction (shake / recoil / anticipation) before a bigger move. */
export function playBeat(el, className, duration = 260) {
    return new Promise(resolve => {
        if (!el || !el.isConnected || isReducedMotion()) { resolve(); return; }
        el.classList.add(className);
        setTimeout(() => { el.classList.remove(className); resolve(); }, duration);
    });
}

export function wait(ms) {
    if (isReducedMotion()) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
}
