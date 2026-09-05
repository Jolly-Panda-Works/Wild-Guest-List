/**
 * Ability Preview action model.
 *
 * These are the only outcomes a Preview can express for a single card
 * (see previewResolver.js). Deliberately plain string constants — same
 * pattern as EVENTS in ../presentation/events.js — never UI strings like
 * "→2" (see PreviewOverlay-ui.js for the layer that turns these + a
 * targetSlot/attachTo payload into something visible).
 */
export const PREVIEW_ACTIONS = {
    STAY:         "STAY",         // no effect — no overlay should be shown
    MOVE_BACK:    "MOVE_BACK",    // generic reposition caused by another card's ability
    REMOVE:       "REMOVE",       // will be sent to Trash
    DEFEND:       "DEFEND",       // Zebra blocking Hippo/Crocodile — affected, but protected
    MOVE_TO_SLOT: "MOVE_TO_SLOT", // an ability relocates this card to a specific, known slot
    ATTACH:       "ATTACH",       // Sloth Bear sticking behind the card that just passed it
    ESCAPE:       "ESCAPE",       // the dragged/selected card itself will NOT enter the Queue
};
