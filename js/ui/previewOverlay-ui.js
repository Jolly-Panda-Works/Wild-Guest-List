/**
 * Ability Preview — visual layer.
 *
 * Turns an AbilityPreviewResult (see ../abilities/previewResolver.js)
 * into the full-card overlays described in the feature brief. This
 * module owns NO gameplay rules whatsoever — it only reads the `action`
 * (and `targetSlot`, for MOVE_TO_SLOT) already computed by the resolver
 * and picks an icon/label for it. Used identically by:
 *   - the human player's drag (see wireHandCardDrag in game-ui.js)
 *   - the Bot's pre-play preview (see turnManager.js)
 *
 * Overlay elements are pooled per card element (cached on the element
 * itself as `._previewOverlayEl`) rather than created/destroyed on every
 * recalculation — see Section 13 (Performance) of the brief. Since a
 * Preview is only computed ONCE per drag/bot-turn (not per pointermove —
 * it depends only on the Queue + the dragged card, never on pointer
 * position), churn is already minimal; pooling just avoids adding to it
 * across repeated drags/bot turns in the same game.
 */

import { PREVIEW_ACTIONS } from "../abilities/previewActions.js";
import { loadIcons } from "./icon-ui.js";

const ICON_FOR_ACTION = {
    [PREVIEW_ACTIONS.MOVE_BACK]:    "previewMoveBack",
    [PREVIEW_ACTIONS.REMOVE]:       "previewRemove",
    [PREVIEW_ACTIONS.DEFEND]:       "previewDefend",
    [PREVIEW_ACTIONS.MOVE_TO_SLOT]: "previewMoveToSlot",
    [PREVIEW_ACTIONS.ATTACH]:       "previewAttach",
    [PREVIEW_ACTIONS.ESCAPE]:       "previewEscape",
};

// Every overlay this module has ever created, so clearAllPreviewOverlays()
// can find and hide them all without having to walk the whole DOM tree
// looking for a class name.
const _activeOverlayEls = new Set();

function findCardEl(uid) {
    if (uid == null) return null;
    return document.querySelector(`.card[data-uid="${uid}"]`);
}

/** Gets (creating once, then reusing) the pooled overlay child for a
 *  given card element. */
function overlayFor(cardEl) {
    if (cardEl._previewOverlayEl && cardEl._previewOverlayEl.isConnected) {
        return cardEl._previewOverlayEl;
    }
    const overlay = document.createElement("div");
    overlay.className = "preview-overlay";
    overlay.innerHTML = `
        <span class="preview-overlay-icon" data-icon=""></span>
        <span class="preview-overlay-slot"></span>
    `;
    cardEl.appendChild(overlay);
    cardEl._previewOverlayEl = overlay;
    return overlay;
}

/** Applies one action to a single card element: shows a full-card
 *  overlay for anything except STAY, and dims/blurs the card underneath
 *  (Section 3 of the brief). STAY explicitly gets no overlay. */
function applyActionToCardEl(cardEl, action) {
    if (!cardEl || !action) return;

    if (!action.type || action.type === PREVIEW_ACTIONS.STAY) {
        clearOverlayFrom(cardEl);
        return;
    }

    const overlay = overlayFor(cardEl);
    const iconName = ICON_FOR_ACTION[action.type] || "";
    const iconEl = overlay.querySelector(".preview-overlay-icon");
    const slotEl = overlay.querySelector(".preview-overlay-slot");

    iconEl.dataset.icon = iconName;
    // A fresh icon name needs its cached "already loaded" marker cleared,
    // otherwise loadIcons() below (which no-ops when dataset.iconLoaded
    // already matches the resolved value) can skip re-render on a pooled
    // element that previously showed a *different* action's icon that
    // happens to resolve to the same underlying asset value.
    delete iconEl.dataset.iconLoaded;

    slotEl.textContent = action.type === PREVIEW_ACTIONS.MOVE_TO_SLOT && action.targetSlot != null
        ? String(action.targetSlot)
        : "";

    overlay.dataset.action = action.type;
    overlay.classList.add("preview-overlay-visible");
    cardEl.classList.add("preview-underlay-dim");
    _activeOverlayEls.add(overlay);

    loadIcons(overlay);
}

function clearOverlayFrom(cardEl) {
    if (!cardEl) return;
    cardEl.classList.remove("preview-underlay-dim");
    const overlay = cardEl._previewOverlayEl;
    if (!overlay) return;
    overlay.classList.remove("preview-overlay-visible");
    delete overlay.dataset.action;
    _activeOverlayEls.delete(overlay);
}

/**
 * Renders the Preview for every card already in the Queue (Section 4).
 * `queueActions` is the array produced by previewAbility() —
 * `[{ uid, card, action }]`. Cards not present in this Queue right now
 * (already resolved away, re-rendered, etc.) are silently skipped —
 * this is presentation only, never a source of truth.
 */
export function showQueuePreview(queueActions = []) {
    queueActions.forEach(({ uid, action }) => {
        const cardEl = findCardEl(uid);
        if (!cardEl) return;
        applyActionToCardEl(cardEl, action);
    });
}

/**
 * Renders the Preview state on the dragged/selected card itself
 * (Section 2.5 / 9) — used for ESCAPE (a duplicate Lion, say, that will
 * never enter the Queue) or a self-relocation MOVE_TO_SLOT (Lion rushing
 * to the front, Hippo pushing forward, Kangaroo jumping, Giraffe's hop).
 * `cardAction` is `null` when nothing preview-worthy happens to the
 * dragged card itself — that clears any overlay left from a previous
 * calculation on the same element instead of leaving it stale.
 */
export function showDraggedCardPreview(cardEl, cardAction) {
    if (!cardEl) return;
    if (!cardAction) {
        clearOverlayFrom(cardEl);
        return;
    }
    applyActionToCardEl(cardEl, cardAction);
}

/**
 * Removes every currently-visible Preview overlay and dim state,
 * everywhere. Safe (and expected) to call defensively — on drag cancel,
 * successful play, invalid drop, turn change, Bot execution, Queue
 * update, and ability resolution (Section 12) — even when nothing is
 * currently showing.
 */
export function clearAllPreviewOverlays() {
    _activeOverlayEls.forEach(overlay => {
        overlay.classList.remove("preview-overlay-visible");
        delete overlay.dataset.action;
        const cardEl = overlay.parentElement;
        if (cardEl) cardEl.classList.remove("preview-underlay-dim");
    });
    _activeOverlayEls.clear();

    // Defensive sweep in case an overlay's card element was replaced
    // (full board re-render) without going through clearOverlayFrom —
    // makes sure no dim state can ever survive that.
    document.querySelectorAll(".preview-underlay-dim").forEach(el => {
        el.classList.remove("preview-underlay-dim");
    });
}
