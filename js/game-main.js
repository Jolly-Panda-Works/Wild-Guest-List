// ══════════════════════════════════════════════════════════
// Game page bootstrap — js/game-main.js
//
// Entry point for game.html. Every piece of game initialization
// (players, decks, dealing cards, board render, turn start) lives
// here and ONLY here — none of it runs on Home (index.html). See
// docs/ARCHITECTURE_PLAN.md for the Home/Game split this implements.
//
// The only thing carried over from Home is the chosen bot
// difficulties (sessionStorage handoff — see js/home-main.js).
// Player identity comes from js/services/profile.js, the same
// authoritative profile Home reads/edits; settings (sound, step
// guidance, language) come from their own persisted stores. If this
// page is opened directly (no Home handoff at all), sensible
// defaults are used instead of forcing any setup screen.
// ══════════════════════════════════════════════════════════

import { gameState }            from "./game/gameState.js";
import { Player }               from "./player.js";
import { createDeck, drawCard } from "./game/deck.js";
import { startTurn }            from "./game/turnManager.js";
import { updateUI, initializeUI } from "./ui/ui.js";
import { initHelp }             from "./game/help.js";
import { initMobileUI, initMobileTabs } from "./ui/mobile-ui.js";
import { PLAYER_TYPES, AI_DIFFICULTY } from "./constants/playerTypes.js";
import { loadI18n, t, buildLangSelector } from "./i18n.js";
import { playBackgroundMusic } from "./services/soundManager.js";
import { initializeTutorial } from "./ui/tutorial-ui.js";
import { startWalkthrough, shouldShowWalkthrough } from "./ui/walkthrough.js";
import { maybeShowCardHelpHint } from "./ui/cardHelpHint.js";
import { initCardColorPicker } from "./ui/cardColor-ui.js";
import { initStepGuidanceToggle } from "./ui/cardGuidance-ui.js";
import { getProfile } from "./services/profile.js";
import { notifyGameStarted } from "./services/achievements.js";
import { initAchievementNotifications } from "./ui/achievementNotification-ui.js";

const PENDING_DIFFICULTIES_KEY = "wgl_pendingDifficulties";
const DEFAULT_DIFFICULTIES = { p2: "easy", p3: "easy", p4: "easy" };

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();
buildLangSelector(document.getElementById("langSelector"));

await initCardColorPicker();
initStepGuidanceToggle();

// Card Guide / Tutorial are reachable from the in-game top bar too.
await initializeTutorial();
initHelp();

/** Reads the bot-difficulty selections handed off by Home. Falls back
 *  to all-Easy if Game was opened without going through Home at all —
 *  never blocks entering a game. */
function readPendingDifficulties() {
    try {
        const raw = sessionStorage.getItem(PENDING_DIFFICULTIES_KEY);
        if (!raw) return { ...DEFAULT_DIFFICULTIES };
        const parsed = JSON.parse(raw);
        const isValid = v => Object.values(AI_DIFFICULTY).includes(v);
        return {
            p2: isValid(parsed?.p2) ? parsed.p2 : "easy",
            p3: isValid(parsed?.p3) ? parsed.p3 : "easy",
            p4: isValid(parsed?.p4) ? parsed.p4 : "easy",
        };
    } catch {
        return { ...DEFAULT_DIFFICULTIES };
    }
}

// ── Game initialization — everything below only runs because this
//    IS the Game page. Nothing here executes on Home. ────────────
async function startGame() {
    const selections = readPendingDifficulties();

    // p1 identity comes from the one authoritative player profile —
    // no name-entry screen, no separate Game-local copy of it.
    const profile = getProfile();
    const p1Name    = profile.displayName || t("you");
    const p1NameKey = profile.displayName ? null : "you";

    const players = [
        new Player("p1", p1Name,    PLAYER_TYPES.HUMAN, AI_DIFFICULTY.EASY, p1NameKey),
        new Player("p2", t("bot1"), PLAYER_TYPES.AI,    selections.p2,       "bot1"),
        new Player("p3", t("bot2"), PLAYER_TYPES.AI,    selections.p3,       "bot2"),
        new Player("p4", t("bot3"), PLAYER_TYPES.AI,    selections.p4,       "bot3"),
    ];

    gameState.players = players;

    // Reset per-game achievement session tracking (e.g. Strategist's
    // unique-abilities-this-game count) — must happen before the first
    // card is ever played this game.
    notifyGameStarted();

    // Starting player is picked at random each game, rather than always
    // being the human — except a brand-new player's very first game,
    // which keeps the human starting so the one-time walkthrough (which
    // waits for the human to play a card early on) can't stall waiting
    // for a bot-opened round to come back around.
    gameState.currentPlayer = shouldShowWalkthrough()
        ? 0
        : Math.floor(Math.random() * players.length);

    players.forEach(p => {
        p.deck = createDeck(p);
        for (let i = 0; i < 4; i++) drawCard(p);
    });

    await initializeUI();
    initHelp();
    initMobileUI();
    initMobileTabs();
    await updateUI(gameState);
    startTurn(gameState);

    // In-game walkthrough (first time only)
    if (shouldShowWalkthrough()) {
        // Held off during the walkthrough itself (isWalkthroughActive()
        // guards against that) and shown only once it fully finishes,
        // right before the player's next real move.
        startWalkthrough().then(() => {
            maybeShowCardHelpHint(document.getElementById("playerHand"));
        });
    } else {
        maybeShowCardHelpHint(document.getElementById("playerHand"));
    }
}

// ── Play Again (end-game screen) ──────────────────────────
// Returns to Home rather than restarting in place — Home is where a
// new match's bot-difficulty/profile choices are made, so it's the
// natural place to land after a match ends.
document.getElementById("playAgainBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
});

initAchievementNotifications();

await startGame();
playBackgroundMusic();
