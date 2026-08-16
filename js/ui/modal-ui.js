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
