import { gameState }         from "./game/gameState.js";
import { Player }             from "./player.js";
import { createDeck, drawCard } from "./game/deck.js";
import { startTurn, playCard }  from "./game/turnManager.js";
import { updateUI, initializeUI } from "./ui/ui.js";
import { initHelp }       from "./game/help.js";
import { initMobileUI, initMobileTabs } from "./ui/mobile-ui.js";
import { PLAYER_TYPES, AI_DIFFICULTY, BOT_AVATARS } from "./constants/playerTypes.js";
import { loadIcons } from "./ui/icon-ui.js"
import { playBackgroundMusic } from "./services/soundManager.js"
import { initializeTutorial, openTutorial } from "./ui/tutorial-ui.js";
import { startWalkthrough, shouldShowWalkthrough } from "./ui/walkthrough.js";
import { loadI18n, t, setLang, buildLangSelector } from "./i18n.js";

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();
buildLangSelector(document.getElementById("langSelector"));

// ── Bot definitions (names use i18n) ──────────────────────
const BOT_DEFS = [
    { id: "p2", nameKey: "bot1" },
    { id: "p3", nameKey: "bot2" },
    { id: "p4", nameKey: "bot3" }
];

const PLAYER_COLORS = { p1: "var(--p1)", p2: "var(--p2)", p3: "var(--p3)", p4: "var(--p4)" };

// ── Build the difficulty panel inside splash ──────────────
async function buildDifficultyPanel() {
    const panel = document.getElementById("difficultyPanel");
    if (!panel) return;

    function renderPanel(){
        panel.innerHTML = BOT_DEFS.map(bot => `
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
            </div>
        `).join("");
    }

    renderPanel();
    window.addEventListener("langchange", async () => {
        renderPanel();
        await loadIcons(panel);
    });

    // store selections
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

// ── Start game ────────────────────────────────────────────
async function startGame() {
    const panel      = document.getElementById("difficultyPanel");
    const selections = panel?._getSelections?.() || { p2: "easy", p3: "easy", p4: "easy" };

    const nameInput  = document.getElementById("playerNameInput");
    const customName = nameInput?.value?.trim();
    // p1: if user typed a name use it (no nameKey), otherwise use "you" key
    const p1Name    = customName || t("you");
    const p1NameKey = customName ? null : "you";

    const players = [
        new Player("p1", p1Name,    PLAYER_TYPES.HUMAN, AI_DIFFICULTY.EASY, p1NameKey),
        new Player("p2", t("bot1"), PLAYER_TYPES.AI,    selections.p2,       "bot1"),
        new Player("p3", t("bot2"), PLAYER_TYPES.AI,    selections.p3,       "bot2"),
        new Player("p4", t("bot3"), PLAYER_TYPES.AI,    selections.p4,       "bot3"),
    ];

    gameState.players = players;

    players.forEach(p => {
        p.deck = createDeck(p);
        for (let i = 0; i < 4; i++) drawCard(p);
    });

    document.getElementById("splashScreen").classList.add("hidden");
    document.getElementById("difficultyModal")?.classList.add("hidden");

    await initializeTutorial();
    await initializeUI();
    initHelp();
    initMobileUI();
    initMobileTabs();
    updateUI(gameState);
    startTurn(gameState);

    // In-game walkthrough (first time only)
    if (shouldShowWalkthrough()) {
        startWalkthrough();
    }
}

// ── Splash settings button ────────────────────────────────
document.getElementById("splashSettingsBtn")?.addEventListener("click", async () => {
    // re-build lang selector in case it wasn't inited yet
    buildLangSelector(document.getElementById("langSelector"));
    const modal = document.getElementById("settingsModal");
    modal?.classList.remove("hidden");
    await loadIcons(modal);
});

// Close settings from splash (reuse closeSettings button)
document.getElementById("closeSettings")?.addEventListener("click", () => {
    document.getElementById("settingsModal")?.classList.add("hidden");
});

// ── Wire up splash → difficulty panel → start ─────────────
document.getElementById("startGameBtn")?.addEventListener("click", () => {
    document.getElementById("splashScreen").classList.add("hidden");
    document.getElementById("difficultyModal")?.classList.remove("hidden");
});

document.getElementById("confirmDiffBtn")?.addEventListener("click", startGame);

buildDifficultyPanel();
playBackgroundMusic();
