// ══════════════════════════════════════════════════════════
// Player Profile — js/services/profile.js
//
// The single authoritative source for the human player's identity
// (display name + avatar) and currency balances (coins + gems). Home,
// Game, and the Profile UI all read from this module instead of
// keeping their own copies — see docs/ARCHITECTURE_PLAN.md
// "Player Profile" for the shape this implements:
//
//   Player Profile
//   ├── displayName
//   ├── avatar
//   ├── coins   (foundation only — see below)
//   └── gems    (foundation only — see below)
//
//   Home       → reads profile
//   Game       → reads profile
//   Profile UI → modifies profile
//
// Persistence: a single localStorage key holds every field. Older
// installs only ever stored an avatar id (js/ui/playerAvatar-ui.js's
// old STORAGE_KEY, "wgl_playerAvatar") — that value is migrated in
// automatically the first time the profile is read, and the legacy
// key is left untouched on disk (never discarded, just superseded).
//
// ── Currencies (coins/gems) — foundation only ──────────────────────
// Per docs/ECONOMY_PLAN.md, coins are ultimately meant to be a
// server-authoritative ledger balance once a backend exists ("the
// client requests, the server decides"). Until that backend exists,
// this module is the same honest, client-side-only placeholder the
// rest of the Player Profile already is (exactly like displayName/
// avatarId today) — a real, persisted balance, but with no code path
// anywhere that earns, spends, exchanges, or rewards it yet. New
// balance-changing features (Shop, Lucky Wheel, quest/game rewards)
// should call setCoins()/setGems() below rather than inventing a
// second currency store, so this module stays the single source of
// truth when those systems are actually built.
// ══════════════════════════════════════════════════════════

import { PLAYER_AVATARS, DEFAULT_PLAYER_AVATAR_ID } from "../constants/avatars.js";

const STORAGE_KEY        = "wgl_playerProfile";
const LEGACY_AVATAR_KEY  = "wgl_playerAvatar";
const MAX_NAME_LENGTH    = 20;
const GUEST_NAME_PREFIX  = "Guest";

let _profile = null;
const _listeners = new Set();

function isValidAvatarId(id) {
    return PLAYER_AVATARS.some(a => a.id === id);
}

/** Sanitizes a stored/incoming currency value: must be a finite,
 *  non-negative number, otherwise falls back to 0. Used for both
 *  coins and gems so a corrupted localStorage value (or, later, a bad
 *  input to setCoins()/setGems()) can never leave the profile with a
 *  negative or non-numeric balance. */
function sanitizeCurrency(value) {
    return (typeof value === "number" && Number.isFinite(value) && value >= 0) ? value : 0;
}

/** Generates a random ID-like guest name (e.g. "Guest4821") for a
 *  brand-new profile, so the name field/display is never blank
 *  before the player picks their own name — just a placeholder
 *  identity they can freely overwrite via Profile → Save. */
function generateGuestName() {
    const id = Math.floor(1000 + Math.random() * 9000); // 4 digits
    return `${GUEST_NAME_PREFIX}${id}`;
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_profile));
    } catch {
        // storage unavailable (private mode, quota, etc.) — profile
        // still works for the rest of this session, just won't persist
    }
}

function notify() {
    const snapshot = getProfile();
    _listeners.forEach(fn => {
        try { fn(snapshot); } catch (err) { console.error("[profile] listener error", err); }
    });
}

/** Loads the profile from storage the first time it's needed, migrating
 *  the legacy avatar-only key if this is the first read after upgrading.
 *  A default profile (random Guest#### name, default avatar) is created
 *  for brand-new players — never a forced setup screen, never a blank
 *  name either. */
