import { t, playerDisplayName } from "../i18n.js";
import { playSound } from "../services/soundManager.js";
import { loadIcons } from "./icon-ui.js";
import { autoOpenFeedbackAfterGame } from "./feedback-ui.js";
import { getRankedPlayers } from "../game/scoreManager.js";
import { MATCH_RESULT, getPlayerResult } from "../game/matchOutcome.js";

const RANK_ICON = ["rankGold", "rankSilver", "rankBronze"];

const RESULT_LABEL_KEY = {
    [MATCH_RESULT.WINNER]: "endResultWinner",
    [MATCH_RESULT.DRAW]:   "endResultDraw",
    [MATCH_RESULT.LOSS]:   "endResultLoss",
};

const RESULT_CLASS = {
    [MATCH_RESULT.WINNER]: "result-winner",
    [MATCH_RESULT.DRAW]:   "result-draw",
    [MATCH_RESULT.LOSS]:   "result-loss",
};

const RESULT_ROW_CLASS = {
    [MATCH_RESULT.WINNER]: "winner-row",
    [MATCH_RESULT.DRAW]:   "draw-row",
    [MATCH_RESULT.LOSS]:   "",
};

export function showEndGame(gameState) {
    const screen       = document.getElementById("endGameScreen");
    const title        = document.getElementById("endGameTitle");
    const text         = document.getElementById("endGameText");
    const finalScores  = document.getElementById("finalScores");
    const outcome      = gameState.outcome;

    const human = gameState.players.find(p => p.id === "p1");
    const humanResult = getPlayerResult(human, outcome);

    if (humanResult === MATCH_RESULT.WINNER) {
        title.textContent = t("endWinTitle");
        text.textContent  = t("endWinText");
        playSound("win");
    } else if (humanResult === MATCH_RESULT.DRAW) {
        title.textContent = t("endDrawTitle");
        text.textContent  = t("endDrawText");
        playSound("win");
    } else {
        title.textContent = t("endLoseTitle");
        if (outcome.type === "WIN") {
            const winner = gameState.players.find(p => p.id === outcome.winnerId);
            text.textContent = `${playerDisplayName(winner)} ${t("endLoseText")}`;
        } else {
            text.textContent = t("endLoseToDrawText");
        }
        playSound("lose");
    }

    // Party Card Count is the sole ranking/victory metric — see
    // js/game/matchOutcome.js. No Card Power (or any other) score is
    // computed or displayed here anymore.
    const ranked = getRankedPlayers(gameState);

    finalScores.innerHTML =
        `<div class="final-score-header">
            <span>${t("endRank")}</span><span>${t("endPlayer")}</span>
            <span>${t("endParty")}</span><span>${t("endResult")}</span>
         </div>` +
        ranked.map((player, idx) => {
            const result = getPlayerResult(player, outcome);
            const rankIcon = RANK_ICON[idx];
            const rank = rankIcon
                ? `<span data-icon="${rankIcon}"></span>`
                : `#${idx + 1}`;
            const rowClass = RESULT_ROW_CLASS[result];
            return `
                <div class="final-score-row ${rowClass}"
                     data-player="${player.id}">
                    <span class="rank-badge">${rank}</span>
                    <span class="player-name">${playerDisplayName(player)}</span>
                    <span class="party-count">${player.party.length} <span data-icon="partyEmoji"></span></span>
                    <span class="result-badge ${RESULT_CLASS[result]}">${t(RESULT_LABEL_KEY[result])}</span>
                </div>`;
        }).join("");

    loadIcons(finalScores);
    screen.classList.remove("hidden");

    // Ask for feedback once results are visible — the player sees how
    // the game turned out before the form shows up over it.
    autoOpenFeedbackAfterGame();
}

export function hideEndGame() {
    document.getElementById("endGameScreen").classList.add("hidden");
}
