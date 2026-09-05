/**
 * Ability Preview Resolver.
 *
 * This is the ONE place that answers "what would happen to the Queue if
 * this card were played right now?" — for both the human player's drag
 * and the Bot's pre-play preview (see js/ui/game-ui.js's drag wiring and
 * js/game/turnManager.js's bot flow). Neither caller duplicates any
 * gameplay rule here: this module runs the exact same resolveAbility()
 * used by real execution (see js/abilities/abilities.js), just against a
 * disposable clone of the Queue, and never touches the real gameState.
 *
 * Why this is safe to call anytime (mid-drag, repeatedly, etc.):
 *  - The "shadow" gameState below is a throwaway object. Its `queue` and
 *    `trash` are brand-new arrays; only the CARD references inside them
 *    are shared with the real game. Nothing in abilities.js ever mutates
 *    a card's own fields (id/power/owner/uid) — it only moves cards
 *    between arrays/positions — so sharing references is safe and avoids
 *    a full deep clone every recalculation (see the Performance section
 *    of the feature brief).
 *  - `logs`/`lastAbility` on the shadow state are likewise throwaway —
 *    addLog() only ever pushes onto whatever `.logs` array it's handed,
 *    so nothing leaks into the real gameState.logs.
 *  - Events are captured through the SAME beginCapture()/endCapture()
 *    pair real turns use (see ../presentation/events.js), then simply
 *    never handed to the Director — so nothing animates and nothing
 *    outside this module ever sees them.
 *
 * Scope: a preview reflects only the immediate Ability effect of playing
 * this card (Section 1 of the brief: "the effect that card will have on
 * the existing Queue"). It deliberately does NOT simulate a subsequent
 * Queue-full → Party/Trash resolution even if the Queue would reach 5
 * cards — that's a separate, later step in turnManager.playCard(), not
 * part of what dragging a card previews.
 */

import { resolveAbility } from "./abilities.js";
import { PREVIEW_ACTIONS } from "./previewActions.js";
import { CARD_IDS } from "../constants/cardIds.js";
import { EVENTS, beginCapture, endCapture, isCapturing } from "../presentation/events.js";

/** Builds the disposable gameState clone resolveAbility() runs against.
 *  The new/dragged card is appended to the end — mirroring the real
 *  addToQueue() + resolveAbility() order in turnManager.playCard() — so
 *  Preview simulates exactly the sequence real execution follows. */
function buildShadowState(card, gameState) {
    return {
        queue: [...gameState.queue, card],
        trash: [],
        logs: [],
        players: gameState.players,
        round: gameState.round,
        currentPlayer: gameState.currentPlayer,
        lastAbility: null,
        gameOver: false,
        winner: null,
    };
}

/** All events in `events` that concern this exact card — either as the
 *  event's own `card`, or (for a QUEUE_REORDERED batch) as one entry in
 *  its `moves` list. */
function eventsForCard(events, card) {
    const direct = events.filter(evt => evt.card === card);
    const reorder = events.find(evt => evt.type === EVENTS.QUEUE_REORDERED && evt.moves.some(m => m.card === card));
    return { direct, reorderMove: reorder ? reorder.moves.find(m => m.card === card) : null };
}

/** What happens to the dragged/selected card itself. Returns null when
 *  nothing preview-worthy happens to it (matches the brief's own example
 *  of `cardAction: null` for the "stays put, nothing special" case). */
function resolveCardAction(card, events, finalIndex) {
    const { direct, reorderMove } = eventsForCard(events, card);

    if (reorderMove) {
        return { type: PREVIEW_ACTIONS.MOVE_TO_SLOT, targetSlot: finalIndex + 1 };
    }

    const jumped = direct.find(evt => evt.type === EVENTS.CARD_JUMPED);
    if (jumped) {
        return { type: PREVIEW_ACTIONS.MOVE_TO_SLOT, targetSlot: finalIndex + 1 };
    }

    // Any other self-relocation caused by the card's OWN ability (Lion's
    // rush to the front, Hippo's push, Giraffe's one-slot hop) — the
    // dragged card is the direct subject of its own ability, so it earns
    // an explicit destination slot rather than a generic "moved back".
    const selfMoved = direct.find(evt => evt.type === EVENTS.CARD_MOVED || evt.type === EVENTS.CARD_ESCAPED);
    if (selfMoved) {
        return { type: PREVIEW_ACTIONS.MOVE_TO_SLOT, targetSlot: finalIndex + 1 };
    }

    return null;
}

