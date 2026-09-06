import { t, getLang, playerDisplayName } from "../i18n.js";
import { playCard } from "../game/turnManager.js";
import { BOT_AVATARS, AI_DIFFICULTY } from "../constants/playerTypes.js";
import { playSound } from "../services/soundManager.js";
import { flip, playBeat, wait, isReducedMotion } from "../presentation/flip.js";
import { director } from "../presentation/director.js";
import { EVENTS } from "../presentation/events.js";
import { ANTICIPATION, DEFAULT_ANTICIPATION, REACTION, DEFAULT_REACTION } from "../presentation/abilityPresentations.js";
import { attachLongPress } from "./longPress.js";
import { openCardInfoByPower } from "../game/help.js";
import { LONG_PRESS_DURATION_MS } from "../constants/longPress.js";
import { TURN_TIMER_SECONDS } from "../constants/turnTimer.js";
import { dismissCardHelpHintOnSuccess } from "./cardHelpHint.js";
import { loadIcons } from "./icon-ui.js";
import { isPaused } from "./pause-ui.js";
import { getPlayerAvatarId } from "./playerAvatar-ui.js";
import { PLAYER_AVATARS } from "../constants/avatars.js";
import { previewAbility } from "../abilities/previewResolver.js";
import { showQueuePreview, showDraggedCardPreview, clearAllPreviewOverlays } from "./previewOverlay-ui.js";
import { DRAG_START_THRESHOLD_PX } from "../constants/preview.js";
import { getPlayerRankIndexes, getRankIcon } from "../game/scoreManager.js";

// ── Warning toast ─────────────────────────────────────────
export function showWarning(message) {
    let el = document.getElementById("warningPopup");
    if (!el) {
        el = document.createElement("div");
        el.id = "warningPopup";
        document.body.appendChild(el);
    }
    el.innerHTML = `<span class="warning-icon" data-icon="waiting"></span> ${message}`;
    loadIcons(el);
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

    let wrapper = document.getElementById("queueWithIcons");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "queueWithIcons";
        wrapper.innerHTML = `
            <div id="queueDoorIcon" class="queue-icon queue-icon-entry"
                 role="button" tabindex="0" aria-label="${t("partyPanel")}">
                <span class="queue-icon-glyph" data-icon="party"></span>
                <span class="queue-icon-label" data-i18n="partyPanel">${t("partyPanel")}</span>
            </div>
            <div id="queueInner"></div>
            <div id="queueTrashIcon" class="queue-icon queue-icon-exit"
                 role="button" tabindex="0" aria-label="${t("trashPanel")}">
                <span class="queue-icon-glyph" data-icon="trash"></span>
                <span class="queue-icon-label" data-i18n="trashPanel">${t("trashPanel")}</span>
            </div>
        `;
        queue.parentNode.insertBefore(wrapper, queue);
        wrapper.querySelector("#queueInner").appendChild(queue);
        loadIcons(wrapper);
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
            // Match card-enter's real 320ms animation length (see note in
            // cardEnteredQueue below) instead of cancelling it next frame.
            setTimeout(() => card.classList.remove("card-enter"), 320);
        }
        queue.appendChild(slot);
    }
}

function queueSlotEl(index) {
    const slots = document.querySelectorAll("#queue .queue-slot");
    return slots[index] || null;
}

// Long-press handles for the currently-rendered hand cards — torn down
// at the top of every renderHand() so timers/listeners from the previous
// render never linger past the re-render that replaces their elements.
let handLongPressHandles = [];

// ── Player's own name + avatar, shown by their deck ─────────
// Mirrors playerDisplayName()/avatar shown for each bot in
// renderOtherPlayers() below, but for the human seat (p1), whose hand
// is laid out full-width instead of sitting in one of the three
// opponent boxes — so this tag lives next to their own deck instead.
function renderPlayerDeckInfo(player) {
    const avatarImg = document.getElementById("playerDeckAvatarImg");
    const nameEl     = document.getElementById("playerDeckName");
    if (!avatarImg || !nameEl) return;

    const avatarId = getPlayerAvatarId();
    if (avatarImg.dataset.avatarId !== avatarId) {
        const avatar = PLAYER_AVATARS.find(a => a.id === avatarId) || PLAYER_AVATARS[0];
        avatarImg.src = avatar.src;
        avatarImg.alt = t(avatar.labelKey);
        avatarImg.dataset.avatarId = avatarId;
    }

    nameEl.textContent = playerDisplayName(player);
}

