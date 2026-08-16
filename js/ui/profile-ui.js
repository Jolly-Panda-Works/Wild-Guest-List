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
import { loadIcons } from "./icon-ui.js";
import { getAchievements, subscribeAchievements } from "../services/achievements.js";

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
            setAvatarId(selectedAvatarId); // saves immediately — no separate Save step
            updateHomeProfileChip();
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

/** Commits just the display name from the input and returns to the
 *  read view — used by the inline Save button and Enter-to-save.
 *  This is the only save action left in Profile now: avatar changes
 *  already save immediately on click (see renderAvatarGrid above). */
function commitNameEdit() {
    const input = document.getElementById("profileNameInput");
    setDisplayName(input?.value ?? "");
    fillNameInput();
    setNameEditMode(false);
    updateHomeProfileChip();
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

/** Renders the Achievements section (#profileAchievements) from the real
 *  achievement system (js/services/achievements.js) — locked and
 *  unlocked achievements both stay visible (none of the 10 initial
 *  achievements are `hidden`), showing progress for count-type ones and
 *  the unlock date for unlocked ones. Called on modal open and again
 *  whenever achievement state changes (see subscribeAchievements() in
 *  initProfilePage) so progress made mid-game is reflected the moment
 *  the player reopens Profile. */
async function renderAchievements() {
    const summaryEl = document.getElementById("profileAchievementsSummary");
    const listEl    = document.getElementById("profileAchievementsList");
    if (!listEl) return;

    const achievements = await getAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    if (summaryEl) {
        summaryEl.textContent = t("profileAchievementsSummary")
            .replace("{unlocked}", unlockedCount)
            .replace("{total}", achievements.length);
    }

    listEl.innerHTML = achievements.map(a => {
        const { def, unlocked, progress } = a;
        const title = t(def.titleKey);
        const desc  = t(def.descriptionKey);
        const statusLabel = unlocked ? t("achievementUnlockedTag") : t("achievementLockedTag");

        // Progress line: only shown for count-type achievements not yet
        // unlocked (e.g. "3 / 5") — binary achievements just show their
        // locked/unlocked status pill instead.
        const progressLine = (!unlocked && def.type === "count")
            ? `<p class="profile-achievement-progress">${progress} / ${def.target}</p>`
            : "";

        return `
            <div class="profile-achievement-item${unlocked ? " unlocked" : ""}">
                <span class="profile-achievement-icon" data-icon="${def.icon}" aria-hidden="true"></span>
                <div class="profile-achievement-body">
                    <p class="profile-achievement-title">${title}</p>
                    <p class="profile-achievement-desc">${desc}</p>
                    ${progressLine}
                </div>
                <span class="profile-achievement-status">${statusLabel}</span>
            </div>
        `;
    }).join("");

    loadIcons(listEl);
}

/** Boots the Profile modal's content: avatar grid + name field wiring.
 *  Both save immediately on their own action — no separate Save step
 *  for the whole popup. Call once from js/home-main.js at boot (the
 *  modal starts hidden — see openProfileModal() below for what runs
 *  on open). */
export function initProfilePage() {
    selectedAvatarId = getProfile().avatarId;
    renderAvatarGrid();
    fillNameInput();
    setNameEditMode(false);

    document.getElementById("profileEditNameBtn")
        ?.addEventListener("click", () => setNameEditMode(true));

    document.getElementById("profileNameSaveBtn")
        ?.addEventListener("click", () => commitNameEdit());

    document.getElementById("profileNameInput")
        ?.addEventListener("keydown", e => {
            if (e.key === "Enter") commitNameEdit();
        });

    document.getElementById("closeProfile")
        ?.addEventListener("click", () => closeModal("profileModal"));

    window.addEventListener("langchange", () => {
        renderAvatarGrid();
        fillNameInput();
        renderAchievements();
    });

    // Keep the Achievements section live: any progress/unlock change
    // (which, in practice, only ever happens on game.html while Profile
    // itself is closed) is reflected the next time it renders.
    subscribeAchievements(() => renderAchievements());
    renderAchievements();
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
    renderAchievements();
    openModal("profileModal");
}
