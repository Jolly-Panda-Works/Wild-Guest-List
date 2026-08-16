// ══════════════════════════════════════════════════════════
// Achievement System — js/services/achievements.js
//
// Single authoritative source for achievement definitions, player
// progress, unlocking, and persistence — mirrors the pattern already
// used by js/services/profile.js (module-level state + localStorage +
// a subscribe() list) rather than inventing a new architecture.
//
// This module never touches the DOM and never listens to gameplay
// directly. Instead, the actual gameplay code (js/game/turnManager.js,
// js/game/queueManager.js, js/game/gameOver.js) calls the small set of
// `notify*()` functions below at the exact points where an authoritative
// event/state already exists (a semantic event from js/presentation/
// events.js, or the real game-result from finishGame()). This keeps
// achievement logic decoupled from UI components and from gameplay
// mechanics, and guarantees every event is only ever processed once —
// it's fed from the same single capture buffer the presentation layer
// already consumes exactly once per play (see beginCapture/endCapture
// in js/presentation/events.js), never re-derived from re-renders.
//
// EXTENSIBILITY: adding achievement #11 means adding one entry to
// ACHIEVEMENT_DEFS below (+ its icon in data/config.json → icons, +
// its title/description i18n keys) — no new UI code, no new storage
// code, no new modal.
// ══════════════════════════════════════════════════════════

import { CARD_IDS } from "../constants/cardIds.js";
import { PLAYER_TYPES } from "../constants/playerTypes.js";
import { getIconConfig } from "../ui/icon-ui.js";
import { EVENTS } from "../presentation/events.js";

const STORAGE_KEY = "wgl_achievements";

/** Categories are just labels on each definition — the architecture
 *  itself doesn't hardcode a fixed list; adding a new category later
 *  is just a new string on a new definition + a new i18n label. */
export const ACHIEVEMENT_CATEGORIES = {
    PROGRESSION: "progression",
    GAMEPLAY:    "gameplay",
    MODES_PARTY: "modesParty",
};

/**
 * Achievement definitions. `target`/`requiredUniqueAbilities` are the
 * configurable thresholds called for in the brief — overridable from
 * data/config.json's own `achievements` array (see resolveConfig()
 * below) so a designer can retune counts without touching this file,
 * while this array stays the single structural source of truth (id,
 * category, type, i18n keys) so thresholds are never scattered across
 * gameplay components.
 *
 * type: "binary" (0/1) or "count" (progress/target).
 */
const ACHIEVEMENT_DEFS = [
    {
        id: "first_steps",
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        type: "binary",
        target: 1,
        icon: "achFirstSteps",
        titleKey: "achFirstStepsTitle",
        descriptionKey: "achFirstStepsDesc",
        hidden: false,
    },
    {
        id: "perfect_timing",
        category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
        type: "binary",
        target: 1,
        icon: "achPerfectTiming",
        titleKey: "achPerfectTimingTitle",
        descriptionKey: "achPerfectTimingDesc",
        hidden: false,
    },
    {
        id: "crocodile_hunter",
        category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
        type: "count",
        target: 5, // requiredCount — see resolveConfig() override
        icon: "achCrocodileHunter",
        titleKey: "achCrocodileHunterTitle",
        descriptionKey: "achCrocodileHunterDesc",
        hidden: false,
    },
    {
        id: "no_escape",
        category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
        type: "binary",
        target: 1,
        icon: "achNoEscape",
        titleKey: "achNoEscapeTitle",
        descriptionKey: "achNoEscapeDesc",
        hidden: false,
    },
    {
        id: "party_animal",
        category: ACHIEVEMENT_CATEGORIES.MODES_PARTY,
        type: "binary",
        target: 1,
        icon: "achPartyAnimal",
        titleKey: "achPartyAnimalTitle",
        descriptionKey: "achPartyAnimalDesc",
        hidden: false,
    },
    {
        id: "party_starter",
        category: ACHIEVEMENT_CATEGORIES.MODES_PARTY,
        type: "count",
        target: 3, // requiredCount — see resolveConfig() override
        icon: "achPartyStarter",
        titleKey: "achPartyStarterTitle",
        descriptionKey: "achPartyStarterDesc",
        hidden: false,
    },
    {
        id: "last_one_standing",
        category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
        type: "binary",
        target: 1,
        icon: "achLastOneStanding",
        titleKey: "achLastOneStandingTitle",
        descriptionKey: "achLastOneStandingDesc",
        hidden: false,
    },
    {
        id: "strategist",
        category: ACHIEVEMENT_CATEGORIES.GAMEPLAY,
        type: "binary",
        target: 1,
        requiredUniqueAbilities: 3, // see resolveConfig() override
        icon: "achStrategist",
        titleKey: "achStrategistTitle",
        descriptionKey: "achStrategistDesc",
        hidden: false,
    },
    {
        id: "duel_master",
        category: ACHIEVEMENT_CATEGORIES.MODES_PARTY,
        type: "binary",
        target: 1,
        requiredPlayerCount: 2, // see resolveConfig() override
        icon: "achDuelMaster",
        titleKey: "achDuelMasterTitle",
        descriptionKey: "achDuelMasterDesc",
        hidden: false,
        // KNOWN LIMITATION (see final report): the current game always
        // deals exactly 1 human + 3 bots — there is no 2-player Duel
        // mode anywhere in the project. This achievement is fully wired
        // (progress/persistence/UI/unlock) and will correctly unlock the
        // moment `gameState.players.length === requiredPlayerCount` for
        // a human win, but that condition cannot currently occur. It is
        // intentionally NOT faked with an invented player-count reading.
    },
    {
        id: "wild_champion",
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        type: "count",
        target: 10, // requiredCount — see resolveConfig() override
        icon: "achWildChampion",
        titleKey: "achWildChampionTitle",
        descriptionKey: "achWildChampionDesc",
        hidden: false,
    },
];

