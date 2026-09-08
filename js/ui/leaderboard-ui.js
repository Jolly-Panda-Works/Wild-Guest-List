import { t, playerDisplayName } from "../i18n.js";
import { loadIcons } from "./icon-ui.js";
import { getRankedPlayers, RANK_ICONS } from "../game/scoreManager.js";

export function renderLeaderboard(gameState) {

    const sorted = getRankedPlayers(gameState);

    const rowsHTML = sorted.map((p, i) => {
        const count = p.party.length;
        const rankIcon = RANK_ICONS[i];
        const medal = rankIcon ? `<span data-icon="${rankIcon}"></span>` : `#${i + 1}`;
        return `<div class="leaderboard-row" data-player="${p.id}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${playerDisplayName(p)}</span>
            <span class="lb-cards" title="${t("endParty")}">${count}</span>
        </div>`;
    }).join("");

    const headerHTML = `<div class="leaderboard-header">
        <span></span><span>${t("endPlayer")}</span>
        <span class="lb-cards-header"> ${t("endParty")}</span><span data-icon="partyEmoji"></span>
    </div>`;

    const desktopRows = document.getElementById("leaderboardRows");
    if (desktopRows) desktopRows.innerHTML = headerHTML + rowsHTML;

    const mobileInline = document.getElementById("mobileLeaderboardInline");
    if (mobileInline) mobileInline.innerHTML = headerHTML + rowsHTML;

    if (desktopRows) loadIcons(desktopRows);
    if (mobileInline) loadIcons(mobileInline);
}
