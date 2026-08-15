import { buildLangSelector } from "../i18n.js";
import { openTutorial } from "./tutorial-ui.js"
import { initFeedback } from "./feedback-ui.js"

// Shared "chrome" modal wiring — Settings, About, Tutorial, Feedback.
// Safe to call once on any page that includes some subset of these
// modals: index.html/Home only keeps About/Feedback/Tutorial now
// (Settings became its own page, settings.html — see
// js/settings-main.js), while game.html/Game keeps all four,
// including its own in-game Settings/Help modals (deliberately NOT
// pages — see docs in game.html). Each lookup is a harmless no-op on
// a page missing a given element.
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
