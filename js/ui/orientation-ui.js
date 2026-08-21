// ══════════════════════════════════════════════════════════
// Orientation Gate — js/ui/orientation-ui.js
//
// Wild Guest List is landscape-only, especially on touch devices.
// This module is a single, reusable gate — call initOrientationGate()
// once on any page that includes the #orientationGate markup (every
// real top-level page: index.html, game.html, bot-difficulty.html,
// cards.html, game-modes.html, coming-soon.html) and it wires itself
// up, self-contained, with no page-specific knowledge.
//
//   Application
//     ↓
//   Orientation Check  (matchMedia, reactive — see below)
//     ↓
//   Landscape?
//   ├── Yes → Application (gate hidden)
//   └── No  → Rotate Device Screen (gate shown, blocks interaction)
//
// DETECTION — deliberately NOT user-agent sniffing. "Is this a device
// where orientation is meaningful" is answered with the standard
// responsive-design signal for a touch-primary device:
// `(pointer: coarse)` — true for phones/tablets, false for desktop
// (even a touch-capable laptop with a mouse attached still reports
// `pointer: fine` as its primary pointer). Combined with
// `(orientation: portrait)`, this means: never blocks desktop
// (regardless of window aspect ratio), and blocks both phones AND
// tablets in portrait — landscape is the supported orientation for
// both, matching the feature spec.
//
// REACTING TO ROTATION — MediaQueryList's own `change` event (fired by
// the browser the instant orientation actually changes) is the
// primary mechanism, with `orientationchange`/`resize` listeners as a
// defensive fallback for older/inconsistent implementations. This is
// what makes the gate show/hide "immediately" on rotation — no
// polling, no CSS `transform: rotate(...)` hack.
//
// TRUE ORIENTATION LOCK — attempted as a progressive enhancement via
// the Screen Orientation API (`screen.orientation.lock("landscape")`),
// which browsers that support it will honor once combined with e.g.
// fullscreen; browsers that don't (notably iOS Safari, and any
// non-fullscreen context) simply reject/throw, silently, and the
// blocking overlay below remains the reliable, universal fallback —
// exactly as called for in this feature's spec.
// ══════════════════════════════════════════════════════════

import { loadIcons } from "./icon-ui.js";

let _initialized = false; // guards against double-initialization (see initOrientationGate())
let _isBlocked = false;
let _lastFocused = null;

const _blockedListeners = new Set();
const _unblockedListeners = new Set();

/** Subscribes to the gate blocking the app (portrait, on a touch-
 *  primary device). Returns an unsubscribe function. Lets a page hook
 *  in page-specific behavior (e.g. game.html pausing the turn timer —
 *  see js/game-main.js) without this module knowing anything about
 *  gameplay. */
export function onOrientationBlocked(fn) {
    _blockedListeners.add(fn);
    return () => _blockedListeners.delete(fn);
}

/** Subscribes to the gate releasing the app again (rotated back to
 *  landscape, or no longer applicable). Returns an unsubscribe
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
    // Re-evaluated on every check (not cached at init) so this stays
    // correct even for the rare device that can change pointer type at
    // runtime (e.g. a 2-in-1 convertible switching between laptop and
    // tablet mode), not just orientation.
    const isTouchPrimary = typeof window.matchMedia === "function"
        && window.matchMedia("(pointer: coarse)").matches;

    return isTouchPrimary && isPortraitNow();
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
            // landscape-only play everywhere.
            orientation.lock("landscape").catch(() => {});
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
