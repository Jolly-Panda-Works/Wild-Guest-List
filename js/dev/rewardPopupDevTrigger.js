// rewardPopupDevTrigger.js
// ══════════════════════════════════════════════════════════
// Development/Test-only shortcut to preview the REAL end-of-match
// Reward Popup (`#endGameScreen`, rendered by js/ui/endgame-ui.js's
// showEndGame()) without playing a full match to a real finish.
//
// ██  DEV/TEST ONLY  ██  See js/services/devEnv.js.
// Every code path below is gated behind isDevEnvironment(). On a real
// production deployment (any real domain — README.md § Deployment)
// that check always evaluates false, so init() becomes a no-op:
//   - no keyboard listener is ever registered,
//   - no `window.__wglRewardPopupTest` console API is ever exposed,
//   - no DOM element is added, no CSS class toggled, nothing.
// There is nothing left for a production visitor to find or trigger —
// this satisfies the task's "completely inaccessible in Production"
// requirement (this project has no bundler/build step — see
// README.md § Running Locally/Deployment — so there is no way to
// physically strip this file out of a shipped artifact; the runtime
// gate is the mechanism instead).
//
// REAL component, REAL state flow (not a mock UI): this module never
// renders its own popup markup. It only ever calls the actual
// showEndGame(gameState) from js/ui/endgame-ui.js — the exact function
// a genuine match end calls — so every visual state, animation, icon,
// translation, and button (Play Again / Return to Home) behaves
// exactly as it would for a real player.
//
// Never touches real game state: the object passed to showEndGame()
// here is a throwaway, gameState-SHAPED snapshot built fresh each
// call — never the real, live `gameState` singleton from
// js/game/gameState.js. The real match in progress (queue, hands,
// decks, turn, log, gameState.gameOver/outcome) is left completely
// untouched, so leaving the dev popup (Play Again / Return to Home)
// behaves exactly as it always does, and dismissing it via Escape
// (dev-only affordance added below) does not "resume" a broken game —
// there is no real game-over to resume from.
//
// Deliberately calls showEndGame() directly rather than
// js/game/gameOver.js's finishGame() — finishGame() also calls
// js/services/achievements.js's notifyGameFinished(), which persists
// to localStorage (Wild Champion win count, Strategist, etc.). Test
// popups must never move real, persisted achievement/profile progress,
// so this bypasses that entirely and renders the popup on its own.
//
// Removable: deleting this file plus its one import + one init() call
// in js/game-main.js fully removes this feature. Nothing else in the
// codebase depends on it.
// ══════════════════════════════════════════════════════════

import { isDevEnvironment } from "../services/devEnv.js";
import { determineMatchOutcome } from "../game/matchOutcome.js";
import { PLAYER_TYPES } from "../constants/playerTypes.js";

// showEndGame()/hideEndGame() (js/ui/endgame-ui.js) are loaded lazily,
// on first actual use, rather than imported at the top like everything
// else here. endgame-ui.js's transitive import graph (icon-ui.js,
// feedback-ui.js, modal-ui.js, i18n.js, soundManager.js...) includes
// modules that run browser-only side effects (DOM listeners) the
// moment they're imported — fine in a real browser, but it means a
// static import here would drag that entire graph in unconditionally.
// Deferring it keeps this file's own logic (SCENARIOS, buildTestSnapshot,
// the isDevEnvironment gate) plain, DOM-free, and unit-testable on its
// own (see tests/rewardPopupDevTrigger.test.mjs) — it's still the
// exact same real showEndGame()/hideEndGame() functions a genuine
// match end calls, just resolved a moment later.
let _endgameUiPromise = null;
function loadEndgameUi() {
    if (!_endgameUiPromise) _endgameUiPromise = import("../ui/endgame-ui.js");
    return _endgameUiPromise;
}

// Predictable, fixed Party Card Counts per test scenario (task
// requirement: predictable test data for the different Reward Popup
// states) — chosen so every scenario also exercises the rank-medal
// display (gold/silver/bronze/4th). Exported (alongside
// buildTestSnapshot below) purely so tests/rewardPopupDevTrigger.test.mjs
// can exercise this pure, DOM-free logic directly.
export const SCENARIOS = {
    win:        [8, 6, 4, 2], // p1 has the unique highest count -> WINNER
    draw:       [7, 7, 5, 3], // p1 ties for the highest count -> DRAW
    loss:       [3, 9, 6, 4], // p1 clearly trails -> LOSS
    lossToDraw: [2, 8, 8, 5], // p1 loses while p2/p3 draw for the lead
};

const FALLBACK_NAME = { p1: "You", p2: "Bot 1", p3: "Bot 2", p4: "Bot 3" };

