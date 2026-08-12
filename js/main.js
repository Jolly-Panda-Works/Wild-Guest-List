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
import { maybeShowCardHelpHint } from "./ui/cardHelpHint.js";
import { loadI18n, t, setLang, buildLangSelector } from "./i18n.js";
import {
    setStepGuidanceEnabled, isStepGuidanceEnabled, initStepGuidanceToggle,
    hasExplainedHistory, resetExplainedAbilities,
    isGuidancePromptHidden, setGuidancePromptHidden,
} from "./ui/cardGuidance-ui.js";
import { initCardColorPicker, initColorTriggers } from "./ui/cardColor-ui.js";
import { initAvatarTrigger } from "./ui/playerAvatar-ui.js";

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();
buildLangSelector(document.getElementById("langSelector"));

// Card color picker: wired at boot (like the language selector above)
// rather than only inside initializeUI(), so it already works from the
// splash screen's Settings modal, before a game has even started.
// Awaited because it loads the palette from data/cardColors.json first —
// buildDifficultyPanel() (below) reuses that same loaded palette for the
// color triggers on the Choose Bot Difficulty screen.
await initCardColorPicker();

// Step-by-step Guidance toggle: same reasoning — wired at boot so
// turning it on from the splash screen's Settings modal (before
// Start Game is even clicked) is actually saved, instead of the click
// being silently lost because nothing was listening yet. initializeUI()
// still calls this again once the game starts; see the guard inside
// initStepGuidanceToggle() for why that's safe.
initStepGuidanceToggle();

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
        // Player's own row — same seat/color system as the bots below,
        // just without a difficulty toggle (the human has none).
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

    // Mounts/re-mounts the color trigger buttons — must run after every
    // renderPanel() call, since that call replaces the markup the
    // triggers were mounted into (panel.innerHTML = ...).
    async function wireColorTriggers() {
        await initColorTriggers({
            p1: document.getElementById("colorTrigger_p1"),
            p2: document.getElementById("colorTrigger_p2"),
            p3: document.getElementById("colorTrigger_p3"),
            p4: document.getElementById("colorTrigger_p4"),
        });
    }

    // Avatar trigger for the player's own row — same click-to-open
    // popover pattern as the color triggers above, just for the
    // player's portrait (js/ui/playerAvatar-ui.js).
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

    // Starting player is picked at random each game, rather than always
    // being the human (players[0]/"p1") — any of the 4 seats can open
    // the round. Exception: the player's very first-ever game keeps the
    // human starting, since the one-time in-game walkthrough below has a
    // step that explicitly waits for the human to play a card early on
    // (js/ui/walkthrough.js "wt7" / waitForCardPlay) — if a bot opened
    // that round instead, the walkthrough could stall until the human's
    // turn eventually comes around. Every game after that first one is
    // fully random.
    gameState.currentPlayer = shouldShowWalkthrough()
        ? 0
        : Math.floor(Math.random() * players.length);

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
    await updateUI(gameState);
    startTurn(gameState);

    // In-game walkthrough (first time only)
    if (shouldShowWalkthrough()) {
        // The card-help hint would only compete for the player's
        // attention if shown during the walkthrough (isWalkthroughActive()
        // already guards against that), so it's held off entirely and
        // shown only once the walkthrough fully finishes, right before
        // the player's next real move — never mid-walkthrough.
        startWalkthrough().then(() => {
            maybeShowCardHelpHint(document.getElementById("playerHand"));
        });
    } else {
        // No walkthrough this game — show the discoverability hint right
        // at the start, before the player's first move.
        maybeShowCardHelpHint(document.getElementById("playerHand"));
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

// ── Wire up splash → difficulty panel → guidance prompt → start ──
document.getElementById("startGameBtn")?.addEventListener("click", () => {
    document.getElementById("splashScreen").classList.add("hidden");
    document.getElementById("difficultyModal")?.classList.remove("hidden");
});

document.getElementById("confirmDiffBtn")?.addEventListener("click", () => {
    document.getElementById("difficultyModal")?.classList.add("hidden");

    // If the player previously checked "Don't show this again", skip the
    // prompt entirely and just go with whatever guidance setting is
    // already saved — same as answering it the same way every game.
    if (isGuidancePromptHidden()) {
        proceedAfterGuidanceChoice(isStepGuidanceEnabled());
        return;
    }

    document.getElementById("guidancePromptModal")?.classList.remove("hidden");
    document.getElementById("guidancePromptYesBtn")?.focus();
});

// Asked once per new game, right before it starts. The answer both
// persists to the same setting the Settings modal's toggle reads/writes
// (js/ui/cardGuidance-ui.js) and directly decides whether contextual
// per-card popups show for this playthrough — see shouldShowGuidance().
function answerGuidancePrompt(enabled) {
    const dontShowAgain = document.getElementById("guidancePromptDontShowAgain")?.checked;
    setGuidancePromptHidden(!!dontShowAgain);

    setStepGuidanceEnabled(enabled);
    document.getElementById("guidancePromptModal")?.classList.add("hidden");
    proceedAfterGuidanceChoice(enabled);
}

// Once guidance is turned on (whether just now or already on from a
// previous game) and some abilities have already been explained before,
// ask whether to start the guidance over from the beginning (show every
// card's guidance again) or keep only showing it for cards not seen yet.
// With no history at all, guidance already shows for every card, so
// there's nothing to ask.
function proceedAfterGuidanceChoice(guidanceEnabled) {
    if (guidanceEnabled && hasExplainedHistory()) {
        document.getElementById("guidanceRestartModal")?.classList.remove("hidden");
        document.getElementById("guidanceRestartYesBtn")?.focus();
        return;
    }
    startGame();
}

function answerGuidanceRestart(startOver) {
    if (startOver) resetExplainedAbilities();
    document.getElementById("guidanceRestartModal")?.classList.add("hidden");
    startGame();
}

document.getElementById("guidancePromptYesBtn")?.addEventListener("click", () => answerGuidancePrompt(true));
document.getElementById("guidancePromptNoBtn")?.addEventListener("click", () => answerGuidancePrompt(false));

document.getElementById("guidancePromptModal")?.addEventListener("keydown", e => {
    // Preserve whatever is already set (e.g. turned on from the splash
    // Settings modal moments earlier) instead of unconditionally forcing
    // it off — Escape should mean "close this prompt", not "opt out".
    if (e.key === "Escape") answerGuidancePrompt(isStepGuidanceEnabled());
});

document.getElementById("guidanceRestartYesBtn")?.addEventListener("click", () => answerGuidanceRestart(true));
document.getElementById("guidanceRestartNoBtn")?.addEventListener("click", () => answerGuidanceRestart(false));

document.getElementById("guidanceRestartModal")?.addEventListener("keydown", e => {
    // Escape = keep existing progress, same as "Just new ones".
    if (e.key === "Escape") answerGuidanceRestart(false);
});

buildDifficultyPanel();
playBackgroundMusic();
