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
import { initPanelCollapse } from "./ui/panelCollapse-ui.js";
import { PLAYER_TYPES, AI_DIFFICULTY } from "./constants/playerTypes.js";
import { loadI18n, t, buildLangSelector } from "./i18n.js";
import { playBackgroundMusic } from "./services/soundManager.js";
import { initializeTutorial } from "./ui/tutorial-ui.js";
import { startWalkthrough, shouldShowWalkthrough } from "./ui/walkthrough.js";
import { initCardColorPicker } from "./ui/cardColor-ui.js";
import { getProfile } from "./services/profile.js";
import { notifyGameStarted } from "./services/achievements.js";
import { initAchievementNotifications } from "./ui/achievementNotification-ui.js";
import { initOrientationGate, onOrientationBlocked, onOrientationUnblocked } from "./ui/orientation-ui.js";
import { pauseTurnTimer, resumeTurnTimer, isPaused } from "./game/turnTimer.js";
import { initRewardPopupDevTrigger } from "./dev/rewardPopupDevTrigger.js";

// Wired synchronously, first thing, before any of this page's own
// top-level awaits below — the gate must be able to block gameplay
// immediately on load, not only once boot finishes.
initOrientationGate();

// Reuses the existing pause/resume architecture (js/game/turnTimer.js,
// also used by the Pause panel — see js/ui/pause-ui.js) rather than a
// second, orientation-specific pause mechanism. Only auto-resumes if
// THIS gate is what paused the game — if the player had already paused
// manually (Pause button) before rotating to landscape, rotating back
// to portrait must not silently resume a game they paused on purpose.
let pausedByOrientation = false;

onOrientationBlocked(() => {
    if (!isPaused()) {
        pausedByOrientation = true;
        pauseTurnTimer();
    }
});

onOrientationUnblocked(() => {
    if (pausedByOrientation) {
        pausedByOrientation = false;
        resumeTurnTimer();
    }
});

const PENDING_DIFFICULTIES_KEY = "wgl_pendingDifficulties";
const DEFAULT_DIFFICULTIES = { p2: "easy", p3: "easy", p4: "easy" };

// Max possible bot seats, in seat order — Home's Play vs Bot panel
// (js/ui/home-ui.js) lets the player pick 1, 2, or 3 of these; how
// many keys actually show up in the handoff is what decides how many
// bot seats get dealt in below.
const BOT_SEAT_IDS = ["p2", "p3", "p4"];
const BOT_NAME_KEYS = { p2: "bot1", p3: "bot2", p4: "bot3" };

// ── i18n boot — runs before anything else ─────────────────
await loadI18n();
buildLangSelector(document.getElementById("langSelector"));

await initCardColorPicker();

// Card Guide / Tutorial are reachable from the in-game top bar too.
await initializeTutorial();
initHelp();

/** Reads the bot-difficulty selections handed off by Home
 *  (js/bot-difficulty-main.js). Only keeps seats that are actually
 *  present and valid — this is what makes the selected bot count
 *  (1/2/3) take effect here: a 1-Bot handoff has just { p2 }, a
 *  2-Bot handoff has { p2, p3 }, and so on. Falls back to the full
 *  3-bot default if the handoff is missing, empty, or corrupted (Game
 *  opened without going through Home at all, older tab, etc.) — never
 *  blocks entering a game, and never leaves a 0-bot table. */
function readPendingDifficulties() {
    try {
        const raw = sessionStorage.getItem(PENDING_DIFFICULTIES_KEY);
        if (!raw) return { ...DEFAULT_DIFFICULTIES };
        const parsed = JSON.parse(raw);
        const isValid = v => Object.values(AI_DIFFICULTY).includes(v);
        const result = {};
        BOT_SEAT_IDS.forEach(id => {
            if (isValid(parsed?.[id])) result[id] = parsed[id];
        });
        return Object.keys(result).length > 0 ? result : { ...DEFAULT_DIFFICULTIES };
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

    // Only the bot seats present in `selections` are dealt in — 1, 2,
    // or 3 bots, per the player's choice on Home (see
    // readPendingDifficulties() above). Order follows BOT_SEAT_IDS
    // (p2, p3, p4) so seating is always consistent regardless of key
    // insertion order in the handoff object.
    const botPlayers = BOT_SEAT_IDS
        .filter(id => id in selections)
        .map(id => new Player(id, t(BOT_NAME_KEYS[id]), PLAYER_TYPES.AI, selections[id], BOT_NAME_KEYS[id]));

    const players = [
        new Player("p1", p1Name, PLAYER_TYPES.HUMAN, AI_DIFFICULTY.EASY, p1NameKey),
        ...botPlayers,
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
    // initMobileTabs() now wires the Queue's door/trash icons
    // (#queueWithIcons, built by the first renderQueue() inside
    // updateUI()) instead of standalone Party/Trash buttons, so it
    // must run after that first render — moved below updateUI().
    await updateUI(gameState);
    initMobileTabs();
    initPanelCollapse();
    startTurn(gameState);

    // In-game walkthrough (first time only)
    if (shouldShowWalkthrough()) {
        startWalkthrough();
    }
}

// ── End-game screen actions ────────────────────────────────
// Mirrors the exact pattern already established by the Pause panel's
// Restart/Home buttons (js/ui/pause-ui.js) — same two behaviors,
// same reasoning — rather than inventing a second mechanism.

// Play Again → reload game.html. The simplest reliable way to get a
// fully clean game state back (queue/party/trash/turn/ability/winner/
// result/achievement-session state — everything module-level in
// js/game/gameState.js and js/services/achievements.js — is rebuilt
// from scratch by the normal boot path), while automatically reusing
// this match's bot difficulties, since they're already sitting in
// sessionStorage (PENDING_DIFFICULTIES_KEY) and a reload doesn't clear
// it. This is also why it never needs to duplicate startGame()/the
// bot-difficulty screen: the existing Game Start system just runs
// again, unmodified. Persistent data (profile, achievements,
// settings — all in localStorage) is untouched by a reload.
document.getElementById("playAgainBtn")?.addEventListener("click", () => {
    location.reload();
});

// Return to Home → a real page navigation. Every gameplay
// listener/timer/animation from this match is torn down for free
// (leaving the document unloads the module state) rather than
// needing manual cleanup here. The match was already finalized by
// finishGame() before this screen could ever be shown (see
// js/game/gameOver.js — it's what calls showEndGame()), so there's
// nothing left to finalize on the way out.
document.getElementById("returnHomeBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
});

initAchievementNotifications();

// Development/Test Mode only — see js/dev/rewardPopupDevTrigger.js.
// A genuine no-op in Production (no listener, no global exposed).
initRewardPopupDevTrigger();

await startGame();
playBackgroundMusic();