// ── Hand ──────────────────────────────────────────────────
function renderHand(gameState) {
    const hand = document.getElementById("playerHand");

    // Only tear down handles whose element is still actually sitting in
    // the hand DOM. A card that has since been played and moved (not
    // cloned — same DOM node, see flip.js) into the queue/party/trash by
    // the Director must keep its long-press wiring; destroying it here
    // would silently strip hold-to-show-help from every card that ever
    // left the hand.
    handLongPressHandles.forEach(h => {
        if (h.el && !hand.contains(h.el)) return;
        h.destroy();
    });
    handLongPressHandles = [];

    hand.innerHTML = "";

    document.getElementById("deckCount").textContent =
        gameState.players[0].deck.length;

    const player   = gameState.players[0];

    renderPlayerDeckInfo(player);

    player.hand.forEach((card) => {
        const cardEl = createCard(card);
        // createCard() already wired the long-press-to-Card-Info gesture
        // and its affordance badge (see wireCardHelpLongPress) — reuse
        // that exact handle here instead of attaching a second gesture,
        // so hand cards just layer click-to-play + keyboard on top of it.
        const longPress = cardEl._helpLongPress;
        longPress.el = cardEl;
        handLongPressHandles.push(longPress);

        // Accessible focus target: same info long-press reveals should
        // also be reachable via keyboard, without changing what Enter/
        // Space does for card-play (see keydown handler below).
        cardEl.tabIndex = 0;
        cardEl.setAttribute("role", "button");
        const cardName = cardEl.querySelector(".card-name")?.textContent || "";
        // Short discoverability suffix so keyboard/screen-reader users learn
        // about the hold-for-info interaction too — the visual hint/affordance
        // below is never the only way to find out about it.
        cardEl.setAttribute("aria-label", `${cardName} — ${t("cardHelpHintLabel")}`);

        // Cards are no longer played by clicking/tapping — see
        // wireHandCardDrag() below for the drag-to-play gesture that
        // replaces it (Ability Preview system). The long-press-to-
        // Card-Info gesture above is untouched: that's the "existing
        // card interaction behavior unrelated to playing cards" the
        // drag integration must preserve.
        const dragHandle = wireHandCardDrag(cardEl, card, gameState, player);
        handLongPressHandles.push(dragHandle);

        // Keyboard parity for the long-press-to-Card-Info gesture only
        // (holding Enter/Space for LONG_PRESS_DURATION_MS opens Card
        // Information, same as holding the card with a pointer does).
        // Playing a card is drag-only now — there is intentionally no
        // keyboard equivalent for that yet; see the deliverable notes
        // for this task on it as a known accessibility gap to revisit.
        let keyHoldTimer = null;
        const onKeyDown = e => {
            if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
            e.preventDefault();
            if (e.repeat) return; // ignore OS key-repeat while held
            keyHoldTimer = setTimeout(() => {
                dismissCardHelpHintOnSuccess();
                openCardInfoByPower(card.power);
            }, LONG_PRESS_DURATION_MS);
        };
        const onKeyUp = e => {
            if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
            clearTimeout(keyHoldTimer);
        };
        cardEl.addEventListener("keydown", onKeyDown);
        cardEl.addEventListener("keyup", onKeyUp);
        // Piggyback on the same handles array so a mid-render teardown
        // also clears any pending key-hold timer, not just pointer state.
        handLongPressHandles.push({
            el: cardEl,
            destroy() {
                clearTimeout(keyHoldTimer);
                cardEl.removeEventListener("keydown", onKeyDown);
                cardEl.removeEventListener("keyup", onKeyUp);
            },
        });

        hand.appendChild(cardEl);
    });

    // Batch-resolve the "help" icon used by the affordance badges above,
    // same pattern used elsewhere for dynamically-inserted [data-icon]
    // elements (see renderOtherPlayers).
    loadIcons(hand);

    // First-time discoverability hint — no-ops instantly once it has
    // already been shown/dismissed (see js/ui/cardHelpHint.js). Not
    // triggered from here: the game-start flow in main.js calls it
    // explicitly at the right moment (immediately, or after the in-game
    // walkthrough finishes if one is running) so it can never appear
    // mid-walkthrough or get missed on a render that happens to run
    // while the walkthrough is still active.
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

// ── Ability Preview: player drag-to-play ────────────────────
//
// Replaces the old click-to-play handler (Section 2 of the feature
// brief). The actual Hand card DOM node never moves during a drag — it
// just becomes invisible (`.card-drag-source`, see style.css) — a
// separate floating "ghost" built from the same createCard() markup
// follows the pointer instead. This means playCard()'s existing
// getHandCardElement()-based flight animation (cardEnteredQueue, above)
// needs no changes at all: once the drag ends, the real card becomes
// visible again exactly where it always was, then flies from there
// into the Queue exactly like the old click flow did.
//
// The Preview itself is computed exactly ONCE per drag — at the moment
// a press turns into a drag — since it depends only on the dragged
// card and the current Queue, never on pointer position (see
// previewResolver.js's own doc comment on why this is safe/correct,
// and Section 13 of the brief on why recalculating more often than
// that would be wasted work).
function positionDragGhost(ghostEl, clientX, clientY) {
    if (!ghostEl) return;
    const w = ghostEl.offsetWidth || 90;
    const h = ghostEl.offsetHeight || 128;
    ghostEl.style.transform = `translate(${clientX - w / 2}px, ${clientY - h / 2}px)`;
}

function isOverQueueDropZone(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    return !!(el && el.closest("#queueArea"));
}

function wireHandCardDrag(cardEl, card, gameState, player) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let ghostEl = null;

    function canStartDrag() {
        if (isPaused()) return false;
        if (gameState.currentPlayer !== 0) {
            // Matches the old click-to-play warning exactly (Section 2
            // doesn't ask for this, but it's existing, unrelated-to-
            // playing UX — the "you tried to interact out of turn"
            // feedback — that shouldn't quietly disappear).
            showWarning(t("notYourTurn"));
            return false;
        }
        if (director.isBusy()) return false;
        if (player.hand.indexOf(card) === -1) return false; // already played/gone
        return true;
    }

    function beginDrag(evt) {
        dragging = true;
        cardEl.classList.add("card-drag-source");

        ghostEl = createCard(card);
        ghostEl.classList.add("card-drag-ghost");
        document.body.appendChild(ghostEl);
        positionDragGhost(ghostEl, evt.clientX, evt.clientY);

        const queueArea = document.getElementById("queueArea");
        if (queueArea) queueArea.classList.add("drag-drop-target-active");

        // Single Preview calculation for this whole drag — see the
        // module-level note above. previewAbility() is defensive (see
        // previewResolver.js) and simply resolves to null if a real
        // turn's own capture happens to be open; either way this can
        // never throw or leave the drag stuck.
        previewAbility(card, gameState).then(result => {
            if (!result || !dragging) return;
            showQueuePreview(result.queueActions);
            showDraggedCardPreview(ghostEl, result.cardAction);
        });
    }

    function endDragVisuals() {
        dragging = false;
        cardEl.classList.remove("card-drag-source");
        if (ghostEl) {
            ghostEl.remove();
            ghostEl = null;
        }
        const queueArea = document.getElementById("queueArea");
        if (queueArea) queueArea.classList.remove("drag-drop-target-active");
    }

    function cleanupPointerTracking() {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
        pointerId = null;
    }

    function onPointerDown(evt) {
        if (evt.pointerType === "mouse" && evt.button !== 0) return;
        if (pointerId !== null) return; // already tracking a press
        if (!canStartDrag()) return;

        pointerId = evt.pointerId;
        startX = evt.clientX;
        startY = evt.clientY;
        dragging = false;

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancel);
    }

    function onPointerMove(evt) {
        if (evt.pointerId !== pointerId) return;

        if (!dragging) {
            const dx = evt.clientX - startX;
            const dy = evt.clientY - startY;
            if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD_PX) return;
            beginDrag(evt);
            return;
        }

        positionDragGhost(ghostEl, evt.clientX, evt.clientY);
    }

    async function onPointerUp(evt) {
        if (evt.pointerId !== pointerId) return;
        const wasDragging = dragging;
        const dropX = evt.clientX;
        const dropY = evt.clientY;
        cleanupPointerTracking();

        if (!wasDragging) return; // a plain tap — playing is drag-only now

        const validDrop = isOverQueueDropZone(dropX, dropY);
        endDragVisuals();
        clearAllPreviewOverlays();

        if (!validDrop) return; // Section 2.7: cancelled drop, restore normal state

        const currentIndex = player.hand.indexOf(card);
        if (currentIndex === -1) return; // defensive — card already gone somehow

        setMyTurnHighlight(false);
        await playCard(player, currentIndex, gameState);
        playSound("playCard");
    }

    function onPointerCancel(evt) {
        if (evt.pointerId !== pointerId) return;
        cleanupPointerTracking();
        endDragVisuals();
        clearAllPreviewOverlays();
    }

    cardEl.addEventListener("pointerdown", onPointerDown);

    return {
        el: cardEl,
        destroy() {
            cardEl.removeEventListener("pointerdown", onPointerDown);
            cleanupPointerTracking();
            endDragVisuals();
            clearAllPreviewOverlays();
        },
    };
}

