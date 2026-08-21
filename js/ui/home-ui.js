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
// direct-URL support. Store/Tournament/Leaderboard are earlier Coming
// Soon entries that were made real pages (coming-soon.html) instead —
// see wireComingSoon() below. Lucky Wheel (added later, see
// #luckyWheelModal) deliberately does NOT follow that page pattern:
// per AGENTS.md rule 4's stated default, it's a genuine popup modal
// instead, same as Settings/Card Guide/How-to-Play. See
// docs/ARCHITECTURE_PLAN.md.
// ══════════════════════════════════════════════════════════

import { openModal, closeModal } from "./modal-ui.js";
import { loadIcons } from "./icon-ui.js";
import { openTutorial } from "./tutorial-ui.js";
import { openProfileModal } from "./profile-ui.js";
import { initHomeGameStart } from "./homeGameStart-ui.js";
import { openHelp } from "../game/help.js";

/** Store/Tournament/Leaderboard Coming Soon entries navigate to their
 *  own page (coming-soon.html) instead of staying on Home — an
 *  earlier, still-supported pattern for these three specifically. Not
 *  the default for new Menu-type features — see Lucky Wheel below,
 *  which follows AGENTS.md rule 4's popup default instead. */
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

    // ── Lucky Wheel — a Menu feature (quick lookup, not a step in
    //    starting a match), so per AGENTS.md rule 4 it's a popup
    //    (#luckyWheelModal), not a coming-soon.html navigation like
    //    the three buttons above. Coming Soon content only — no
    //    spinning, rewards, or currency; see index.html's
    //    #luckyWheelModal comment for what a future real
    //    implementation would change. ─────────────────────────────
    document.getElementById("homeLuckyWheelBtn")?.addEventListener("click", () => {
        openModal("luckyWheelModal");
    });

    document.getElementById("closeLuckyWheel")?.addEventListener("click", () => {
        closeModal("luckyWheelModal");
    });
}
