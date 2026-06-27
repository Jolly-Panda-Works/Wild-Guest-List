import { 
    renderGame 
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