// ── Ability Preview: Bot ─────────────────────────────────────
//
// Shows which card the Bot is about to play, next to its seat, while
// its Ability Preview is up on the Queue (Section 7 of the brief).
// Deliberately a standalone floating element rather than reusing/
// revealing one of renderOtherPlayers()'s own `.card-back` elements —
// those are wired for the existing "face-down back flies to the queue,
// then reveals" animation (see cardEnteredQueue above), and swapping
// one out early for a face-up preview would desync that choreography
// the moment the Bot's turn actually plays out.
let _botPreviewBadgeEl = null;

export function showBotPreviewBadge(player, card) {
    clearBotPreviewBadge();

    const row = document.querySelector(`.other-player-row[data-player="${player.id}"]`);
    if (!row) return;

    const badge = document.createElement("div");
    badge.className = "bot-preview-badge";
    badge.appendChild(createCard(card));
    row.appendChild(badge);
    loadIcons(badge);

    // Next frame, so the opacity/transform transition in style.css
    // actually plays instead of snapping straight to visible.
    requestAnimationFrame(() => badge.classList.add("bot-preview-badge-visible"));

    _botPreviewBadgeEl = badge;
}

export function clearBotPreviewBadge() {
    if (_botPreviewBadgeEl) {
        _botPreviewBadgeEl.remove();
        _botPreviewBadgeEl = null;
    }
}

