// ══════════════════════════════════════════════════════════
// Choose Bot Difficulty page bootstrap — js/bot-difficulty-main.js
//
// Entry point for bot-difficulty.html — a top-level destination
// reached from Home's Play vs Bot button (js/ui/home-ui.js), not
// content rendered inside index.html. Builds the bot-difficulty +
// per-seat color panel, then hands off to game.html exactly as
// before via the same sessionStorage handoff — nothing about how a
// match starts changed, only where the picking-a-setup UI lives.
//
// Player identity (avatar + name) is read-only on this page, sourced
// from the one authoritative profile (js/services/profile.js) —
// editing only happens in Home's Profile popup (index.html
// #profileModal). Bot difficulty and every seat's color are the
// only things configurable here.
// ══════════════════════════════════════════════════════════

import { loadI18n, t } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { initOrientationGate } from "./ui/orientation-ui.js";

initOrientationGate();

import { initCardColorPicker, initColorTriggers } from "./ui/cardColor-ui.js";
import {
    setStepGuidanceEnabled, isStepGuidanceEnabled,
    hasExplainedHistory, resetExplainedAbilities,
    isGuidancePromptHidden, setGuidancePromptHidden,
} from "./ui/cardGuidance-ui.js";
import { playBackgroundMusic } from "./services/soundManager.js";
import { PLAYER_AVATARS, DEFAULT_PLAYER_AVATAR_ID } from "./constants/avatars.js";
import { getAvatarId, getDisplayName, subscribeProfile } from "./services/profile.js";

const PENDING_DIFFICULTIES_KEY = "wgl_pendingDifficulties";

// ── Bot definitions (names use i18n) ──────────────────────
const BOT_DEFS = [
    { id: "p2", nameKey: "bot1" },
    { id: "p3", nameKey: "bot2" },
    { id: "p4", nameKey: "bot3" }
];

// ── Build the difficulty panel ────────────────────────────
// The player's own avatar and name are shown read-only, sourced
// from the one authoritative profile — this page never lets either
// be changed (see refreshPlayerIdentity() below).
async function buildDifficultyPanel() {
    const panel = document.getElementById("difficultyPanel");
    if (!panel) return;

    function avatarById(id) {
        return PLAYER_AVATARS.find(a => a.id === id) || PLAYER_AVATARS.find(a => a.id === DEFAULT_PLAYER_AVATAR_ID) || PLAYER_AVATARS[0];
    }

    function renderPanel(){
        const activeAvatar = avatarById(getAvatarId());
        const playerName   = getDisplayName() || t("you");

        const playerRow = `
            <div class="bot-row player-row" id="playerColorRow">
                <div class="player-avatar-mount">
                    <img id="playerAvatarDisplay" class="player-avatar-display"
                         src="${activeAvatar.src}" alt="${t(activeAvatar.labelKey)}">
                </div>
                <div class="bot-info">
                    <div class="bot-name" id="playerNameDisplay">${playerName}</div>
                </div>
                <div class="color-trigger-mount" id="colorTrigger_p1"></div>
            </div>
        `;

        const botRows = BOT_DEFS.map(bot => `
            <div class="bot-row" id="botRow_${bot.id}" data-player="${bot.id}">
                <div class="bot-avatar" id="botAvatar_${bot.id}">
                    <span data-icon="bot-easy"></span>
                </div>
                <div class="bot-info">
                    <div class="bot-name">${t(bot.nameKey)}</div>
                    <div class="diff-toggle" data-bot="${bot.id}">
                        ${["easy","medium","hard"].map(d => `
                            <button class="diff-btn ${d === "easy" ? "active" : ""}"
                                    data-diff="${d}"
                                    data-bot="${bot.id}">
                                ${t("bot" + d.charAt(0).toUpperCase() + d.slice(1))}
                            </button>
                        `).join("")}
                    </div>
                </div>
                <div class="color-trigger-mount" id="colorTrigger_${bot.id}"></div>
            </div>
        `).join("");

        panel.innerHTML = playerRow + botRows;
    }

    async function wireColorTriggers() {
        await initColorTriggers({
            p1: document.getElementById("colorTrigger_p1"),
            p2: document.getElementById("colorTrigger_p2"),
            p3: document.getElementById("colorTrigger_p3"),
            p4: document.getElementById("colorTrigger_p4"),
        });
    }

    // Keeps the read-only avatar + name in sync if the profile changes
    // elsewhere (e.g. Home's Profile popup, open in another tab) while this
    // page is visible — display-only refresh, never writes back.
    function refreshPlayerIdentity() {
        const activeAvatar = avatarById(getAvatarId());
        const img  = document.getElementById("playerAvatarDisplay");
        const name = document.getElementById("playerNameDisplay");
        if (img) {
            img.src = activeAvatar.src;
            img.alt = t(activeAvatar.labelKey);
        }
        if (name) name.textContent = getDisplayName() || t("you");
    }

    renderPanel();
    await wireColorTriggers();
    subscribeProfile(refreshPlayerIdentity);
    window.addEventListener("langchange", async () => {
        renderPanel();
        await loadIcons(panel);
        await wireColorTriggers();
    });

    const selected = { p2: "easy", p3: "easy", p4: "easy" };

    async function updateBotDisplay(botId, diff) {
        selected[botId] = diff;
        const av  = document.getElementById(`botAvatar_${botId}`);
        if (av) {
            av.innerHTML = `<span data-icon="bot-${diff}"></span>`;
        }
        await loadIcons(av);
    }

    panel.addEventListener("click", e => {
        const btn = e.target.closest(".diff-btn");
        if (!btn) return;
        const botId = btn.dataset.bot;
        const diff  = btn.dataset.diff;
        panel.querySelectorAll(`.diff-btn[data-bot="${botId}"]`)
             .forEach(b => b.classList.toggle("active", b.dataset.diff === diff));
        updateBotDisplay(botId, diff);
    });

    panel._getSelections = () => selected;
    await loadIcons(panel);
}

