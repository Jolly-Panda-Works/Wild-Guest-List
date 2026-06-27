/**
 * In-game walkthrough
 *
 * Step 8: shows after card played — game waits until dismissed
 * Step 9: shows BEFORE queue resolves, with real card names — game waits until dismissed
 */

import { t } from "../i18n.js";
import { cardLabel } from "../services/logger.js";

const STORAGE_KEY = "walkthroughSeen";
const PAD = 10;

let _active      = false;
let _step        = 0;
let _onCardPlay  = null;   // resolves when human plays a card
let _onWillResolve = null; // resolves when queue hits 5 (BEFORE resolve)
let _onResolveAck  = null; // resolves when player clicks Next on step 9

/* ─────────────────────────────────────────
   Public API
───────────────────────────────────────── */

export function shouldShowWalkthrough() {
    return !localStorage.getItem(STORAGE_KEY);
}
export function markWalkthroughSeen() {
    localStorage.setItem(STORAGE_KEY, "true");
}
export function isWalkthroughActive() {
    return _active;
}

export function startWalkthrough() {
    return new Promise(resolve => {
        _active = true;
        _step   = 0;
        const overlay = document.getElementById("walkthroughOverlay");
        overlay.removeAttribute("aria-hidden");
        overlay.classList.remove("hidden");
        overlay.classList.add("active");
        _bindButtons(resolve);
        _showStep(0, resolve);
    });
}

/** Called by turnManager when human plays a card */
export function notifyCardPlayed() {
    if (_onCardPlay) {
        const fn = _onCardPlay;
        _onCardPlay = null;
        fn();
    }
}

/**
 * Called by queueManager BEFORE resolving the queue (queue still has 5 cards).
 * Returns a Promise — queueManager awaits it, so the game is paused until
 * the player dismisses step 9.
 */
export function notifyQueueWillResolve(queue) {
    return new Promise(resolve => {
        _onWillResolve = { queue: [...queue], resolve };
        // Trigger the walkthrough to show step 9
        if (_onWillResolveReady) {
            const fn = _onWillResolveReady;
            _onWillResolveReady = null;
            fn();
        }
    });
}

/** Called by queueManager AFTER resolving (cleanup, not used to gate UI) */
export function notifyQueueResolved() {
    // no-op now — step 9 already shown and dismissed before resolve
}

/* ─────────────────────────────────────────
   Internal: waiting for queue-will-resolve
───────────────────────────────────────── */

let _onWillResolveReady = null; // set when step 9 is waiting for the event

/* ─────────────────────────────────────────
   Mobile detection
───────────────────────────────────────── */

function isMobile() {
    return window.innerWidth <= 600;
}

/* ─────────────────────────────────────────
   Step definitions
───────────────────────────────────────── */

function getSteps() {
    const mobile = isMobile();
    return [
        {   // 1
            targetId: "topBar", titleKey: "wt1Title", textKey: "wt1Text",
            arrowDir: "up", boxPos: "below",
        },
        {   // 2
            targetId: mobile ? "handArea" : "playerHand",
            titleKey: "wt2Title", textKey: "wt2Text",
            arrowDir: "down", boxPos: "above",
        },
        {   // 3
            targetId: "topPlayer", fallbackId: "leftPlayer",
            titleKey: "wt3Title", textKey: "wt3Text",
            arrowDir: "up", boxPos: "below",
        },
        {   // 4
            targetId: "queue", titleKey: "wt4Title", textKey: "wt4Text",
            arrowDir: "down", boxPos: "above",
        },
        {   // 5
            targetId:   mobile ? "mobileTabs" : "partyCards",
            fallbackId: mobile ? null : "trashCards",
            titleKey: "wt5Title", textKey: "wt5Text",
            arrowDir: mobile ? "down" : "left",
            boxPos:   mobile ? "above" : "right",
        },
        {   // 6
            targetId:   mobile ? "mobileLeaderboard" : "leaderboardRows",
            fallbackId: mobile ? null : "logEntries",
            titleKey: "wt6Title", textKey: "wt6Text",
            arrowDir: mobile ? "up" : "left",
            boxPos:   mobile ? "below" : "right",
        },
        {   // 7 — play a card
            targetId: mobile ? "handArea" : "playerHand",
            titleKey: "wt7Title", textKey: "wt7Text",
            arrowDir: "down", boxPos: "above",
            waitForCardPlay: true,
        },
        {   // 8 — queue explained; game pauses until dismissed
            targetId: "queue", titleKey: "wt8Title", textKey: "wt8Text",
            arrowDir: "down", boxPos: "above",
            pauseGame: true,
        },
        {   // 9 — queue will resolve; game paused, dynamic text, shown BEFORE resolve
            targetId:   mobile ? "mobileTabs" : "queue",
            fallbackId: mobile ? null : null,
            titleKey: "wt9Title", textKey: "wt9TextDynamic",
            arrowDir: mobile ? "down" : "down",
            boxPos:   mobile ? "above" : "above",
            waitForQueueFull: true,   // waits for notifyQueueWillResolve
            pauseGame: true,          // game waits for player to dismiss
        },
        {   // 10
            targetId: null, titleKey: "wt10Title", textKey: "wt10Text",
            arrowDir: null, boxPos: "center",
            isFinal: true,
        },
    ];
}