function makePlayer(id, nameKey, partyCardCount) {
    return {
        id,
        name: FALLBACK_NAME[id],
        nameKey,
        type: id === "p1" ? PLAYER_TYPES.HUMAN : PLAYER_TYPES.AI,
        // Only .length is ever read by matchOutcome.js/endgame-ui.js —
        // the actual card contents don't matter for this display.
        party: Array.from({ length: partyCardCount }, () => ({})),
    };
}

/** Builds a throwaway, gameState-SHAPED snapshot — never the real,
 *  live gameState — with its outcome derived through the SAME
 *  resolver a real match uses (js/game/matchOutcome.js), so the
 *  popup's WINNER/DRAW/LOSS labels are never hand-authored to match
 *  whatever we want to see; they're computed exactly like a real
 *  result would be. Exported: pure/DOM-free, exercised directly by
 *  tests/rewardPopupDevTrigger.test.mjs. */
export function buildTestSnapshot(scenarioKey) {
    const counts = SCENARIOS[scenarioKey];
    if (!counts) {
        console.warn(`[Reward Popup dev trigger] Unknown scenario "${scenarioKey}". Use one of: ${Object.keys(SCENARIOS).join(", ")}`);
        return null;
    }

    const players = [
        makePlayer("p1", "you",  counts[0]),
        makePlayer("p2", "bot1", counts[1]),
        makePlayer("p3", "bot2", counts[2]),
        makePlayer("p4", "bot3", counts[3]),
    ];

    return {
        players,
        outcome: determineMatchOutcome(players),
    };
}

let _devPopupOpen = false;

async function openTestRewardPopup(scenarioKey) {
    const snapshot = buildTestSnapshot(scenarioKey);
    if (!snapshot) return;

    if (!document.getElementById("endGameScreen")) {
        console.warn("[Reward Popup dev trigger] #endGameScreen isn't on this page (this only exists on game.html).");
        return;
    }

    const { showEndGame } = await loadEndgameUi();

    _devPopupOpen = true;
    showEndGame(snapshot);
    console.info(`[Reward Popup dev trigger] Opened "${scenarioKey}" scenario. Press Escape to dismiss without reloading.`);
}

async function closeTestRewardPopupIfOpen() {
    if (!_devPopupOpen) return;
    _devPopupOpen = false;
    const { hideEndGame } = await loadEndgameUi();
    hideEndGame();
}

const KEY_TO_SCENARIO = {
    r: "win",
    d: "draw",
    l: "loss",
    o: "lossToDraw",
};

function isTypingIntoField(target) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function onKeydown(e) {
    if (e.key === "Escape") {
        if (_devPopupOpen) closeTestRewardPopupIfOpen().catch(console.error);
        return;
    }

    if (!e.ctrlKey || !e.altKey || e.shiftKey || e.metaKey) return;
    if (isTypingIntoField(e.target)) return;

    const scenarioKey = KEY_TO_SCENARIO[e.key.toLowerCase()];
    if (!scenarioKey) return;

    e.preventDefault();
    openTestRewardPopup(scenarioKey).catch(console.error);
}

/**
 * Wires the Development-only Reward Popup test trigger. Safe to call
 * unconditionally from js/game-main.js — it's a real no-op (no
 * listener, no global) outside a Development environment.
 *
 * Trigger, once wired (Development only):
 *   Ctrl+Alt+R  -> WINNER scenario
 *   Ctrl+Alt+D  -> DRAW scenario
 *   Ctrl+Alt+L  -> LOSS scenario
 *   Ctrl+Alt+O  -> LOSS-while-others-draw scenario
 *   Escape      -> dismiss the test popup (only while it's the one
 *                  that opened it) without reloading/navigating
 *
 * Also exposes `window.__wglRewardPopupTest` with the same four
 * scenarios as plain functions, for triggering from the browser
 * console when a keyboard combo isn't convenient (e.g. conflicts with
 * a particular OS/keyboard layout).
 */
export function initRewardPopupDevTrigger() {
    if (!isDevEnvironment()) return;

    document.addEventListener("keydown", onKeydown);

    window.__wglRewardPopupTest = {
        win:        () => openTestRewardPopup("win").catch(console.error),
        draw:       () => openTestRewardPopup("draw").catch(console.error),
        loss:       () => openTestRewardPopup("loss").catch(console.error),
        lossToDraw: () => openTestRewardPopup("lossToDraw").catch(console.error),
        close:      () => closeTestRewardPopupIfOpen().catch(console.error),
    };

    console.info(
        "[Reward Popup dev trigger] Development environment detected. " +
        "Ctrl+Alt+R/D/L/O to preview the Reward Popup (Win/Draw/Loss/Loss-to-draw), " +
        "Escape to dismiss, or use window.__wglRewardPopupTest in the console."
    );
}
