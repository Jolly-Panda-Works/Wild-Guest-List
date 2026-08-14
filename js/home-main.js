// ══════════════════════════════════════════════════════════
// Home page bootstrap — js/home-main.js
//
// Entry point for index.html (Home). This file owns everything
// Home needs: i18n boot, shared "chrome" (settings/help/tutorial/
// about/feedback/profile), the Home screen itself, and the
// pre-game setup flow (bot difficulty + step-guidance prompts).
//
// It deliberately does NOT create a game, a deck, or any player's
// hand — that's game-main.js's job, only once the player actually
// navigates to game.html. See docs/ARCHITECTURE_PLAN.md for the
// Home/Game split this implements.
// ══════════════════════════════════════════════════════════

import { loadI18n, t, buildLangSelector } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { playBackgroundMusic, initSoundToggle } from "./services/soundManager.js";
import { initializeTutorial } from "./ui/tutorial-ui.js";
import { initHelp } from "./game/help.js";
import { initCardColorPicker, initColorTriggers } from "./ui/cardColor-ui.js";
import { initAvatarTrigger } from "./ui/playerAvatar-ui.js";
import {
    setStepGuidanceEnabled, isStepGuidanceEnabled, initStepGuidanceToggle,
    hasExplainedHistory, resetExplainedAbilities,
    isGuidancePromptHidden, setGuidancePromptHidden,
} from "./ui/cardGuidance-ui.js";
import { initializeModals } from "./ui/modal-ui.js";
import { initProfile } from "./ui/profile-ui.js";
import { initHome } from "./ui/home-ui.js";
import { BOT_AVATARS } from "./constants/playerTypes.js";

// Key used to hand the chosen bot difficulties off to game.html.
// Nothing else about a match (player identity, settings) needs to
// cross the navigation — those already live in localStorage via
// js/services/profile.js and the various settings modules, and
// game.html reads them itself.
const PENDING_DIFFICULTIES_KEY = "wgl_pendingDifficulties";

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();
buildLangSelector(document.getElementById("langSelector"));

// Card color picker + step-guidance toggle: wired at boot so both
// work immediately from Home's Settings modal, before any game
// exists — same reasoning as before, just no longer tied to a game
// ever being started on this page.
await initCardColorPicker();
initStepGuidanceToggle();
initSoundToggle();

// ── Shared "chrome" available on Home: Card Guide, Settings,
//    Tutorial, About, Feedback, Profile — none of these touch the
//    game engine, so they're safe (and needed) here. ────────────
await initializeTutorial();
initHelp();
initializeModals();
initProfile();
await initHome();

await loadIcons();

// ── Bot definitions (names use i18n) ──────────────────────
const BOT_DEFS = [
    { id: "p2", nameKey: "bot1" },
    { id: "p3", nameKey: "bot2" },
    { id: "p4", nameKey: "bot3" }
];

// ── Build the difficulty panel inside the difficulty modal ───
// Reveals bot difficulty + player avatar choices, exactly as
// before — just no longer nested inside a splash screen.
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

// ── Hand off to Game ──────────────────────────────────────
// The only thing that needs to cross the Home → Game navigation is
// which difficulty each bot was set to. Everything else Game needs
// (player identity, sound/guidance settings, language) it reads
// itself from the same persisted stores Home just used.
function goToGame(selections) {
    try {
        sessionStorage.setItem(PENDING_DIFFICULTIES_KEY, JSON.stringify(selections));
    } catch {
        // sessionStorage unavailable — game.html falls back to
        // default (easy/easy/easy) difficulties, never a hard failure
    }
    window.location.href = "game.html";
}

document.getElementById("confirmDiffBtn")?.addEventListener("click", () => {
    document.getElementById("difficultyModal")?.classList.add("hidden");

    if (isGuidancePromptHidden()) {
        proceedAfterGuidanceChoice(isStepGuidanceEnabled());
        return;
    }

    document.getElementById("guidancePromptModal")?.classList.remove("hidden");
    document.getElementById("guidancePromptYesBtn")?.focus();
});

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

buildDifficultyPanel();
playBackgroundMusic();
