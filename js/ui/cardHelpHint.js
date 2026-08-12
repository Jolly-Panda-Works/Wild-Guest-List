/**
 * Card Help long-press discoverability hint.
 *
 * This is a SEPARATE UX concept from:
 *   - js/ui/tutorial-ui.js   (the manual Tutorial slides)
 *   - js/ui/walkthrough.js   (the in-game first-run walkthrough)
 *   - js/ui/cardGuidance-ui.js (per-ability "here's what just happened" popups)
 *
 * Its only job is to teach the player, once, that holding a card opens
 * the existing Card Information modal (js/game/help.js). It never opens
 * that modal itself and never duplicates the explanations those other
 * systems already give.
 *
 * Persistence is a dedicated localStorage flag, independent of tutorial/
 * walkthrough/guidance state — see STORAGE_KEY below.
 */

import { t } from "../i18n.js";
import { isWalkthroughActive } from "./walkthrough.js";
import { LONG_PRESS_DURATION_MS } from "../constants/longPress.js";
import { loadIcons } from "./icon-ui.js";

const STORAGE_KEY = "wgl_cardHelpLongPressHintShown";
const AUTO_DISMISS_MS = 5000;

let hintEl = null;
let dismissTimer = null;
let resizeHandler = null;
let everShownThisSession = false; // avoids re-triggering the entrance animation on repeated calls

export function hasSeenCardHelpHint() {
    return localStorage.getItem(STORAGE_KEY) === "true";
}

export function markCardHelpHintSeen() {
    localStorage.setItem(STORAGE_KEY, "true");
}

function buildHintEl() {
    const el = document.createElement("div");
    el.id = "cardHelpHint";
    el.className = "card-help-hint";
    // role="status" + aria-live: announced once to screen readers without
    // stealing focus or blocking any interaction underneath it.
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `
        <div class="card-help-hint-bubble">
            <div class="card-help-hint-demo" aria-hidden="true">
                <span class="card-help-hint-demo-ring"></span>
                <span class="card-help-hint-demo-icon" data-icon="pointer"></span>
            </div>
            <p class="card-help-hint-text"></p>
        </div>
        <div class="card-help-hint-arrow" aria-hidden="true"></div>
    `;
    // Entirely non-blocking: no close button, no click handling that
    // could eat a tap meant for the card underneath/behind it.
    el.style.pointerEvents = "none";
    return el;
}

/** Positions the (fixed) hint just above the hand, horizontally
 *  centered on it — computed from the live layout rather than CSS
 *  anchoring, since #centerArea's overflow:hidden would otherwise risk
 *  clipping a bubble poking up above #handArea. Re-run on resize while
 *  the hint is visible so rotating a device or resizing doesn't leave
 *  it pointing at empty space. */
function positionHint(handEl) {
    if (!hintEl || !handEl) return;
    const rect = handEl.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // hand not laid out yet
    const centerX = rect.left + rect.width / 2;
    hintEl.style.left = `${centerX}px`;
    hintEl.style.bottom = `${Math.max(window.innerHeight - rect.top + 10, 10)}px`;
}

function renderText() {
    if (!hintEl) return;
    hintEl.querySelector(".card-help-hint-text").textContent = t("cardHelpHintText");
}

/** Removes the hint from the DOM and clears any pending auto-dismiss
 *  timer/listeners. Safe to call multiple times. Does NOT by itself
 *  mark the hint as permanently seen — call markCardHelpHintSeen()
 *  (done by the callers below) so a hint that's merely hidden mid-
 *  entrance-animation doesn't come back either. */
function removeHint() {
    if (dismissTimer !== null) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
    }
    if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
    }
    if (hintEl) {
        hintEl.classList.remove("visible");
        const toRemove = hintEl;
        hintEl = null;
        // Let the short exit transition play instead of yanking the node.
        setTimeout(() => toRemove.remove(), 220);
    }
}

/** Called when the player either lets the hint time out, or the game
 *  itself decides it no longer applies (e.g. game restarted mid-hint). */
export function dismissCardHelpHint() {
    removeHint();
    markCardHelpHintSeen();
}

/** Called specifically when the player successfully performs the
 *  long-press gesture while the hint is showing — the clearest possible
 *  signal that the interaction has been discovered. */
export function dismissCardHelpHintOnSuccess() {
    if (!hintEl) return; // hint wasn't showing — nothing to do
    removeHint();
    markCardHelpHintSeen();
}

/**
 * Shows the hint, anchored above the hand, if (and only if) all of the
 * following hold:
 *   - it has never been shown on this device before
 *   - it isn't already on screen
 *   - the in-game walkthrough isn't currently running (that owns the
 *     player's attention instead — see isWalkthroughActive())
 *   - there's at least one card in hand to point at
 *
 * Cheap to call repeatedly (e.g. once per hand re-render) — every call
 * after the first no-ops once the hint has been shown or dismissed.
 */
export function maybeShowCardHelpHint(handEl) {
    if (hasSeenCardHelpHint()) return;
    if (everShownThisSession) return; // already showing (or mid-exit) this session
    if (isWalkthroughActive()) return; // the walkthrough owns this moment instead
    if (!handEl || handEl.children.length === 0) return;

    everShownThisSession = true;

    hintEl = buildHintEl();
    renderText();
    document.body.appendChild(hintEl);
    loadIcons(hintEl);
    positionHint(handEl);

    resizeHandler = () => positionHint(handEl);
    window.addEventListener("resize", resizeHandler);

    // Entrance animation on next frame (so the initial state actually
    // paints first instead of the transition being skipped).
    requestAnimationFrame(() => {
        requestAnimationFrame(() => hintEl?.classList.add("visible"));
    });

    dismissTimer = setTimeout(() => {
        dismissCardHelpHint();
    }, AUTO_DISMISS_MS);

    // Re-render text if the language changes while the hint is up.
    window.addEventListener("langchange", renderText, { once: false });
}
