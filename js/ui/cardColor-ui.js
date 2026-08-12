/**
 * Card color picker.
 *
 * Lets the player repaint the card colors used across the whole game —
 * hand, queue, party, trash, deck-backs, leaderboard rows — by choosing
 * from the predefined palette in js/constants/cardColors.js. One choice
 * is "my card color" (seat p1, always the human — see js/main.js), the
 * other is "opponent card color", applied to all three AI seats (p2-p4)
 * so every bot stays visually consistent as a single group.
 *
 * This intentionally does NOT introduce a new styling mechanism: every
 * card already reads its color from the shared --p1..--p4 CSS custom
 * properties (css/style.css, :root and .card[data-player="pN"]), so
 * applying a choice here is just overwriting those four variables on
 * the document root. Nothing else needs to change.
 *
 * Persistence follows the same pattern as js/ui/cardGuidance-ui.js /
 * js/services/soundManager.js — a small localStorage key, read on boot
 * and written on change, so the choice survives reloads and carries
 * into every future game.
 */

import { CARD_COLOR_PALETTE, DEFAULT_MY_COLOR, DEFAULT_OPPONENT_COLOR } from "../constants/cardColors.js";

const MY_KEY  = "wgl_myCardColor";
const OPP_KEY = "wgl_opponentCardColor";

/* ─────────────────────────────────────────
   Settings persistence
───────────────────────────────────────── */

export function getMyCardColor() {
    return localStorage.getItem(MY_KEY) || DEFAULT_MY_COLOR;
}

export function setMyCardColor(id) {
    localStorage.setItem(MY_KEY, id);
    applyCardColors();
}

export function getOpponentCardColor() {
    return localStorage.getItem(OPP_KEY) || DEFAULT_OPPONENT_COLOR;
}

export function setOpponentCardColor(id) {
    localStorage.setItem(OPP_KEY, id);
    applyCardColors();
}

function hexFor(id) {
    return (CARD_COLOR_PALETTE.find(c => c.id === id) || CARD_COLOR_PALETTE[0]).hex;
}

/**
 * Paints the current choices onto the shared --p1..--p4 variables.
 * Safe to call any time (boot, settings change, mid-game) — it never
 * touches anything but those four custom properties, so it can't
 * clobber unrelated theme state.
 */
export function applyCardColors() {
    const root = document.documentElement.style;
    root.setProperty("--p1", hexFor(getMyCardColor()));

    const opponentHex = hexFor(getOpponentCardColor());
    root.setProperty("--p2", opponentHex);
    root.setProperty("--p3", opponentHex);
    root.setProperty("--p4", opponentHex);
}

/* ─────────────────────────────────────────
   Rendering the swatch pickers
───────────────────────────────────────── */

function renderSwatchRow(container, selectedId, onPick) {
    if (!container) return;

    container.innerHTML = CARD_COLOR_PALETTE.map(c => `
        <button type="button"
                class="color-swatch${c.id === selectedId ? " active" : ""}"
                data-color="${c.id}"
                style="--swatch-color:${c.hex}"
                aria-label="${c.id}"
                aria-pressed="${c.id === selectedId}"></button>
    `).join("");

    container.querySelectorAll(".color-swatch").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) return;
            container.querySelectorAll(".color-swatch").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
            onPick(btn.dataset.color);
        });
    });
}

/** Wires the two Settings swatch rows. Call once during UI init. */
export function initCardColorPicker() {
    applyCardColors(); // make sure the stored/default choice is already live

    const myRow  = document.getElementById("myColorSwatches");
    const oppRow = document.getElementById("opponentColorSwatches");

    renderSwatchRow(myRow, getMyCardColor(), setMyCardColor);
    renderSwatchRow(oppRow, getOpponentCardColor(), setOpponentCardColor);
}
