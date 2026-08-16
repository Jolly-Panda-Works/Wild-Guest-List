// ══════════════════════════════════════════════════════════
// Home page bootstrap — js/home-main.js
//
// Entry point for index.html (Home). Home is a top-level navigation
// destination — it boots i18n, its own screen, and its menu-type
// modals: Profile, Settings, Card Guide, About, Feedback, and the
// How-to-Play tutorial. These default to popups over Home rather
// than separate pages — see js/ui/home-ui.js for the rule and its
// one exception (Choose Bot Difficulty).
//
// Choose Bot Difficulty (bot-difficulty.html) is NOT rendered here —
// it's a separate page reached via real navigation from
// js/ui/home-ui.js. Home never initializes gameplay itself; that's
// game-main.js's job, only once the player confirms on
// bot-difficulty.html and is handed off to game.html. See
// docs/ARCHITECTURE_PLAN.md for the navigation architecture this
// implements.
// ══════════════════════════════════════════════════════════

import { loadI18n, buildLangSelector } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { playBackgroundMusic } from "./services/soundManager.js";
import { initSoundToggle } from "./services/soundManager.js";
import { initializeTutorial } from "./ui/tutorial-ui.js";
import { initializeModals } from "./ui/modal-ui.js";
import { updateHomeProfileChip, initProfilePage } from "./ui/profile-ui.js";
import { initCardColorPicker } from "./ui/cardColor-ui.js";
import { initStepGuidanceToggle } from "./ui/cardGuidance-ui.js";
import { initHelp } from "./game/help.js";
import { initHome } from "./ui/home-ui.js";

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();

// ── Home's own genuine modals: Profile, Settings, Card Guide,
//    About, Feedback, and the How-to-Play tutorial. All popups over
//    Home rather than separate destinations — see js/ui/home-ui.js
//    for why, and docs/ARCHITECTURE_PLAN.md for the one exception
//    (Choose Bot Difficulty stays a real page). ────────────────────
await initializeTutorial();
initializeModals();

initProfilePage();
updateHomeProfileChip();

buildLangSelector(document.getElementById("langSelector"));
await initCardColorPicker();
initStepGuidanceToggle();
initSoundToggle();

initHelp();

await initHome();

await loadIcons();

playBackgroundMusic();
