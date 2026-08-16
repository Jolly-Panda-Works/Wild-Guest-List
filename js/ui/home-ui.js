// ══════════════════════════════════════════════════════════
// Home — js/ui/home-ui.js
//
// index.html's own screen — the app's landing page (see
// js/home-main.js).
//
// Menu-type destinations (Profile, Settings, Card Guide, How-to-Play)
// default to opening as genuine popup modals over Home — quick
// lookups/tweaks that shouldn't unload Home underneath them — unless
// a specific screen has an explicit reason to be a real page instead.
// About Developer is no longer its own top-level Menu entry — it now
// lives inside Settings (#settingsAboutBtn opens the existing
// #aboutModal nested on top of #settingsModal). Right now the only
// real-page exception is Choose Bot Difficulty (bot-difficulty.html):
// it's a step in actually starting a match, not a menu lookup, so it
// stays a real top-level destination with its own Back/refresh/
// direct-URL support. Coming Soon entries are likewise real pages
// (coming-soon.html) so even disabled/future features are
// independently linkable. See docs/ARCHITECTURE_PLAN.md.
// ══════════════════════════════════════════════════════════

import { openModal } from "./modal-ui.js";
import { loadIcons } from "./icon-ui.js";
import { openTutorial } from "./tutorial-ui.js";
import { openProfileModal } from "./profile-ui.js";
import { initHomeGameStart } from "./homeGameStart-ui.js";
import { openHelp } from "../game/help.js";

/** Coming Soon entries navigate to their own page (coming-soon.html)
 *  instead of staying on Home — even disabled/future features must
 *  be architecturally independent destinations, not Home children. */
function wireComingSoon(id, featureId) {
    document.getElementById(id)?.addEventListener("click", () => {
        window.location.href = `coming-soon.html?feature=${featureId}`;
    });
}

export async function initHome() {
    // Home's icon spans (data-icon="play"/"globe"/"cards"/...) are only
    // ever populated by loadIcons().
    await loadIcons(document.getElementById("homeScreen"));

    // ── Profile entry point — popup, see js/ui/profile-ui.js ──
    document.getElementById("homeProfileChip")?.addEventListener("click", () => {
        openProfileModal();
    });

    // ── Start Game tabs — Play vs Bot / Rank / Friendly. Play vs Bot
    //    is the one menu item that's a real top-level destination
    //    (bot-difficulty.html), not a popup — see the note above and
    //    js/bot-difficulty-main.js. Rank and Friendly are switchable
    //    tabs whose panel says Coming Soon; see
    //    js/ui/homeGameStart-ui.js. ─────────────────────────────────
    initHomeGameStart();
    document.getElementById("homePlayVsBotBtn")?.addEventListener("click", () => {
        window.location.href = "bot-difficulty.html";
    });

    // ── Secondary nav row — popups, matching How-to-Play ──
    document.getElementById("homeCardsBtn")?.addEventListener("click", () => {
        openHelp();
    });

    document.getElementById("homeSettingsBtn")?.addEventListener("click", () => {
        openModal("settingsModal");
    });

    document.getElementById("homeHowToPlayBtn")?.addEventListener("click", () => {
        openModal("tutorialModal");
        openTutorial(false);
    });

    // About Developer now lives inside Settings (#settingsAboutBtn,
    // see index.html #settingsModal) rather than as its own top-level
    // Menu entry — opens the same #aboutModal, nested on top of
    // Settings, exactly like #cardModal nests on top of #helpModal.
    document.getElementById("settingsAboutBtn")?.addEventListener("click", () => {
        openModal("aboutModal");
    });

    // ── Bottom nav (Store / Tournament / Leaderboard) ─────
    // Real, reachable, clearly-labeled placeholders, not dead buttons.
    wireComingSoon("homeStoreBtn", "shop");
    wireComingSoon("homeTournamentBtn", "tournament");
    wireComingSoon("homeLeaderboardBtn", "leaderboard");
}
