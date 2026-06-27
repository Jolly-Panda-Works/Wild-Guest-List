import { t, playerDisplayName } from "../i18n.js";

export function renderLeaderboard(gameState) {

    const sorted = [...gameState.players].sort((a, b) => {
        const ap = a.party.reduce((s, c) => s + c.power, 0);
        const bp = b.party.reduce((s, c) => s + c.power, 0);
        if (bp !== ap) return bp - ap;
        return b.party.length - a.party.length;
    });

    const rowsHTML = sorted.map((p, i) => {
        const score = p.party.reduce((s, c) => s + c.power, 0);
        const count = p.party.length;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
        return `<div class="leaderboard-row" data-player="${p.id}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${playerDisplayName(p)}</span>
            <span class="lb-cards" title="${t("endParty")}">${count} 🎉</span>
            <span class="lb-score" title="${t("endPower")}">${score} ⚡</span>
        </div>`;
    }).join("");

    const headerHTML = `<div class="leaderboard-header">
        <span></span><span>${t("endPlayer")}</span>
        <span>${t("endParty")}</span><span>${t("endPower")}</span>
    </div>`;

    const desktopRows = document.getElementById("leaderboardRows");
    if (desktopRows) desktopRows.innerHTML = headerHTML + rowsHTML;

    const mobileInline = document.getElementById("mobileLeaderboardInline");
    if (mobileInline) mobileInline.innerHTML = headerHTML + rowsHTML;
}
