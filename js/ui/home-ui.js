// ══════════════════════════════════════════════════════════
// Home — js/ui/home-ui.js
//
// index.html's own screen — the app's landing page (see
// js/home-main.js). Home is a navigation destination, not a
// persistent container for the rest of the app: every button here
// either navigates to its own top-level page/document (profile.html,
// settings.html, cards.html, coming-soon.html) or, for Start Game,
// acts directly on Home itself — there is no separate Game Modes
// screen. Navigating away unmounts Home completely (a real page
// load) — nothing here keeps running in the background, and the
// browser's own Back button returns correctly without any extra
// history bookkeeping.
// ══════════════════════════════════════════════════════════

import { openModal } from "./modal-ui.js";
import { loadIcons } from "./icon-ui.js";
import { openTutorial } from "./tutorial-ui.js";
import { initPlayVsBot } from "./playVsBot-ui.js";
import { initHomeGameStart } from "./homeGameStart-ui.js";

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

    // ── Profile entry point ───────────────────────────────
    document.getElementById("homeProfileChip")?.addEventListener("click", () => {
        window.location.href = "profile.html";
    });

    // ── Start Game tabs — Play vs Bot / Rank / Friendly, all direct
    //    Home actions rather than links into a separate Game Modes
    //    screen. Only Play vs Bot is active: it reveals the
    //    bot-difficulty panel as a sub-state of Home itself (see
    //    js/ui/playVsBot-ui.js) — gameplay itself is unchanged. Rank
    //    and Friendly are switchable tabs whose panel says Coming
    //    Soon; see js/ui/homeGameStart-ui.js. ───────────────────────
    initHomeGameStart();
    await initPlayVsBot();

    // ── Secondary nav row ─────────────────────────────────
    document.getElementById("homeCardsBtn")?.addEventListener("click", () => {
        window.location.href = "cards.html";
    });

    document.getElementById("homeSettingsBtn")?.addEventListener("click", () => {
        window.location.href = "settings.html";
    });

    document.getElementById("homeHowToPlayBtn")?.addEventListener("click", () => {
        openModal("tutorialModal");
        openTutorial(false);
    });

    document.getElementById("homeAboutBtn")?.addEventListener("click", () => {
        openModal("aboutModal");
    });

    // ── Bottom nav (Store / Tournament / Leaderboard) ─────
    // Real, reachable, clearly-labeled placeholders, not dead buttons.
    wireComingSoon("homeStoreBtn", "shop");
    wireComingSoon("homeTournamentBtn", "tournament");
    wireComingSoon("homeLeaderboardBtn", "leaderboard");
}
