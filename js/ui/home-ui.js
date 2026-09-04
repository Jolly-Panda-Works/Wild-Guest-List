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
// direct-URL support. Store/Tournament/Leaderboard/Lucky Wheel are all
// Menu-type Coming Soon placeholders, so per AGENTS.md rule 4's stated
// default they're all genuine popup modals — Store/Tournament/
// Leaderboard share one generic #comingSoonModal (see
// wireComingSoon()/openComingSoon() below), while Lucky Wheel has its
// own dedicated #luckyWheelModal (kept separate since a future real
// implementation will need its own body content). coming-soon.html
// still exists and works by direct URL — it's just no longer linked
// from Home. See docs/ARCHITECTURE_PLAN.md.
// ══════════════════════════════════════════════════════════

import { openModal, closeModal } from "./modal-ui.js";
import { loadIcons } from "./icon-ui.js";
import { openTutorial } from "./tutorial-ui.js";
import { openProfileModal } from "./profile-ui.js";
import { initHomeGameStart } from "./homeGameStart-ui.js";
import { openHelp } from "../game/help.js";
import { t } from "../i18n.js";

/** Store/Tournament/Leaderboard Coming Soon entries open the shared
 *  #comingSoonModal popup (see index.html) instead of navigating to
 *  coming-soon.html?feature=... — the same AGENTS.md rule 4 popup
 *  default Lucky Wheel already follows below, generalized so a
 *  near-identical modal isn't duplicated per feature. coming-soon.html
 *  itself is untouched and still reachable by direct URL; it's just no
 *  longer linked from these three Home entry points. iconKey must
 *  match a data/config.json → icons key; titleKey an i18n key for the
 *  feature's display name. */
function wireComingSoon(id, iconKey, titleKey) {
    document.getElementById(id)?.addEventListener("click", () => {
        openComingSoon(iconKey, titleKey);
    });
}

function openComingSoon(iconKey, titleKey) {

    const titleEl = document.getElementById("comingSoonModalTitle");
    if (titleEl) titleEl.textContent = t(titleKey);

    // Swap the popup's icon per feature, same "reset iconLoaded, then
    // re-run loadIcons()" pattern js/ui/tutorial-ui.js uses to change
    // an already-loaded icon element's image at runtime.
    const iconEl = document.getElementById("comingSoonModalIcon");
    if (iconEl && iconEl.dataset.icon !== iconKey) {
        iconEl.dataset.icon = iconKey;
        delete iconEl.dataset.iconLoaded;
        loadIcons(iconEl);
    }

    openModal("comingSoonModal");
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
    // Real, reachable, clearly-labeled placeholders, not dead buttons —
    // each opens the shared #comingSoonModal popup (see openComingSoon
    // above) identifying itself by name, rather than a full-page nav.
    wireComingSoon("homeStoreBtn", "store", "homeStore");
    wireComingSoon("homeTournamentBtn", "tournament", "homeTournament");
    wireComingSoon("homeLeaderboardBtn", "leaderboard", "homeLeaderboard");

    document.getElementById("closeComingSoon")?.addEventListener("click", () => {
        closeModal("comingSoonModal");
    });

    // ── Lucky Wheel — a Menu feature (quick lookup, not a step in
    //    starting a match), so per AGENTS.md rule 4 it's a popup too,
    //    like the three buttons above — but its own dedicated
    //    #luckyWheelModal rather than the shared #comingSoonModal,
    //    since a future real implementation will need its own body
    //    content. Coming Soon content only — no spinning, rewards, or
    //    currency; see index.html's #luckyWheelModal comment for what
    //    a future real implementation would change. ────────────────
    document.getElementById("homeLuckyWheelBtn")?.addEventListener("click", () => {
        openModal("luckyWheelModal");
    });

    document.getElementById("closeLuckyWheel")?.addEventListener("click", () => {
        closeModal("luckyWheelModal");
    });
}
