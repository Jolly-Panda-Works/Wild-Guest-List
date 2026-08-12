/**
 * Card → Ability → Presentation Strategy registry.
 *
 * Two layers, kept deliberately separate:
 *
 *  1. Generic card lifecycle (enters queue / repositions / leaves the
 *     queue / enters Party / enters Trash) — that's js/presentation/flip.js
 *     (the actual DOM motion primitive) plus the event handlers in
 *     js/ui/game-ui.js's presenter. Those never know or care which
 *     specific animal caused an event.
 *
 *  2. Ability-specific *flavor* — which of those generic transitions gets
 *     which reaction class, easing, and duration. THIS file is that
 *     layer: one small data table per ability instead of per-card `if`
 *     branches scattered through the generic handlers, or one giant
 *     switch keyed on card power.
 *
 * abilities.js tags every event it emits with a semantic `reason` /
 * `cause` / `flavor` string (e.g. reason:"rush" only ever comes from
 * Lion, cause:"scared" only from Lion's Monkeys / the Monkey pair) —
 * those strings are already effectively an ability id in most cases.
 * The one genuinely ability-agnostic flavor is "anticipate" (many
 * animals get a short wind-up beat before their main action), which is
 * why events are additionally tagged with `abilityPower` in
 * turnManager.js — that's what ANTICIPATION below is keyed on.
 */

export const ABILITY = {
    WEASEL: 1, MONKEY: 2, KANGAROO: 3, PARROT: 4, SLOTH_BEAR: 5,
    SEAL: 6, ZEBRA: 7, GIRAFFE: 8, SNAKE: 9, CROCODILE: 10,
    HIPPO: 11, LION: 12,
};

/* ── Anticipation: the "wind-up" beat before an ability's main action.
   Only abilities whose action is a visible queue-wide or dramatic change
   get one — keeps ordinary plays fast (see the brief's "avoid animation
   fatigue"). Missing here = no anticipation beat for that ability. ──── */
export const ANTICIPATION = {
    [ABILITY.LION]:      { className: "card-anticipate-rush",    duration: 180 },
    [ABILITY.HIPPO]:     { className: "card-anticipate-push",    duration: 200 },
    [ABILITY.CROCODILE]: { className: "card-anticipate-bite",    duration: 220 },
    [ABILITY.KANGAROO]:  { className: "card-anticipate-jump",    duration: 180 },
    [ABILITY.SEAL]:      { className: "card-anticipate-reverse", duration: 200 },
    [ABILITY.SNAKE]:     { className: "card-anticipate-sort",    duration: 200 },
    [ABILITY.GIRAFFE]:   { className: "card-anticipate-hop",     duration: 120 },
};

export const DEFAULT_ANTICIPATION = { className: "card-anticipate-generic", duration: 150 };

/* ── Reaction flavors: cards reacting to something ANOTHER card's
   ability just did to them. Keyed directly by the semantic flavor tag
   abilities.js already attaches (no abilityPower lookup needed — these
   are already unambiguous).
   `duration` must equal each class's own CSS animation-duration exactly —
   playBeat removes the class on a plain timer, independent of the
   animation, so a mismatch snaps the card back to rest mid-motion
   instead of finishing the beat smoothly (see the matching note in
   js/ui/game-ui.js). ──── */
export const REACTION = {
    block:       { className: "card-block-react",   duration: 240 }, // Zebra stops Hippo/Crocodile; a Lion holds its ground
    recoil:      { className: "card-croc-recoil",    duration: 260 }, // Crocodile, satisfied, after eating
    "hopped-over": { className: "card-hopped-over",  duration: 220 }, // a card Kangaroo just leapt over
    group:       { className: "card-monkey-group",   duration: 200 }, // the Monkey troop banding together
};

export const DEFAULT_REACTION = { className: "card-block-react", duration: 240 };
