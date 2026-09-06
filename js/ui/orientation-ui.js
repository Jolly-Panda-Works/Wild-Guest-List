// ══════════════════════════════════════════════════════════
// Orientation Gate — js/ui/orientation-ui.js
//
// POLICY: Wild Guest List is portrait-only on touch devices. On a
// coarse-pointer (touch) device held in landscape, this gate blocks
// the normal app UI and shows "Please rotate your device" instead —
// the mobile experience must never present a mixed
// landscape-home/portrait-game system. Desktop (fine pointer) is
// never gated, even if the window happens to be wider than it is
// tall, since desktop uses its own layout regardless of window shape.
// Rotating back to portrait (or attaching a mouse/trackpad) clears
// the gate automatically via the reactive matchMedia listeners below —
// nothing underneath is destroyed or reset while blocked.
//
// A prior iteration of this project was landscape-only on touch
// devices (gating portrait instead) — that approach has been
// superseded by this portrait-only policy; see README.md § Responsive
// Design. Do not reintroduce a landscape-locked mode without updating
// this comment, tests/orientation.test.mjs, and the README section
// together.
//
// This module is a single, reusable gate — call initOrientationGate()
// once on any page that includes the #orientationGate markup (every
// real top-level page: index.html, game.html, bot-difficulty.html,
// cards.html, game-modes.html, coming-soon.html) and it wires itself
// up, self-contained, with no page-specific knowledge.
// ══════════════════════════════════════════════════════════

import { loadIcons } from "./icon-ui.js";

let _initialized = false; // guards against double-initialization (see initOrientationGate())
let _isBlocked = false;
let _lastFocused = null;

const _blockedListeners = new Set();
const _unblockedListeners = new Set();

/** Subscribes to the gate blocking the app (landscape, on a touch-
 *  primary device). Returns an unsubscribe function. Lets a page hook
 *  in page-specific behavior (e.g. game.html pausing the turn timer —
 *  see js/game-main.js) without this module knowing anything about
 *  gameplay. */
export function onOrientationBlocked(fn) {
    _blockedListeners.add(fn);
    return () => _blockedListeners.delete(fn);
}

/** Subscribes to the gate releasing the app again (rotated back to
 *  portrait, or no longer applicable). Returns an unsubscribe
 *  function. */
export function onOrientationUnblocked(fn) {
    _unblockedListeners.add(fn);
    return () => _unblockedListeners.delete(fn);
}

export function isOrientationBlocked() {
    return _isBlocked;
}

function isPortraitNow() {
    // matchMedia("(orientation: portrait)") is supported in every
    // evergreen browser and is the correct signal to use — the direct
    // viewport-dimension comparison below only exists as a fallback for
    // the rare environment without window.matchMedia at all.
    if (typeof window.matchMedia === "function") {
        return window.matchMedia("(orientation: portrait)").matches;
    }
    return window.innerHeight > window.innerWidth;
}

function computeShouldBlock() {
    // Portrait-only on touch devices: block when the device is both
    // coarse-pointer (touch — phones/tablets) AND currently landscape.
    // Fine-pointer devices (desktop/laptop, even a mouse-driven
    // tablet) are never blocked, regardless of window shape, since
    // desktop keeps its own existing layout.
    const isCoarsePointer = typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: coarse)").matches
        : false;
    return isCoarsePointer && !isPortraitNow();
}

function applyState() {
    const shouldBlock = computeShouldBlock();
    if (shouldBlock === _isBlocked) return; // no-op on redundant re-checks — never double-fires listeners
    _isBlocked = shouldBlock;

    const gate = document.getElementById("orientationGate");

    if (shouldBlock) {
        if (gate) {
            gate.classList.remove("hidden");
            _lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            // Moves focus (and, for screen readers, attention) into the
            // gate's own status message rather than leaving it on
            // whatever control was focused in the now-blocked app
            // underneath.
            gate.focus?.({ preventScroll: true });
        }
        _blockedListeners.forEach(fn => {
            try { fn(); } catch (err) { console.error("[orientation] blocked listener error", err); }
        });
    } else {
        if (gate) {
            gate.classList.add("hidden");
            if (_lastFocused && document.contains(_lastFocused)) {
                _lastFocused.focus?.({ preventScroll: true });
            }
            _lastFocused = null;
        }
        _unblockedListeners.forEach(fn => {
            try { fn(); } catch (err) { console.error("[orientation] unblocked listener error", err); }
        });
    }
}

function attemptOrientationLock() {
    try {
        const orientation = window.screen?.orientation;
        if (orientation && typeof orientation.lock === "function") {
            // Best-effort only — most browsers require fullscreen first,
            // and several (iOS Safari) don't implement this API at all.
            // Either way this never blocks or throws synchronously; the
            // reactive matchMedia gate above is what actually guarantees
            // portrait-only play everywhere.
            orientation.lock("portrait").catch(() => {});
        }
    } catch {
        // Unsupported entirely — nothing to do, overlay fallback covers it.
    }
}

/** Call once per page (every real top-level page includes the
 *  #orientationGate markup — see index.html/game.html/etc.). Safe to
 *  call more than once: every call after the first is a deliberate
 *  no-op, so an accidental duplicate import/call can never attach a
 *  second set of listeners or double-fire blocked/unblocked
 *  subscribers. */
export function initOrientationGate() {
    if (_initialized) return;
    _initialized = true;

    const gate = document.getElementById("orientationGate");
    if (gate) loadIcons(gate);

    const mqPortrait = window.matchMedia("(orientation: portrait)");
    const mqCoarse   = window.matchMedia("(pointer: coarse)");

    // MediaQueryList's `change` event is what makes this reactive
    // "immediately" on real device rotation — addEventListener is the
    // modern API; addListener is kept as a fallback for older WebKit.
    const reactTo = mql => {
        if (typeof mql.addEventListener === "function") mql.addEventListener("change", applyState);
        else if (typeof mql.addListener === "function") mql.addListener(applyState);
    };
    reactTo(mqPortrait);
    reactTo(mqCoarse);

    // Defensive fallback for environments where the above doesn't fire
    // reliably (this is intentionally in *addition* to the matchMedia
    // listeners above, never a replacement for them).
    window.addEventListener("orientationchange", applyState);
    window.addEventListener("resize", applyState);

    applyState();
    if (computeShouldBlock()) attemptOrientationLock();
}