let _configOverrides = null;

/** Merges data/config.json's optional `achievements` array (by id) over
 *  the structural defaults above, so thresholds can be retuned from
 *  data-driven config without editing this file — cached after first
 *  resolve exactly like js/ui/icon-ui.js caches config.json itself. */
async function resolveConfig() {
    if (_configOverrides) return _configOverrides;
    _configOverrides = {};
    try {
        const config = await getIconConfig();
        (config.achievements || []).forEach(entry => {
            if (entry && entry.id) _configOverrides[entry.id] = entry;
        });
    } catch {
        // config.json unavailable — structural defaults above still work.
    }
    return _configOverrides;
}

function defById(id) {
    return ACHIEVEMENT_DEFS.find(d => d.id === id) || null;
}

/** Returns the *effective* definition for one achievement: structural
 *  fields from ACHIEVEMENT_DEFS, thresholds overridden by config.json
 *  when present. */
async function getEffectiveDef(id) {
    const base = defById(id);
    if (!base) return null;
    const overrides = await resolveConfig();
    return { ...base, ...(overrides[id] || {}) };
}

async function getAllEffectiveDefs() {
    const overrides = await resolveConfig();
    return ACHIEVEMENT_DEFS.map(d => ({ ...d, ...(overrides[d.id] || {}) }));
}

// ── Persistence (player achievement progress — NOT config.json;
//    config.json stays static/asset-only per project rules) ────────

let _progress = null; // { [id]: { progress, unlocked, unlockedAt } }
const _listeners = new Set();       // fired on any progress change
const _unlockListeners = new Set(); // fired only on a fresh unlock

function emptyProgress(id) {
    return { id, progress: 0, unlocked: false, unlockedAt: null };
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_progress));
    } catch {
        // storage unavailable (private mode, quota, etc.) — progress
        // still works for the rest of this session, just won't persist
    }
}

function ensureLoaded() {
    if (_progress) return;

    let stored = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) stored = JSON.parse(raw);
    } catch {
        stored = null;
    }

    _progress = {};
    ACHIEVEMENT_DEFS.forEach(def => {
        const saved = stored && typeof stored === "object" ? stored[def.id] : null;
        _progress[def.id] = (saved && typeof saved === "object")
            ? {
                id: def.id,
                progress: Number.isFinite(saved.progress) ? saved.progress : 0,
                unlocked: !!saved.unlocked,
                unlockedAt: typeof saved.unlockedAt === "string" ? saved.unlockedAt : null,
            }
            : emptyProgress(def.id);
    });
}

function notify() {
    const snapshot = _progress;
    _listeners.forEach(fn => {
        try { fn(snapshot); } catch (err) { console.error("[achievements] listener error", err); }
    });
}

/** Subscribes to any progress change (unlock or partial progress).
 *  Returns an unsubscribe function — same shape as subscribeProfile(). */
