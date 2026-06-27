import { t, playerDisplayName } from "../i18n.js";
import { playSound } from "../services/soundManager.js";

export function showEndGame(gameState) {
    const screen     = document.getElementById("endGameScreen");
    const title      = document.getElementById("endGameTitle");
    const text       = document.getElementById("endGameText");
    const finalScores = document.getElementById("finalScores");
    const winner = gameState.winner;

    if (winner.id === "p1") {
        title.textContent = t("endWinTitle");
        text.textContent  = t("endWinText");
        playSound("win");
    } else {
        title.textContent = t("endLoseTitle");
        text.textContent  = `${playerDisplayName(winner)} ${t("endLoseText")}`;
        playSound("lose");
    }

    const sorted = [...gameState.players].sort((a, b) => {
        const ap = a.party.reduce((s, c) => s + c.power, 0);
        const bp = b.party.reduce((s, c) => s + c.power, 0);
        if (b.party.length !== a.party.length) return b.party.length - a.party.length;
        return bp - ap;
    });

    finalScores.innerHTML =
        `<div class="final-score-header">
            <span>${t("endRank")}</span><span>${t("endPlayer")}</span>
            <span>${t("endParty")}</span><span>${t("endPower")}</span>
         </div>` +
        sorted.map((player, idx) => {
            const power = player.party.reduce((s, c) => s + c.power, 0);
            const isWinner = player.id === winner.id;
            return `
                <div class="final-score-row ${isWinner ? "winner-row" : ""}"
                     data-player="${player.id}">
                    <span class="rank-badge">${idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx+1}`}</span>
                    <span class="player-name">${playerDisplayName(player)}</span>
                    <span class="party-count">${player.party.length} 🎉</span>
                    <span class="power-score">${power} ⚡</span>
                </div>`;
        }).join("");

    screen.classList.remove("hidden");
}

export function hideEndGame() {
    document.getElementById("endGameScreen").classList.add("hidden");
}
