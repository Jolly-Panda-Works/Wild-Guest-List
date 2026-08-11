import { t, getLang, playerDisplayName } from "../i18n.js";
import { playCard } from "../game/turnManager.js";
import { BOT_AVATARS, AI_DIFFICULTY } from "../constants/playerTypes.js";
import { playSound } from "../services/soundManager.js";
import { flip, playBeat, wait, isReducedMotion } from "../presentation/flip.js";
import { director } from "../presentation/director.js";
import { EVENTS } from "../presentation/events.js";

let _config = null;
async function getConfig() {
    if (_config) return _config;
    const res = await fetch("./data/config.json");
    _config = await res.json();
    return _config;
}

// ── Warning toast ─────────────────────────────────────────
function showWarning(message) {
    let el = document.getElementById("warningPopup");
    if (!el) {
        el = document.createElement("div");
        el.id = "warningPopup";
        document.body.appendChild(el);
    }
    el.innerHTML = `<span class="warning-icon">⏳</span> ${message}`;
    el.classList.add("visible");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("visible"), 2200);
}

// ── Pulse control ─────────────────────────────────────────
export function setMyTurnHighlight(isMyTurn) {
    const hand = document.getElementById("playerHand");
    if (!hand) return;
    hand.classList.toggle("my-turn", isMyTurn);
}

// ── Main render (full reconcile — initial paint / language change /
//    resize / error-fallback ONLY. Never called mid-turn: during a turn
//    the Director animates individual DOM nodes in place, and a full
//    wipe-and-rebuild here would destroy elements that may be mid-flight.) ──
export async function renderGame(gameState) {
    await renderQueue(gameState);
    renderCurrentTurn(gameState);
    renderHand(gameState);
    await renderOtherPlayers(gameState);
    renderParty(gameState);
    renderTrash(gameState);
    setMyTurnHighlight(gameState.currentPlayer === 0);
}

// ── Non-board render — safe to call after every phase of an animated
//    turn. Deliberately excludes queue/party/trash, which are owned by
//    the Director while a turn is in flight. ──
export async function renderNonBoard(gameState) {
    renderCurrentTurn(gameState);
    renderHand(gameState);
    await renderOtherPlayers(gameState);
    setMyTurnHighlight(gameState.currentPlayer === 0);
}

// ── Queue ─────────────────────────────────────────────────
async function renderQueue(gameState) {
    const queue = document.getElementById("queue");
    const config = await getConfig();
    const entryIcon = config.icons?.queueEntry || "🚪";
    const exitIcon  = config.icons?.queueExit  || "🗑️";

    let wrapper = document.getElementById("queueWithIcons");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "queueWithIcons";
        wrapper.innerHTML = `
            <div class="queue-icon queue-icon-entry">${entryIcon}</div>
            <div id="queueInner"></div>
            <div class="queue-icon queue-icon-exit">${exitIcon}</div>
        `;
        queue.parentNode.insertBefore(wrapper, queue);
        wrapper.querySelector("#queueInner").appendChild(queue);
    }

    queue.innerHTML = "";
    for (let i = 0; i < 5; i++) {
        const slot = document.createElement("div");
        slot.className = "queue-slot";

        const num = document.createElement("div");
        num.className = "slot-number";
        num.textContent = i + 1;
        slot.appendChild(num);

        if (gameState.queue[i]) {
            const card = createCard(gameState.queue[i]);
            card.classList.add("card-enter");
            slot.appendChild(card);
            requestAnimationFrame(() => card.classList.remove("card-enter"));
        }
        queue.appendChild(slot);
    }
}

function queueSlotEl(index) {
    const slots = document.querySelectorAll("#queue .queue-slot");
    return slots[index] || null;
}

// ── Hand ──────────────────────────────────────────────────
function renderHand(gameState) {
    const hand = document.getElementById("playerHand");
    hand.innerHTML = "";

    document.getElementById("deckCount").textContent =
        gameState.players[0].deck.length;

    const player   = gameState.players[0];
    const isMyTurn = gameState.currentPlayer === 0;

    player.hand.forEach((card, index) => {
        const cardEl = createCard(card);
        cardEl.onclick = async () => {
            if (!isMyTurn) {
                showWarning(t("notYourTurn"));
                return;
            }
            if (director.isBusy()) {
                // A previous play/AI turn is still animating — ignore the
                // click rather than starting a second, overlapping turn.
                return;
            }
            // stop pulse before animation
            setMyTurnHighlight(false);
            await playCard(player, index, gameState);
            playSound("playCard");
        };
        hand.appendChild(cardEl);
    });
}

/** The specific hand-card DOM element at `index`, captured before the
 *  card is spliced out of the data model — used as the flight source for
 *  the human player's "hand → queue" animation. */
