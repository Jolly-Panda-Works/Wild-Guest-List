// ══════════════════════════════════════════════════════════
// Profile modal — js/ui/profile-ui.js
//
// The dedicated place to change display name + avatar (see
// docs/ARCHITECTURE_PLAN.md "Player Profile"). Reads/writes
// exclusively through js/services/profile.js — the one
// authoritative profile state — so Home's profile chip, the
// difficulty panel's avatar trigger (js/ui/playerAvatar-ui.js),
// and any future consumer all reflect a save here immediately.
// ══════════════════════════════════════════════════════════

import { PLAYER_AVATARS } from "../constants/avatars.js";
import { t } from "../i18n.js";
import { loadIcons } from "./icon-ui.js";
import { openModal, closeModal } from "./modal-ui.js";
import { getProfile, setDisplayName, setAvatarId, subscribeProfile } from "../services/profile.js";

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

/** Opens the Profile modal, pre-filled with the current profile. */
export async function openProfileModal() {
    selectedAvatarId = getProfile().avatarId;
    renderAvatarGrid();
    fillNameInput();
    openModal("profileModal");
    await loadIcons(document.getElementById("profileModal"));
    document.getElementById("profileNameInput")?.focus();
}

/** Keeps Home's compact avatar/name entry point in sync with the
 *  authoritative profile. No-ops on pages without the chip (e.g. Game
 *  doesn't render one). */
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

/** Wires the Profile modal's own controls. Call once at boot on any
 *  page that includes #profileModal (currently: Home only). */
export function initProfile() {
    document.getElementById("closeProfile")
        ?.addEventListener("click", () => closeModal("profileModal"));

    document.getElementById("profileSaveBtn")
        ?.addEventListener("click", () => {
            const input = document.getElementById("profileNameInput");
            setDisplayName(input?.value ?? "");
            if (selectedAvatarId) setAvatarId(selectedAvatarId);
            closeModal("profileModal");
        });

    document.getElementById("profileModal")?.addEventListener("keydown", e => {
        if (e.key === "Escape") closeModal("profileModal");
    });

    window.addEventListener("langchange", () => {
        if (!document.getElementById("profileModal")?.classList.contains("hidden")) {
            renderAvatarGrid();
            fillNameInput();
        }
        updateHomeProfileChip();
    });

    updateHomeProfileChip();
    subscribeProfile(updateHomeProfileChip);
}
