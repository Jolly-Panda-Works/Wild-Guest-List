// ══════════════════════════════════════════════════════════
// Profile page — js/ui/profile-ui.js
//
// The dedicated place to change display name + avatar (see
// docs/ARCHITECTURE_PLAN.md "Player Profile"). Reads/writes
// exclusively through js/services/profile.js — the one
// authoritative profile state — so Home's profile chip, the
// difficulty panel's avatar trigger (js/ui/playerAvatar-ui.js),
// and any future consumer all reflect a save here immediately.
//
// Profile is its own top-level page (profile.html /
// js/profile-main.js) — a sibling of Home, not something rendered
// inside it. Home only shows a small read-only chip (see
// updateHomeProfileChip below) that links to profile.html; it does
// not contain the editing UI itself.
// ══════════════════════════════════════════════════════════

import { PLAYER_AVATARS } from "../constants/avatars.js";
import { t } from "../i18n.js";
import { getProfile, setDisplayName, setAvatarId } from "../services/profile.js";

let selectedAvatarId = null;

function avatarById(id) {
    return PLAYER_AVATARS.find(a => a.id === id) || PLAYER_AVATARS[0];
}

function renderAvatarGrid() {
    const grid = document.getElementById("profileAvatarGrid");
    if (!grid) return;

    grid.innerHTML = PLAYER_AVATARS.map(a => `
        <button type="button"
                class="profile-avatar-choice${a.id === selectedAvatarId ? " active" : ""}"
                data-avatar="${a.id}"
                aria-label="${t(a.labelKey)}"
                aria-pressed="${a.id === selectedAvatarId}">
            <img src="${a.src}" alt="${t(a.labelKey)}">
        </button>
    `).join("");

    grid.querySelectorAll(".profile-avatar-choice").forEach(btn => {
        btn.addEventListener("click", () => {
            selectedAvatarId = btn.dataset.avatar;
            grid.querySelectorAll(".profile-avatar-choice").forEach(b => {
                const active = b === btn;
                b.classList.toggle("active", active);
                b.setAttribute("aria-pressed", String(active));
            });
        });
    });
}

function fillNameInput() {
    const input = document.getElementById("profileNameInput");
    if (!input) return;
    input.value = getProfile().displayName || "";
    input.placeholder = t("playerNamePlaceholder");
}

/** Keeps Home's compact avatar/name entry point in sync with the
 *  authoritative profile. Called once when Home boots (Home is a
 *  fresh page load every time the player lands on it, so a one-shot
 *  render is enough — no live subscription needed). No-ops on pages
 *  without the chip. */
export function updateHomeProfileChip() {
    const chip = document.getElementById("homeProfileChip");
    if (!chip) return;

    const { displayName, avatarId } = getProfile();
    const avatar = avatarById(avatarId);

    const nameEl = document.getElementById("homeProfileChipName");
    const imgEl  = document.getElementById("homeProfileChipAvatar");
    if (nameEl) nameEl.textContent = displayName || t("you");
    if (imgEl) {
        imgEl.src = avatar.src;
        imgEl.alt = t(avatar.labelKey);
    }
}

/** Boots the Profile page's own content: avatar grid + name field +
 *  Save. Call once from js/profile-main.js. */
export function initProfilePage() {
    selectedAvatarId = getProfile().avatarId;
    renderAvatarGrid();
    fillNameInput();
    document.getElementById("profileNameInput")?.focus();

    document.getElementById("profileSaveBtn")
        ?.addEventListener("click", () => {
            const input = document.getElementById("profileNameInput");
            setDisplayName(input?.value ?? "");
            if (selectedAvatarId) setAvatarId(selectedAvatarId);
            // Saved — return to Home, same as the close/back link.
            window.location.href = "index.html";
        });

    window.addEventListener("langchange", () => {
        renderAvatarGrid();
        fillNameInput();
    });
}
