/* ══════════════════════════════════════════════════════════
   Feedback / survey UI
   ══════════════════════════════════════════════════════════
   Three entry points, one modal:
     1. A button inside the About modal.
     2. A button on the End Game screen — the modal also opens
        there automatically a moment after the results appear.
     3. A random, non-blocking toast shown at most once per
        playthrough during a game, offering to open the form.

   Submission goes straight from the browser to FormSubmit
   (see js/constants/feedback.js) — no backend of our own
   involved. Everything here is silent AJAX: no page reload,
   no redirect away from the game.
   ══════════════════════════════════════════════════════════ */

import { t } from "../i18n.js";
import { loadIcons } from "./icon-ui.js";
import { openModal, closeModal } from "./modal-ui.js";
import { FEEDBACK_ENDPOINT } from "../constants/feedback.js";

// Chance (0–1) checked once per new round that the random toast offers
// itself. Capped at one offer per playthrough regardless of how many
// rounds are checked.
const RANDOM_TOAST_CHANCE = 0.18;
const RANDOM_TOAST_MIN_ROUND = 2; // don't interrupt round 1
const TOAST_AUTO_DISMISS_MS = 9000;
const AUTO_OPEN_AFTER_GAME_DELAY_MS = 1400;

let selectedRating = 0;
let offeredThisSession = false;   // random toast: shown at most once per playthrough
let submittedThisSession = false; // once they submit, stop pestering them
let toastDismissTimer = null;

/* ── Wire everything up (call once at boot) ───────────────── */
export function initFeedback() {
    document.getElementById("aboutFeedbackBtn")
        ?.addEventListener("click", () => openFeedbackModal());

    document.getElementById("endgameFeedbackBtn")
        ?.addEventListener("click", () => openFeedbackModal());

    document.getElementById("closeFeedback")
        ?.addEventListener("click", () => closeModal("feedbackModal"));

    initStars();

    document.getElementById("feedbackForm")
        ?.addEventListener("submit", onSubmit);

    document.getElementById("feedbackToastYesBtn")
        ?.addEventListener("click", () => {
            hideToast();
            openFeedbackModal();
        });

    document.getElementById("feedbackToastLaterBtn")
        ?.addEventListener("click", hideToast);
}

function initStars() {
    const wrap = document.getElementById("feedbackStars");
    if (!wrap) return;

    wrap.addEventListener("click", e => {
        const btn = e.target.closest(".feedback-star");
        if (!btn) return;
        setRating(Number(btn.dataset.value));
    });
}

function setRating(value) {
    selectedRating = value;
    document.getElementById("feedbackRatingInput").value = String(value);
    document.querySelectorAll("#feedbackStars .feedback-star").forEach(btn => {
        btn.classList.toggle("active", Number(btn.dataset.value) <= value);
    });
}

function resetForm() {
    const form = document.getElementById("feedbackForm");
    form?.reset();
    setRating(0);
    setStatus("", null);
    const submitBtn = document.getElementById("feedbackSubmitBtn");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t("feedbackSubmitBtn");
    }
}

function setStatus(text, kind /* "error" | "success" | null */) {
    const el = document.getElementById("feedbackStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-error", kind === "error");
    el.classList.toggle("is-success", kind === "success");
}

/* ── Open / close the modal (exported so other modules can trigger it) ── */
export function openFeedbackModal() {
    resetForm();
    openModal("feedbackModal");
    loadIcons(document.getElementById("feedbackModal"));
}

async function onSubmit(e) {
    e.preventDefault();

    if (selectedRating === 0) {
        setStatus(t("feedbackRatingRequired"), "error");
        return;
    }

    const submitBtn = document.getElementById("feedbackSubmitBtn");
    const message   = document.getElementById("feedbackMessage")?.value?.trim() || "";
    const name      = document.getElementById("feedbackName")?.value?.trim() || "";
    const email     = document.getElementById("feedbackEmail")?.value?.trim() || "";

    submitBtn.disabled = true;
    submitBtn.textContent = t("feedbackSendingBtn");
    setStatus("", null);

    try {
        const res = await fetch(FEEDBACK_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                _subject: "Wild Guest List — new feedback",
                rating: `${selectedRating}/5`,
                message: message || "(no comment)",
                name: name || "(not provided)",
                email: email || "(not provided)",
            }),
        });

        if (!res.ok) throw new Error(`FormSubmit responded ${res.status}`);

        submittedThisSession = true;
        setStatus(t("feedbackSuccessText"), "success");
        document.getElementById("feedbackForm")?.reset();
        setRating(0);
        submitBtn.textContent = t("feedbackSubmitBtn");

        setTimeout(() => closeModal("feedbackModal"), 1800);

    } catch (err) {
        console.error("[feedback] submission failed", err);
        setStatus(t("feedbackErrorText"), "error");
        submitBtn.disabled = false;
        submitBtn.textContent = t("feedbackSubmitBtn");
    }
}

/* ── Auto-open after the game ends ─────────────────────────
   Called by js/game/gameOver.js once the end-game screen is
   already showing, so the player sees their result first. */
export function autoOpenFeedbackAfterGame() {
    if (submittedThisSession) return;
    setTimeout(() => {
        // Guard: only pop it if the end-game screen is still the one
        // visible (player might have already navigated away/reloaded).
        const endScreen = document.getElementById("endGameScreen");
        if (!endScreen || endScreen.classList.contains("hidden")) return;
        openFeedbackModal();
    }, AUTO_OPEN_AFTER_GAME_DELAY_MS);
}

/* ── Random in-game toast ──────────────────────────────────
   Called once per round (see js/game/turnManager.js nextTurn).
   Non-blocking: it never pauses the game, just sits in a corner
   until dismissed, clicked, or it times out on its own. */
export function maybeOfferFeedbackToast(gameState) {
    if (offeredThisSession) return;
    if (submittedThisSession) return;
    if (!gameState || gameState.round < RANDOM_TOAST_MIN_ROUND) return;
    if (Math.random() > RANDOM_TOAST_CHANCE) return;

    offeredThisSession = true;
    showToast();
}

function showToast() {
    const toast = document.getElementById("feedbackToast");
    if (!toast) return;

    loadIcons(toast);
    toast.classList.remove("hidden");
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("visible"));
    });

    toastDismissTimer = setTimeout(hideToast, TOAST_AUTO_DISMISS_MS);
}

function hideToast() {
    const toast = document.getElementById("feedbackToast");
    if (!toast) return;
    if (toastDismissTimer !== null) {
        clearTimeout(toastDismissTimer);
        toastDismissTimer = null;
    }
    toast.classList.remove("visible");
    setTimeout(() => toast.classList.add("hidden"), 250);
}