export function getHandCardElement(index) {
    const hand = document.getElementById("playerHand");
    return hand?.children[index] || null;
}

/** Any one face-down card-back belonging to an opponent — opponents'
 *  hands are anonymous placeholders, so a specific card has no DOM
 *  identity until it's revealed at the queue; any back will do as the
 *  flight source. */
export function getOpponentHandBackElement(player) {
    return document.querySelector(`.card-back[data-player="${player.id}"]`);
}

import {loadIcons} from "./icon-ui.js"

// ── Other players — deck-back style with avatar & deck count ──
async function renderOtherPlayers(gameState) {
    const top   = document.getElementById("topPlayer");
    const left  = document.getElementById("leftPlayer");
    const right = document.getElementById("rightPlayer");
    [top, left, right].forEach(el => { if(el) el.innerHTML = ""; });

    const others    = gameState.players.filter(p => p.id !== "p1");
    const positions = [top, left, right];

    others.forEach((player, i) => {
        const box = positions[i];
        if (!box) return;

        const diff   = player.difficulty || AI_DIFFICULTY.EASY;
        const avatar = BOT_AVATARS[diff] || BOT_AVATARS.easy;

        const handCards = player.hand.map(() =>
            `<div class="card-back" data-player="${player.id}"></div>`
        ).join("");

        box.innerHTML = `
            <div class="other-player-row"
                data-player="${player.id}"
                style="--bot-color:${avatar.color}">

                <div class="other-player-left">
                    <div class="other-avatar">
                        <span data-icon="bot-${diff}"></span>
                    </div>

                    <div class="player-label">${playerDisplayName(player)}</div>
                </div>

                <div class="other-hand">${handCards}</div>

                <div class="other-player-right">
                    <div class="deck-back other-deck-back" data-player="${player.id}">
                        <span class="other-deck-count">${player.deck.length}</span>
                    </div>
                </div>
            </div>
        `;
    });

    await loadIcons();
}

// ── Party ─────────────────────────────────────────────────
function renderParty(gameState) {
    const party = document.getElementById("partyCards");
    party.innerHTML = "";
    gameState.players.forEach(p => p.party.forEach(c => party.appendChild(createCard(c))));
}

// ── Trash ─────────────────────────────────────────────────
function renderTrash(gameState) {
    const trash = document.getElementById("trashCards");
    trash.innerHTML = "";
    gameState.trash.forEach(c => trash.appendChild(createCard(c)));
}

// ── Card factory ──────────────────────────────────────────
export function createCard(card) {
    const div = document.createElement("div");
    div.className = "card";
    div.dataset.player = card.owner.id;
    if (card.uid != null) div.dataset.uid = card.uid;

    const lang = getLang();
    const displayName = card.translations?.[lang]?.name || card.name;

    const visual = card.image
        ? `<img class="card-image" src="${card.image}" alt="${displayName}" />`
        : `<div class="card-emoji">${card.animal}</div>`;

    div.innerHTML = `
        <div class="card-owner-badge">${playerDisplayName(card.owner)}</div>
        <div class="card-visual">${visual}</div>
        <div class="card-footer">
            <div class="card-name">${displayName}</div>
            <div class="card-power">${card.power}</div>
        </div>
    `;
    return div;
}

// ── Turn label ────────────────────────────────────────────
function renderCurrentTurn(gameState) {
    const player = gameState.players[gameState.currentPlayer];
    const turnEl  = document.getElementById("turnPlayer");
    const roundEl = document.getElementById("roundInfo");
    if (turnEl)  turnEl.textContent  = `${t("topTurn")}: ${playerDisplayName(player)}`;
    if (roundEl) roundEl.textContent = `${t("topRound")}: ${gameState.round}`;
}

// ============================================================
// Presentation layer — the Director's presenter.
//
// Everything below turns a semantic event into an actual DOM animation.
// It never decides WHAT happened (that's abilities.js / queueManager.js);
// it only shows what already happened, and is defensive throughout: a
// missing DOM node logs a warning and returns rather than throwing, so a
// presentation bug can never leave a turn (or the input lock) stuck.
// ============================================================

function findCardEl(uid) {
    if (uid == null) return null;
    return document.querySelector(`.card[data-uid="${uid}"]`);
}

/** Hand → back-of-queue. The one transition that needs a specific source
 *  element handed to it, since pure game logic (addToQueue) has no idea
 *  which DOM node the play came from. */
