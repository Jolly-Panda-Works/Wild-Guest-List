/**
 * Contextual card guidance.
 *
 * A small, self-contained layer on top of the existing Help modal /
 * Tutorial slides / in-game Walkthrough (js/game/help.js, js/ui/tutorial-ui.js,
 * js/ui/walkthrough.js) — it does not replace or modify any of them.
 *
 * After a played card's ability has finished animating, this shows a
 * short "here's what just happened" popup for that specific card, built
 * entirely from data already in the project (data/cardInfo.json via
 * js/services/dataLoader.js, plus the semantic events the presentation
 * layer already produces — see js/presentation/events.js) rather than a
 * hand-written explanation per animal.
 *
 * Gating (see shouldShowGuidance):
 *   - never while the in-game Walkthrough is actively running (it has its
 *     own steps for this) — this layer picks up once that's done/skipped
 *   - shown only if the player opted in — either at the "show step-by-step
 *     help?" prompt asked before every new game starts (main.js, right
 *     before startGame()), or by turning "Step-by-step Guidance" on in
 *     Settings mid-game. Both write the same localStorage setting, so
 *     they always agree.
 *   - only once per ability, ever — tracked in localStorage so it's
 *     never "excessive", per ability, across games and sessions
 */

import { t, getLang } from "../i18n.js";
import { loadCardData } from "../services/dataLoader.js";
import { isWalkthroughActive } from "./walkthrough.js";
import { EVENTS } from "../presentation/events.js";
import { isReducedMotion } from "../presentation/flip.js";

const SETTING_KEY   = "wgl_stepGuidance";
const EXPLAINED_KEY = "wgl_explainedAbilities";

/* ─────────────────────────────────────────
   Settings persistence (localStorage — same mechanism the rest of the
   project already uses for wgl_lang / walkthroughSeen / tutorialSeen)
───────────────────────────────────────── */

export function isStepGuidanceEnabled() {
    return localStorage.getItem(SETTING_KEY) === "true";
}

export function setStepGuidanceEnabled(enabled) {
    const wasEnabled = isStepGuidanceEnabled();
    localStorage.setItem(SETTING_KEY, enabled ? "true" : "false");

    // Turning the setting ON — whether from off, or for the very first
    // time — should reliably start showing per-card guidance again from
    // here on, even for abilities already marked "explained" in an
    // earlier session/game. Otherwise a player who re-enables this
    // mid-game (or after having played with it on before) can end up
    // seeing nothing at all, silently suppressed by old dismissal
    // history that has nothing to do with their current request.
    // Re-saving an already-matching value (off->off, on->on) never
    // touches that history, so this can't turn into a reset loop.
    if (enabled && !wasEnabled) {
        resetExplainedAbilities();
    }
}

/** Wires the Settings toggle. Safe to call more than once (e.g. once at
 *  boot so a pre-game toggle in the splash Settings modal isn't silently
 *  ignored, and again from initializeUI() once the game has started) —
 *  the checked state is always re-synced, but the change listener is
 *  only ever attached a single time. */
export function initStepGuidanceToggle() {
    const toggle = document.getElementById("stepGuidanceToggle");
    if (!toggle) return;

    toggle.checked = isStepGuidanceEnabled();

    if (toggle._stepGuidanceWired) return;
    toggle._stepGuidanceWired = true;

    toggle.addEventListener("change", () => {
        // Persisted immediately — the very next card played reads this
        // fresh (see shouldShowGuidance), so the setting takes effect
        // right away, not just on the next game.
        setStepGuidanceEnabled(toggle.checked);
    });
}

/* ─────────────────────────────────────────
   "Already explained this ability" tracking
───────────────────────────────────────── */

