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
import { t, getLang } from "../i18n.js";
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

// ── Achievement Collection UI state ──────────────────────────────
// Client-side-only display filter (which category tab is active).
// Purely presentational — never touches achievement progress/logic;
// re-applied after every render (achievement data changes, language
// changes) so the selected tab survives a re-render.
let _activeAchCategory = "all";

const LOCALE_BY_LANG = { en: "en-US", fa: "fa-IR", ar: "ar-SA", tr: "tr-TR" };

/** Formats an ISO unlockedAt timestamp using the current UI language's
 *  locale — falls back to the raw date string if Intl throws (e.g. an
 *  unexpected/legacy stored value). */
function formatUnlockDate(isoString) {
    if (!isoString) return "";
    try {
        const locale = LOCALE_BY_LANG[getLang()] || "en-US";
        return new Date(isoString).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return isoString;
    }
}

/** Builds one achievement card's inner markup — shared by both the grid
 *  and the featured/"Recently Unlocked" slot so the two never drift out
 *  of visual sync. Communicates locked/unlocked/progress with icon +
 *  text + a status pill, never color alone (accessibility requirement). */
function renderAchievementCard(a, { featured = false } = {}) {
    const { def, unlocked, progress, unlockedAt } = a;
    const title = t(def.titleKey);
    const desc  = t(def.descriptionKey);
    const statusLabel = unlocked ? t("achievementUnlockedTag") : t("achievementLockedTag");
    const badgeIcon = unlocked ? "confirm" : "lockClosed";

    const isCountType = def.type === "count";
    const progressLine = (isCountType && !unlocked)
        ? `
            <div class="ach-card-progress">
                <div class="ach-card-progress-track">
                    <div class="ach-card-progress-fill" style="width:${Math.min(100, (progress / def.target) * 100)}%"></div>
                </div>
                <span class="ach-card-progress-label">${progress} / ${def.target}</span>
            </div>
        `
        : "";

    const unlockDateLine = (unlocked && unlockedAt)
        ? `<p class="ach-card-unlockdate">${t("achievementsUnlockedOn").replace("{date}", formatUnlockDate(unlockedAt))}</p>`
        : "";

    const ariaParts = [title, desc, statusLabel];
    if (isCountType && !unlocked) ariaParts.push(`${progress} / ${def.target}`);
    const ariaLabel = ariaParts.join(". ");

    return `
        <div class="ach-card${unlocked ? " unlocked" : " locked"}${featured ? " ach-card--featured" : ""}"
             data-id="${def.id}" data-category="${def.category}" tabindex="0" role="group"
             aria-label="${ariaLabel.replace(/"/g, "&quot;")}">
            <div class="ach-card-icon-wrap">
                <span class="ach-card-icon" data-icon="${def.icon}" aria-hidden="true"></span>
                <span class="ach-card-badge" data-icon="${badgeIcon}" aria-hidden="true"></span>
            </div>
            <p class="ach-card-title">${title}</p>
            <p class="ach-card-desc">${desc}</p>
            ${progressLine}
            ${unlockDateLine}
            <span class="ach-card-status">${statusLabel}</span>
        </div>
    `;
}

/** Shows/hides already-rendered cards in the grid according to the
 *  currently active category tab — pure DOM filtering, no re-fetch and
 *  no change to achievement state. Safe to call any time the grid or
 *  the active category changes. */
function applyAchievementFilter() {
    const listEl = document.getElementById("profileAchievementsList");
    if (!listEl) return;

    listEl.querySelectorAll(".ach-card").forEach(card => {
        const matches = _activeAchCategory === "all" || card.dataset.category === _activeAchCategory;
        card.classList.toggle("ach-card--filtered-out", !matches);
    });

    document.querySelectorAll("#achFilters .ach-filter").forEach(btn => {
        const active = btn.dataset.category === _activeAchCategory;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-selected", String(active));
    });
}

/** Renders the Achievements section (#profileAchievements) from the real
 *  achievement system (js/services/achievements.js) as a game-quality
 *  Achievement Collection: header summary, an overall-progress bar, an
 *  optional "Recently Unlocked" featured card (only when real unlock
 *  data exists — never fabricated), category filter tabs, and a
 *  responsive card grid. Locked and unlocked achievements both stay
 *  visible (none of the 10 initial achievements are `hidden`), showing
 *  progress for count-type ones and the unlock date for unlocked ones.
 *  Called on modal open and again whenever achievement state changes
 *  (see subscribeAchievements() in initProfilePage) so progress made
 *  mid-game is reflected the moment the player reopens Profile. */
async function renderAchievements() {
    const summaryEl  = document.getElementById("profileAchievementsSummary");
    const listEl     = document.getElementById("profileAchievementsList");
    const progressEl = document.getElementById("achProgress");
    const fillEl     = document.getElementById("achProgressFill");
    const pctEl      = document.getElementById("achProgressPct");
    const featuredWrap = document.getElementById("achFeatured");
    const featuredCard = document.getElementById("achFeaturedCard");
    if (!listEl) return;

    const achievements = await getAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;
    const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

    if (summaryEl) {
        summaryEl.textContent = t("profileAchievementsSummary")
            .replace("{unlocked}", unlockedCount)
            .replace("{total}", total);
    }

    if (fillEl) fillEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (progressEl) progressEl.setAttribute("aria-valuenow", String(pct));

    // Featured "Recently Unlocked" — the single most-recently-unlocked
    // achievement by unlockedAt, using only real data; hidden entirely
    // if nothing has been unlocked yet rather than showing a fake entry.
    const unlockedWithDate = achievements
        .filter(a => a.unlocked && a.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt));

    if (featuredWrap && featuredCard) {
        if (unlockedWithDate.length > 0) {
            featuredCard.innerHTML = renderAchievementCard(unlockedWithDate[0], { featured: true });
            featuredWrap.classList.remove("hidden");
        } else {
            featuredCard.innerHTML = "";
            featuredWrap.classList.add("hidden");
        }
    }

    listEl.innerHTML = achievements.map(a => renderAchievementCard(a)).join("");

    loadIcons(listEl);
    if (featuredCard) loadIcons(featuredCard);

    applyAchievementFilter();
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

    // Achievement Collection category filter tabs — pure display
    // filter, delegated so it keeps working across every re-render.
    document.getElementById("achFilters")?.addEventListener("click", e => {
        const btn = e.target.closest(".ach-filter");
        if (!btn) return;
        _activeAchCategory = btn.dataset.category;
        applyAchievementFilter();
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
