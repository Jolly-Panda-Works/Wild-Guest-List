import { t, getLang, playerDisplayName } from "../i18n.js";
import { playCard } from "../game/turnManager.js";
import { BOT_AVATARS, AI_DIFFICULTY } from "../constants/playerTypes.js";
import { playSound } from "../services/soundManager.js";

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

// ── Card play animation (hand → queue slot) ───────────────
function animateCardPlay(cardEl, targetEl) {
    if (!cardEl || !targetEl) return Promise.resolve();
    return new Promise(resolve => {
        const from = cardEl.getBoundingClientRect();
        const to   = targetEl.getBoundingClientRect();
        const clone = cardEl.cloneNode(true);
        Object.assign(clone.style, {
            position: "fixed",
            left: `${from.left}px`, top: `${from.top}px`,
            width: `${from.width}px`, height: `${from.height}px`,
            margin: "0", transition: "all 0.36s cubic-bezier(.4,0,.2,1)",
            pointerEvents: "none", zIndex: "9999",
            borderRadius: "var(--radius-md)"
        });
        document.body.appendChild(clone);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            clone.style.left      = `${to.left}px`;
            clone.style.top       = `${to.top}px`;
            clone.style.width     = `${to.width}px`;
            clone.style.height    = `${to.height}px`;
            clone.style.opacity   = "0";
            clone.style.transform = "scale(0.85)";
        }));
        setTimeout(() => { clone.remove(); resolve(); }, 400);
    });
}

export async function animatePlay(cardIndex) {
    const hand  = document.getElementById("playerHand");
    const queue = document.getElementById("queue");
    const cardEl = hand?.children[cardIndex];
    const emptySlot = [...(queue?.querySelectorAll(".queue-slot") || [])]
        .find(s => !s.querySelector(".card"));

    // stop pulse immediately
    setMyTurnHighlight(false);

    await animateCardPlay(cardEl, emptySlot || queue);
}

// ── Main render ───────────────────────────────────────────
export async function renderGame(gameState) {
    await renderQueue(gameState);
    renderCurrentTurn(gameState);
    renderHand(gameState);
    await renderOtherPlayers(gameState);
    renderParty(gameState);
    renderTrash(gameState);
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
            // stop pulse before animation
            setMyTurnHighlight(false);
            await playCard(player, index, gameState);
            playSound("playCard");
        };
        hand.appendChild(cardEl);
    });
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