function getExplainedIds() {
    try {
        const raw = localStorage.getItem(EXPLAINED_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function hasBeenExplained(cardId) {
    return getExplainedIds().includes(cardId);
}

function markExplained(cardId) {
    const ids = getExplainedIds();
    if (!ids.includes(cardId)) {
        ids.push(cardId);
        localStorage.setItem(EXPLAINED_KEY, JSON.stringify(ids));
    }
}

/** Clears "already explained" history so every ability's guidance can
 *  show again. Called automatically when the setting is turned on —
 *  see setStepGuidanceEnabled() above — but also exported in case it's
 *  ever useful on its own. */
export function resetExplainedAbilities() {
    localStorage.removeItem(EXPLAINED_KEY);
}

/* ─────────────────────────────────────────
   Gating
───────────────────────────────────────── */

/**
 * Should the contextual popup show for this card right now?
 * (card here is the in-play card object — its `id` matches cardInfo.json's
 * `id`/`power` field, since that's how the deck is built.)
 *
 * The player is asked directly, once per new game (see the guidance
 * prompt wired in main.js, right before startGame()), whether they want
 * this — that explicit answer is what isStepGuidanceEnabled() reflects,
 * and it's the sole gate here. It's persisted the same way the Settings
 * toggle is, so a "yes" at the prompt also shows as "on" in Settings,
 * and can be changed there mid-game too.
 */
export function shouldShowGuidance(card) {
    if (!card) return false;
    if (isWalkthroughActive()) return false; // the walkthrough owns this moment instead
    if (hasBeenExplained(card.id)) return false;
    return isStepGuidanceEnabled();
}

/* ─────────────────────────────────────────
   Building a reusable, data-driven payload
───────────────────────────────────────── */

/**
 * Turns (card, beforeQueue snapshot, afterQueue snapshot, the events this
 * ability emitted) into the structured shape the popup renders from.
 * This is the one place that understands "what kind of thing happened" —
 * everything downstream (renderGuidance) just draws whatever it's given,
 * so a new ability never needs a new hardcoded explanation component.
 */
export function buildGuidancePayload(card, beforeQueue, afterQueue, events) {
    const removed = [];
    const jumped  = [];
    const escaped = [];

    (events || []).forEach(evt => {
        if (evt.type === EVENTS.CARD_EATEN || evt.type === EVENTS.CARD_REMOVED) removed.push(evt.card);
        else if (evt.type === EVENTS.CARD_JUMPED) jumped.push(evt.card);
        else if (evt.type === EVENTS.CARD_ESCAPED) escaped.push(evt.card);
    });

    let affected = [];
    let kind = "none";
    let destination = "none";

    if (removed.length)      { affected = removed; kind = "removed"; destination = "trash"; }
    else if (jumped.length)  { affected = jumped;  kind = "jumped";  destination = "queue"; }
    else if (escaped.length) { affected = escaped; kind = "escaped"; destination = "queue"; }
    else {
        // Pure reorder (Giraffe/Snake/Seal/Lion-to-front/no-op) — nothing
        // was individually singled out, so highlight the card that was
        // actually played instead of showing no emphasis at all.
        affected = [card];
        destination = queueOrderChanged(beforeQueue, afterQueue) ? "queue" : "none";
    }

    return { card, beforeQueue, afterQueue, affected, kind, destination };
}

function queueOrderChanged(before, after) {
    if (before.length !== after.length) return true;
    return before.some((c, i) => after[i] !== c);
}

/* ─────────────────────────────────────────
   Rendering
───────────────────────────────────────── */

function trOf(cardLike) {
    const lang = getLang();
    return cardLike.translations?.[lang] || {};
}

/** cardInfo.json's description is authored as "Short Title. Explanation..."
 *  in every language — reuse it instead of adding a duplicate field. */
function splitAbilityTitle(description) {
    if (!description) return { title: "", body: "" };
    const idx = description.indexOf(".");
    if (idx === -1) return { title: description, body: "" };
    return { title: description.slice(0, idx).trim(), body: description.slice(idx + 1).trim() };
}

function visualFor(cardLike) {
    if (cardLike.image) {
        return `<img class="guide-visual-img" src="${cardLike.image}" alt="" />`;
    }
    return `<div class="guide-visual-emoji">${cardLike.emoji || cardLike.animal || ""}</div>`;
}

function chipFor(cardLike, { affectedSet, kind }) {
    const isAffected = affectedSet.has(cardLike.uid);
    const cls = ["guide-chip"];
    let badge = "";
    if (isAffected) {
        cls.push("guide-chip-affected", `guide-chip-${kind}`);
        badge = kind === "removed" ? "🗑️" : kind === "jumped" ? "⤴️" : kind === "escaped" ? "↩️" : "⭐";
    }
    const visual = cardLike.image
        ? `<img class="guide-chip-img" src="${cardLike.image}" alt="" />`
        : `<div class="guide-chip-emoji">${cardLike.emoji || cardLike.animal || ""}</div>`;

    return `
        <div class="${cls.join(" ")}">
            ${visual}
            <span class="guide-chip-power">${cardLike.power}</span>
            ${badge ? `<span class="guide-chip-badge">${badge}</span>` : ""}
        </div>
    `;
}

function renderQueueRow(cards, affectedSet, kind) {
    if (!cards.length) return `<div class="guide-queue-row guide-queue-empty"></div>`;
    return `<div class="guide-queue-row">${cards.map(c => chipFor(c, { affectedSet, kind })).join("")}</div>`;
}

async function renderGuidance(payload) {
    const { CARD_INFO } = await loadCardData();
    const info = CARD_INFO.find(c => c.power === payload.card.power) || {};
    const tr   = trOf(info);

    const name        = tr.name || info.name || payload.card.name;
    const description = tr.description || info.description || "";
    const { title, body } = splitAbilityTitle(description);

    document.getElementById("guideVisual").innerHTML = visualFor({ ...info, ...tr });
    document.getElementById("guideCardName").textContent = name;
    document.getElementById("guideAbilityTitle").textContent = title;
    document.getElementById("guideDesc").textContent = body || description;

    const affectedSet = new Set(payload.affected.map(c => c.uid));

    const diagram = document.getElementById("guideDiagram");
    let html = `
        <div class="guide-queue-block">
            <div class="guide-queue-label">${t("queueBefore")}</div>
            ${renderQueueRow(payload.beforeQueue, affectedSet, payload.kind)}
        </div>
        <div class="guide-diagram-arrow">→</div>
        <div class="guide-queue-block">
            <div class="guide-queue-label">${t("queueAfter")}</div>
            ${renderQueueRow(payload.afterQueue, affectedSet, payload.kind)}
        </div>
    `;

    if (payload.destination === "trash") {
        html += `
            <div class="guide-queue-block guide-destination">
                <div class="guide-queue-label">🗑️</div>
                ${renderQueueRow(payload.affected, affectedSet, payload.kind)}
            </div>
        `;
    }

    diagram.innerHTML = html;
}

/* ─────────────────────────────────────────
   Public: show + await Continue
───────────────────────────────────────── */

let _openHandlers = null;

/**
 * Shows the popup for `payload` and resolves once the player dismisses it
 * (Continue button, backdrop click, or Escape). Never rejects — a
 * rendering problem still resolves so the caller (turnManager) can never
 * get stuck waiting on it.
 */
export function showCardGuidance(payload) {
    return new Promise(async resolve => {
        const modal = document.getElementById("cardGuidanceModal");
        if (!modal) { resolve(); return; }

        try {
            await renderGuidance(payload);
        } catch (e) {
            console.error("[cardGuidance] failed to render, skipping popup", e);
            resolve();
            return;
        }

        const continueBtn = document.getElementById("guideContinueBtn");

        const finish = () => {
            modal.classList.add("hidden");
            modal.removeAttribute("aria-hidden");
            _detach();
            markExplained(payload.card.id);
            resolve();
        };

        const onBackdrop = e => { if (e.target === modal) finish(); };
        const onKeydown  = e => {
            if (e.key === "Escape" || e.key === "Enter") finish();
        };

        function _detach() {
            modal.removeEventListener("click", onBackdrop);
            document.removeEventListener("keydown", onKeydown);
            continueBtn.removeEventListener("click", finish);
            _openHandlers = null;
        }

        // Defensive: if a previous popup somehow never cleaned up, detach
        // it before attaching new listeners rather than stacking them.
        if (_openHandlers) _openHandlers();
        _openHandlers = _detach;

        continueBtn.addEventListener("click", finish);
        modal.addEventListener("click", onBackdrop);
        document.addEventListener("keydown", onKeydown);

        modal.classList.remove("hidden");
        modal.classList.toggle("guide-reduced-motion", isReducedMotion());
        continueBtn.focus();
    });
}
