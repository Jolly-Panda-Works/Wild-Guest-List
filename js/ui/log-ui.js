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
    const buildHTML = () => gameState.logs.map(entry => {
        const displayName = entry.playerNameKey ? t(entry.playerNameKey) : (entry.playerName ?? "");
        return `
        <div class="log-entry ${entry.playerId}">
            <span class="player-name">${displayName}</span>
            ${resolveLogText(entry)}
        </div>`;
    }).join("");

    const desktop = document.getElementById("logEntries");
    if (desktop) desktop.innerHTML = buildHTML();

    const mobile = document.getElementById("mobileLogContent");
    if (mobile) {
        mobile.innerHTML = buildHTML();
        mobile.scrollTop = mobile.scrollHeight;
    }
}
