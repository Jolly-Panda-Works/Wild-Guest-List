// ══════════════════════════════════════════════════════════
// Home page bootstrap — js/home-main.js
//
// Entry point for index.html (Home). Home is a top-level navigation
// destination — it boots i18n, its own screen, and the small set of
// genuine modals that belong to Home itself (About, Feedback, and
// the How-to-Play tutorial — brief overlays, not full destinations).
//
// Profile, Settings, and Cards are NOT rendered here — they're
// separate pages (profile.html, settings.html, cards.html) reached
// via real navigation from js/ui/home-ui.js. Game Modes are NOT a
// separate page either: Play vs Bot, Online Multiplayer, and Local
// Multiplayer are direct Home actions, wired via js/ui/home-ui.js
// and js/ui/playVsBot-ui.js. Home never initializes gameplay itself;
// that's game-main.js's job, only once the player confirms Play vs
// Bot and is handed off to game.html. See docs/ARCHITECTURE_PLAN.md
// for the navigation architecture this implements.
// ══════════════════════════════════════════════════════════

import { loadI18n } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { playBackgroundMusic } from "./services/soundManager.js";
import { initializeTutorial } from "./ui/tutorial-ui.js";
import { initializeModals } from "./ui/modal-ui.js";
import { updateHomeProfileChip } from "./ui/profile-ui.js";
import { initHome } from "./ui/home-ui.js";

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();

// ── Home's own genuine modals: About, Feedback, and the
//    How-to-Play tutorial. Brief overlays, not full destinations —
//    see docs/ARCHITECTURE_PLAN.md for why these stay modals while
//    Profile/Settings/Cards/Game Modes became real pages. ─────────
await initializeTutorial();
initializeModals();
updateHomeProfileChip();
await initHome();

await loadIcons();

playBackgroundMusic();
