import { t, playerDisplayName } from "../i18n.js";
import { loadIcons } from "./icon-ui.js";

const RANK_ICON = ["rankGold", "rankSilver", "rankBronze", "rankFourth"];

export function renderLeaderboard(gameState) {

    const sorted = [...gameState.players].sort((a, b) => {
        const ap = a.party.reduce((s, c) => s + c.power, 0);
        const bp = b.party.reduce((s, c) => s + c.power, 0);
        if (b.party.length !== a.party.length) return b.party.length - a.party.length;
        return bp - ap;
    });

    const rowsHTML = sorted.map((p, i) => {
        const score = p.party.reduce((s, c) => s + c.power, 0);
        const count = p.party.length;
        const rankIcon = RANK_ICON[i];
        const medal = rankIcon ? `<span data-icon="${rankIcon}"></span>` : `#${i + 1}`;
        return `<div class="leaderboard-row" data-player="${p.id}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${playerDisplayName(p)}</span>
            <span class="lb-cards" title="${t("endParty")}">${count} <span data-icon="partyEmoji"></span></span>
            <span class="lb-score" title="${t("endPower")}">${score} <span data-icon="power"></span></span>
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

    if (desktopRows) loadIcons(desktopRows);
    if (mobileInline) loadIcons(mobileInline);
}
