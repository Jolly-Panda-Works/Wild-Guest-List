/**
 * Reusable long-press gesture handler.
 *
 * Attaches a press-and-hold gesture to a single element without
 * interfering with that element's normal click/tap behavior. Used to
 * open the existing Card Information / Help UI (js/game/help.js) from
 * cards in the hand — see wireCardLongPress in game-ui.js.
 *
 * Design notes:
 *  - Prefers Pointer Events (covers mouse + touch + pen in one code path
 *    on every browser this project targets). No separate touch/mouse
 *    listeners are registered when pointer events are supported, so
 *    there's no risk of a gesture double-firing from two event families.
 *  - Falls back to mousedown/mouseup/mousemove + touchstart/touchmove/
 *    touchend/touchcancel only on environments without PointerEvent.
 *  - Duration and movement-cancel threshold both come from the single
 *    shared config in js/constants/longPress.js — never hardcoded here
 *    or at any call site.
 *  - A short "hasn't moved enough to count as a drag/scroll yet" window
 *    is intentional: mobile scrolling starts with some initial movement
 *    on the same finger, so small jitter must not stop the timer, only
 *    a real drag/scroll should.
 *  - Calling the returned `destroy()` removes every listener and clears
 *    any pending timer — call it whenever the element is discarded
 *    (e.g. a full hand re-render) to avoid leaking timers/listeners.
 */

import { LONG_PRESS_DURATION_MS, LONG_PRESS_MOVE_THRESHOLD_PX } from "../constants/longPress.js";

const supportsPointerEvents = typeof window !== "undefined" && "PointerEvent" in window;

/**
 * @param {HTMLElement} el - element to attach the gesture to.
 * @param {Object} options
 * @param {(evt: Event) => void} options.onLongPress - fired once the hold
 *        threshold is reached. Receives the originating event.
 * @param {() => boolean} [options.isDisabled] - checked at press-start;
 *        if it returns true, the gesture is not armed at all (e.g. while
 *        gameplay input is locked/animating).
 * @param {number} [options.duration] - override LONG_PRESS_DURATION_MS.
 * @param {number} [options.moveThreshold] - override LONG_PRESS_MOVE_THRESHOLD_PX.
 * @returns {{ destroy: () => void }}
 */
