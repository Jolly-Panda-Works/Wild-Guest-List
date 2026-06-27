import { AI_DIFFICULTY } from "../constants/playerTypes.js";
import { CARD_IDS } from "../constants/cardIds.js";

// Cards that actively harm strong opponents
const AGGRESSIVE_CARDS = [
    CARD_IDS.LION, CARD_IDS.CROCODILE, CARD_IDS.PARROT, CARD_IDS.WEASEL
];

// Cards that help control the queue position
const POSITIONAL_CARDS = [
    CARD_IDS.SNAKE, CARD_IDS.SEAL, CARD_IDS.GIRAFFE, CARD_IDS.HIPPO, CARD_IDS.KANGAROO
];

function scoreCard(card, gameState) {
    let score = card.power;

    const queueLen = gameState.queue.length;
    const isNearFull = queueLen >= 3;

    // High-power cards are even better when queue is nearly full
    if (card.power >= 9 && isNearFull) score += 4;

    // Parrot / Weasel remove top cards — great when top cards are enemies
    if (card.id === CARD_IDS.PARROT || card.id === CARD_IDS.WEASEL) {
        const topCard = gameState.queue[0];
        if (topCard && topCard.owner.id !== "p1") score += 6;
    }

    // Snake sorts queue — good when AI has many high-power cards in queue
    if (card.id === CARD_IDS.SNAKE) {
        const aiInQueue = gameState.queue.filter(c => c.owner.id !== "p1").length;
        score += aiInQueue * 2;
    }

    // Seal reverses — good when AI is at back
    if (card.id === CARD_IDS.SEAL) {
        const aiAtBack = gameState.queue.slice(-2).filter(c => c.owner.id !== "p1").length;
        score += aiAtBack * 3;
    }

    return score;
}

function bestCardIndex(player, gameState) {
    let bestIdx  = 0;
    let bestScore = -Infinity;

    player.hand.forEach((card, i) => {
        const s = scoreCard(card, gameState);
        if (s > bestScore) { bestScore = s; bestIdx = i; }
    });

    return bestIdx;
}

export function getRandomCardIndex(player, gameState) {
    if (!player.hand.length) return 0;

    const diff = player.difficulty || AI_DIFFICULTY.EASY;

    if (diff === AI_DIFFICULTY.EASY) {
        // Fully random
        return Math.floor(Math.random() * player.hand.length);
    }

    if (diff === AI_DIFFICULTY.MEDIUM) {
        // 50% chance to pick best card, 50% random
        if (Math.random() < 0.5) return bestCardIndex(player, gameState);
        return Math.floor(Math.random() * player.hand.length);
    }

    if (diff === AI_DIFFICULTY.HARD) {
        // 85% best card, 15% random (simulates occasional mistakes)
        if (Math.random() < 0.85) return bestCardIndex(player, gameState);
        return Math.floor(Math.random() * player.hand.length);
    }

    return Math.floor(Math.random() * player.hand.length);
}