// ── Hand off to Game ──────────────────────────────────────
// The only thing that needs to cross the Choose Bot Difficulty →
// Game navigation is which difficulty each bot was set to.
// Everything else Game needs (player identity, sound/guidance
// settings, language) it reads itself from the same persisted
// stores used here.
function goToGame(selections) {
    try {
        sessionStorage.setItem(PENDING_DIFFICULTIES_KEY, JSON.stringify(selections));
    } catch {
        // sessionStorage unavailable — game.html falls back to
        // default (easy/easy/easy) difficulties, never a hard failure
    }
    window.location.href = "game.html";
}

function answerGuidancePrompt(enabled) {
    const dontShowAgain = document.getElementById("guidancePromptDontShowAgain")?.checked;
    setGuidancePromptHidden(!!dontShowAgain);

    setStepGuidanceEnabled(enabled);
    document.getElementById("guidancePromptModal")?.classList.add("hidden");
    proceedAfterGuidanceChoice(enabled);
}

function proceedAfterGuidanceChoice(guidanceEnabled) {
    if (guidanceEnabled && hasExplainedHistory()) {
        document.getElementById("guidanceRestartModal")?.classList.remove("hidden");
        document.getElementById("guidanceRestartYesBtn")?.focus();
        return;
    }
    launchGame();
}

function answerGuidanceRestart(startOver) {
    if (startOver) resetExplainedAbilities();
    document.getElementById("guidanceRestartModal")?.classList.add("hidden");
    launchGame();
}

function launchGame() {
    const panel      = document.getElementById("difficultyPanel");
    const selections = panel?._getSelections?.() || { p2: "easy", p3: "easy", p4: "easy" };
    goToGame(selections);
}

// ── Boot ───────────────────────────────────────────────────
await loadI18n();
await initCardColorPicker();
await buildDifficultyPanel();
await loadIcons();
playBackgroundMusic();

document.getElementById("confirmDiffBtn")?.addEventListener("click", () => {
    if (isGuidancePromptHidden()) {
        proceedAfterGuidanceChoice(isStepGuidanceEnabled());
        return;
    }

    document.getElementById("guidancePromptModal")?.classList.remove("hidden");
    document.getElementById("guidancePromptYesBtn")?.focus();
});

document.getElementById("guidancePromptYesBtn")?.addEventListener("click", () => answerGuidancePrompt(true));
document.getElementById("guidancePromptNoBtn")?.addEventListener("click", () => answerGuidancePrompt(false));

document.getElementById("guidancePromptModal")?.addEventListener("keydown", e => {
    if (e.key === "Escape") answerGuidancePrompt(isStepGuidanceEnabled());
});

document.getElementById("guidanceRestartYesBtn")?.addEventListener("click", () => answerGuidanceRestart(true));
document.getElementById("guidanceRestartNoBtn")?.addEventListener("click", () => answerGuidanceRestart(false));

document.getElementById("guidanceRestartModal")?.addEventListener("keydown", e => {
    if (e.key === "Escape") answerGuidanceRestart(false);
});
