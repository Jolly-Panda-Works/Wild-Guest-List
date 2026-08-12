/**
 * Predefined card-color palette.
 *
 * Every card, hand border, deck-back and leaderboard row is already
 * painted from the shared --p1..--p4 CSS variables (see :root and
 * .card[data-player="pN"] in css/style.css) — this file just lists the
 * fixed set of colors a player is allowed to repaint those variables
 * with, from js/ui/cardColor-ui.js.
 */

export const CARD_COLOR_PALETTE = [
    { id: "blue",   hex: "#3b82f6" },
    { id: "green",  hex: "#22c55e" },
    { id: "orange", hex: "#f97316" },
    { id: "purple", hex: "#a855f7" },
    { id: "red",    hex: "#ef4444" },
    { id: "yellow", hex: "#eab308" },
    { id: "pink",   hex: "#ec4899" },
    { id: "teal",   hex: "#14b8a6" },
];

// Match the game's original defaults (--p1 / --p2 in css/style.css) so a
// fresh install/localStorage looks exactly like it did before this
// feature existed.
export const DEFAULT_MY_COLOR       = "blue";
export const DEFAULT_OPPONENT_COLOR = "green";
