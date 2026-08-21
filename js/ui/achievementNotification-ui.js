// ══════════════════════════════════════════════════════════
// Achievement Unlock Notification — js/ui/achievementNotification-ui.js
//
// A single, reusable "🏆 Achievement Unlocked!" toast, following the
// exact same non-blocking pattern already used for the feedback toast
// (js/ui/feedback-ui.js): fixed-position bubble, fade/slide in, auto
// dismiss, never pauses Gameplay. Reuses the existing toast markup
// shape/CSS conventions instead of inventing a second notification
// framework, and reuses loadIcons()/t() for its icon + copy exactly
// like every other UI piece in the project (config.json-driven icon,
// i18n-driven text — never hardcoded).
// ══════════════════════════════════════════════════════════

import { t } from "../i18n.js";
import { loadIcons } from "./icon-ui.js";
import { onAchievementUnlocked } from "../services/achievements.js";

const AUTO_DISMISS_MS = 6000;
const QUEUE_GAP_MS = 350; // brief gap between stacked unlocks so they never overlap illegibly

let dismissTimer = null;
let queue = [];
let showing = false;

function getToastEl() {
    return document.getElementById("achievementToast");
}

/** Wires the unlock subscription — call once at game boot (game-main.js).
 *  No-ops harmlessly if the toast markup isn't present on this page
 *  (e.g. if this were ever imported somewhere without the markup). */
export function initAchievementNotifications() {
    onAchievementUnlocked(({ def }) => {
        queue.push(def);
        if (!showing) processQueue();
    });
}

function processQueue() {
    const toastEl = getToastEl();
    if (!toastEl || queue.length === 0) {
        showing = false;
        return;
    }

    showing = true;
    const def = queue.shift();
    renderToast(def);
}

function renderToast(def) {
    const toastEl = getToastEl();
    if (!toastEl) { showing = false; return; }

    const iconEl  = document.getElementById("achievementToastIcon");
    const titleEl = document.getElementById("achievementToastTitle");
    const descEl  = document.getElementById("achievementToastDesc");

    if (iconEl) {
        iconEl.dataset.icon = def.icon;
        delete iconEl.dataset.iconLoaded; // force loadIcons() to (re)apply for the new icon
    }
    if (titleEl) titleEl.textContent = t(def.titleKey);
    if (descEl)  descEl.textContent  = t(def.descriptionKey);

    loadIcons(toastEl);

    clearTimeout(dismissTimer);
    toastEl.classList.remove("hidden");
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toastEl.classList.add("visible"));
    });

    dismissTimer = setTimeout(hideToast, AUTO_DISMISS_MS);
}

function hideToast() {
    const toastEl = getToastEl();
    clearTimeout(dismissTimer);
    if (!toastEl) { showing = false; return; }

    toastEl.classList.remove("visible");
    setTimeout(() => {
        toastEl.classList.add("hidden");
        setTimeout(() => processQueue(), QUEUE_GAP_MS);
    }, 250);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("achievementToastCloseBtn")
        ?.addEventListener("click", hideToast);
});
