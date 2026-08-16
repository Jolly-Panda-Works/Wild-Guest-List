// ══════════════════════════════════════════════════════════
// Profile — js/ui/profile-ui.js
//
// The dedicated place to change display name + avatar (see
// docs/ARCHITECTURE_PLAN.md "Player Profile"). Reads/writes
// exclusively through js/services/profile.js — the one
// authoritative profile state — so Home's profile chip, the
// Choose Bot Difficulty page's read-only display, and any future
// consumer all reflect a save here immediately.
//
// Profile is a genuine popup modal on Home (#profileModal in
// index.html, opened via openProfileModal() below) — not a separate
// page. Home's #homeProfileChip is a small read-only preview that
// opens it; all editing happens inside this modal.
// ══════════════════════════════════════════════════════════

import { PLAYER_AVATARS } from "../constants/avatars.js";
import { t } from "../i18n.js";
import { getProfile, setDisplayName, setAvatarId } from "../services/profile.js";
import { openModal, closeModal } from "./modal-ui.js";

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
    const name = getProfile().displayName || "";

    const input = document.getElementById("profileNameInput");
    if (input) {
        input.value = name;
        input.placeholder = t("playerNamePlaceholder");
    }

    const text = document.getElementById("profileNameText");
    if (text) text.textContent = name || t("you");
}

/** Toggles the name row between its read view (plain text + Edit
 *  button) and its edit view (the actual input). Editing is opt-in —
 *  tapping the Edit button reveals the input, pre-filled and focused;
 *  Save commits it and returns to the read view. */
function setNameEditMode(editing) {
    const display  = document.getElementById("profileNameDisplay");
    const editWrap = document.getElementById("profileNameEditWrap");
    if (!display || !editWrap) return;

    display.classList.toggle("hidden", editing);
    editWrap.classList.toggle("hidden", !editing);

    if (editing) {
        const input = document.getElementById("profileNameInput");
        input?.focus({ preventScroll: true });
        input?.select();
    }
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

/** Boots the Profile modal's content: avatar grid + name field + Save
 *  wiring. Call once from js/home-main.js at boot (the modal starts
 *  hidden — see openProfileModal() below for what runs on open). */
export function initProfilePage() {
    selectedAvatarId = getProfile().avatarId;
    renderAvatarGrid();
    fillNameInput();
    setNameEditMode(false);

    document.getElementById("profileEditNameBtn")
        ?.addEventListener("click", () => setNameEditMode(true));

    document.getElementById("profileNameInput")
        ?.addEventListener("keydown", e => {
            if (e.key === "Enter") document.getElementById("profileSaveBtn")?.click();
        });

    document.getElementById("profileSaveBtn")
        ?.addEventListener("click", () => {
            const input = document.getElementById("profileNameInput");
            setDisplayName(input?.value ?? "");
            if (selectedAvatarId) setAvatarId(selectedAvatarId);
            fillNameInput();          // reflect the (possibly regenerated) name
            setNameEditMode(false);   // back to the read view
            updateHomeProfileChip();  // reflect the save immediately — no reload
            closeModal("profileModal");
        });

    document.getElementById("closeProfile")
        ?.addEventListener("click", () => closeModal("profileModal"));

    window.addEventListener("langchange", () => {
        renderAvatarGrid();
        fillNameInput();
    });
}

/** Opens the Profile modal — re-renders against the current profile
 *  (in case it was changed elsewhere), starting in the name row's
 *  read view (see setNameEditMode). Wired to Home's
 *  #homeProfileChip (js/ui/home-ui.js). */
export function openProfileModal() {
    selectedAvatarId = getProfile().avatarId;
    renderAvatarGrid();
    fillNameInput();
    setNameEditMode(false);
    openModal("profileModal");
}