async function cardEnteredQueue(card, sourceEl, toIndex) {
    const slot = queueSlotEl(toIndex);
    if (!slot) return;

    if (!sourceEl || !sourceEl.isConnected) {
        // Fallback: we lost track of the source element for some reason —
        // still place the real card so state and UI never desync, just
        // without the flight animation.
        const el = createCard(card);
        el.classList.add("card-enter");
        slot.appendChild(el);
        requestAnimationFrame(() => el.classList.remove("card-enter"));
        return;
    }

    if (sourceEl.classList.contains("card-back")) {
        // Opponent's hand is anonymous — fly the face-down back to the
        // slot, then reveal the real card in its place.
        await flip(sourceEl, () => slot.appendChild(sourceEl), { duration: 380 });
        const real = createCard(card);
        real.classList.add("card-reveal");
        sourceEl.replaceWith(real);
        setTimeout(() => real.classList.remove("card-reveal"), 260);
        await playBeat(real, "card-joins-line", 240);
    } else {
        await flip(sourceEl, () => slot.appendChild(sourceEl), { duration: 380 });
        await playBeat(sourceEl, "card-joins-line", 240);
    }
}

async function onReposition(evt, opts) {
    const el = findCardEl(evt.card.uid);
    if (!el) {
        console.warn("[presenter] no DOM node for moved card, state already correct — skipping animation", evt);
        return;
    }
    const slot = queueSlotEl(evt.toIndex);
    if (!slot) return;
    await flip(el, () => slot.appendChild(el), opts);
}

async function onEscaped(evt) {
    const el = findCardEl(evt.card.uid);
    if (!el) return;
    await playBeat(el, "card-flee-react", 220);
    const slot = queueSlotEl(evt.toIndex);
    if (!slot) return;
    await flip(el, () => slot.appendChild(el), { duringClass: "card-fleeing", duration: 380 });
}

async function onRemoved(evt, reactionClass) {
    const el = findCardEl(evt.card.uid);
    if (!el) {
        console.warn("[presenter] no DOM node for removed card, state already correct — skipping animation", evt);
        return;
    }
    await playBeat(el, reactionClass, 260);
    const trash = document.getElementById("trashCards");
    if (!trash) return;
    await flip(el, () => trash.appendChild(el), { duringClass: "card-to-trash", duration: 420 });
    await playBeat(el, "card-in-trash", 220);
}

async function onQueueFull() {
    const queueEl = document.getElementById("queue");
    await wait(isReducedMotion() ? 120 : 500);
    if (queueEl) {
        queueEl.classList.add("queue-full-flash");
        setTimeout(() => queueEl.classList.remove("queue-full-flash"), 700);
        spawnConfetti(queueEl);
    }
    await wait(isReducedMotion() ? 60 : 260);
}

async function onEnteredParty(evt) {
    const el = findCardEl(evt.card.uid);
    const party = document.getElementById("partyCards");
    if (!party) return;
    if (!el) {
        party.appendChild(createCard(evt.card));
        return;
    }
    await playBeat(el, "card-result-anticipation", 260);
    await flip(el, () => party.appendChild(el), { duringClass: "card-to-party", duration: 520 });
    await playBeat(el, "card-party-celebrate", 420);
}

async function onRejected(evt) {
    const el = findCardEl(evt.card.uid);
    const trash = document.getElementById("trashCards");
    if (!trash) return;
    if (!el) {
        trash.appendChild(createCard(evt.card));
        return;
    }
    await playBeat(el, "card-removed-react", 220);
    await flip(el, () => trash.appendChild(el), { duringClass: "card-to-trash", duration: 420 });
}

function spawnConfetti(anchorEl) {
    if (isReducedMotion() || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    layer.style.left = `${rect.left}px`;
    layer.style.top = `${rect.top}px`;
    layer.style.width = `${rect.width}px`;
    layer.style.height = `${Math.max(rect.height, 1)}px`;

    const colors = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#eab308"];
    for (let i = 0; i < 18; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colors[i % colors.length];
        piece.style.animationDelay = `${Math.random() * 120}ms`;
        layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 900);
}

async function handle(evt) {
    switch (evt.type) {
        case EVENTS.CARD_JUMPED:
            return onReposition(evt, { duringClass: "card-jump-arc", duration: 460 });
        case EVENTS.CARD_ESCAPED:
            return onEscaped(evt);
        case EVENTS.CARD_MOVED:
            return onReposition(evt, { duration: 380 });
        case EVENTS.CARD_REMOVED:
            return onRemoved(evt, "card-removed-react");
        case EVENTS.CARD_EATEN:
            return onRemoved(evt, "card-eaten-react");
        case EVENTS.QUEUE_FULL:
            return onQueueFull(evt);
        case EVENTS.QUEUE_RESOLUTION_STARTED:
            return;
        case EVENTS.CARD_ENTERED_PARTY:
            return onEnteredParty(evt);
        case EVENTS.CARD_REJECTED:
            return onRejected(evt);
        case EVENTS.QUEUE_RESOLUTION_COMPLETED:
            return;
        default:
            console.warn("[presenter] unknown event type, ignoring", evt);
    }
}

// Register this module as the Director's presenter once, at load time.
director.configure({ cardEnteredQueue, handle });