function ensureLoaded() {
    if (_profile) return;

    let stored = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw);
    } catch {
        stored = null;
    }

    if (stored && typeof stored === "object") {
        const storedName = (typeof stored.displayName === "string" && stored.displayName.trim())
            ? stored.displayName.trim().slice(0, MAX_NAME_LENGTH)
            : null;

        _profile = {
            // Backfills a random Guest#### name for profiles saved
            // before this default existed (or ones with an explicitly
            // cleared name) — a name is never blank once loaded.
            displayName: storedName || generateGuestName(),
            avatarId: isValidAvatarId(stored.avatarId) ? stored.avatarId : DEFAULT_PLAYER_AVATAR_ID,
            // Foundation only (see header comment) — existing profiles
            // saved before currencies existed simply get 0/0, never an
            // invented starting balance.
            coins: sanitizeCurrency(stored.coins),
            gems: sanitizeCurrency(stored.gems),
        };
        if (!storedName) persist();
        return;
    }

    // No profile yet — migrate the legacy avatar-only key if present,
    // otherwise fall back to a fresh default profile with a random
    // Guest#### name (never blank). Brand-new profiles start at
    // 0 coins / 0 gems — no invented free currency.
    let legacyAvatar = null;
    try { legacyAvatar = localStorage.getItem(LEGACY_AVATAR_KEY); } catch {
        legacyAvatar = null;
    }

    _profile = {
        displayName: generateGuestName(),
        avatarId: isValidAvatarId(legacyAvatar) ? legacyAvatar : DEFAULT_PLAYER_AVATAR_ID,
        coins: 0,
        gems: 0,
    };
    persist();
}

/** Returns a copy of the current profile: { displayName, avatarId,
 *  coins, gems }. displayName is always a non-empty string —
 *  brand-new and legacy profiles alike get a random Guest####
 *  placeholder name, so callers never need to fall back to t("you")
 *  for a blank name. coins/gems are always non-negative numbers
 *  (0 for every profile today — see header comment). */
export function getProfile() {
    ensureLoaded();
    return { ..._profile };
}

export function getDisplayName() {
    ensureLoaded();
    return _profile.displayName;
}

export function getAvatarId() {
    ensureLoaded();
    return _profile.avatarId;
}

/** Sets the player's display name. Pass an empty/whitespace-only value
 *  to reset it back to a fresh random Guest#### name — the name is
 *  never left blank. */
export function setDisplayName(name) {
    ensureLoaded();
    const trimmed = (name || "").trim().slice(0, MAX_NAME_LENGTH);
    _profile.displayName = trimmed || generateGuestName();
    persist();
    notify();
}

export function setAvatarId(id) {
    ensureLoaded();
    if (!isValidAvatarId(id)) return;
    _profile.avatarId = id;
    persist();
    notify();
}

// ── Currencies (coins/gems) — foundation only ──────────────────────
// Same read/write/persist/notify shape as every other profile field
// above. Nothing in the project calls the setters yet — no Shop, no
// Lucky Wheel, no rewards — this is intentionally just the storage
// foundation those systems will build on later (see header comment).

export function getCoins() {
    ensureLoaded();
    return _profile.coins;
}

export function getGems() {
    ensureLoaded();
    return _profile.gems;
}

/** Sets the player's coin balance directly to `amount` (not a
 *  delta) — mirrors setAvatarId()'s "set the whole field" shape.
 *  Invalid input (negative, NaN, non-number) is ignored rather than
 *  silently corrupting the balance. Not wired to any UI or system yet
 *  — see header comment. */
export function setCoins(amount) {
    ensureLoaded();
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return;
    _profile.coins = amount;
    persist();
    notify();
}

/** Sets the player's gem balance directly to `amount` — see
 *  setCoins() above for the exact same contract. */
export function setGems(amount) {
    ensureLoaded();
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return;
    _profile.gems = amount;
    persist();
    notify();
}

/** Subscribes to profile changes. Returns an unsubscribe function.
 *  Used so every UI area displaying the player's identity (Home's
 *  profile chip, the difficulty panel's avatar trigger, etc.) updates
 *  immediately when the profile changes, without duplicating state. */
export function subscribeProfile(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}