/* ─────────────────────────────────────────
   Core render
───────────────────────────────────────── */

function _showStep(index, doneFn) {
    const steps = getSteps();
    if (index >= steps.length) { _finish(doneFn); return; }

    _step = index;
    const step = steps[index];

    if (step.waitForQueueFull) {
        // Hide overlay and wait for queue to hit 5
        _hideOverlay();
        _onWillResolveReady = () => {
            // _onWillResolve now has { queue, resolve }
            _renderPausedStep(step, index, doneFn);
        };
        // If event already fired (race condition), handle immediately
        if (_onWillResolve) {
            const fn = _onWillResolveReady;
            _onWillResolveReady = null;
            fn();
        }
        return;
    }

    if (step.waitForCardPlay) {
        const box = document.getElementById("walkthroughBox");
        box.classList.add("wt-waiting");
        _setOverlayPassthrough(true);
        _onCardPlay = () => {
            _setOverlayPassthrough(false);
            box.classList.remove("wt-waiting");
            _showStep(index + 1, doneFn);
        };
        _showOverlay();
        _updateText(step, null);
        _renderVisuals(step, index, doneFn);
        return;
    }

    if (step.pauseGame) {
        // Show step, Next button unblocks game
        _showOverlay();
        _updateText(step, null);
        _renderVisuals(step, index, doneFn);
        return;
    }

    _showOverlay();
    _updateText(step, null);
    _renderVisuals(step, index, doneFn);
}

/** Render step 9: show BEFORE resolve with real card names, then unblock game */
function _renderPausedStep(step, index, doneFn) {
    const { queue, resolve: unblockGame } = _onWillResolve;
    _onWillResolve = null;

    _showOverlay();
    _updateText(step, queue);
    _renderVisuals(step, index, doneFn);

    // Override Next: unblock the game, then advance
    document.getElementById("wtNextBtn").onclick = () => {
        unblockGame();          // let queueManager.resolveQueue() continue
        _showStep(index + 1, doneFn);
    };
}

function _updateText(step, queue) {
    document.getElementById("wtTitle").textContent =
        t(step.titleKey);
    document.getElementById("wtStepLabel").textContent =
        t("wtStep").replace("{n}", _step + 1).replace("{total}", getSteps().length);
    document.getElementById("wtSkipBtn").textContent = t("wtSkip");
    document.getElementById("wtNextBtn").textContent =
        step.isFinal ? t("wtDone") : t("wtNext");

    // Dynamic text with real card names (step 9)
    let text = t(step.textKey);
    if (queue && queue.length >= 5) {
        text = text
            .replace("{card1}", cardLabel(queue[0]))
            .replace("{card2}", cardLabel(queue[1]))
            .replace("{card3}", cardLabel(queue[2]))
            .replace("{card4}", cardLabel(queue[3]))
            .replace("{card5}", cardLabel(queue[4]));
    }
    document.getElementById("wtText").textContent = text;
}

function _renderVisuals(step, index, doneFn) {
    const box = document.getElementById("walkthroughBox");
    const mobile = isMobile();

    if (!step.waitForCardPlay) {
        box.classList.remove("wt-waiting");
        _setOverlayPassthrough(false);
    }

    if (mobile && (step.targetId === "handArea" || step.waitForCardPlay)) {
        box.classList.add("above-hand");
    } else {
        box.classList.remove("above-hand");
    }

    const targetEl = _getTarget(step);
    _positionSpotlight(targetEl);
    _positionBox(targetEl, step.boxPos, step.arrowDir);

    // Default Next handler (may be overridden by _renderPausedStep)
    document.getElementById("wtNextBtn").onclick = () => {
        if (step.waitForCardPlay) return;
        _showStep(index + 1, doneFn);
    };
}

