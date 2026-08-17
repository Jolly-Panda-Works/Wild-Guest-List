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
//
// bootHome() below is this exact sequence, just wrapped in a function
// instead of run as bare top-level awaits, so js/ui/startup-ui.js can
// gate it behind the Splash/Loading UI and re-invoke it on Retry if
// it fails. Known limitation: a Retry after a failure partway through
// re-runs the whole sequence from the top, including any earlier
// steps that already succeeded and wired their own listeners — see
// the startup feature's "Known Limitations" note. In practice this
// only matters if a step fails *after* an earlier step has already
// attached DOM listeners, which isn't the common failure mode here
// (the two fetch-based steps — i18n and config/icons — fail before
// any listener wiring happens).
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
import { runStartup } from "./ui/startup-ui.js";
import { initOrientationGate } from "./ui/orientation-ui.js";

// The orientation gate is deliberately NOT inside bootHome(): it's not
// a boot *step* that needs Splash/Loading/Error representation (see
// AGENTS.md rule 5) — it's an always-on device-state overlay that must
// be able to block even while boot is still running or has failed, so
// it's wired directly, synchronously, before runStartup() even starts.
initOrientationGate();

async function bootHome() {
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
}

await runStartup(bootHome);
