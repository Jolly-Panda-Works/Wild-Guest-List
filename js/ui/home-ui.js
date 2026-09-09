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

// Session-only handoff to bot-difficulty.html: which bot-count option
// (1/2/3) was selected on Home's Play vs Bot panel when Play was
// pressed. Read by js/bot-difficulty-main.js to decide how many bot
// seats to build; falls back to 3 there if missing/invalid (direct
// URL access, older tab left open, etc.) so nothing ever breaks the
// existing flow.
const SELECTED_BOT_COUNT_KEY = "wgl_selectedBotCount";

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

    // ── Start Game tabs — Play vs Bot / Play vs Human. Primary tab
    //    switching lives in js/ui/homeGameStart-ui.js; the secondary
    //    options inside each panel are wired here since they actually
    //    do something (start a match / open a modal) rather than just
    //    toggling visibility. ─────────────────────────────────────
    initHomeGameStart();

    // Play vs Bot panel — three bot-count options plus a separate
    // Play button. The options are pure selectors (radiogroup, one
    // active/orange at a time) — tapping one only updates which
    // count is selected, it never starts a match by itself. 1 Bot
    // is selected by default in the markup. Only the Play button
    // below (#homeBotPlayBtn) stores the currently-selected count
    // and navigates to bot-difficulty.html — a real top-level
    // destination (js/bot-difficulty-main.js), not a popup — see
    // the note above.
    document.querySelectorAll(".home-bot-option").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".home-bot-option").forEach(b => {
                const isSelected = b === btn;
                b.classList.toggle("home-bot-option--selected", isSelected);
                b.setAttribute("aria-checked", String(isSelected));
            });
        });
    });

    document.getElementById("homeBotPlayBtn")?.addEventListener("click", () => {
        const selectedBtn = document.querySelector(".home-bot-option--selected");
        const botCount = selectedBtn?.dataset.bots || "1";
        try {
            sessionStorage.setItem(SELECTED_BOT_COUNT_KEY, botCount);
        } catch {
            // sessionStorage unavailable — bot-difficulty.html falls
            // back to 3 bots, never a hard failure
        }
        window.location.href = "bot-difficulty.html";
    });

    // Play vs Human panel — Rank and Friendly are real, visible
    // options, but neither has a backend or game flow yet, so tapping
    // either honestly opens the shared #comingSoonModal (same pattern
    // as Store/Tournament/Leaderboard below) instead of starting a
    // match. No fake multiplayer.
    wireComingSoon("homeHumanRankBtn", "trophy", "homeTabRank");
    wireComingSoon("homeHumanFriendlyBtn", "users", "homeTabFriendly");

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
