import {
    sendToTrash
}
from "./helpers/trash.js";

import {
    moveFollowersBehind
}
from "./helpers/followHelpers.js";

import {
    moveCard,
    swapCards
}
from "./helpers/queue.js";

import { chooseKangarooJump } 
from "./helpers/chooser.js";

import { 
    addLog,
    cardLabel
 }
from "../services/logger.js";

import { CARD_IDS }
from "../constants/cardIds.js";

export async function resolveAbility(card, gameState) {

    switch(card.power) {

        case 12: lion(card, gameState); break;
        case 11: hippo(card, gameState); break;
        case 10: crocodile(card, gameState); break;
        case 9:  snake(card, gameState); break;
        case 8:  giraffe(card, gameState); break;
        case 6:  seal(card, gameState); break;
        case 4:  parrot(card, gameState); break;
        case 3:  await kangaroo(card, gameState); break;
        case 2:  monkey(card, gameState); break;
        case 1:  weasel(card, gameState); break;
        default: console.log(card.name, "no ability");
    }

    if(card.power !== 2) {
        gameState.lastAbility = card;
    }
}

async function kangaroo(card, gameState) {
    const queue = gameState.queue;
    const index = queue.indexOf(card);
    if(index === -1) return;

    const maxJump = Math.min(index, 2);
    if(maxJump === 0) {
        addLog(gameState, card.owner, "logCantJump", { card: cardLabel(card) });
        return;
    }

    const jump = await chooseKangarooJump(card.owner, maxJump);
    const targetIndex = index - jump;
    if(targetIndex < 0) return;

    addLog(gameState, card.owner, "logJumped", { card: cardLabel(card), n: jump });
    moveCard(queue, index, targetIndex);
}

function hippo(card, gameState) {
    const queue = gameState.queue;
    let index = queue.indexOf(card);
    let passedCount = 0;

    while(index > 0) {
        const previous = queue[index-1];

        if(previous.id === CARD_IDS.ZEBRA) {
            addLog(gameState, card.owner, "logStopped", { card: cardLabel(card), other: cardLabel(previous) });
            break;
        }

        if(previous.id === CARD_IDS.SLOTH_BEAR) {
            queue[index] = previous;
            queue[index-1] = card;
            index--;
            passedCount++;
            continue;
        }

        if(previous.power < 11) {
            queue[index] = previous;
            queue[index-1] = card;
            index--;
            passedCount++;
        } else {
            break;
        }
    }

    addLog(gameState, card.owner, "logPushed", { card: cardLabel(card), n: passedCount });
    moveFollowersBehind(card, gameState);
}

function crocodile(card, gameState) {
    const queue = gameState.queue;
    let index = queue.indexOf(card);
    const eatenList = [];

    while(index > 0) {
        const previous = queue[index-1];

        if(previous.id === CARD_IDS.ZEBRA) {
            addLog(gameState, card.owner, "logStopped", { card: cardLabel(card), other: cardLabel(previous) });
            break;
        }

        if(previous.power < 10) {
            const eaten = queue[index - 1];
            sendToTrash(eaten, gameState);
            eatenList.push(eaten);
            index--;
        } else {
            break;
        }
    }

    const newIndex = queue.indexOf(card);
    if(newIndex > 0) {
        const before = queue[newIndex-1];
        if(before.power > 10) return;
    }

    const eatenLabels = eatenList.map(cardLabel).join(", ");
    addLog(gameState, card.owner, "logAte", { card: cardLabel(card), targets: eatenLabels });
}

function snake(card, gameState) {
    const queue = gameState.queue;
    queue.sort((a,b) => b.power - a.power);
    addLog(gameState, card.owner, "logSorted", { card: cardLabel(card) });
}

function giraffe(card, gameState) {
    const queue = gameState.queue;
    let index = queue.indexOf(card);
    if(index <= 0) return;

    const previous = queue[index - 1];
    swapCards(queue, index, index - 1);
    addLog(gameState, card.owner, "logJumpedAhead", { card: cardLabel(card), other: cardLabel(previous) });
}

function seal(card, gameState) {
    gameState.queue.reverse();
    addLog(gameState, card.owner, "logReversed", { card: cardLabel(card) });
}

function lion(card, gameState) {
    const queue = gameState.queue;

    const otherLion = queue.find(c => c !== card && c.id === CARD_IDS.LION);
    if(otherLion) {
        sendToTrash(card, gameState);
        addLog(gameState, card.owner, "logBlocked", { card: cardLabel(card), other: cardLabel(otherLion) });
        return;
    }

    const monkeys = queue.filter(c => c.id === CARD_IDS.MONKEY);
    monkeys.forEach(monkey => { sendToTrash(monkey, gameState); });

    if(monkeys.length > 0) {
        addLog(gameState, card.owner, "logScaredMonkeys", { card: cardLabel(card), n: monkeys.length });
    }

    queue.splice(queue.indexOf(card), 1);
    queue.unshift(card);
    addLog(gameState, card.owner, "logMovedFront", { card: cardLabel(card) });
    moveFollowersBehind(card, gameState);
}

function monkey(card, gameState) {
    const queue = gameState.queue;
    const index = queue.indexOf(card);
    if(index !== -1) {
        queue.splice(index, 1);
        queue.push(card);
    }

    const monkeys = queue.filter(c => c.id === 2);

    if(monkeys.length < 2) {
        addLog(gameState, card.owner, "logMovedEnd", { card: cardLabel(card) });
        return;
    }

    const removed = [];
    for(let i = queue.length - 1; i >= 0; i--) {
        if(queue[i].id === CARD_IDS.CROCODILE || queue[i].id === CARD_IDS.HIPPO) {
            removed.push(queue[i]);
            sendToTrash(queue[i], gameState);
        }
    }

    if(removed.length > 0) {
        addLog(gameState, card.owner, "logScaredAway", { card: cardLabel(card), targets: removed.map(cardLabel).join(", ") });
    }
}

function weasel(card, gameState) {
    const queue = gameState.queue;
    const targets = queue.filter(c => c !== card).sort((a,b) => b.power - a.power).slice(0, 2);
    targets.forEach(target => { sendToTrash(target, gameState); });
    addLog(gameState, card.owner, "logRemoved", { card: cardLabel(card), targets: targets.map(cardLabel).join(" and ") });
}

function parrot(card, gameState) {
    const targets = gameState.queue.filter(c => c !== card).sort((a,b) => b.power - a.power).slice(0, 2);
    targets.forEach(target => { sendToTrash(target, gameState); });
    addLog(gameState, card.owner, "logRemoved", { card: cardLabel(card), targets: targets.map(cardLabel).join(" and ") });
}
