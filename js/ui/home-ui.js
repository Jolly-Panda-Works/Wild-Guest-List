// ══════════════════════════════════════════════════════════
// Home — js/ui/home-ui.js
//
// index.html's own screen — the app's landing page (see
// js/home-main.js). Nothing here touches the game engine.
// "Offline Game" reveals #difficultyModal, the same bot-difficulty
// picker that used to open directly from the old splash screen;
// js/home-main.js still owns building that panel and, once
// confirmed, navigating to game.html — Home only decides *when*
// that flow becomes visible.
// ══════════════════════════════════════════════════════════

import { openModal } from "./modal-ui.js";
import { loadIcons } from "./icon-ui.js";
import { buildLangSelector, t } from "../i18n.js";
import { openTutorial } from "./tutorial-ui.js";
import { openHelp } from "../game/help.js";
import { showWarning } from "./game-ui.js";
import { openProfileModal } from "./profile-ui.js";

/** Real Home entries that only have a future-state today. Shared
 *  handler so every "Coming Soon" tile gives the same, honest
 *  feedback instead of silently doing nothing. */
function wireComingSoon(id, messageKey) {
    document.getElementById(id)?.addEventListener("click", () => {
        showWarning(t(messageKey));
    });
}

export async function initHome() {
    // Home's icon spans (data-icon="play"/"globe"/"cards"/...) are only
    // ever populated by loadIcons().
    await loadIcons(document.getElementById("homeScreen"));

    // ── Profile entry point ───────────────────────────────
    document.getElementById("homeProfileChip")?.addEventListener("click", () => {
        openProfileModal();
    });

    // ── Primary CTAs ──────────────────────────────────────
    document.getElementById("homeOfflineBtn")?.addEventListener("click", () => {
        document.getElementById("difficultyModal")?.classList.remove("hidden");
    });

    // Online Game is visibly present and clearly disabled — it must
    // not error or silently do nothing when tapped.
    wireComingSoon("homeOnlineBtn", "homeOnlineComingSoonTip");

    // ── Secondary nav row ─────────────────────────────────
    document.getElementById("homeCardsBtn")?.addEventListener("click", () => {
        openHelp();
    });

    document.getElementById("homeSettingsBtn")?.addEventListener("click", async () => {
        buildLangSelector(document.getElementById("langSelector"));
        openModal("settingsModal");
        await loadIcons(document.getElementById("settingsModal"));
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
    wireComingSoon("homeStoreBtn", "comingSoon");
    wireComingSoon("homeTournamentBtn", "comingSoon");
    wireComingSoon("homeLeaderboardBtn", "comingSoon");
}
