/**
 * Player avatar picker.
 *
 * Lets the human player (p1) pick their own avatar image on the
 * "Choose Bot Difficulty" screen, from the small fixed set in
 * js/constants/avatars.js. Mirrors the click-to-open trigger +
 * popover pattern already used for per-seat card colors
 * (js/ui/cardColor-ui.js initColorTriggers) — same interaction, same
 * localStorage-backed persistence approach, just for the player's
 * portrait instead of a card color.
 *
 * The choice is purely cosmetic (shown on the player's own row here);
 * it persists across games/reloads the same way the sound and
 * step-guidance settings do.
 *
 * Storage lives in js/services/profile.js — the single authoritative
 * player profile (displayName + avatar). This module only owns the
 * popover *widget*; it reads/writes through profile.js so every UI
 * area (Home, the difficulty panel, the Profile modal) shares one
 * source of truth instead of duplicating avatar state.
 */

import { PLAYER_AVATARS } from "../constants/avatars.js";
import { t } from "../i18n.js";
import { getAvatarId, setAvatarId, subscribeProfile } from "../services/profile.js";

/** Returns the currently selected avatar id for the human player. */
export function getPlayerAvatarId() {
    return getAvatarId();
}

function avatarById(id) {
    return PLAYER_AVATARS.find(a => a.id === id) || PLAYER_AVATARS[0];
}

/** Persists the player's avatar choice. */
export function setPlayerAvatarId(id) {
    setAvatarId(id);
    return getAvatarId();
}

/* ─────────────────────────────────────────
   Compact "click to open" trigger + popover
   ───────────────────────────────────────── */

function closeAllAvatarPopovers() {
    document.querySelectorAll(".avatar-trigger-popover.open")
        .forEach(p => p.classList.remove("open"));
    document.querySelectorAll(".avatar-trigger-btn.open")
        .forEach(b => b.classList.remove("open"));
}

if (!document._avatarTriggerOutsideClickWired) {
    document.addEventListener("click", e => {
        if (!e.target.closest(".avatar-trigger")) closeAllAvatarPopovers();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeAllAvatarPopovers();
    });
    document._avatarTriggerOutsideClickWired = true;
}

function renderTrigger(container, onChange) {
    const selectedId = getPlayerAvatarId();
    const active      = avatarById(selectedId);

    container.innerHTML = `
        <div class="avatar-trigger">
            <button type="button"
                    class="avatar-trigger-btn"
                    aria-haspopup="true"
                    aria-expanded="false"
                    aria-label="${t("chooseAvatar")}">
                <img src="${active.src}" alt="${t(active.labelKey)}">
            </button>
            <div class="avatar-trigger-popover" role="menu">
                ${PLAYER_AVATARS.map(a => `
                    <button type="button"
                            class="avatar-choice${a.id === selectedId ? " active" : ""}"
                            data-avatar="${a.id}"
                            aria-label="${t(a.labelKey)}"
                            aria-pressed="${a.id === selectedId}">
                        <img src="${a.src}" alt="${t(a.labelKey)}">
                    </button>
                `).join("")}
            </div>
        </div>
    `;

    const btn = container.querySelector(".avatar-trigger-btn");
    const pop = container.querySelector(".avatar-trigger-popover");

    btn.addEventListener("click", e => {
        e.stopPropagation();
        const isOpen = pop.classList.contains("open");
        closeAllAvatarPopovers();
        if (!isOpen) {
            pop.classList.add("open");
            btn.classList.add("open");
            btn.setAttribute("aria-expanded", "true");
        }
    });

    container.querySelectorAll(".avatar-choice").forEach(choice => {
        choice.addEventListener("click", e => {
            e.stopPropagation();
            closeAllAvatarPopovers();
            if (choice.classList.contains("active")) return;
            setPlayerAvatarId(choice.dataset.avatar);
            onChange?.();
        });
    });
}

/**
 * Mounts the click-to-open avatar trigger into `container` (the human
 * player's row on the Choose Bot Difficulty screen). Returns a
 * `refresh()` function — call it again after a language change, since
 * that call replaces the mounted markup (same pattern as
 * initColorTriggers()).
 */
export function initAvatarTrigger(container) {
    if (!container) return () => {};
    const refresh = () => renderTrigger(container, refresh);
    refresh();
    // Keep the trigger in sync if the avatar changes elsewhere (e.g. the
    // Profile modal) — one authoritative profile, reflected everywhere.
    subscribeProfile(refresh);
    return refresh;
}
