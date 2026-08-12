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
import { maybeShowCardHelpHint, dismissCardHelpHintOnSuccess } from "./cardHelpHint.js";

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

// ── Hand ──────────────────────────────────────────────────
function renderHand(gameState) {
    const hand = document.getElementById("playerHand");

    handLongPressHandles.forEach(h => h.destroy());
    handLongPressHandles = [];

    hand.innerHTML = "";

    document.getElementById("deckCount").textContent =
        gameState.players[0].deck.length;

    const player   = gameState.players[0];
    const isMyTurn = gameState.currentPlayer === 0;

    player.hand.forEach((card, index) => {
        const cardEl = createCard(card);
        // createCard() already wired the long-press-to-Card-Info gesture
        // and its affordance badge (see wireCardHelpLongPress) — reuse
        // that exact handle here instead of attaching a second gesture,
        // so hand cards just layer click-to-play + keyboard on top of it.
        const longPress = cardEl._helpLongPress;
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

        const playThisCard = async () => {
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

        cardEl.onclick = () => {
            // A long-press that just fired also produces a trailing
            // click/tap on release — swallow exactly that one so Help
            // opening never also plays the card underneath it.
            if (longPress.consumeSuppressedClick()) return;
            playThisCard();
        };

        // Keyboard parity with the long-press gesture: holding Enter/Space
        // for the same LONG_PRESS_DURATION_MS opens Card Information,
        // exactly like holding the card with a pointer does. A quick
        // tap still plays the card, so existing keyboard play behavior
        // is unchanged — this only adds a hold action, it doesn't alter
        // what a normal press does.
        let keyHoldTimer = null;
        let keyHoldFired = false;
        const onKeyDown = e => {
            if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
            e.preventDefault();
            if (e.repeat) return; // ignore OS key-repeat while held
            keyHoldFired = false;
            keyHoldTimer = setTimeout(() => {
                keyHoldFired = true;
                dismissCardHelpHintOnSuccess();
                openCardInfoByPower(card.power);
            }, LONG_PRESS_DURATION_MS);
        };
        const onKeyUp = e => {
            if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
            clearTimeout(keyHoldTimer);
            if (!keyHoldFired) playThisCard();
            keyHoldFired = false;
        };
        cardEl.addEventListener("keydown", onKeyDown);
        cardEl.addEventListener("keyup", onKeyUp);
        // Piggyback on the same handles array so a mid-render teardown
        // also clears any pending key-hold timer, not just pointer state.
        handLongPressHandles.push({
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
    // already been shown/dismissed (see js/ui/cardHelpHint.js).
    maybeShowCardHelpHint(hand);
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
