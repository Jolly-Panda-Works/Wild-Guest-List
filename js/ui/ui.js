import { 
    renderGame,
    renderNonBoard
}
from "./game-ui.js";

import {
    renderLeaderboard
}
from "./leaderboard-ui.js";

import {
    renderLog
}
from "./log-ui.js";

import {
    syncMobilePanels,
    initMobileUI
}
from "./mobile-ui.js";

import {
    loadIcons
}
from "./icon-ui.js"

import { initSoundToggle } from "../services/soundManager.js"

import { initStepGuidanceToggle } from "./cardGuidance-ui.js"

import { initCardColorPicker } from "./cardColor-ui.js"

import {
    initializeModals
}
from "./modal-ui.js"

let _lastGameState = null;

export async function initializeUI(){
    await loadIcons();
    
    initMobileUI();

    initializeModals();
    initSoundToggle();
    initStepGuidanceToggle();
    await initCardColorPicker();

    // Re-render everything when language changes
    window.addEventListener("langchange", () => {
        if (_lastGameState) {
            updateUI(_lastGameState);
        }
    });
}

export async function updateUI(gameState){
    _lastGameState = gameState;

    await renderGame(gameState);

    renderLeaderboard(gameState);

    renderLog(gameState);

    syncMobilePanels();
}

/**
 * Same as updateUI(), but skips the full queue/party/trash rebuild
 * (renderGame). Used between the steps of an animated turn, where the
 * Director is incrementally updating queue/party/trash DOM nodes itself —
 * a full rebuild here would tear those nodes out mid-animation. Hand,
 * other-players, turn label, leaderboard, log and mobile-panel sync are
 * all cheap/idempotent and safe to refresh every step.
 */
export async function updateNonBoardUI(gameState){
    _lastGameState = gameState;

    await renderNonBoard(gameState);

    renderLeaderboard(gameState);

    renderLog(gameState);

    syncMobilePanels();
}
