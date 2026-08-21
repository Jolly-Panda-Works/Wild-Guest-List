import { buildLangSelector } from "../i18n.js";
import { openTutorial } from "./tutorial-ui.js"
import { initFeedback } from "./feedback-ui.js"

// Shared "chrome" modal wiring — Settings, About, Tutorial, Feedback.
// Safe to call once on any page that includes some subset of these
// modals: index.html/Home keeps Profile/Settings/Card Guide/About/
// Feedback/Tutorial as popups (see js/home-main.js), while
// game.html/Game keeps its own in-game Settings/Help/Card Guide
// modals — a deliberate, separate use case (see js/ui/pause-ui.js)
// sharing the same underlying widgets/persistence, not the same
// markup instance. Each lookup here is a harmless no-op on a page
// missing a given element.
export function initializeModals(){

    initFeedback();

    document
        .getElementById("closeSettings")
        ?.addEventListener(
            "click",
            ()=> closeModal("settingsModal")
        );

    document
        .getElementById("aboutBtn")
        ?.addEventListener(
            "click",
            ()=> openModal("aboutModal")
        );

    document
        .getElementById("closeAbout")
        ?.addEventListener(
            "click",
            ()=> closeModal("aboutModal")
        );

    document
        .getElementById("tutorialBtn")
        ?.addEventListener(
            "click",
            ()=> {
                openModal("tutorialModal");
                openTutorial(false);
            }
        );
}

export function openModal(id){

    const el = document.getElementById(id);
    if (!el) return;

    _lastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    el.classList.remove("hidden");

    // Move focus into the popup so keyboard/screen-reader users land
    // inside it rather than on the now-hidden Home content behind it.
    const focusTarget = el.querySelector("[autofocus]") || el.querySelector(FOCUSABLE_SELECTOR) || el;
    focusTarget?.focus?.({ preventScroll: true });
}

export function closeModal(id){

    const el = document.getElementById(id);
    if (!el) return;

    el.classList.add("hidden");

    // Return focus to whatever opened the popup, instead of leaving it
    // stuck on (or lost by) a now-hidden element.
    if (_lastTrigger && document.contains(_lastTrigger)) {
        _lastTrigger.focus?.({ preventScroll: true });
    }
    _lastTrigger = null;
}

// ── Consistent Menu Popup lifecycle ─────────────────────────────
// Every genuine Home popup (.modal) shares the same close behavior:
// click the backdrop, or press Escape, to dismiss the topmost visible
// one — on top of whatever close button each modal already has. This
// is additive to (never a replacement for) any modal-specific close
// wiring already in place (e.g. js/game/help.js's own backdrop
// handler) — closing an already-hidden modal is a harmless no-op.
const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let _lastTrigger = null;

function initModalLifecycle() {
    document.addEventListener("click", e => {
        const modal = e.target;
        if (modal instanceof HTMLElement && modal.classList.contains("modal") && !modal.classList.contains("hidden") && e.target === modal) {
            closeModal(modal.id);
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;

        const openModals = Array.from(document.querySelectorAll(".modal:not(.hidden)"));
        if (openModals.length === 0) return;

        // Close only the topmost (last in DOM = last opened, in this
        // project's markup order) so nested modals like #cardModal
        // over #helpModal close one at a time.
        closeModal(openModals[openModals.length - 1].id);
    });

    // Basic focus trap: while any modal is open, keep Tab cycling
    // inside the topmost one instead of letting focus escape onto the
    // hidden Home page behind it.
    document.addEventListener("keydown", e => {
        if (e.key !== "Tab") return;

        const openModals = Array.from(document.querySelectorAll(".modal:not(.hidden)"));
        if (openModals.length === 0) return;

        const active = openModals[openModals.length - 1];
        const focusable = Array.from(active.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(elm => elm.offsetParent !== null);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
}

initModalLifecycle();