export function subscribeAchievements(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

/** Subscribes specifically to fresh unlocks — this is what the unlock
 *  notification UI hooks into, so it never fires for progress that was
 *  already unlocked before this session (e.g. on page load). */
export function onAchievementUnlocked(fn) {
    _unlockListeners.add(fn);
    return () => _unlockListeners.delete(fn);
}

/** Returns { def, progress, unlocked, unlockedAt } for every achievement,
 *  in definition order — this is what Profile renders directly. */
export async function getAchievements() {
    ensureLoaded();
    const defs = await getAllEffectiveDefs();
    return defs.map(def => ({
        def,
        ..._progress[def.id],
    }));
}

export function isUnlocked(id) {
    ensureLoaded();
    return !!_progress[id]?.unlocked;
}

// ── Unlock core ──────────────────────────────────────────────────

async function unlock(id) {
    ensureLoaded();
    const entry = _progress[id];
    if (!entry || entry.unlocked) return; // never unlock the same achievement repeatedly

    const def = await getEffectiveDef(id);
    if (!def) return;

    entry.unlocked = true;
    entry.progress = def.target;
    entry.unlockedAt = new Date().toISOString();
    persist();
    notify();

    _unlockListeners.forEach(fn => {
        try { fn({ def, ...entry }); } catch (err) { console.error("[achievements] unlock listener error", err); }
    });
}

/** Increments a count-type achievement's progress by `amount`, unlocking
 *  it the moment progress reaches its target. Safe to call on an
 *  already-unlocked achievement (no-ops). */
async function increment(id, amount = 1) {
    if (amount <= 0) return;
    ensureLoaded();
    const entry = _progress[id];
    if (!entry || entry.unlocked) return;

    const def = await getEffectiveDef(id);
    if (!def) return;

    entry.progress = Math.min(def.target, entry.progress + amount);
    if (entry.progress >= def.target) {
        await unlock(id);
        return;
    }
    persist();
    notify();
}

// ── Per-session gameplay tracking (reset every new game — see
//    notifyGameStarted()). Session data is intentionally NOT persisted:
//    Strategist's "unique abilities in a single winning game" must never
//    accumulate across games. ────────────────────────────────────────

let _session = null;

function freshSession() {
    return {
        missedTurn: false,        // Perfect Timing: the turn timer ever expired for the human
        usedAbilityPowers: new Set(), // Strategist: unique successfully-used ability powers this game
    };
}

/** Call once per new game (game-main.js, right after gameState.players
 *  is populated) — resets session-only tracking so per-game achievements
 *  (Strategist, Perfect Timing) never leak progress across games. */
export function notifyGameStarted() {
    _session = freshSession();
}

function isHuman(player) {
    return !!player && player.type === PLAYER_TYPES.HUMAN;
}

/** Call from js/game/turnTimer.js's onExpire path whenever the
 *  countdown reaches 0 and a card is auto-played on the human's behalf
 *  — the only authoritative "missed turn" signal this game currently
 *  exposes (see KNOWN LIMITATION about "invalid/unproductive action" in
 *  the final report: no such concept exists yet in gameplay — every
 *  card in hand is always a legal play). */
export function notifyTurnTimerExpired(player) {
    if (!_session) _session = freshSession();
    if (isHuman(player)) _session.missedTurn = true;
}

/**
 * Call once per ability resolution — right after js/game/turnManager.js
 * calls endCapture() for a played card's ability — with the exact same
 * event batch the presentation Director consumes (so nothing is ever
 * double-counted: this is fed from the single capture buffer, processed
 * exactly once, never re-derived from a re-render or animation replay).
 *
 * `actingCard` is the card whose ability just resolved (its `.owner` is
 * who played it — set once in js/game/deck.js and never reassigned).
 */
export async function notifyAbilityResolved(actingCard, events) {
    if (!_session) _session = freshSession();
    if (!actingCard || !Array.isArray(events)) return;

    const actor = actingCard.owner;
    const succeeded = events.length > 0;

    // Strategist — unique *successful* abilities used by the human
    // during the current (in-progress) game. Evaluated against a win
    // in notifyGameFinished(); never evaluated from UI state.
    if (isHuman(actor) && succeeded) {
        _session.usedAbilityPowers.add(actingCard.power);
    }

    // Crocodile Hunter — successful Crocodile eats, attributed to
    // whoever played the Crocodile (the acting card's owner), counted
    // per card actually eaten (CARD_EATEN), not per Crocodile play.
    if (isHuman(actor) && actingCard.id === CARD_IDS.CROCODILE) {
        const eatenCount = events.filter(e => e.type === EVENTS.CARD_EATEN).length;
        if (eatenCount > 0) await increment("crocodile_hunter", eatenCount);
    }

    // No Escape — a card survives an elimination attempt (Crocodile
    // trying to eat it) and remains in the queue, because a Zebra
    // blocked the attempt. Attributed to whoever owns the *surviving*
    // card (event.card), not whoever played the Crocodile — this reuses
    // the existing CARD_REACTED "block" event already emitted by
    // crocodile() in js/abilities/abilities.js, rather than inventing a
    // new escape mechanic.
    if (actingCard.id === CARD_IDS.CROCODILE) {
        const blocked = events.find(e => e.type === EVENTS.CARD_REACTED && e.flavor === "block");
        if (blocked && isHuman(blocked.card?.owner)) await unlock("no_escape");
    }
}

/**
 * Call once per queue-resolution capture (js/game/queueManager.js's
 * resolveQueue() AND resolveRemainingQueue(), right after their
 * endCapture()) with that batch's events — same single-capture,
 * exactly-once guarantee as notifyAbilityResolved().
 */
export async function notifyQueueEvents(events) {
    if (!Array.isArray(events)) return;

    for (const evt of events) {
        if (evt.type !== EVENTS.CARD_ENTERED_PARTY) continue;
        if (!isHuman(evt.card?.owner)) continue;

        // Party Animal (first entry) / Party Starter (Nth entry) — every
        // CARD_ENTERED_PARTY here is one real, already-deduplicated party
        // entry (queueManager only ever emits it once per card, at the
        // moment that exact card is spliced into `party`) — never an
        // animation callback or re-render.
        await unlock("party_animal");
        await increment("party_starter", 1);

        // Last One Standing — this card was the sole remaining card in
        // the queue when the game concluded (see the `soleSurvivor` flag
        // added in resolveRemainingQueue()), i.e. it genuinely was the
        // last one standing rather than one of an arbitrary pair.
        if (evt.soleSurvivor) await unlock("last_one_standing");
    }
}

/**
 * Call once per game from js/game/gameOver.js's finishGame(), AFTER
 * gameState.gameOver/gameState.winner are set — the authoritative game
 * result, never evaluated from UI state. `finishGame()` itself is
 * already guarded against running twice (`if (gameState.gameOver) return;`
 * at its top, checked before this is called), so this is inherently
 * safe against duplicate game-result events.
 */
export async function notifyGameFinished(gameState) {
    if (!_session) _session = freshSession();

    const humanPlayer = gameState.players.find(isHuman);

    // First Steps — reaching a valid final game state at all, win or
    // lose. finishGame() is only ever reached once isGameOver(gameState)
    // is true (every hand/deck empty) — never from just opening Gameplay.
    await unlock("first_steps");

    // Perfect Timing — completed the game without the turn timer ever
    // having to auto-play on the human's behalf.
    if (!_session.missedTurn) await unlock("perfect_timing");

    const humanWon = !!humanPlayer && gameState.winner === humanPlayer;

    if (humanWon) {
        await increment("wild_champion", 1);

        // Strategist — at least requiredUniqueAbilities distinct
        // successful abilities used by the human during this winning
        // game (session-only, reset every game — see notifyGameStarted).
        const def = await getEffectiveDef("strategist");
        const required = def?.requiredUniqueAbilities ?? 3;
        if (_session.usedAbilityPowers.size >= required) await unlock("strategist");

        // Duel Master — see KNOWN LIMITATION on the definition above:
        // fully wired, but gameState.players.length is always 4 in the
        // current game, so requiredPlayerCount (2) never matches. Left
        // as real, config-driven logic rather than removed, so a future
        // 2-player Duel mode lights this up with no further changes.
        const duelDef = await getEffectiveDef("duel_master");
        const requiredPlayers = duelDef?.requiredPlayerCount ?? 2;
        if (gameState.players.length === requiredPlayers) await unlock("duel_master");
    }

    // Session tracking is per-game; clear it now that this game's result
    // has been fully evaluated (nextTurn()/finishGame() aren't called
    // again for this game, but this also protects against any stray
    // re-entry).
    _session = freshSession();
}