// ── Other players — deck-back style with avatar & deck count ──
async function renderOtherPlayers(gameState) {
    const top   = document.getElementById("topPlayer");
    const left  = document.getElementById("leftPlayer");
    const right = document.getElementById("rightPlayer");
    [top, left, right].forEach(el => { if(el) el.innerHTML = ""; });

    const others       = gameState.players.filter(p => p.id !== "p1");
    const positions    = [top, left, right];
    const currentId    = gameState.players[gameState.currentPlayer]?.id;

    // Rank badges reuse the exact same standings math as the Match
    // Standings/Leaderboard popup (js/game/scoreManager.js), computed
    // once per render, so a player's medal here can never disagree
    // with the popup's.
    const rankIndexes = getPlayerRankIndexes(gameState);

    others.forEach((player, i) => {
        const box = positions[i];
        if (!box) return;

        const diff   = player.difficulty || AI_DIFFICULTY.EASY;
        const avatar = BOT_AVATARS[diff] || BOT_AVATARS.easy;
        const isCurrentTurn = player.id === currentId;

        const handCards = player.hand.map(() =>
            `<div class="card-back" data-player="${player.id}"></div>`
        ).join("");

        const rankIcon = getRankIcon(rankIndexes.get(player.id));
        const rankBadge = rankIcon
            ? `<span class="player-rank-badge" data-icon="${rankIcon}" aria-hidden="true"></span>`
            : "";

        box.innerHTML = `
            <div class="other-player-row${isCurrentTurn ? " current-turn" : ""}"
                data-player="${player.id}"
                style="--bot-color:${avatar.color}">

                <div class="other-player-left">
                    <div class="other-avatar">
                        <span data-icon="bot-${diff}"></span>
                    </div>

                    <div class="player-label">${rankBadge}<span class="player-name-text">${playerDisplayName(player)}</span></div>
                </div>

                <div class="other-hand">
                    ${handCards}
                    <span class="other-hand-count" aria-label="${t("handCountLabel")}">${player.hand.length}</span>
                </div>

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
        </div>
    `;

    wireCardHelpLongPress(div, card);

    return div;
}

/**
 * Wires the "hold to open Card Information" gesture onto a card element.
 * Called from createCard() itself, so EVERY face-up card the game ever
 * renders — hand, queue, party, and trash alike — gets it for free,
 * instead of only the player's hand (the original, narrower wiring lived
 * inline in renderHand() below). Opponents' face-down card-backs are
 * never passed through createCard() at all, so there's nothing to hold
 * there — there's no card identity to reveal yet.
 *
 * The returned handle is also stashed on the element itself
 * (`el._helpLongPress`) so a caller that layers extra behavior on top —
 * currently only renderHand(), for click-to-play + keyboard parity —
 * can reuse this exact gesture instead of attaching a second, competing
 * one to the same element.
 */
function wireCardHelpLongPress(cardEl, card) {
    // Returning-player affordance: a small info badge that only fades in
    // on hover/focus/touch, instead of a permanent label/icon on every
    // card. Reuses the same "help" icon as the Help button
    // (js/ui/icon-ui.js), so it matches the existing visual language
    // rather than introducing a new icon. Purely visual — pointer-events
    // disabled so it can never intercept a tap meant for the card.
    const affordance = document.createElement("span");
    affordance.className = "card-help-affordance";
    affordance.setAttribute("data-icon", "help");
    affordance.setAttribute("title", t("cardHelpHintLabel"));
    affordance.setAttribute("aria-hidden", "true");
    cardEl.appendChild(affordance);
    // Resolve this specific badge's icon right away — self-contained, so
    // every call site (queue/party/trash/hand, plus the presentation
    // layer's own createCard() calls) gets a rendered icon without each
    // one having to remember to call loadIcons() itself.
    loadIcons(cardEl);

    const longPress = attachLongPress(cardEl, {
        // Long-press must not fire while the player doesn't have
        // control — e.g. mid-animation/AI turn — matching the same
        // director.isBusy() gate normal play already respects.
        isDisabled: () => director.isBusy(),
        onLongPress: () => {
            dismissCardHelpHintOnSuccess();
            openCardInfoByPower(card.power);
        },
    });
    cardEl._helpLongPress = longPress;
    return longPress;
}

// ── Turn label ────────────────────────────────────────────
function renderCurrentTurn(gameState) {
    const player = gameState.players[gameState.currentPlayer];
    const turnEl  = document.getElementById("turnPlayer");
    const roundEl = document.getElementById("roundInfo");
    if (turnEl)  turnEl.textContent  = `${t("topTurn")}: ${playerDisplayName(player)}`;
    if (roundEl) roundEl.textContent = `${t("topRound")}: ${gameState.round}`;
}

// ── Turn timer ────────────────────────────────────────────
function lerpChannel(from, to, t) {
    return Math.round(from + (to - from) * t);
}

// text-main (#e5e7eb) at full time → a red matching the rest of the
// game's existing "danger" color (e.g. the hard-bot avatar) at zero.
const TURN_TIMER_SAFE_RGB   = [229, 231, 235];
const TURN_TIMER_DANGER_RGB = [239, 68, 68];

/** Called every tick of the countdown in js/game/turnTimer.js — updates
 *  the displayed number and smoothly shifts its color from the default
 *  text color toward red as `secondsLeft` approaches 0, with an added
 *  pulse in the final few seconds for extra urgency at a glance. */
export function renderTurnTimer(secondsLeft) {
    const el = document.getElementById("turnTimer");
    if (!el) return;

    el.textContent = secondsLeft;

    const fraction = Math.max(0, Math.min(1, secondsLeft / TURN_TIMER_SECONDS));
    const t = 1 - fraction; // 0 = full time left, 1 = out of time
    const [r, g, b] = TURN_TIMER_SAFE_RGB.map((c, i) => lerpChannel(c, TURN_TIMER_DANGER_RGB[i], t));
    el.style.color = `rgb(${r}, ${g}, ${b})`;
    el.classList.toggle("turn-timer-critical", secondsLeft <= 3);

    // Once the clock drops under 3 seconds, echo that urgency with a
    // screen-wide red flash on top of the label's own pulse/color shift.
    if (secondsLeft < 3) {
        triggerScreenDamage();
    }
}

/** Full-screen red flash (#screenDamage in index.html / css/style.css)
 *  fired once per tick while the turn timer is critical. Re-triggers the
 *  CSS animation even if the previous tick's flash hasn't fully faded,
 *  by dropping the class, forcing a reflow, then re-adding it. */
function triggerScreenDamage() {
    const el = document.getElementById("screenDamage");
    if (!el) return;

    el.classList.remove("screen-damage-flash");
    void el.offsetWidth;
    el.classList.add("screen-damage-flash");
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

/* ── Animation timing hierarchy ───────────────────────────────
   MINOR   (joins queue, single-position hop/settle): short + subtle.
   IMPORTANT (removed/eaten/rush/push/jump/reorder): stronger, with a
              clear reaction beat before the card actually moves.
   MAJOR   (queue-full resolution): paused, emphasized, celebratory —
              see onQueueFull / onEnteredParty / onRejected below.
   Numbers live here so the whole hierarchy can be tuned in one place.

   IMPORTANT: any duration paired with a CSS @keyframes class (played via
   playBeat) must equal that class's own animation-duration (× iteration
   count) EXACTLY. playBeat removes the class on a plain timer, independent
   of the animation — a shorter timer yanks the class mid-motion and the
   card snaps back to rest instead of finishing the beat smoothly, and a
   longer one just idles. reactBeat below is intentionally NOT reused for
   every playBeat call for this reason — several reaction classes (see
   ESCAPE_STYLE / REMOVE_REACTION further down) have their own true
   length and carry it explicitly instead. */
const T = {
    minorFlip:   340,   // hand → queue, plain settle/hop travel
    minorBeat:   240,   // card-joins-line (0.24s) — small joins-line bounce
    reactBeat:   240,   // generic pre-move reaction fallback only
    importantFlip: 400, // eaten/removed/rush/push travel
    majorPause:  420,   // queue-full "let it sink in" pause
    majorBeat:   260,   // card-result-anticipation (0.26s) — pre-party wind-up
    majorFlip:   440,   // travel into Party
    majorCelebrate: 420 // card-party-celebrate (0.42s) — landing celebration
};

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
        // card-enter's own keyframe animation runs 320ms (see style.css) —
        // give it the full length instead of yanking the class next frame,
        // which cancelled the animation before it could play at all.
        setTimeout(() => el.classList.remove("card-enter"), 320);
        return;
    }

    if (sourceEl.classList.contains("card-back")) {
        // Opponent's hand is anonymous — fly the face-down back to the
        // slot, then reveal the real card in its place.
        await flip(sourceEl, () => slot.appendChild(sourceEl), { duration: T.minorFlip });
        const real = createCard(card);
        real.classList.add("card-reveal");
        sourceEl.replaceWith(real);
        setTimeout(() => real.classList.remove("card-reveal"), 260);
        await playBeat(real, "card-joins-line", T.minorBeat);
    } else {
        await flip(sourceEl, () => slot.appendChild(sourceEl), { duration: T.minorFlip });
        await playBeat(sourceEl, "card-joins-line", T.minorBeat);
    }
}

// reason -> { duringClass, duration } for a plain CARD_MOVED reposition.
// "settle" (the generic diff-based fallback) stays the lightest of the
// bunch — everything an ability explicitly calls out gets more character.
const MOVE_STYLE = {
    settle: { duration: T.minorFlip },
    hop:    { duringClass: "card-hop",        duration: 300 },   // Giraffe
    rush:   { duringClass: "card-lion-rush",  duration: 320, easing: "cubic-bezier(.55,0,.85,.35)" }, // Lion
    push:   { duringClass: "card-heavy-push", duration: 460, easing: "cubic-bezier(.2,.7,.3,1)" },    // Hippo
    stick:  { duringClass: "card-stick",      duration: 220 },   // Sloth Bear following
};

// Reasons whose fromIndex→toIndex gap can span more than one slot need to
// visibly cross every slot in between instead of sweeping straight to the
// target in one flight — a card advancing through the queue should read
// as passing each position, not skipping over them. "rush" (Lion's
// charge) is a deliberate exception: it's meant to read as one aggressive
// dash the full length of the queue, not a step-by-step walk.
const STEPWISE_REASONS = new Set(["settle", "push", "stick"]);

// The card (if any) already sitting in `slot` other than the one currently
// moving into it — used to give a brief "something arrived" bump to a
// card that hasn't cleared out of a slot yet when another needs to pass
// through or land there.
function slotOccupant(slot, movingEl) {
    const occupant = slot.querySelector(".card");
    return (occupant && occupant !== movingEl) ? occupant : null;
}

async function onReposition(evt) {
    const el = findCardEl(evt.card.uid);
    if (!el) {
        console.warn("[presenter] no DOM node for moved card, state already correct — skipping animation", evt);
        return;
    }
    const style = MOVE_STYLE[evt.reason] || MOVE_STYLE.settle;

    if (!STEPWISE_REASONS.has(evt.reason) || evt.fromIndex == null || evt.fromIndex === evt.toIndex) {
        const slot = queueSlotEl(evt.toIndex);
        if (!slot) return;
        await flip(el, () => slot.appendChild(el), style);
        return;
    }

    // Walk the card through every intermediate slot, one hop at a time.
    // Each hop gets a fair share of the reason's overall travel time so a
    // 3-slot push doesn't take 3x as long as a 1-slot one, just more steps.
    const step = evt.toIndex > evt.fromIndex ? 1 : -1;
    const hops = Math.abs(evt.toIndex - evt.fromIndex);
    const hopDuration = Math.max(140, Math.round((style.duration ?? T.minorFlip) / hops));

    let index = evt.fromIndex;
    while (index !== evt.toIndex) {
        const nextIndex = index + step;
        const slot = queueSlotEl(nextIndex);
        if (!slot) break;

        // A card still settling into this slot (see the queue-slot z-index
        // rule in style.css) gets a quick "blocked" bump acknowledging the
        // arrival — never a size change, just a beat — before we land.
        const occupant = slotOccupant(slot, el);
        if (occupant) playBeat(occupant, "card-block-react", 240);

        await flip(el, () => slot.appendChild(el), { ...style, duration: hopDuration });
        index = nextIndex;
    }
}

// reason -> reaction/travel styling for a card that's displaced but stays
// in the queue (Hippo pushing a weaker card, or "sticking" a Sloth Bear).
// reactDuration must equal reactClass's own CSS animation length exactly
// (see the note on T above) — card-sticky-react in particular repeats
// twice (480ms total), not once, or the drag gets cut off mid-shake.
const ESCAPE_STYLE = {
    pushed: { reactClass: "card-flee-react",   reactDuration: 220, duringClass: "card-fleeing",     duration: T.importantFlip },
    sticky: { reactClass: "card-sticky-react", reactDuration: 480, duringClass: "card-sticky-drag", duration: T.importantFlip + 60, easing: "cubic-bezier(.3,.9,.4,1)" },
};

async function onEscaped(evt) {
    const el = findCardEl(evt.card.uid);
    if (!el) return;
    const style = ESCAPE_STYLE[evt.reason] || ESCAPE_STYLE.pushed;
    await playBeat(el, style.reactClass, style.reactDuration);
    const slot = queueSlotEl(evt.toIndex);
    if (!slot) return;
    await flip(el, () => slot.appendChild(el), { duringClass: style.duringClass, duration: style.duration, easing: style.easing });
}

// cause -> reaction class + exact CSS animation length for a card that's
// being eliminated. Distinct per cause so "outmatched" (weasel/parrot),
// "scared off" (lion/monkey) and "bounced off another Lion" all *read*
// differently, even though they all end up in the same place. Duration
// must match each class's own animation-duration exactly (see the note
// on T above) so the beat is never cut short mid-motion.
const REMOVE_REACTION = {
    weaker:  { className: "card-removed-react",      duration: 260 },
    scared:  { className: "card-scared-react",        duration: 240 },
    blocked: { className: "card-blocked-out-react",   duration: 260 },
};
const EATEN_REACTION = { className: "card-eaten-react", duration: 260 };

async function onRemoved(evt, { reaction, sound }) {
    const el = findCardEl(evt.card.uid);
    if (!el) {
        console.warn("[presenter] no DOM node for removed card, state already correct — skipping animation", evt);
        return;
    }
    if (sound) playSound(sound);
    const style = reaction || REMOVE_REACTION[evt.cause] || REMOVE_REACTION.weaker;
    await playBeat(el, style.className, style.duration);
    const trash = document.getElementById("trashCards");
    if (!trash) return;
    await flip(el, () => trash.appendChild(el), { duringClass: "card-to-trash", duration: T.importantFlip });
    await playBeat(el, "card-in-trash", 220); // card-in-trash's own animation is 0.22s
}

/** In-place-only reaction — nothing moves, no removal, just a beat that
 *  communicates "something happened here". Two kinds:
 *   - flavor "anticipate": the wind-up before an ability's main action —
 *     looked up by WHICH ability (abilityPower), since Lion's crouch
 *     looks nothing like Crocodile's pause.
 *   - everything else: a reaction to what just happened, looked up by
 *     the flavor tag itself (see abilityPresentations.js). */
async function onReacted(evt) {
    const el = findCardEl(evt.card.uid);
    if (!el) return;
    const style = evt.flavor === "anticipate"
        ? (ANTICIPATION[evt.abilityPower] || DEFAULT_ANTICIPATION)
        : (REACTION[evt.flavor] || DEFAULT_REACTION);
    await playBeat(el, style.className, style.duration);
}

/** Snake's sort / Seal's reverse — many cards changing position from one
 *  ability. Played as ONE concurrent, lightly-staggered batch rather than
 *  a slow one-at-a-time queue: a full-queue reshuffle is exactly the case
 *  where simultaneous motion reads as "chaotic reorder", not confusing. */
async function onReordered(evt) {
    const duringClass = evt.reason === "reverse" ? "card-reverse-flip" : "card-chaos-move";
    const duration = evt.reason === "reverse" ? 480 : 380;

    const flights = evt.moves.map((m, i) => (async () => {
        const el = findCardEl(m.card.uid);
        if (!el) return;
        const slot = queueSlotEl(m.toIndex);
        if (!slot) return;
        await wait(isReducedMotion() ? 0 : i * 45);
        await flip(el, () => slot.appendChild(el), { duringClass, duration });
    })());

    await Promise.all(flights);
}

async function onQueueFull() {
    const queueEl = document.getElementById("queue");
    playSound("queueFull");
    await wait(isReducedMotion() ? 100 : T.majorPause);
    if (queueEl) {
        queueEl.classList.add("queue-full-flash");
        setTimeout(() => queueEl.classList.remove("queue-full-flash"), 700);
        spawnConfetti(queueEl);
    }
    await wait(isReducedMotion() ? 50 : 220);
}

async function onEnteredParty(evt) {
    const el = findCardEl(evt.card.uid);
    const party = document.getElementById("partyCards");
    if (!party) return;
    if (!el) {
        party.appendChild(createCard(evt.card));
        playSound("partyJoin");
        return;
    }
    await playBeat(el, "card-result-anticipation", T.majorBeat);
    await flip(el, () => party.appendChild(el), { duringClass: "card-to-party", duration: T.majorFlip });
    playSound("partyJoin");
    await playBeat(el, "card-party-celebrate", T.majorCelebrate);
}

async function onRejected(evt) {
    const el = findCardEl(evt.card.uid);
    const trash = document.getElementById("trashCards");
    if (!trash) return;
    if (!el) {
        trash.appendChild(createCard(evt.card));
        playSound("trashJoin");
        return;
    }
    await playBeat(el, REMOVE_REACTION.weaker.className, REMOVE_REACTION.weaker.duration);
    await flip(el, () => trash.appendChild(el), { duringClass: "card-to-trash", duration: T.importantFlip });
    playSound("trashJoin");
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

/* ── Dimming: draw the eye to whatever an ability actually touches ──── */
function dimQueueExcept(activeUids) {
    document.querySelectorAll("#queue .queue-slot .card").forEach(el => {
        const uid = Number(el.dataset.uid);
        el.classList.toggle("queue-dimmed", !activeUids.has(uid));
    });
}

function clearDim() {
    document.querySelectorAll("#queue .queue-slot .card.queue-dimmed")
        .forEach(el => el.classList.remove("queue-dimmed"));
}

async function handle(evt) {
    switch (evt.type) {
        case EVENTS.CARD_JUMPED:
            return onJumped(evt);
        case EVENTS.CARD_ESCAPED:
            return onEscaped(evt);
        case EVENTS.CARD_MOVED:
            return onReposition(evt);
        case EVENTS.CARD_REMOVED:
            return onRemoved(evt, { sound: "cardRemoved" });
        case EVENTS.CARD_EATEN:
            return onRemoved(evt, { reaction: EATEN_REACTION, sound: "cardEaten" });
        case EVENTS.CARD_REACTED:
            return onReacted(evt);
        case EVENTS.QUEUE_REORDERED:
            return onReordered(evt);
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

/** Kangaroo — the one dedicated "obvious jump arc", bigger and springier
 *  than a generic reposition. */
async function onJumped(evt) {
    const el = findCardEl(evt.card.uid);
    if (!el) return;
    const slot = queueSlotEl(evt.toIndex);
    if (!slot) return;
    await flip(el, () => slot.appendChild(el), { duringClass: "card-jump-arc", duration: 460 });
}

// Register this module as the Director's presenter once, at load time.
director.configure({ cardEnteredQueue, handle, dimQueueExcept, clearDim });
