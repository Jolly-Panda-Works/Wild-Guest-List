// ══════════════════════════════════════════════════════════
// Home / Main Hub — js/ui/home-ui.js
//
// New default landing screen, shown after the splash name-entry
// step and before the existing splash→difficulty→match flow.
// See docs/PRODUCT_ROADMAP.md "Phase 1 — Home & Navigation" and
// docs/UI_UX_PLAN.md §1-2 for the plan this implements.
//
// Nothing here touches the game engine. "Offline Game" reveals
// the exact same #difficultyModal flow that the splash screen's
// Start Game button used to open directly (js/main.js still owns
// buildDifficultyPanel()/startGame()) — Home only decides *when*
// that flow becomes visible.
// ══════════════════════════════════════════════════════════

import { openModal } from "./modal-ui.js";
import { loadIcons } from "./icon-ui.js";
import { buildLangSelector, t } from "../i18n.js";
import { openTutorial } from "./tutorial-ui.js";
import { openHelp } from "../game/help.js";
import { showWarning } from "./game-ui.js";

/** Reveals Home and hides the splash screen behind it (splash may
 *  already be hidden if this isn't the first visit this session). */
export function showHome() {
    document.getElementById("splashScreen")?.classList.add("hidden");
    const home = document.getElementById("homeScreen");
    home?.classList.remove("hidden");
    // Land focus on the primary CTA so keyboard/screen-reader users
    // don't have to tab in from the top of the document.
    document.getElementById("homeOfflineBtn")?.focus();
}

function hideHome() {
    document.getElementById("homeScreen")?.classList.add("hidden");
}

/** Real Home entries that only have a future-state today. Shared
 *  handler so every "Coming Soon" tile gives the same, honest
 *  feedback instead of silently doing nothing (per
 *  docs/PRODUCT_ROADMAP.md Phase 1 acceptance criteria). */
function wireComingSoon(id, messageKey) {
    document.getElementById(id)?.addEventListener("click", () => {
        showWarning(t(messageKey));
    });
}

export async function initHome() {
    // Home's icon spans (data-icon="play"/"globe"/"cards"/...) are only
    // ever populated by loadIcons() — and until now loadIcons(document)
    // only ran once startGame() fired. Scope a call to #homeScreen here
    // so icons render before the player has started a match at all.
    await loadIcons(document.getElementById("homeScreen"));

    // ── Primary CTAs ──────────────────────────────────────
    document.getElementById("homeOfflineBtn")?.addEventListener("click", () => {
        hideHome();
        // Same entry point the old splash "Start Game" button used to
        // open directly — see js/main.js startGameBtn wiring (now
        // repointed to showHome() instead).
        document.getElementById("difficultyModal")?.classList.remove("hidden");
    });

    // Online Game is visibly present and clearly disabled — it must
    // not error or silently do nothing when tapped.
    wireComingSoon("homeOnlineBtn", "homeOnlineComingSoonTip");

    // ── Secondary nav row ─────────────────────────────────
    document.getElementById("homeCardsBtn")?.addEventListener("click", () => {
        openHelp();
    });

    wireComingSoon("homeProfileBtn", "comingSoon");

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
    // All three are reserved navigation entries per
    // docs/ARCHITECTURE_PLAN.md §8 Step E — real, reachable,
    // clearly-labeled placeholders, not dead buttons.
    wireComingSoon("homeStoreBtn", "comingSoon");
    wireComingSoon("homeTournamentBtn", "comingSoon");
    wireComingSoon("homeLeaderboardBtn", "comingSoon");
}
