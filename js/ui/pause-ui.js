import { openModal, closeModal } from "./modal-ui.js";
import { pauseTurnTimer, resumeTurnTimer } from "../game/turnTimer.js";
import { buildLangSelector } from "../i18n.js";

// Whether the game is currently paused. Exported so other modules (e.g.
// the hand's click/keyboard handlers in game-ui.js) can refuse to play a
// card while paused, as a second line of defense on top of the pause
// panel's own full-screen overlay (which already blocks pointer clicks
// on the board underneath it, but not a keyboard Enter/Space on a card
// that still happens to hold focus).
let paused = false;
export function isPaused() {
    return paused;
}

// Tracks whether Settings was opened FROM the pause panel, so closing
// Settings can bring the pause panel back up instead of just dropping
// the player back into an unpaused board.
let settingsOpenedFromPause = false;

export function initializePause() {

    document
        .getElementById("pauseBtn")
        ?.addEventListener("click", () => {
            // Nothing to pause before a game has actually started, or if
            // a card is already mid-animation — same guard style used
            // elsewhere (see director.isBusy() checks in game-ui.js).
            paused = true;
            pauseTurnTimer();
            openModal("pauseModal");
        });

    document
        .getElementById("pauseResumeBtn")
        ?.addEventListener("click", () => {
            paused = false;
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