function _finish(doneFn) {
    _active = false;
    markWalkthroughSeen();
    _setOverlayPassthrough(false);
    _hideOverlay();
    if (doneFn) doneFn();
}

/* ─────────────────────────────────────────
   Overlay helpers
───────────────────────────────────────── */

function _setOverlayPassthrough(on) {
    const ov   = document.getElementById("walkthroughOverlay");
    const spot = document.getElementById("walkthroughSpotlight");
    ov.classList.toggle("wt-passthrough", on);
    spot.style.pointerEvents = on ? "none" : "";
}

function _showOverlay() {
    const ov = document.getElementById("walkthroughOverlay");
    ov.removeAttribute("aria-hidden");
    ov.classList.remove("hidden");
    ov.classList.add("active");
}

function _hideOverlay() {
    const ov = document.getElementById("walkthroughOverlay");
    ov.classList.add("hidden");
    ov.classList.remove("active");
}

/* ─────────────────────────────────────────
   DOM helpers
───────────────────────────────────────── */

function _getTarget(step) {
    let el = step.targetId ? document.getElementById(step.targetId) : null;
    if (!el && step.fallbackId) el = document.getElementById(step.fallbackId);
    return el;
}

function _positionSpotlight(el) {
    const spot = document.getElementById("walkthroughSpotlight");
    if (!el) { spot.style.display = "none"; return; }
    spot.style.display = "block";
    const r = el.getBoundingClientRect();
    spot.style.left   = `${r.left   - PAD}px`;
    spot.style.top    = `${r.top    - PAD}px`;
    spot.style.width  = `${r.width  + PAD * 2}px`;
    spot.style.height = `${r.height + PAD * 2}px`;
}

function _positionBox(targetEl, boxPos, arrowDir) {
    const box   = document.getElementById("walkthroughBox");
    const arrow = document.getElementById("wtArrow");
    arrow.className = "wt-arrow";

    if (isMobile()) return;   // CSS handles mobile positioning

    if (!targetEl || boxPos === "center") {
        box.style.cssText = "top:50%;left:50%;transform:translate(-50%,-50%);bottom:auto;right:auto;";
        return;
    }

    box.style.transform = "";
    const r      = targetEl.getBoundingClientRect();
    const bw     = 340;
    const margin = 16;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;
    let top, left;

    switch (boxPos) {
        case "below":
            top  = r.bottom + PAD + margin;
            left = Math.max(margin, Math.min(r.left + r.width / 2 - bw / 2, vw - bw - margin));
            if (arrowDir) arrow.classList.add("arrow-up");
            break;
        case "above":
            top  = r.top - PAD - margin - 180;
            left = Math.max(margin, Math.min(r.left + r.width / 2 - bw / 2, vw - bw - margin));
            if (top < margin) top = r.bottom + PAD + margin;
            if (arrowDir) arrow.classList.add("arrow-down");
            break;
        case "right":
            top  = Math.max(margin, r.top + r.height / 2 - 90);
            left = r.right + PAD + margin;
            if (left + bw > vw) { left = r.left - PAD - margin - bw; arrow.classList.add("arrow-right"); }
            else if (arrowDir) arrow.classList.add("arrow-left");
            break;
        case "left":
            top  = Math.max(margin, r.top + r.height / 2 - 90);
            left = r.left - PAD - margin - bw;
            if (left < margin) { left = r.right + PAD + margin; arrow.classList.add("arrow-left"); }
            else if (arrowDir) arrow.classList.add("arrow-right");
            break;
        default:
            top = vh / 2 - 90; left = vw / 2 - bw / 2;
    }

    top  = Math.max(margin, Math.min(top,  vh - margin));
    left = Math.max(margin, Math.min(left, vw - bw - margin));
    box.style.top = `${top}px`; box.style.left = `${left}px`;
    box.style.bottom = "auto";  box.style.right = "auto";
}

function _bindButtons(doneFn) {
    document.getElementById("wtSkipBtn").onclick = () => {
        // If game is paused waiting for step 9 ack, unblock it before finishing
        if (_onWillResolve) {
            _onWillResolve.resolve();
            _onWillResolve = null;
        }
        _finish(doneFn);
    };
}
