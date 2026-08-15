// ══════════════════════════════════════════════════════════
// Play vs Bot — js/ui/playVsBot-ui.js
//
// Home's "Play vs Bot" game mode (see js/ui/home-ui.js). There is
// no separate Game Modes screen: clicking "Play vs Bot" reveals the
// bot-difficulty panel as a sub-state of Home itself — swapping
// #homeMainContent for #difficultyPanelSection (index.html) — via a
// #play-vs-bot history entry, so Back correctly collapses the panel
// before returning to the rest of Home instead of skipping a step.
// Confirming still hands off to game.html exactly as before via the
// same sessionStorage handoff — nothing about how a match starts
// changed, only where the picking-a-mode UI lives. Reuses the
// existing gameplay initialization/game state as-is; no duplicate
// Bot gameplay implementation is introduced here.
// ══════════════════════════════════════════════════════════

import { t } from "../i18n.js";
import { loadIcons } from "./icon-ui.js";
import { initCardColorPicker, initColorTriggers } from "./cardColor-ui.js";
import { initAvatarTrigger } from "./playerAvatar-ui.js";
import {
    setStepGuidanceEnabled, isStepGuidanceEnabled,
    hasExplainedHistory, resetExplainedAbilities,
    isGuidancePromptHidden, setGuidancePromptHidden,
} from "./cardGuidance-ui.js";
import { BOT_AVATARS } from "../constants/playerTypes.js";

const PENDING_DIFFICULTIES_KEY = "wgl_pendingDifficulties";
const PLAY_VS_BOT_HASH = "#play-vs-bot";

// ── Bot definitions (names use i18n) ──────────────────────
const BOT_DEFS = [
    { id: "p2", nameKey: "bot1" },
    { id: "p3", nameKey: "bot2" },
    { id: "p4", nameKey: "bot3" }
];

// ── Build the difficulty panel ────────────────────────────
// Reveals bot difficulty + player avatar choices — identical
// content/logic to before, just living on Home now.
async function buildDifficultyPanel() {
    const panel = document.getElementById("difficultyPanel");
    if (!panel) return;

    function renderPanel(){
        const playerRow = `
            <div class="bot-row player-row" id="playerColorRow">
                <div class="avatar-trigger-mount" id="avatarTrigger_p1"></div>
                <div class="bot-info">
                    <div class="bot-name">${t("you")}</div>
                </div>
                <div class="color-trigger-mount" id="colorTrigger_p1"></div>
            </div>
        `;

        const botRows = BOT_DEFS.map(bot => `
            <div class="bot-row" id="botRow_${bot.id}">
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

    function wireAvatarTrigger() {
        initAvatarTrigger(document.getElementById("avatarTrigger_p1"));
    }

    renderPanel();
    await wireColorTriggers();
    wireAvatarTrigger();
    window.addEventListener("langchange", async () => {
        renderPanel();
        await loadIcons(panel);
        await wireColorTriggers();
        wireAvatarTrigger();
    });

    const selected = { p2: "easy", p3: "easy", p4: "easy" };

    async function updateBotDisplay(botId, diff) {
        selected[botId] = diff;
        const av  = document.getElementById(`botAvatar_${botId}`);
        const row = document.getElementById(`botRow_${botId}`);
        if (av) {
            av.innerHTML = `<span data-icon="bot-${diff}"></span>`;
            loadIcons(av);
        }
        if (row) row.style.setProperty("--bot-color", BOT_AVATARS[diff].color);
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

// ── Play vs Bot reveal/collapse ───────────────────────────
// A sub-state of Home, not a Game Modes screen — but it still gets
// its own history entry (a #play-vs-bot hash) so Back correctly
// collapses to the rest of Home first, matching every other
// destination's history behavior instead of skipping a step.
function showHome() {
    document.getElementById("homeMainContent")?.classList.remove("hidden");
    document.getElementById("difficultyPanelSection")?.classList.add("hidden");
}

function showDifficultyPanel() {
    document.getElementById("homeMainContent")?.classList.add("hidden");
    document.getElementById("difficultyPanelSection")?.classList.remove("hidden");
}

function revealDifficultyPanel() {
    if (location.hash !== PLAY_VS_BOT_HASH) {
        history.pushState({ playVsBot: true }, "", PLAY_VS_BOT_HASH);
    }
    showDifficultyPanel();
}

window.addEventListener("popstate", () => {
    if (location.hash === PLAY_VS_BOT_HASH) {
        showDifficultyPanel();
    } else {
        showHome();
    }
});

// ── Hand off to Game ──────────────────────────────────────
// The only thing that needs to cross the Home → Game navigation is
// which difficulty each bot was set to. Everything else Game needs
// (player identity, sound/guidance settings, language) it reads
// itself from the same persisted stores used here.
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

// ── Public entry point — wired from js/ui/home-ui.js ─────
export async function initPlayVsBot() {
    await initCardColorPicker();
    await buildDifficultyPanel();

    // Deep link / refresh support: opening index.html#play-vs-bot
    // directly lands straight on the difficulty panel instead of
    // requiring the rest of Home to be shown first.
    if (location.hash === PLAY_VS_BOT_HASH) {
        showDifficultyPanel();
    }

    document.getElementById("homePlayVsBotBtn")?.addEventListener("click", revealDifficultyPanel);

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
}
