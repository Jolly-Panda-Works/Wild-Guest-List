import { buildLangSelector } from "../i18n.js";
import { openTutorial } from "./tutorial-ui.js"
import { initFeedback } from "./feedback-ui.js"

// Shared "chrome" modal wiring — Settings, About, Tutorial, Feedback.
// Safe to call once on any page that includes these modals (both
// index.html/Home and game.html/Game do); each lookup is a harmless
// no-op on a page missing a given element (e.g. Home has no in-board
// #tutorialBtn top-bar icon, only its own homeHowToPlayBtn, which
// js/ui/home-ui.js wires separately).
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

    document
        .getElementById(id)
        ?.classList.remove(
            "hidden"
        );
}

export function closeModal(id){

    document
        .getElementById(id)
        ?.classList.add(
            "hidden"
        );
}
