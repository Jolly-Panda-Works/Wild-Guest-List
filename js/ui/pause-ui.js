import { openModal, closeModal } from "./modal-ui.js";
import { pauseTurnTimer, resumeTurnTimer, isPaused } from "../game/turnTimer.js";
import { buildLangSelector } from "../i18n.js";

// Re-exported so other modules (e.g. the hand's click/keyboard handlers
// in game-ui.js, and the AI move scheduler in turnManager.js) can check
// pause state too — as a second line of defense on top of the pause
// panel's own full-screen overlay (which already blocks pointer clicks
// on the board underneath it, but not a keyboard Enter/Space on a card
// that still happens to hold focus, or a setTimeout already in flight).
// turnTimer.js is the single source of truth for this flag — see its
// pauseTurnTimer()/resumeTurnTimer()/isPaused() for why it lives there
// instead of a separate flag here.
export { isPaused };

// Tracks whether Settings was opened FROM the pause panel, so closing
// Settings can bring the pause panel back up instead of just dropping
// the player back into an unpaused board.
let settingsOpenedFromPause = false;

export function initializePause() {

    document
        .getElementById("pauseBtn")
        ?.addEventListener("click", () => {
            pauseTurnTimer();
            openModal("pauseModal");
        });

    document
        .getElementById("pauseResumeBtn")
        ?.addEventListener("click", () => {
            closeModal("pauseModal");
            resumeTurnTimer();
        });

    document
        .getElementById("pauseSettingsBtn")
        ?.addEventListener("click", () => {
            settingsOpenedFromPause = true;
            buildLangSelector(document.getElementById("langSelector"));
            closeModal("pauseModal");
            openModal("settingsModal");
        });

    document
        .getElementById("pauseRestartBtn")
        ?.addEventListener("click", () => {
            // Same as the existing "Play Again" button on the game-over
            // screen (js/ui/modal-ui.js) — simplest reliable way to get
            // a fully clean game state back.
            location.reload();
        });

    // If Settings was opened from the pause panel, closing it should
    // return to the pause panel (still paused) rather than resuming.
    document
        .getElementById("closeSettings")
        ?.addEventListener("click", () => {
            if (settingsOpenedFromPause) {
                settingsOpenedFromPause = false;
                openModal("pauseModal");
            }
        });
}
