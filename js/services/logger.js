import { t, getLang } from "../i18n.js";

export function addLog(gameState, player, textKey, params = {}) {

    const text = resolveLogText(textKey, params);

    const log = {
        playerId:    player?.id,
        playerName:  player?.name,
        playerNameKey: player?.nameKey ?? null,
        textKey,
        params,
        text,
    };

    console.log(player?.name, text);

    gameState.logs.unshift(log);

    if (gameState.logs.length > 50) {
        gameState.logs.pop();
    }
}

function resolveLogText(textKey, params = {}) {
    // built-in log keys
    const templates = {
        "logTurn":           () => t("logTurn"),
        "logNoCards":        () => t("logNoCards"),
        "logPlayed":         () => `${params.card} ${t("logPlayed")}`,
        "logEnteredParty":   () => `${params.card} ${t("logEnteredParty")}`,
        "logSentToTrash":    () => `${params.card} ${t("logSentToTrash")}`,
        "logWon":            () => t("wonGame"),
        "logJumped":         () => `${params.card} ${t("logJumped").replace("{n}", params.n)}`,
        "logCantJump":       () => `${params.card} ${t("logCantJump")}`,
        "logStopped":        () => `${params.card} ${t("logStopped").replace("{other}", params.other)}`,
        "logPushed":         () => `${params.card} ${t("logPushed").replace("{n}", params.n)}`,
        "logAte":            () => `${params.card} ${t("logAte").replace("{targets}", params.targets)}`,
        "logSorted":         () => `${params.card} ${t("logSorted")}`,
        "logJumpedAhead":    () => `${params.card} ${t("logJumpedAhead").replace("{other}", params.other)}`,
        "logReversed":       () => `${params.card} ${t("logReversed")}`,
        "logBlocked":        () => `${params.card} ${t("logBlocked").replace("{other}", params.other)}`,
        "logScaredMonkeys":  () => `${params.card} ${t("logScaredMonkeys").replace("{n}", params.n)}`,
        "logMovedFront":     () => `${params.card} ${t("logMovedFront")}`,
        "logMovedEnd":       () => `${params.card} ${t("logMovedEnd")}`,
        "logScaredAway":     () => `${params.card} ${t("logScaredAway").replace("{targets}", params.targets)}`,
        "logRemoved":        () => `${params.card} ${t("logRemoved").replace("{targets}", params.targets)}`,
    };

    if (templates[textKey]) return templates[textKey]();
    // fallback for legacy string calls
    return textKey;
}

export function cardLabel(card, lang) {
    const usedLang = lang || getLang();
    const translatedName = card.translations?.[usedLang]?.name || card.name;
    return `${card.animal} ${translatedName}`;
}