export function attachLongPress(el, options = {}) {
    if (!el) return { destroy() {} };

    const {
        onLongPress,
        isDisabled = () => false,
        duration = LONG_PRESS_DURATION_MS,
        moveThreshold = LONG_PRESS_MOVE_THRESHOLD_PX,
    } = options;

    let timer = null;
    let startX = 0;
    let startY = 0;
    let active = false;      // a press is currently being tracked
    let fired = false;       // long-press already triggered for this press
    let activePointerId = null;

    function clearTimer() {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function setPressingVisual(on) {
        if (on) {
            // Keep the CSS ring animation's fill time locked to the exact
            // configured duration — single source of truth, no separate
            // number hardcoded in the stylesheet.
            el.style.setProperty("--long-press-duration", `${duration}ms`);
        }
        el.classList.toggle("long-press-active", on);
    }

    /** Fully resets gesture state. Safe to call multiple times. */
    function reset() {
        clearTimer();
        active = false;
        fired = false;
        activePointerId = null;
        setPressingVisual(false);
    }

    function start(evt, x, y) {
        if (isDisabled()) return;
        // Only track one press at a time (e.g. ignore a second finger).
        if (active) return;

        active = true;
        fired = false;
        startX = x;
        startY = y;
        setPressingVisual(true);

        clearTimer();
        timer = setTimeout(() => {
            if (!active) return; // already cancelled/released
            fired = true;
            setPressingVisual(false);
            onLongPress?.(evt);
        }, duration);
    }

    function moveCheck(x, y) {
        if (!active || fired) return;
        const dx = x - startX;
        const dy = y - startY;
        if (Math.hypot(dx, dy) > moveThreshold) {
            reset();
        }
    }

    function end() {
        // If it already fired, onLongPress has run — just clear state so
        // the pointerup that follows can't also be read as a click/play.
        reset();
    }

    // ── Pointer Events path (mouse + touch + pen, single code path) ──
    function onPointerDown(evt) {
        // Only primary button for mouse; touch/pen have no button concept.
        if (evt.pointerType === "mouse" && evt.button !== 0) return;
        activePointerId = evt.pointerId;
        start(evt, evt.clientX, evt.clientY);
    }
    function onPointerMove(evt) {
        if (evt.pointerId !== activePointerId) return;
        moveCheck(evt.clientX, evt.clientY);
    }
    function onPointerUp(evt) {
        if (evt.pointerId !== activePointerId) return;
        end();
    }
    function onPointerCancel(evt) {
        if (evt.pointerId !== activePointerId) return;
        end();
    }
    // Losing focus/visibility mid-press (alt-tab, mobile app switch,
    // OS-level context menu) must not leave a live timer behind.
    function onPointerLeave(evt) {
        if (evt.pointerId !== activePointerId) return;
        // Only cancel on true leave, not a bubble from a child.
        if (!el.contains(evt.relatedTarget)) end();
    }

    // ── Fallback path: mouse + touch separately ──
    function onMouseDown(evt) {
        if (evt.button !== 0) return;
        start(evt, evt.clientX, evt.clientY);
    }
    function onMouseMove(evt) {
        moveCheck(evt.clientX, evt.clientY);
    }
    function onMouseUp() {
        end();
    }
    function onMouseLeaveFallback() {
        end();
    }
    function onTouchStart(evt) {
        const t = evt.touches[0];
        if (!t) return;
        start(evt, t.clientX, t.clientY);
    }
    function onTouchMove(evt) {
        const t = evt.touches[0];
        if (!t) return;
        moveCheck(t.clientX, t.clientY);
    }
    function onTouchEnd() {
        end();
    }
    function onTouchCancel() {
        end();
    }

    // Prevent the native context menu (mobile long-press-to-select / right
    // click) from appearing over the card while our own gesture handles it.
    function onContextMenu(evt) {
        if (active || fired) evt.preventDefault();
    }

    if (supportsPointerEvents) {
        el.addEventListener("pointerdown", onPointerDown);
        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerup", onPointerUp);
        el.addEventListener("pointercancel", onPointerCancel);
        el.addEventListener("pointerleave", onPointerLeave);
    } else {
        el.addEventListener("mousedown", onMouseDown);
        el.addEventListener("mousemove", onMouseMove);
        el.addEventListener("mouseup", onMouseUp);
        el.addEventListener("mouseleave", onMouseLeaveFallback);
        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: true });
        el.addEventListener("touchend", onTouchEnd);
        el.addEventListener("touchcancel", onTouchCancel);
    }
    el.addEventListener("contextmenu", onContextMenu);

    /**
     * True if the element's most recent press ended by reaching the
     * long-press threshold. Callers use this to swallow the click/tap
     * that the browser fires right after a long touch/mouse press, so
     * long-press never also plays the card. Clears itself after being
     * read once the following pointerdown/touchstart starts a new press.
     */
    function consumeSuppressedClick() {
        // `fired` is reset to false as soon as the NEXT press starts, so
        // it correctly reflects "did the press that just ended fire?"
        // right up until then.
        return fired;
    }

    function destroy() {
        reset();
        if (supportsPointerEvents) {
            el.removeEventListener("pointerdown", onPointerDown);
            el.removeEventListener("pointermove", onPointerMove);
            el.removeEventListener("pointerup", onPointerUp);
            el.removeEventListener("pointercancel", onPointerCancel);
            el.removeEventListener("pointerleave", onPointerLeave);
        } else {
            el.removeEventListener("mousedown", onMouseDown);
            el.removeEventListener("mousemove", onMouseMove);
            el.removeEventListener("mouseup", onMouseUp);
            el.removeEventListener("mouseleave", onMouseLeaveFallback);
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
            el.removeEventListener("touchcancel", onTouchCancel);
        }
        el.removeEventListener("contextmenu", onContextMenu);
    }

    return { destroy, consumeSuppressedClick };
}
