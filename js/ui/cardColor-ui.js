/**
 * Card color picker.
 *
 * The game always has exactly 4 seats — p1 (human) and p2-p4 (AI bots),
 * see js/main.js. This lets the player assign each seat its own color
 * from the predefined palette (js/constants/cardColors.js), with one
 * hard rule: all four colors must stay distinct. Picking a color that
 * another seat already has simply swaps the two seats' colors, so the
 * assignment is always a valid 1-to-1 mapping — there's no way to end
 * up with two seats sharing a color, and no dead-end where a color is
 * unreachable.
 *
 * This intentionally does NOT introduce a new styling mechanism: every
 * card already reads its color from the shared --p1..--p4 CSS custom
 * properties (css/style.css, :root and .card[data-player="pN"]), so
 * applying an assignment here is just overwriting those four variables
 * on the document root. Nothing else needs to change.
 *
 * Persistence follows the same pattern as js/ui/cardGuidance-ui.js /
 * js/services/soundManager.js — a small localStorage key, read on boot
 * and written on change — so each player's color stays fixed: it's
 * whatever was last explicitly assigned, and never changes on its own
 * (not on reload, not on a new game, not when the random starting
 * player is picked — that only randomizes turn order, never seat
 * identity or color).
 */

import { CARD_COLOR_PALETTE, DEFAULT_PLAYER_COLORS } from "../constants/cardColors.js";
import { t } from "../i18n.js";

const STORAGE_KEY = "wgl_playerColors";
const PLAYER_IDS  = ["p1", "p2", "p3", "p4"];
const NAME_KEYS   = { p1: "you", p2: "bot1", p3: "bot2", p4: "bot3" };

/* ─────────────────────────────────────────
   Settings persistence
───────────────────────────────────────── */

function isValidAssignment(obj) {
    if (!obj || typeof obj !== "object") return false;
    const ids = PLAYER_IDS.map(pid => obj[pid]);
    if (ids.some(id => !CARD_COLOR_PALETTE.some(c => c.id === id))) return false;
    return new Set(ids).size === ids.length; // all four distinct
}

/** Returns { p1: colorId, p2: colorId, p3: colorId, p4: colorId }. */
export function getPlayerColors() {
    try {
        const raw    = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (isValidAssignment(parsed)) return parsed;
    } catch {
        // fall through to defaults
    }
    return { ...DEFAULT_PLAYER_COLORS };
}

function savePlayerColors(colors) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

/**
 * Assigns `colorId` to `playerId`. If another seat already has that
 * color, the two seats swap colors — this is what keeps every
 * assignment valid (four distinct colors) without ever blocking a
 * choice or leaving a color unreachable.
 */
export function setPlayerColor(playerId, colorId) {
    const colors  = { ...getPlayerColors() };
    const prev    = colors[playerId];
    const ownerOfTarget = PLAYER_IDS.find(pid => pid !== playerId && colors[pid] === colorId);

    colors[playerId] = colorId;
    if (ownerOfTarget) colors[ownerOfTarget] = prev;

    savePlayerColors(colors);
    applyCardColors();
    return colors;
}

function hexFor(id) {
    return (CARD_COLOR_PALETTE.find(c => c.id === id) || CARD_COLOR_PALETTE[0]).hex;
}

function hexToRgbTriplet(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return "0, 0, 0";
    const [r, g, b] = m.slice(1).map(h => parseInt(h, 16));
    return `${r}, ${g}, ${b}`;
}

/**
 * Paints the current per-seat assignment onto the shared --p1..--p4
 * variables (plus their --p1-rgb..--p4-rgb companions, used wherever a
 * translucent player color is needed — see css/style.css). Safe to
 * call any time (boot, settings change, mid-game).
 */
export function applyCardColors() {
    const colors = getPlayerColors();
    const root   = document.documentElement.style;
    PLAYER_IDS.forEach(pid => {
        const hex = hexFor(colors[pid]);
        root.setProperty(`--${pid}`, hex);
        root.setProperty(`--${pid}-rgb`, hexToRgbTriplet(hex));
    });
}

/* ─────────────────────────────────────────
   Rendering the picker
───────────────────────────────────────── */

function renderRow(playerId, colors) {
    const selectedId = colors[playerId];
    const swatches = CARD_COLOR_PALETTE.map(c => `
        <button type="button"
                class="color-swatch${c.id === selectedId ? " active" : ""}"
                data-player="${playerId}"
                data-color="${c.id}"
                style="--swatch-color:${c.hex}"
                aria-label="${c.id}"
                aria-pressed="${c.id === selectedId}"></button>
    `).join("");

    return `
        <div class="player-color-row">
            <div class="player-color-name">${t(NAME_KEYS[playerId])}</div>
            <div class="color-swatch-row">${swatches}</div>
        </div>
    `;
}

function renderAll(container) {
    const colors = getPlayerColors();
    container.innerHTML = PLAYER_IDS.map(pid => renderRow(pid, colors)).join("");

    container.querySelectorAll(".color-swatch").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) return;
            setPlayerColor(btn.dataset.player, btn.dataset.color);
            renderAll(container); // re-render everything: a swap can change another row too
        });
    });
}

/** Wires the Settings picker. Call once during UI init (and again on langchange). */
export function initCardColorPicker() {
    applyCardColors(); // make sure the stored/default assignment is already live

    const container = document.getElementById("playerColorPicker");
    if (!container) return;

    renderAll(container);

    if (!container._langchangeWired) {
        window.addEventListener("langchange", () => renderAll(container));
        container._langchangeWired = true;
    }
}
