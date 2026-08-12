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

import { emit, wasAnimated, EVENTS }
from "../presentation/events.js";

export async function resolveAbility(card, gameState) {

    const queue = gameState.queue;
    // Snapshot of card identity -> position before the ability runs, so we
    // can tell afterwards which cards moved as a side-effect of this
    // ability but never got an explicit CARD_JUMPED/CARD_ESCAPED/removal
    // event of their own (e.g. Snake's full sort, Seal's full reverse,
    // Lion's move-to-front, the queue closing around Crocodile after it
    // eats). Those cards still need to visibly slide to their new spot
    // instead of teleporting there on the next render.
    //
    // The same snapshot (by reference, not just uid) is also handed back
    // to the caller — turnManager uses it to build the contextual
    // "before queue / after queue" guidance popup without having to
    // re-derive it from the animation events.
    const beforeQueue = [...queue];
    const before = beforeQueue.map(c => c.uid);

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

    // Settle pass: animate any remaining-in-queue card whose index changed
    // but that no explicit event above already covers.
    queue.forEach((c, toIndex) => {
        if (wasAnimated(c.uid)) return;
        const fromIndex = before.indexOf(c.uid);
        if (fromIndex === -1 || fromIndex === toIndex) return;
        emit({ type: EVENTS.CARD_MOVED, card: c, fromIndex, toIndex, reason: "settle" });
    });

    return { beforeQueue, afterQueue: [...queue] };
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

    // Crouch before the leap, then the cards it hops over visibly
    // acknowledge it passing overhead — so a 2-card jump doesn't look
    // like a plain slide with extra height.
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });
    const passedOver = queue.slice(targetIndex, index);

    addLog(gameState, card.owner, "logJumped", { card: cardLabel(card), n: jump });
    moveCard(queue, index, targetIndex);

    passedOver.forEach(c => {
        emit({ type: EVENTS.CARD_REACTED, card: c, flavor: "hopped-over" });
    });
}

function hippo(card, gameState) {
    const queue = gameState.queue;
    const startIndex = queue.indexOf(card);
    let index = startIndex;
    let passedCount = 0;

    // A brace/lean-in before it starts shoving through the line.
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });

    while(index > 0) {
        const previous = queue[index-1];

        if(previous.id === CARD_IDS.ZEBRA) {
            addLog(gameState, card.owner, "logStopped", { card: cardLabel(card), other: cardLabel(previous) });
            emit({ type: EVENTS.CARD_REACTED, card: previous, flavor: "block" });
            break;
        }

        if(previous.id === CARD_IDS.SLOTH_BEAR) {
            queue[index] = previous;
            queue[index-1] = card;
            // Sloth Bear is "sticky" — it resists a beat before being
            // dragged along, unlike a card that simply gives ground.
            emit({ type: EVENTS.CARD_ESCAPED, card: previous, fromIndex: index-1, toIndex: index, reason: "sticky" });
            index--;
            passedCount++;
            continue;
        }

        if(previous.power < 11) {
            queue[index] = previous;
            queue[index-1] = card;
            emit({ type: EVENTS.CARD_ESCAPED, card: previous, fromIndex: index-1, toIndex: index, reason: "pushed" });
            index--;
            passedCount++;
        } else {
            emit({ type: EVENTS.CARD_REACTED, card: previous, flavor: "block" });
            break;
        }
    }

    addLog(gameState, card.owner, "logPushed", { card: cardLabel(card), n: passedCount });

    // Hippo's own advance — a heavier, slower shove rather than a plain
    // slide, so it reads as "pushing through" rather than "stepping over".
    if(index !== startIndex) {
        emit({ type: EVENTS.CARD_MOVED, card, fromIndex: startIndex, toIndex: index, reason: "push" });
    }

    moveFollowersBehind(card, gameState);
}

function crocodile(card, gameState) {
    const queue = gameState.queue;
    let index = queue.indexOf(card);
    const eatenList = [];

    // A menacing pause — "sizing up" the queue — before the first bite.
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });

    while(index > 0) {
        const previous = queue[index-1];

        if(previous.id === CARD_IDS.ZEBRA) {
            addLog(gameState, card.owner, "logStopped", { card: cardLabel(card), other: cardLabel(previous) });
            emit({ type: EVENTS.CARD_REACTED, card: previous, flavor: "block" });
            break;
        }

        if(previous.power < 10) {
            const eaten = queue[index - 1];
            sendToTrash(eaten, gameState, "eaten");
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

    // A satisfied little recoil once it's done eating — purely an in-place
    // flourish, no reposition (the queue-closing slide is handled by the
    // generic settle pass in resolveAbility()).
    if(eatenList.length > 0) {
        emit({ type: EVENTS.CARD_REACTED, card, flavor: "recoil" });
    }

    const eatenLabels = eatenList.map(cardLabel).join(", ");
    addLog(gameState, card.owner, "logAte", { card: cardLabel(card), targets: eatenLabels });
}

function snake(card, gameState) {
    const queue = gameState.queue;
    const before = [...queue];
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });
    queue.sort((a,b) => b.power - a.power);

    // Snake's whole point is a chaotic scramble — played as one batch so
    // every card visibly crosses paths at once instead of politely taking
    // turns (see QUEUE_REORDERED in the Director/presenter).
    const moves = queue
        .map((c, toIndex) => ({ card: c, fromIndex: before.indexOf(c), toIndex }))
        .filter(m => m.fromIndex !== m.toIndex);
    if(moves.length > 0) {
        emit({ type: EVENTS.QUEUE_REORDERED, moves, reason: "sort" });
    }

    addLog(gameState, card.owner, "logSorted", { card: cardLabel(card) });
}