/** What happens to one card that was ALREADY in the Queue. */
function resolveQueueCardAction(card, events, wasRemoved, originalIndex, finalIndex) {
    if (wasRemoved) {
        return { type: PREVIEW_ACTIONS.REMOVE };
    }

    const { direct, reorderMove } = eventsForCard(events, card);

    // Sloth Bear snapping in behind whichever card just passed it —
    // see helpers/followHelpers.js (CARD_MOVED reason "stick") and
    // abilities.js's hippo() (CARD_ESCAPED reason "sticky").
    const attached = direct.some(evt =>
        (evt.type === EVENTS.CARD_MOVED && evt.reason === "stick") ||
        (evt.type === EVENTS.CARD_ESCAPED && evt.reason === "sticky")
    );
    if (attached) {
        return { type: PREVIEW_ACTIONS.ATTACH };
    }

    // Zebra specifically ("Barrier" — cardInfo.json #7) blocking Hippo or
    // Crocodile from passing. The SAME "block" CARD_REACTED flavor is
    // also used for a duplicate Lion bouncing off an existing Lion (see
    // abilities.js's lion()) — that is handled entirely by canEnterQueue/
    // ESCAPE below and must NOT show Defend on the existing Lion, so this
    // is deliberately gated to the Zebra card id, not the flavor alone.
    const defended = card.id === CARD_IDS.ZEBRA &&
        direct.some(evt => evt.type === EVENTS.CARD_REACTED && evt.flavor === "block");
    if (defended) {
        return { type: PREVIEW_ACTIONS.DEFEND };
    }

    if (reorderMove) {
        return { type: PREVIEW_ACTIONS.MOVE_TO_SLOT, targetSlot: finalIndex + 1 };
    }

    if (originalIndex !== finalIndex) {
        return { type: PREVIEW_ACTIONS.MOVE_BACK };
    }

    return { type: PREVIEW_ACTIONS.STAY };
}

/**
 * Computes the AbilityPreviewResult for playing `card` against
 * `gameState.queue` as it stands right now. Read-only: never mutates
 * gameState. Returns null if a preview genuinely cannot be computed
 * right now (a real turn is actively resolving/capturing) — callers
 * should treat that as "don't show a preview", never throw.
 *
 * Shape (adapted to this project's existing event/queue model — see
 * Section 9 of the brief):
 *   {
 *     canEnterQueue: boolean,
 *     cardAction: { type, targetSlot? } | null,
 *     queueActions: [{ uid, card, action: { type, targetSlot? } }]
 *   }
 */
export async function previewAbility(card, gameState) {
    if (!card || !gameState) return null;

    // A real turn's own resolveAbility()/resolveQueue() call is already
    // using the single shared event-capture buffer (see
    // presentation/events.js) — never nest a Preview capture inside that,
    // it would silently corrupt the real capture. In practice this only
    // happens if a caller forgets to gate on director.isBusy() first.
    if (isCapturing()) {
        console.warn("[previewResolver] a real capture is already open — skipping preview this time");
        return null;
    }

    const shadow = buildShadowState(card, gameState);

    beginCapture();
    let events;
    try {
        await resolveAbility(card, shadow, { preview: true });
    } finally {
        events = endCapture();
    }

    const stillInQueue = shadow.queue.includes(card);

    if (!stillInQueue) {
        // e.g. a second Lion bouncing off the one already in the Queue —
        // see abilities.js's lion(). Nothing else could have run in that
        // branch (lion() returns immediately after sendToTrash), so no
        // existing Queue card should show an overlay either (Section 6
        // of the brief).
        return {
            canEnterQueue: false,
            cardAction: { type: PREVIEW_ACTIONS.ESCAPE },
            queueActions: [],
        };
    }

    const finalCardIndex = shadow.queue.indexOf(card);
    const cardAction = resolveCardAction(card, events, finalCardIndex);

    const queueActions = gameState.queue.map((queueCard, originalIndex) => {
        const wasRemoved = shadow.trash.includes(queueCard);
        const finalIndex = wasRemoved ? -1 : shadow.queue.indexOf(queueCard);
        const action = resolveQueueCardAction(queueCard, events, wasRemoved, originalIndex, finalIndex);
        return { uid: queueCard.uid, card: queueCard, action };
    });

    return {
        canEnterQueue: true,
        cardAction,
        queueActions,
    };
}
