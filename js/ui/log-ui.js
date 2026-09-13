import { t, playerDisplayName } from "../i18n.js";

function resolveLogText(entry) {
    if (!entry.textKey) return entry.text || "";

    const templates = {
        "logTurn":           () => t("logTurn"),
        "logNoCards":        () => t("logNoCards"),
        "logPlayed":         () => `${entry.params?.card} ${t("logPlayed")}`,
        "logEnteredParty":   () => `${entry.params?.card} ${t("logEnteredParty")}`,
        "logSentToTrash":    () => `${entry.params?.card} ${t("logSentToTrash")}`,
        "logWon":            () => t("wonGame"),
        "logDraw":           () => t("drawGame"),
        "logJumped":         () => `${entry.params?.card} ${t("logJumped").replace("{n}", entry.params?.n)}`,
        "logCantJump":       () => `${entry.params?.card} ${t("logCantJump")}`,
        "logStopped":        () => `${entry.params?.card} ${t("logStopped").replace("{other}", entry.params?.other)}`,
        "logPushed":         () => `${entry.params?.card} ${t("logPushed").replace("{n}", entry.params?.n)}`,
        "logAte":            () => `${entry.params?.card} ${t("logAte").replace("{targets}", entry.params?.targets)}`,
        "logSorted":         () => `${entry.params?.card} ${t("logSorted")}`,
        "logJumpedAhead":    () => `${entry.params?.card} ${t("logJumpedAhead").replace("{other}", entry.params?.other)}`,
        "logReversed":       () => `${entry.params?.card} ${t("logReversed")}`,
        "logBlocked":        () => `${entry.params?.card} ${t("logBlocked").replace("{other}", entry.params?.other)}`,
        "logScaredMonkeys":  () => `${entry.params?.card} ${t("logScaredMonkeys").replace("{n}", entry.params?.n)}`,
        "logMovedFront":     () => `${entry.params?.card} ${t("logMovedFront")}`,
        "logMovedEnd":       () => `${entry.params?.card} ${t("logMovedEnd")}`,
        "logScaredAway":     () => `${entry.params?.card} ${t("logScaredAway").replace("{targets}", entry.params?.targets)}`,
        "logRemoved":        () => `${entry.params?.card} ${t("logRemoved").replace("{targets}", entry.params?.targets)}`,
    };

    return templates[entry.textKey]?.() ?? entry.text ?? entry.textKey;
}

export function renderLog(gameState) {
    // Newest entry first: gameState.logs itself is untouched
    // (`.slice()` copies before `.reverse()`) — this is a display-order
    // choice only, not a change to how/where entries get appended.
    // Both the persistent Game Log panel and the popup show entries
    // this way now (see the Layout Corrections work order, § Fix Game
    // Log Height — "new log entries should appear at the TOP"), so
    // there's still exactly one generated markup string shared by
    // both targets, not two different orderings to maintain.
    const buildHTML = () => gameState.logs.slice().reverse().map(entry => {
        const displayName = entry.playerNameKey ? t(entry.playerNameKey) : (entry.playerName ?? "");
        return `
        <div class="log-entry ${entry.playerId}">
            <span class="player-name">${displayName}</span>
            ${resolveLogText(entry)}
        </div>`;
    }).join("");

    // Two presentation surfaces share this one render, same generated
    // markup, no duplicated log logic:
    //  - #mobileLogContent inside #logModal — the popup entry point
    //    (#railLogBtn), used on every layout, and the ONLY Log surface
    //    on touch/mobile.
    //  - #gameLogContent inside #gameLog — the persistent top-left
    //    panel that exists only on Desktop/Tablet (fine-pointer,
    //    ≥601px; see css/style.css). `#gameLog` itself stays
    //    `display: none` off that breakpoint, so this simply writes
    //    into a hidden, harmless element elsewhere.
    // gameState.logs itself, and everything that appends to it, is
    // untouched by either target.
    const html = buildHTML();
    const mobile = document.getElementById("mobileLogContent");
    if (mobile) {
        mobile.innerHTML = html;
        // Newest entry is now the FIRST child, not the last — scrolled
        // to the top (not `scrollHeight`) so it's visible without
        // scrolling, same as the persistent panel below.
        mobile.scrollTop = 0;
    }
    const persistent = document.getElementById("gameLogContent");
    if (persistent) {
        persistent.innerHTML = html;
        persistent.scrollTop = 0;
    }
}