function giraffe(card, gameState) {
    const queue = gameState.queue;
    let index = queue.indexOf(card);
    if(index <= 0) return;

    const previous = queue[index - 1];
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });
    swapCards(queue, index, index - 1);

    // A quick single-position hop, not a flat slide.
    emit({ type: EVENTS.CARD_MOVED, card, fromIndex: index, toIndex: index - 1, reason: "hop" });
    emit({ type: EVENTS.CARD_MOVED, card: previous, fromIndex: index - 1, toIndex: index, reason: "hop" });

    addLog(gameState, card.owner, "logJumpedAhead", { card: cardLabel(card), other: cardLabel(previous) });
}

function seal(card, gameState) {
    const queue = gameState.queue;
    const before = [...queue];
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });
    queue.reverse();

    const moves = queue
        .map((c, toIndex) => ({ card: c, fromIndex: before.indexOf(c), toIndex }))
        .filter(m => m.fromIndex !== m.toIndex);
    if(moves.length > 0) {
        emit({ type: EVENTS.QUEUE_REORDERED, moves, reason: "reverse" });
    }

    addLog(gameState, card.owner, "logReversed", { card: cardLabel(card) });
}

function lion(card, gameState) {
    const queue = gameState.queue;

    const otherLion = queue.find(c => c !== card && c.id === CARD_IDS.LION);
    if(otherLion) {
        emit({ type: EVENTS.CARD_REACTED, card: otherLion, flavor: "block" });
        sendToTrash(card, gameState, "blocked");
        addLog(gameState, card.owner, "logBlocked", { card: cardLabel(card), other: cardLabel(otherLion) });
        return;
    }

    const monkeys = queue.filter(c => c.id === CARD_IDS.MONKEY);

    // A crouch/flex before the charge — plays whether or not any Monkeys
    // are in the way, since the rush itself always happens once we get
    // this far (the only thing that stops Lion is another Lion, handled
    // above).
    emit({ type: EVENTS.CARD_REACTED, card, flavor: "anticipate" });

    monkeys.forEach(monkey => { sendToTrash(monkey, gameState, "scared"); });

    if(monkeys.length > 0) {
        addLog(gameState, card.owner, "logScaredMonkeys", { card: cardLabel(card), n: monkeys.length });
    }

    const fromIndex = queue.indexOf(card);
    queue.splice(fromIndex, 1);
    queue.unshift(card);

    // An aggressive rush to the front — a distinctly faster, sharper
    // motion than a plain reposition.
    if(fromIndex !== 0) {
        emit({ type: EVENTS.CARD_MOVED, card, fromIndex, toIndex: 0, reason: "rush" });
    }

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

    // The troop bands together for a beat before scaring anything off.
    monkeys.forEach(m => { emit({ type: EVENTS.CARD_REACTED, card: m, flavor: "group" }); });

    const removed = [];
    for(let i = queue.length - 1; i >= 0; i--) {
        if(queue[i].id === CARD_IDS.CROCODILE || queue[i].id === CARD_IDS.HIPPO) {
            removed.push(queue[i]);
            sendToTrash(queue[i], gameState, "scared");
        }
    }

    if(removed.length > 0) {
        addLog(gameState, card.owner, "logScaredAway", { card: cardLabel(card), targets: removed.map(cardLabel).join(", ") });
    }
}

function weasel(card, gameState) {
    const queue = gameState.queue;
    const targets = queue.filter(c => c !== card).sort((a,b) => b.power - a.power).slice(0, 2);
    targets.forEach(target => { sendToTrash(target, gameState, "weaker"); });
    addLog(gameState, card.owner, "logRemoved", { card: cardLabel(card), targets: targets.map(cardLabel).join(" and ") });
}

function parrot(card, gameState) {
    const targets = gameState.queue.filter(c => c !== card).sort((a,b) => b.power - a.power).slice(0, 2);
    targets.forEach(target => { sendToTrash(target, gameState, "weaker"); });
    addLog(gameState, card.owner, "logRemoved", { card: cardLabel(card), targets: targets.map(cardLabel).join(" and ") });
}
