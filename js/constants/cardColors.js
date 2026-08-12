/**
 * Card-color palette.
 *
 * Every card, hand border, deck-back and leaderboard row is already
 * painted from the shared --p1..--p4 CSS variables (see :root and
 * .card[data-player="pN"] in css/style.css) — this file just holds the
 * fixed set of colors a player is allowed to repaint those variables
 * with, from js/ui/cardColor-ui.js.
 *
 * The actual color list + per-seat defaults live in data/cardColors.json
 * (loaded once, below) so they can be edited/extended without touching
 * any code. CARD_COLOR_PALETTE / DEFAULT_PLAYER_COLORS start out holding
 * a built-in fallback and are mutated *in place* once the JSON file
 * loads — every existing `import { CARD_COLOR_PALETTE } ...` keeps
 * working unchanged, since only the contents change, not the binding.
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

// Fixed default color per seat — matches the game's original --p1..--p4
// values exactly, so a fresh install/localStorage looks unchanged.
export const DEFAULT_PLAYER_COLORS = {
    p1: "blue",
    p2: "green",
    p3: "orange",
    p4: "purple",
};

let _loadPromise = null;

/**
 * Loads data/cardColors.json and merges it into CARD_COLOR_PALETTE /
 * DEFAULT_PLAYER_COLORS in place. Safe to call many times — the fetch
 * only ever happens once, everyone else awaits the same promise. If the
 * file is missing or malformed, the built-in fallback above is kept as
 * is (so the picker still works, just with the hardcoded palette).
 */
export function loadCardColors() {
    if (_loadPromise) return _loadPromise;

    _loadPromise = fetch("./data/cardColors.json")
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data?.palette) && data.palette.length) {
                CARD_COLOR_PALETTE.length = 0;
                CARD_COLOR_PALETTE.push(...data.palette);
            }
            if (data?.defaults && typeof data.defaults === "object") {
                Object.keys(DEFAULT_PLAYER_COLORS).forEach(pid => delete DEFAULT_PLAYER_COLORS[pid]);
                Object.assign(DEFAULT_PLAYER_COLORS, data.defaults);
            }
        })
        .catch(err => {
            console.warn("cardColors.json failed to load — using built-in palette", err);
        });

    return _loadPromise;
}
