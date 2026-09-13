# Changelog

All notable changes to **Wild Guest List** are recorded here, most recent first.

This file was consolidated from a changelog that had grown to live inline inside `README.md`'s "Version" section (relocated here verbatim, in a documentation-audit pass, to keep `README.md` focused on onboarding rather than release history — see `AGENTS.md` § Documentation Maintenance). The authoritative current version number always lives in `data/config.json` → `app.version`; this file records the history behind it.

> **Note on `version_history.txt`:** this repository also contains an older `version_history.txt` file at the project root. Its most recent entry is `1.37.9`, while the version below (and `data/config.json`) is already past that point — it appears to have stopped being updated at some point after 1.37.9 in favor of the changelog that had been accumulating in `README.md` (now this file). It has been left as-is rather than edited or merged, since reconciling two independently-worded historical logs risks misstating what actually shipped in either. See the documentation audit findings for this note in context.

---

**Gameplay UI — Move Turn Indicator above opponents (1.44.4):**
Focused layout correction: the Turn Indicator (`#gameState`) now sits
at the top of the gameplay board, directly above the opponent row,
instead of directly above the local player's hand. Same component,
same single source of turn state — only its position changed.

- **`game.html`:** moved `#gameState` out of `#centerArea` (where it
  sat directly above `#handArea`) to be a direct `#gameLayout` child,
  placed immediately before `#otherPlayers`.
- **`css/style.css` — Desktop/Tablet tabletop grid** (`@media
  (min-width: 601px) and (pointer: fine)`): `#gameLayout` gained a new
  `turn` grid row, spanning the opponent/board columns, directly above
  `oppTop`; `#leftUtilityColumn` (`utility`) now spans all three rows
  instead of two, so it still runs the full height of the board.
  `#gameState` was given `grid-area: turn` in place of its old
  "flex item inside `#centerArea`" rule.
- **`css/style.css` — Mobile flex column** (`@media (max-width:
  600px)`, both the primary and the later effective order block):
  `#gameState` now gets an explicit `order` placing it before
  `#otherPlayers` (previously it had no order of its own, since it
  used to be nested inside `#centerArea` instead).
- **Touch/Mobile Portrait** (`@media (pointer: coarse) and
  (orientation: portrait)`): no CSS change needed — this tier has
  always relied on plain DOM source order with no `order` overrides,
  so moving the markup was sufficient; only the explanatory comment
  was updated.
- No duplicate turn state was introduced: `renderCurrentTurn()`/
  `renderTurnTimer()` in `js/ui/game-ui.js` were not touched, and the
  opponents' existing `.current-turn` glow (in `renderOtherPlayers()`)
  remains the only per-seat signal — `#gameState` is still the one
  shared indicator.
- **Files changed:** `game.html`, `css/style.css`,
  `tests/tabletopLayout.test.mjs` (updated the DOM-position assertion
  to match the new location).
- Verified against the test suite: 120/121 passing, same one
  pre-existing unrelated failure (`header markup has a dedicated Party
  column cell carrying the partyEmoji icon`) — nothing newly broken.

---

**Gameplay UI — Remove Tutorial button from header (1.44.3):**
Focused header cleanup: removed the Tutorial control from the
gameplay screen's top-right controls, leaving `[ Help ] [ Pause ]`.
No header redesign, no gameplay-logic changes, and the Tutorial
feature itself was not touched.

- **`game.html`:** removed the `#tutorialBtn` `<button>` from
  `#topRight`. `#topRight` is a plain flex row (`justify-content:
  flex-end`, no fixed column/grid track per button), so Help and
  Pause simply close up and stay right-aligned — no empty gap, no
  layout-shift of `#topCenter`/the central gameplay area.
- **`js/ui/modal-ui.js`:** left the `#tutorialBtn` click listener in
  place — it already used the file's established optional-chained
  no-op pattern (the same convention already documented there for
  `#aboutBtn`), so it's a harmless no-op on the gameplay page now that
  the element is gone. Updated the comment to match.
- **Tutorial system preserved elsewhere:** Home (`index.html`) keeps
  its own, separate entry point — `#homeHowToPlayBtn` in the secondary
  nav row — which opens the same `#tutorialModal`/`openTutorial()`
  untouched. No Tutorial markup, data, state, or i18n keys were
  deleted.
- **Files changed:** `game.html`, `js/ui/modal-ui.js`.
- Verified against the test suite: 120/121 passing, same one
  pre-existing unrelated failure (`header markup has a dedicated Party
  column cell carrying the partyEmoji icon`) seen in prior sessions —
  nothing newly broken.

---

**Gameplay UI — Enlarge player identity (avatar, name, rank icon) (1.44.2):**
Focused readability fix: increased the size of the player-identity
elements (avatar, name, rank badge) shown for both the local player
(`#playerDeckInfo`, above the hand) and opponents (`.other-player-row`,
in the left/top/right seat slots) on the gameplay screen. No layout
redesign, no gameplay-logic changes.

- **Local player identity:** `.player-deck-avatar-wrap` 26px → 34px
  (20px → 26px on ≤600px), `.player-deck-name` 12px → 14px (10px →
  12px on ≤600px).
- **Opponent identity:** `.other-avatar` 20px → 26px (16px → 20px on
  ≤600px, clamp(12px,1.3vw,20px) → clamp(16px,1.6vw,26px) on the
  Desktop/Tablet tabletop grid); opponent name chip
  (`.other-player-row .player-label`) 12px → 14px (11px → 13px on the
  Desktop/Tablet tabletop grid).
- **Rank badge (shared by both):** `.player-rank-badge` font-size and
  icon-image size 14px → 18px.
- Sizes were bumped at every existing breakpoint for these selectors
  (base, `max-width: 600px`, and the `min-width: 601px and
  pointer: fine` tabletop-grid squeeze) so the increase holds
  proportionally across Mobile, Tablet, and Desktop rather than only
  on one screen size. No new breakpoints were added.
- No RTL-specific sizing rules existed for these elements (RTL is
  handled via layout direction elsewhere), so Persian/RTL inherits the
  same larger sizes automatically. Existing name-ellipsis truncation
  was left untouched, so longer localized names still degrade
  gracefully.
- **Files changed:** `css/style.css` only — no JS, markup, or
  gameplay-logic changes.

---

**Gameplay screen — Layout Corrections: fixed-height Log, dedicated utility column, turn indicator above player, Leaderboard panel removed (1.44.1):**
Follow-up correction pass on 1.44.0's Tabletop layout, fixing four
structural issues without redesigning or reverting the tabletop
layout itself.

- **Root cause of the Game Log growth bug:** `#gameLog` was a plain
  CSS Grid item sized by an `auto`-height track. Since that track
  spanned the *full width* of `#gameLayout`, every new log entry grew
  the track — which shifted every row below it (the left-seated
  opponent, the board, the right-seated opponent) down, and, because
  the left-seated opponent shared `#gameLog`'s own column, put a
  *player* directly underneath a growing Game Log. Two things fixed
  this together: (1) `#gameLog` now gets a fixed `flex: 0 0 45%`
  (never `max-height`, never sized by content) with `overflow-y: auto`
  on its scrollable body only, so its own box can't grow; (2) the
  left-seated opponent moved out of Log/Chat's column entirely (see
  below), so even if it could still grow, nothing else would move.
- **Dedicated Left Utility Column:** new `#leftUtilityColumn` wraps
  `#gameLog` and `#chatPanel` only — no player/opponent element is
  nested inside it, or shares a grid track with it, ever.
  `.opp-slot[data-slot="left"]` now gets its own `oppLeft` grid area,
  fully independent of `utility`.
- **Turn Indicator above the player:** `#gameState` moved (in the DOM)
  from its own row above the board into `#centerArea`, directly above
  `#handArea`/`#playerDeckInfo` — literally above the local player's
  info/hand on every layout now, not just a separate strip near the
  board. It's still the one shared indicator (already showed "Your
  Turn" vs "ALICE'S TURN" by name/icon — see `renderCurrentTurn()`),
  never duplicated per seat; for opponents, the pre-existing
  `.other-player-row.current-turn` highlight (already applied to their
  own component) is the equivalent treatment, reused rather than
  building a second turn-state UI.
- **Standalone Leaderboard panel removed from the gameplay screen:**
  `#leaderboardBtn`/`#mobileLeaderboard`/`#mobileLeaderboardInline`
  deleted from `game.html`. Nothing else needed to change —
  `js/ui/mobile-ui.js` was already fully null-safe (optional chaining
  throughout) for a missing button/panel, and `renderLeaderboard()`
  (`js/ui/leaderboard-ui.js`) already no-ops per-target when a target
  element doesn't exist. All underlying score/rank data and functions
  (`getPlayerRankIndexes`, `getRankedPlayers`, `RANK_ICONS`) are
  untouched and still run every render.
- **Player rank beside name:** already implemented before this task —
  both `renderOtherPlayers()`'s opponent badges and
  `renderPlayerDeckInfo()`'s local-player badge
  (`#playerDeckRankBadge`) already show a live medal-style rank icon
  next to the player's name, recomputed from `gameState` every render.
  Verified this still works after the above changes; nothing rebuilt.

- `game.html` — `#leftUtilityColumn` wraps `#gameLog`+`#chatPanel`;
  `#gameState` moved inside `#centerArea` above `#handArea`;
  `#leaderboardBtn`/`#mobileLeaderboard` removed.
- `css/style.css` — `#gameLayout`'s Desktop/Tablet grid re-shaped to
  `utility | oppLeft | board | oppRight` columns (`oppTop` spans the
  latter three); `#gameLog`/`#chatPanel` get fixed `flex-basis` shares
  of `#leftUtilityColumn` instead of grid areas of their own; removed
  two now-stale `#gameState { order: -1; }` rules left over from when
  it was a direct `#gameLayout` child (would otherwise have
  incorrectly reordered it inside `#centerArea`'s own flex column,
  above the Queue instead of above the Hand).
- `js/ui/log-ui.js` — `renderLog()` now renders `gameState.logs` newest
  entry first (display order only, via `.slice().reverse()` —
  `gameState.logs` itself is never mutated/reordered); both targets
  scroll to `0` instead of `scrollHeight` to match.
- `js/ui/walkthrough.js` + `data/i18n.json` (en/fa/ar/tr) — tutorial
  step 6 no longer targets the removed Standings button; retargeted to
  `#railLogBtn` with copy updated to describe Log + the
  now-beside-the-name rank badge instead.
- `tests/tabletopLayout.test.mjs` — new/updated coverage: fixed
  `flex-basis` (not `max-height`) on `#gameLog`, its scrollable body's
  `overflow-y`/`min-height`, `renderLog()`'s newest-first order
  (without mutating `gameState.logs`), `#gameState`'s new DOM position,
  the Leaderboard panel's removal, no opponent slot nested inside
  `#leftUtilityColumn`, and the re-shaped grid's area names.
- `tests/desktopPartyTrash.test.mjs` — widened its Desktop-media-block
  slice length again (`16400` → `19500` chars) for the same reason as
  1.44.0: the block grew further and some of its target rules fell
  outside the old slice.
- `README.md`/`CHANGELOG.md` — version 1.44.0 → 1.44.1.

**Known limitation:** same as 1.44.0 — no live browser in this
environment, so verified via CSS-source/markup-level tests and manual
review (rectangular grid-area check, `order`-property scope audit for
the two removed stale rules, cascade check for the Chat/Standings
popup split) rather than an actual rendered screenshot or click-through.
A real visual pass (2/3/4 players, en/fa/ar/tr, several log-entry
counts including 20+, several viewport heights) is recommended before
shipping.

---

**Gameplay screen — Tabletop layout: per-side opponents + persistent Log/Chat (1.44.0):**
Requested as a redesign of the gameplay screen's Desktop/Tablet
(fine-pointer, ≥601px) composition, following a reference-screenshot
brief specifying a classic digital-tabletop arrangement. This
deliberately reverses two earlier decisions on this same breakpoint —
opponents seated left/top/right of the board instead of one shared
row (1.36.11 moved *away* from a per-side `#topPlayer`/`#leftPlayer`/
`#rightPlayer` layout), and Game Log/Chat as persistent panels again
instead of popups (1.36.12 moved Chat out of a permanent sidebar
specifically because a fixed `height: 140px` there was cramped). This
was a deliberate, explicitly confirmed reversal, not an oversight —
the root causes those two changes fixed are addressed directly rather
than reintroduced:
- **Opponent row overflow (1.36.11's motivation):** the old row
  squeezed however many opponents there were into one shared strip.
  The new layout gives each opponent exactly one of three fixed grid
  cells (`#oppSlotLeft`/`#oppSlotTop`/`#oppSlotRight`) — a slot never
  holds more than one player, so there's nothing left to squeeze.
- **Cramped Chat panel (1.36.12's motivation):** the old sidebar's
  Chat had a fixed `height: 140px`. The new `#chatPanel` sits in a
  real CSS Grid row (`flex: 1` within it) sized by however much room
  the "chat" grid row actually has, plus its own collapse toggle if a
  player wants that room back for the board.

Touch/mobile (`pointer: coarse`, and any width ≤600px regardless of
pointer) is completely unaffected: opponents stay one row, and
Log/Chat stay popup-only via `#railLogBtn`/`#railChatBtn` — none of
this is reachable or visible there.

- `js/ui/game-ui.js` — `renderOtherPlayers()` (now exported) assigns
  each opponent to exactly one of the three fixed slots by seat order
  and count: 1 opponent → top (face-to-face), 2 → left+right
  (flanking), 3 → left+top+right. A slot nobody is assigned to is left
  with zero children.
- `game.html` — `#otherPlayers` now wraps three fixed
  `#oppSlotLeft`/`#oppSlotTop`/`#oppSlotRight` containers instead of
  being a flat, dynamically-populated row. Added the new persistent
  `#gameLog` panel (`#gameLogContent` body, mirrors `#logModal`'s
  `#mobileLogContent`). `#chatPanel` gained a `.panel-collapse-btn`
  alongside its existing mobile-only close button; both it and
  `#gameLog` are marked `.collapsible-panel`.
- `js/ui/log-ui.js` — `renderLog()` now writes its one generated
  markup string into both `#mobileLogContent` (popup, every layout)
  and `#gameLogContent` (persistent panel, Desktop/Tablet only) — one
  render, two targets, no duplicated log logic or state.
- `js/ui/panelCollapse-ui.js` *(new)* — wires the shared
  `.panel-collapse-btn`/`.collapsed` toggle for `#gameLog`/`#chatPanel`;
  called from `js/game-main.js` alongside the existing mobile-UI init.
  Purely presentational — never touches `gameState` or `gameState.logs`.
- `css/style.css` —
  - `@media (min-width: 601px) and (pointer: fine)`: `#gameLayout`
    becomes a CSS Grid (`log`/`oppTop`/`oppLeft`/`turn`/`oppRight`/
    `board`/`chat` named areas); `#otherPlayers` unwraps via
    `display: contents` (the same technique already used for
    `#queuePartyTrashRow`) so its three slots place directly onto that
    grid; `#gameLog`/`#chatPanel` become real flex-column panels
    instead of centered popups; `#railLogBtn`/`#railChatBtn` (now
    redundant) are hidden; `#mobileSideRail` (left holding only the
    Standings button) becomes a small floating control instead of
    reserving a grid row for a single button. The pre-existing
    `#mobileLeaderboard, #chatPanel { position: fixed; ... }` Desktop
    popup rule is split so `#chatPanel` is no longer part of it (it's
    no longer a popup at all there) — Standings alone keeps that
    behavior.
  - New `.opp-slot`/`.opp-slot:empty` (hides an unassigned slot
    entirely — no empty seat is ever rendered), `.collapsible-panel`/
    `.panel-collapse-btn`/`.panel-collapse-body` (generic collapse
    toggle shared by both new panels), and `#gameLog`'s own base panel
    styling (`display: none` off the Desktop/Tablet breakpoint — Log's
    only Mobile surface stays `#logModal`).
  - RTL note: this uses `grid-template-areas`, which mirrors
    automatically under `direction: rtl` (already set on
    `<html dir>` by `js/i18n.js` for `fa`/`ar`) — left/right opponent
    seating flips correctly for those languages with no extra rule.
- `data/config.json` — added a `chevronDown` icon glyph (`▾`) for the
  new collapse toggle, no existing icon fit.
- `data/i18n.json` — added `panelCollapseToggle` (en/fa/ar/tr) as the
  toggle button's `aria-label`.
- `tests/tabletopLayout.test.mjs` *(new)* — opponent slot assignment by
  count/seat order, empty-slot behavior, `renderLog()` feeding both
  targets identically, and the Desktop/Tablet grid actually placing
  each element on its named area.
- `tests/desktopPartyTrash.test.mjs` — three of its Desktop-media-block
  slice lengths (`6000`/`9000` chars from the media query's start) were
  too short to still reach the Party/Trash-flanking-the-Queue rules
  once this task's new CSS was added ahead of them in the same media
  block; widened to `16400` so the same assertions still run against
  the same real rules (no change to what's being asserted).

**Known limitation:** this environment has no live browser, so the
layout was verified by CSS-source/markup-level tests and manual
reasoning about the grid (rectangular-area check, cascade/specificity
audit for the split popup rule above) rather than an actual rendered
screenshot or click-through at each breakpoint/player-count/language.
A real visual pass (2/3/4 players, en/fa/ar/tr, common desktop/tablet
widths) is recommended before shipping.

---

**Style — Achievements redesigned as a vertical list, not a card grid (1.43.7):**
The Achievement Collection (Profile → Achievements) previously laid
achievements out as a responsive multi-column card grid
(`.ach-grid`/`.ach-card`, `grid-template-columns: repeat(auto-fill,
minmax(132px, 1fr))`, 2 columns on mobile). Redesigned into a
single-column vertical list (`.ach-list`/`.ach-item`) so every
achievement — including the "Recently Unlocked" featured slot, which
shares the same row markup — is one horizontal row: icon on the left;
title and (only for completed achievements with a real unlock date)
the completion date on the same line on the right; description below;
an optional progress bar below that for in-progress count-type
achievements. No table/multi-column layout remains at any width.
- `js/ui/profile-ui.js` — `renderAchievementCard()` now emits the row
  markup above instead of the old centered card; `applyAchievementFilter()`
  updated for the renamed classes. No change to achievement unlock
  logic, progress calculation, persistence, or data models
  (`js/services/achievements.js` untouched) — this is presentation-only.
- `css/style.css` — `.ach-grid`/`.ach-card*` replaced with
  `.ach-list`/`.ach-item*`. The title/date row uses `flex-wrap` so the
  date stays right-aligned on desktop and gracefully drops to its own
  right-aligned line on narrow/mobile widths instead of overflowing,
  including for long titles; `.ach-item-body` uses `min-width: 0` so
  long titles/descriptions wrap instead of forcing horizontal
  overflow. Locked vs. unlocked stays visually distinguishable via the
  existing warm border/background treatment and the icon badge
  (check vs. lock), same as before; the separate "Unlocked"/"Locked"
  text pill was dropped from the visible row (redundant with those
  signals and the date's presence/absence) but the status label is
  still included in each row's `aria-label` for screen readers.
- `index.html` — `#profileAchievementsList` now carries `ach-list`
  instead of `ach-grid`; doc comments updated to describe the list
  layout instead of a card grid.
- Verified: `tests/achievements.test.mjs` (pure achievement-logic
  tests, no DOM) all pass unchanged, confirming achievement logic
  itself was not touched. Manually verified via a throwaway Playwright
  screenshot harness (not committed) at desktop (1200px) and mobile
  portrait (375px) widths, covering a completed achievement with a
  date, an in-progress count-type achievement with its progress bar, a
  locked achievement with no progress bar, and a long title/long
  description case to confirm wrapping with no horizontal overflow.

---

**Fix — Tutorial/Help content audit: drag-to-play, Card Power, and a stale Monkey description (1.43.6):**
A full audit of the player education system (tutorial slides, in-game
walkthrough, Card Guide, contextual hints) against the current UI and
implementation turned up several places where content described an
older version of the game:
- `wt7Text` (in-game walkthrough step 7, `data/i18n.json`, all 4
  languages) told players to "tap the card to play it." Playing is
  drag-only now (`js/ui/game-ui.js`'s `wireHandCardDrag()` —
  `// a plain tap — playing is drag-only now`); this was the one step
  the walkthrough blocks on (`waitForCardPlay`), so it could strand a
  new player. Reworded to describe the drag-to-Queue gesture and the
  live Ability Preview, in all 4 languages.
- Tutorial slide 3 (`data/tutorial.json`, `tutSlide3Text`/`tutSlide3Title`
  keys in `data/i18n.json`) was vague ("choose one animal card...
  placed at the back of the queue") and never mentioned dragging or
  the Ability Preview. Updated, all 4 languages.
- Tutorial slide 4 never mentioned Card Power, even though it's a
  restored, visible per-card attribute (`tests/cardPowerDisplay.test.mjs`)
  that several abilities key off of. Added one sentence introducing it
  — explicitly as a gameplay-interaction attribute, not a victory
  metric (victory is Party Card Count only — `js/game/matchOutcome.js`
  has no Power tie-breaker and no Sudden Death, confirmed unchanged).
  All 4 languages.
- `cardHelpHintText` had no entry in `data/i18n.json` at all, so the
  "hold a card" hint (`js/ui/cardHelpHint.js`) rendered the literal
  key string instead of real text. Added the missing string. While
  investigating this, found the hint (and the long-press gesture it's
  built on, `js/ui/longPress.js`) is never actually wired up anywhere
  in `game-ui.js` — logged as a new finding in `docs/ARCHITECTURE.md`
  § 14 rather than fixed here, since wiring a new gesture into
  `game-ui.js` is a UI-behavior change beyond tutorial/help-content
  scope.
- `data/cardInfo.json`'s Monkey `description`/`example` (Card Guide
  content) said the ability "removes all Crocodiles and Hippos and
  moves them to the front" — the implementation sends them to Trash,
  not the front. This mismatch was already flagged in
  `docs/ANIMAL_ABILITIES.md`'s Monkey entry; fixed the flavor text to
  match, in all 4 languages, and updated that doc's note plus
  `docs/ARCHITECTURE.md` § 14 item 2 to mark it resolved.
- Removed a `"video"` field on the last tutorial slide
  (`data/tutorial.json`) that pointed at an unrelated YouTube video
  instead of real gameplay footage, rather than leave misleading
  tutorial content in place.

Everything else audited — the Queue-resolves-at-5 explanation, the
12-cards-per-player match structure, WINNER/DRAW/LOSS wording, the
walkthrough's dynamic queue-resolution step, and the Card Guide's
Power badge — already matched the current implementation and was left
unchanged.

---

**Fix — Bot's Queue Ability Preview now appears AFTER its card is visible, not before (1.43.5):**
`previewThenPlayCard()` (`js/game/turnManager.js`) used to show the
Queue Ability Preview (arrows/icons on cards already in the Queue —
`showQueuePreview`, `js/ui/previewOverlay-ui.js`) for a fixed 1.1s
*before* the Bot's card had even appeared on its deck — so the player
saw the *effect* on the Queue before knowing *which card* caused it.
`cardEnteredQueue()` (`js/ui/game-ui.js`) now takes an optional
`onRevealed` callback, fired the instant the Bot's real card finishes
its reveal on the deck (right as the Hold phase begins) — threaded
through `director.presentCardEnteredQueue()` and `playCard()`
(`js/presentation/director.js`, `js/game/turnManager.js`). The Preview
is shown from that callback instead of before play, stays up for the
deck reveal's existing Hold + Flight beats, and is cleared right as the
card lands in the Queue and real ability resolution takes over. The
now-unused `BOT_PREVIEW_DISPLAY_DURATION_MS` constant was removed
(`js/constants/preview.js`, `docs/ARCHITECTURE.md`).

---

**Fix — Opponent card-play animation: removed the duplicate "Bot Preview Badge" (1.43.4):**
A Bot's turn used to show a standalone floating card ("Bot Preview
Badge", near its seat, above/below — not on its deck) for ~1.1s, then
remove it, then immediately start the real deck-reveal-hold-fly
sequence (`cardEnteredQueue`, `js/ui/game-ui.js`) with a *second*,
separate card element. Back to back, this read as one broken animation:
a card appearing off the deck, jumping onto it, holding, then flying to
the Queue — even though the underlying deck-reveal sequence itself was
already correct in isolation. `showBotPreviewBadge()` /
`clearBotPreviewBadge()` / `positionBotPreviewBadge()` and the
`.bot-preview-badge` CSS were removed entirely (`js/ui/game-ui.js`,
`js/game/turnManager.js`, `css/style.css`); the deck reveal's own hold
(`T.opponentHold` in `js/ui/game-ui.js`) was lengthened from 350ms to
700ms to keep giving the player a beat to see the card, since it's now
the only place a Bot's played card is shown before it enters the Queue.
The Queue Ability Preview (the arrow/icon overlays on cards already
sitting in the Queue, `js/ui/previewOverlay-ui.js`) is a separate,
unaffected feature.

---

**Feature — Card Power restored to the Animal Cards on the table and the Card Guide (1.42.0):**
`Power` (the numeric gameplay stat behind ability dispatch, queue
sorting, ability targeting, and AI evaluation — `data/cardInfo.json`,
`js/abilities/abilities.js`, `js/ai/ai.js`) is visible again next to
the Animal name on every in-play card. `createCard()`
(`js/ui/game-ui.js`, the single factory used for Hand/Queue/Party/
Trash/drag-ghost/preview cards alike) now renders a `.card-power`
readout in the card footer beside `.card-name`, reversing the 1.30.12
cleanup that removed it from the card face. The Card Guide
(`js/game/help.js`) shows the same value in both its grid tiles
(`.help-card-power`) and its card-detail popup (`.power-badge` next
to the `<h2>` name), reversing 1.36.5's removal there.

Both surfaces read `card.power` straight from the one authoritative
loader, `js/services/dataLoader.js`'s `loadCardData()` — the Card
Guide previously ran its own independent `fetch("./data/cardInfo.json")`
and now goes through that same cached loader instead, so gameplay and
the Card Guide can never disagree on a card's Power, and there is no
second copy of the card data anywhere. Nothing about this touches
Victory: **Party Card Count remains the sole Victory Metric**
(`js/game/matchOutcome.js`) — Power is displayed purely as a Card
Gameplay Attribute readout and plays no part in Win/Draw/Loss,
scoring, or leaderboard ranking, which were already fully decoupled
from Power back in 1.38.0 and stay that way (see
`tests/matchOutcome.test.mjs`'s "no Power dependency" case). The
in-turn ability-guidance chip (`js/ui/cardGuidance-ui.js`) and the
tutorial's ability-examples mock-up (`js/ui/tutorial-ui.js`) are
unchanged — out of scope for this pass.

CSS-only changes support the new layout: `.card-footer`/
`.help-card-footer` switch from `justify-content: center` to
`justify-content: space-between` (with a small `gap`) now that each
holds two children, `.card-name`/`.help-card-name` gain
`flex: 1 1 auto; min-width: 0` so a long Animal name still ellipsizes
instead of pushing Power out of the footer, and `.card-power`/
`.help-card-power`/`.power-badge` join the existing "numbers always
LTR" selector list so the digit never reverses under the Persian/
Arabic RTL layout.

**Style — Reward Popup action buttons now visually match the Pause Popup, via shared-component reuse (1.41.1):**
The Reward Popup (`#endGameScreen`, `js/ui/endgame-ui.js` — the screen
shown at the end of every match) previously styled its two actions,
**Return to Home** and **Play Again**, as filled/outlined pill
buttons (`.screen-btn` + `.endgame-btn-primary`/`.endgame-btn-secondary`)
in a two-column grid — a different visual pattern from the Pause
Popup's icon-over-label actions. Both buttons now reuse the Pause
Popup's exact existing button implementation instead — no new/parallel
CSS was written: the same `.pause-actions` row, `.pause-action`
button, `.pause-action-icon.top-btn` icon box, and
`.pause-action-label` label classes the Pause Popup (`#pauseModal`)
already uses. That gives the Reward Popup's buttons the same size,
height/width, border-radius, typography, icon alignment, spacing, and
hover/active states as the Pause Popup's, on both Mobile and Desktop,
with zero duplicated styling.

Only presentation changed: `#returnHomeBtn`/`#playAgainBtn` keep
their ids, `type="button"`, and click wiring (`js/game-main.js`)
exactly as before — same two buttons, same behavior. The old
`.endgame-btn-primary`/`.endgame-btn-secondary`/`.endgame-btn-icon`/
`.endgame-btn-label` rules (the duplicated button styling) were
removed from `css/style.css`; `.endgame-actions` remains as a
Reward-Popup-scoped layout hook only, carrying no button visuals of
its own. `tests/endgameActionButtons.test.mjs` was rewritten to
assert the new shared-component markup instead of the old grid/
equal-width regression it used to guard.

**Feature — Play vs Bot's 1/2/3-Bot options are now pure selectors, with a separate Play button to start the match (1.41.0):**
Tapping **1 Bot / 2 Bots / 3 Bots** (`.home-bot-options`) on Home's Play
vs Bot panel no longer starts a match by itself. The three options are
now a radiogroup of pure selectors (`role="radio"`/`aria-checked`,
exactly one `.home-bot-option--selected` at a time, same orange
active/inactive styling as before) — selecting one only changes which
count is selected. **1 Bot** ships selected by default (previously 3
Bots). A new, separate, full-width **Play** button
(`#homeBotPlayBtn`, `.home-bot-play-btn`) sits directly below the
three options, reusing the existing orange `.home-primary-btn`/
`.home-play-btn` CTA styling unchanged; it's the only control that
starts a match, using whichever bot count is currently selected. The
handoff to `bot-difficulty.html` is otherwise unchanged: Play still
stores the selected count in the same `wgl_selectedBotCount`
sessionStorage key (`js/ui/home-ui.js`), read the same way by
`js/bot-difficulty-main.js`. Play vs Human's **Rank**/**Friendly**
options (`.home-human-options`) are untouched — still Coming Soon
selectors that open `#comingSoonModal`, never start a fake match. Logo
size and the rest of the existing visual style are unchanged.

New localization key `homeBotPlayBtn` ("Play") added for all four
supported languages (en/fa/ar/tr).

**Feature — Home's Start Game restructured into Play vs Bot / Play vs Human, with selectable 1/2/3-Bot matches (1.40.0):**
Home's Start Game tab bar is now two levels instead of one flat
Play vs Bot / Rank / Friendly row. The primary level is
**Play vs Bot** (default) / **Play vs Human**. Play vs Bot's panel now
offers three selectable, self-starting options — **1 Bot / 2 Bots /
3 Bots** (`.home-bot-options`, reusing the existing
`playWith1Bot`/`playWith2Bots`/`playWith3Bots` icons) — instead of one
big button; **3 Bots** ships selected by default and is still exactly
the original 1 human + 3 bots match. Play vs Human's panel holds
**Rank** and **Friendly** (`.home-human-options`), both honest Coming
Soon options that open the shared `#comingSoonModal` instead of a
Rank/Friendly-specific panel. The visual language (dark theme, orange
accent, card/border/radius styling, logo size) is unchanged.

Game-state side: `js/bot-difficulty-main.js` now builds only the
selected number of bot rows (reading a new `wgl_selectedBotCount`
sessionStorage handoff from `js/ui/home-ui.js`, defaulting to 3 if
missing/invalid), and `js/game-main.js` now deals in however many bot
difficulties actually came through the `wgl_pendingDifficulties`
handoff (1–3) instead of always assuming exactly 3 — reusing the
existing player/difficulty architecture (`Player`, `PLAYER_TYPES`,
`gameState.players`) rather than introducing a parallel one. The
existing 3-bot flow is unchanged end-to-end. 1-Bot and 2-Bot matches
reuse the same generic engine (queue/party/trash resolution,
abilities, scoring) that already only reads `gameState.players`
rather than assuming a fixed seat count.

Also fixed: an unwanted translucent-white fill behind Home's profile
chip avatar (`.home-profile-chip-avatar`) that showed through the
avatar artwork's transparent areas as a light box instead of the dark
menu background — removed, background is now `transparent`. And the
four Coming Soon cards (Store/Tournament/Leaderboard/Lucky Wheel) now
reserve the same two-line title height (`.home-bottom-label`) so
Lucky Wheel's wrapping two-line title no longer pushes its icon out of
vertical alignment with the other three single-line cards.

New localization keys (`gameModesPlayVsHuman`,
`homePlayWith1Bot`/`2Bots`/`3Bots`) added for all four supported
languages (en/fa/ar/tr); `Rank`/`Friendly` reuse the existing
`homeTabRank`/`homeTabFriendly` keys.

**Fix — Give/Send Feedback button now genuinely centered in the Reward Popup (1.39.1):**
The Reward Popup's `#endgameFeedbackBtn` ("Give Feedback") sat flush
to the left edge of its footer on every viewport — the `display:flex;
justify-content: center` previously declared directly on the button
only centered its own icon+label *inside* its own already-content-sized
box, which had no effect on where that box sat within the footer.
Fixed at the layout-container level instead: `#endGameScreen
.screen-panel-footer` is now a flex column with `align-items: center`
(`css/style.css`), which centers the feedback button — the only
footer child without an explicit `width: 100%` — through real
flexbox, not a hardcoded margin/left/transform, so it stays centered
at any popup or viewport width, Desktop and Mobile alike.
`.endgame-actions` (Return to Home / Play Again) is unaffected since
it keeps its own explicit full-width sizing. The button's own
size/padding/font (`.feedback-link-btn`) and its click behavior are
completely untouched — only its position within the footer changed.
CSS-only change; no JS/behavior touched.

**Feature — Development/Test Mode for the Reward Popup (1.39.0):**
Added a Development-only way to preview the real end-of-match Reward
Popup (`#endGameScreen`, `js/ui/endgame-ui.js`'s `showEndGame()`)
without playing a full 12-card match — see § Development/Test Mode
above for the full trigger list
(`Ctrl+Alt+R`/`D`/`L`/`O` and `window.__wglRewardPopupTest`). New
files: `js/services/devEnv.js` (runtime Development-vs-Production
detection — this project has no bundler/`NODE_ENV`, so it reads the
page's actual hostname/protocol instead of a hardcoded flag) and
`js/dev/rewardPopupDevTrigger.js` (the trigger itself, wired into
`js/game-main.js` with a single import + init call). It opens the
exact same `showEndGame()` component/state flow a real match end
uses — never a mock popup — with a throwaway, predictable test
snapshot whose outcome is computed through the same
`determineMatchOutcome()` resolver a real match uses
(`js/game/matchOutcome.js`), so the popup's WINNER/DRAW/LOSS labels
are never hand-authored. It never touches the real, live `gameState`
and deliberately bypasses `js/game/gameOver.js`'s `finishGame()`/
achievement persistence, so it cannot corrupt an in-progress match or
move real, saved achievement/profile progress. On a real deployment
(any real domain — see § Deployment) `isDevEnvironment()` always
returns `false`, so the whole feature becomes a genuine no-op: no
keyboard listener, no console global, no trigger of any kind exists in
Production. Covered by `tests/devEnv.test.mjs` and
`tests/rewardPopupDevTrigger.test.mjs`.

**Feature — Card Power removed from victory; real Draw outcome added (1.38.0):**
The match result used to be "highest Party count, ties broken by the
sum of each party's card Power" (duplicated across
`js/game/gameOver.js`, `js/ui/endgame-ui.js`, and
`js/game/scoreManager.js` — see the "Cleanup — Power stat removed from
Animal Ability Cards (1.36.5)" entry below, which explicitly called out
this end-of-game score as a separate, at-the-time-unremoved feature).
That hidden tie-breaker is now gone entirely: **Party Card Count is the
only metric that decides a match.** A new single authoritative resolver,
`js/game/matchOutcome.js`'s `determineMatchOutcome()`, returns a
discriminated union — `{ type: "WIN", winnerId }` when exactly one
player has the highest Party Card Count, or `{ type: "DRAW", playerIds
}` when two or more players share it — with **no** secondary numeric
tie-breaker of any kind (no Power, no card rarity, no turn count, no
random value) and no Sudden Death round. `gameState.winner` (a single
Player object) is replaced by `gameState.outcome` (this discriminated
union); `js/game/gameOver.js`'s `finishGame()` sets it and logs either
`logWon` or the new `logDraw`. `js/ui/endgame-ui.js`'s final-results
screen now labels every player `WINNER`, `DRAW`, or `LOSS`
(`endResultWinner`/`endResultDraw`/`endResultLoss`, replacing the old
`endPower` score column and its now-unused `power` icon in
`data/config.json`), and its title/text (`endWinTitle`/`endDrawTitle`/
`endLoseTitle`, plus matching body text) adapt to whichever of the
three the human player got. `js/game/scoreManager.js`'s
`getRankedPlayers()` (the Match Standings / opponent rank-badge
ranking, shared with `js/ui/leaderboard-ui.js` and `js/ui/game-ui.js`)
now sorts by Party Card Count alone — its dead, never-displayed
`getPartyScore()` export was also removed. `js/services/achievements.js`'s
Wild Champion/Strategist win-checks now read `gameState.outcome.type
=== "WIN"`, so a Draw correctly never counts as a win. None of this
touches the unrelated, load-bearing `power` field each card still
carries (`data/cardInfo.json`) — that's the animal's identity/strength
ranking the ability system dispatches on (`js/abilities/abilities.js`,
`js/ai/ai.js`, `js/services/dataLoader.js`) and is unaffected. The
victory rule reads only `player.id`/`player.party.length`, so it stays
correct once players can build their own decks (see Roadmap below) —
nothing depends on a specific card, card count per animal, or fixed
deck composition. The reward/economy system that will eventually
consume `WINNER`/`DRAW`/`LOSS` is intentionally out of scope here — no
coins, gems, XP, or reward UI were added.

**Fixed — "Send Feedback" button not centered in the Feedback popup on Mobile (1.37.8):**
`#feedbackSubmitBtn`'s `.feedback-modal-footer` (`.modal-content > .modal-footer`)
is `display: flex; flex-direction: column`, so the footer's cross axis
is horizontal. Below the 600px breakpoint, the generic
`.screen-btn { max-width: 300px; }` mobile rule also applied to this
button, capping its width below the footer's own available width
(the feedback popup's `.small-popup` runs up to `min(350px, 92vw)`,
wider than 300px once its padding is subtracted on most phones).
Once the button's cross-size stopped resolving to `auto`, flexbox's
default `align-items: stretch` no longer filled the footer, and with
no alignment override the button fell back to the flex line's start
edge — flush-left in English/Turkish, flush-right in Farsi/Arabic —
instead of sitting centered. Fixed by adding `align-self: center` to
`.feedback-submit-btn` — pure flexbox alignment on the project's
existing layout system, no hardcoded margins/left/transform. Centers
correctly at any popup or viewport width, Mobile and Desktop alike;
above 300px-wide footers the button still renders at its previous
full width (just centered instead of pinned to the start edge), so
the size/padding/font-size fixed in the prior task, and the button's
`type="submit"`/click→`feedback-ui.js` submit behavior, are
unchanged.

**Fixed — Win Popup action buttons not equal size (1.37.7):**
`#endGameScreen`'s `.endgame-actions` row (Return to Home / Play
Again) switched from `display: flex` (`flex: 1 1 160px` per button)
to `display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));`.
Flex's default `min-width: auto` let a button's own label win extra
width over its equal flex-grow share once that label needed more room
than the other (e.g. `endReturnHome` vs `playAgain`, longer still in
some locales — see `data/i18n.json`), and if a label ever wrapped it
also grew that button taller — so the two buttons weren't reliably
the same size, worst on narrow Mobile widths. Grid's `minmax(0, 1fr)`
tracks split the row exactly in half regardless of content; each
`.endgame-actions .screen-btn` also got a fixed `height: 50px` (not
`min-height`) plus `width: 100%; min-width: 0;`, and its label
(`.endgame-btn-label`, new span class in `game.html`) now truncates
with an ellipsis instead of wrapping or overflowing — so no label,
short or long, in any locale, can change either button's width or
height. The `@media (max-width: 420px)` rule that used to stack the
row into a column was removed (the buttons must stay in one row at
every Mobile width per the requirement); that breakpoint now only
tightens gap/padding/icon size so both equally-sized buttons keep
fitting inside the popup without overflowing it. `#returnHomeBtn`/
`#playAgainBtn` ids, classes, and their click handlers
(`js/game-main.js`) are unchanged — only sizing/layout changed.
Desktop is visually unchanged (it already rendered in one row; it
just now gets guaranteed-equal widths instead of coincidentally equal
ones).

**Fixed — Party/Trash notification badge crowding on Mobile Portrait (1.37.6):**
On Mobile Portrait, the live card-count badges on the Party and Trash
buttons (`#partyIconBadge`/`#trashIconBadge`, `.queue-icon-badge`) sit
at `top: -6px` on their own `.queue-icon` button — standard
corner-badge positioning, unchanged. The Party/Trash button row
(`#queuePartyTrashRow`/`.queue-party-trash-row`) is the first element
inside `#queueWithIcons`, directly below the Other Players row with
only `#centerArea`'s 6px column `gap` between them, so that 6px badge
overhang exactly canceled the 6px gap and left the badges touching the
Other Players row above at every Mobile Portrait width/aspect ratio.
Fixed with a `margin-top: 10px` on `.queue-party-trash-row` itself
(inside the `@media (pointer: coarse) and (orientation: portrait)`
block) — scoped to the row that actually owns the badges, not to
`#queueArea`/`#centerArea` (shared with the unrelated Hand section).
Badge-to-icon offset, count logic (`renderParty()`/`renderTrash()` in
`js/ui/game-ui.js`), and popup open/close behavior are all unchanged;
Desktop (`@media (min-width: 601px) and (pointer: fine)`) is untouched.

**Removed — "Hold to Show Hint" (Card Help long-press) (1.37.5):**
The Card Help discoverability system — holding a card (pointer, touch,
or keyboard Enter/Space) to open the Card Information modal, plus the
one-time bubble teaching players about it — has been removed
completely. Deleted `js/ui/longPress.js` (the reusable long-press
gesture handler), `js/ui/cardHelpHint.js` (the discoverability hint
bubble + its `wgl_cardHelpLongPressHintShown` persistence), and
`js/constants/longPress.js` (its duration/threshold config), along
with `wireCardHelpLongPress()`, the keyboard hold handler, and the
`.card-help-affordance` badge in `js/ui/game-ui.js`; `openCardInfoByPower()`/
`ensureHelpCardsLoaded()` in `js/game/help.js` (only ever called by the
long-press gesture — Card Information stays fully reachable through
the existing Help/Card Guide modal grid, unaffected); the
`dismissCardHelpHint()`/`maybeShowCardHelpHint()` call sites in
`js/game/turnManager.js` and `js/game-main.js`; the `.long-press-active`
and `.card-help-hint*`/`.card-help-affordance` CSS (rules + keyframes)
in `css/style.css`; and the `cardHelpHintText`/`cardHelpHintLabel` i18n
keys (all 4 locales). The Ability Preview system (`js/abilities/
previewResolver.js`, `js/ui/previewOverlay-ui.js`) and every other
existing hint/guidance system (`js/ui/cardGuidance-ui.js`,
`js/ui/tutorial-ui.js`, `js/ui/walkthrough.js`) are untouched —
`tests/previewResolver.test.mjs` still passes in full, confirming no
Ability Preview regression.

**Fix — Desktop drag only worked from a card's top-right corner (1.37.5):**
`wireHandCardDrag()` (`js/ui/game-ui.js`) has always attached its
`pointerdown` handler directly to the whole card element with no
target/area restriction, so architecturally a drag should already
start from anywhere on the card. The actual cause: `<img
class="card-image">` — which covers most of a card's visible area —
is natively drag-and-drop-able by default in every browser, so a
press-and-drag starting over the image was hijacked by the browser's
own native image-drag instead of reaching our pointer handlers; only
the small non-image slivers of the card (e.g. the top-right corner,
where the now-removed Card Help affordance badge used to sit) were
ever free of that interference. Fixed by adding `draggable="false"` to
the `<img>` in `createCard()`, plus a `-webkit-user-drag: none;
user-select: none;` CSS safety net on `.card` and all of its children
(also stops the card's own text — name, owner badge — from starting a
native text-selection drag instead of our drag). No parallel drag
implementation was introduced; the existing single
pointer-events-based architecture is unchanged. Mobile's existing
`touch-action: pan-x` on hand cards (native horizontal hand-scroll
alongside our own vertical/diagonal pointer-driven drag) was reviewed
and needed no change; Ability Preview during drag, Queue drop, and
drag-cancel-doesn't-mutate-state all continue to work exactly as
before.

**Fix — Bot card selection/preview no longer resizes the Bot Section (1.37.4):**
On Mobile (and, more subtly, Desktop) the Bot Section — `#otherPlayers`
and its `#topPlayer`/`#leftPlayer`/`#rightPlayer` seats — visibly
changed size while a Bot selected/previewed/played a card, then
snapped back afterward, shoving the Queue and Player Hand around in
the process. The cause traced to `showBotPreviewBadge()`
(`js/ui/game-ui.js`): the small face-up card it shows next to a Bot's
seat while that Bot's Ability Preview is up (Section 7 of the brief)
was styled `position: absolute`, but was still appended as a real DOM
child of that seat's `.other-player-row` — i.e. still inside the Bot
Section's own layout subtree. Neither `.other-player-row` nor any of
its ancestors up to `#otherPlayers` declare their own `position:
relative`, so the badge had no stable containing block of its own to
size against; and `#otherPlayers` is exactly the kind of flex context
(`flex-wrap: wrap` with `width: auto` seats on Mobile Portrait,
`flex: 1 1 0; min-width: 0` shrinkable equal columns on Desktop) where
inserting/removing *any* child — including one meant to be taken out
of visual flow — still triggers a fresh layout pass for that subtree
and its siblings. That's what let the badge's brief appearance and
disappearance on every single Bot turn perturb the surrounding Bot
Section box, rather than any actual change to its own declared size.

Rather than reach for a bigger `min-height` on the Bot Section (which
would only mask the coupling, not remove it — see this version's
Task brief), `showBotPreviewBadge()`/`clearBotPreviewBadge()` now
follow the exact same pattern already used one screen over for the
human player's own drag preview: `.card-drag-ghost` (see
`wireHandCardDrag` in the same file) has always been appended to
`document.body`, entirely outside `#playerHand`'s own DOM subtree, and
positioned with `transform: translate(...)`. The Bot preview badge now
does the same — appended to `document.body`, `position: fixed`, with
its screen position computed fresh from the target seat's live
`getBoundingClientRect()` (via a new `positionBotPreviewBadge()`
helper) into two CSS custom properties (`--bpb-x`/`--bpb-y`) the badge's
`transform` reads, clamped to stay fully inside the viewport at any
screen size. There is now no DOM relationship whatsoever between the
badge and the Bot Section, so showing or hiding it structurally cannot
reflow `#otherPlayers`, the Queue, or the Player Hand — this isn't a
CSS tuning fix, the coupling that caused it is gone. A `resize`/
`orientationchange` listener (added while the badge is visible, always
removed in `clearBotPreviewBadge()`) keeps it glued to the seat if the
viewport changes mid-preview; nothing is hardcoded to one Mobile
resolution, so this holds across Mobile portrait at any width and
Desktop's own flanking-columns layout equally.

Nothing about *when* or *how long* the Bot's preview shows changed —
`previewThenPlayCard()`/`playCard()` in `js/game/turnManager.js`,
`BOT_PREVIEW_DISPLAY_DURATION_MS`, and the shared Ability Preview
system (`js/ui/previewOverlay-ui.js`'s `showQueuePreview()`, used
identically by the human's drag and the Bot's turn) are all untouched.
Card selection/execution timing, the Director's animation sequencing,
and the human player's drag-and-drop are all unaffected — only where
the Bot's own preview badge lives in the DOM changed.

**Fix — Queue → Party/Trash animation actually flies to the flanking icon instead of the corner (1.37.3):**
`onEnteredParty`/`onRejected`/`onRemoved` (`js/ui/game-ui.js`) used to
animate a resolving card with the same `flip()` FLIP primitive used
for in-queue moves — measure where the element ends up after
reparenting it, then transition to that real rect. That works for
in-queue moves because the destination (`#queue`) is always visible,
but `#partyCards`/`#trashCards` live inside `#partyArea`/`#trashArea`,
popups that are `display: none` until the player opens them (see §
Desktop — Party/Trash flank the Queue above). Measuring a
`display:none` subtree's `getBoundingClientRect()` returns an
all-zero rect, so the card was actually animating a shrink-to-the-
top-left-corner rather than a visible trip toward Party/Trash — on
both Mobile and Desktop, since both hide the popup by default.

Added `flyToTarget()` alongside `flip()` in `js/presentation/flip.js`:
it still performs the real reparent into `#partyCards`/`#trashCards`
synchronously (gameplay/DOM state is correct the instant the flight
starts, same as before — no gameplay logic changed, no new mutation
path), but instead of chasing the hidden container's rect it measures
the always-visible `#queueDoorIcon`/`#queueTrashIcon` flanking the
Queue with a fresh `getBoundingClientRect()` call every time (dynamic,
never hardcoded screen coordinates) and flies the card's real DOM node
there with a pure `transform: translate(...) scale(...)` + opacity
transition down to ~5% scale, fading out as it lands — cheap enough
(no width/height/left/top interpolation) to run several times back-to-
back without jank when a full Queue resolves two cards into Party and
one into Trash in the same turn. `onEnteredParty`/`onRejected`/
`onRemoved` now call `flyToTarget()` with the matching icon instead of
`flip()` with the hidden container. Reduced-motion and "element
already gone" fallbacks are unchanged (same defensive shape as
`flip()` — never stalls a turn on a presentation failure).

The old post-landing beats (`card-party-celebrate`, `card-in-trash`)
played on the card element itself, which — same underlying issue — was
already invisible once the card sat inside the hidden popup. They're
replaced with a new `.queue-icon-receive` bump (`css/style.css`) played
on the icon itself right as the flight lands, so there's now a real,
visible "Party/Trash received it" beat instead of a wasted invisible
one. Added to the existing `prefers-reduced-motion` suppression list
alongside the other flourish-only keyframes.

Sequencing, badges, and everything else are unchanged: the Director
already plays each semantic event (`CARD_ENTERED_PARTY`/
`CARD_REJECTED`/`CARD_REMOVED`/`CARD_EATEN`) strictly one at a time
(`director.run()`'s `for...of` loop), so multiple cards resolving out
of the Queue in one turn already animated in controlled sequence, never
overlapping — that didn't need to change, only where each flight's
target came from. `refreshPartyBadge()`/`refreshTrashBadge()` still
read the real DOM child count of `#partyCards`/`#trashCards` right
after each flight's reparent, so the badges stay correct throughout.
Ability Preview and Drag & Drop are untouched — this only affects the
resolution flight into Party/Trash. Applies identically on Mobile and
Desktop, since both share the exact same `#queueDoorIcon`/
`#queueTrashIcon` elements and only differ in their CSS position.

**Refinement — Party/Trash popup's Pause-matching shape extended to Mobile (1.37.2):**
1.37.1 gave `#partyArea`/`#trashArea` the Pause popup's shape (border/
radius/background/blur/shadow) and size (width/height) on Desktop
only. This follow-up extends just the *shape* — not the size — to
Mobile too: the ≤600px-width tier and the touch+portrait tier each
gain a dedicated `#partyArea, #trashArea { border; background;
border-radius; backdrop-filter; }` rule matching Pause's values,
layered right after their own existing (untouched) edge-anchored
position/size rule. Mobile keeps its own tuned position and
dimensions — only Desktop's popup also matches Pause's width/height
(from 1.37.1) — and `#mobileLeaderboard`, which shares that position
rule with Party/Trash on the touch+portrait tier, was deliberately
left out of the new shape rule; it wasn't asked to match Pause.
`tests/desktopPartyTrash.test.mjs`'s Mobile-tiers test was rewritten
to assert this split explicitly (position/size still tier-specific,
shape now shared with Pause, Leaderboard excluded).

**Refinement — Desktop Party/Trash popup shaped/sized to match Pause, Trash icon given more right-edge spacing (1.37.1):**
Three follow-up tweaks to the 1.37.0 change below, all presentational:
`#partyArea`/`#trashArea` on Desktop now use the exact same shape as
the Pause popup (`#pauseModal`'s `.modal-content.small-popup`) instead
of the panel look they shared with `#chatPanel` — same width basis
(`min(350px, 92vw)`), border, `var(--radius-md)` radius,
`rgba(10,31,15,0.82)` background, `blur(18px)`, and box-shadow/padding.
The popup's height is now fixed (`min(600px, 80vh)`, the old
content-driven `max-height` removed) and larger than before, rather
than shrinking to fit however many cards are currently inside. The
Trash icon flanking the Queue also got its own `margin-right` so it no
longer sits flush against the row's right edge (Party's left-side
spacing is unchanged). All three are scoped to the
`@media (min-width: 601px) and (pointer: fine)` block only — Mobile
Portrait's own popup sizing/positioning rules already restate their
own background/radius/shadow independently, so none of this reaches
them. `tests/desktopPartyTrash.test.mjs` gained three new cases
covering this.

**Feature — Desktop Party/Trash: permanent sidebars replaced by buttons flanking the Queue, plus live notification-count badges (1.37.0):**
Desktop no longer shows `#partyArea`/`#trashArea` as the two big
always-visible sidebar panels either side of the Queue —
`#gameLayout`'s grid drops from three columns
(`clamp(180px, 22vw, 280px) 1fr clamp(180px, 22vw, 280px)`) to a
single `1fr` column, and `#partyArea`/`#trashArea` now default to
`display: none` everywhere (Desktop included) as a centered,
fixed-position popup, toggled by the exact same `.mobile-open` class
Mobile Portrait already used — no second popup implementation. Party
and Trash are reached the same way Mobile already reached them too:
the door/trash icons that flank the Queue (`#queueDoorIcon`/
`#queueTrashIcon`, built once in `renderQueue()` — `js/ui/game-ui.js`
— and wired in `js/ui/mobile-ui.js`'s `initMobileTabs()`, which was
already unconditional, never gated to mobile). On Desktop these are
now unwrapped from their Mobile Portrait row (`#queuePartyTrashRow {
display: contents }`) and placed via `order` — Party before the
Queue, Trash after it — so they flank both sides of the Queue itself
as small, compact icon+label buttons instead of eating into its
space, rather than stacking above it the way Mobile Portrait does.
No gameplay logic changed anywhere in this — purely presentation and
access point, same as the 1.36.12 Log change below. Each button also
now carries a live notification badge (`#partyIconBadge`/
`#trashIconBadge`) showing how many cards have entered that section
so far, read from the real DOM contents of `#partyCards`/
`#trashCards` (never hardcoded): `renderParty()`/`renderTrash()`
refresh it on every full render, and the Director's own mid-turn
card-move handlers (`onEnteredParty`/`onRejected`/`onRemoved`, same
file) refresh it again right after their own append, so the count
stays live during an animated turn too. See § Desktop — Party/Trash
flank the Queue for the full breakdown (popup positioning, the
restored close button, badge details) and `tests/desktopPartyTrash.
test.mjs` for the regression coverage. Mobile Portrait is untouched —
same elements, same row-above-the-Queue arrangement, same popups.

**Refactor — Desktop Chat/Log layout: Log moved from a permanent sidebar panel into a Header popup (1.36.12):**
On Desktop, `#leftSidebar` used to give Log its own permanent panel
(`#gameLog`/`#logEntries`) squeezed between Match Standings and Chat,
leaving Chat a fixed, cramped `height: 140px`. Log now opens from a
new `#logBtn` button in the Header's `#topRight`, right next to
Pause — same `.top-btn` markup, styling, and tooltip pattern
(`data-title-key`) as Pause/Help/Tutorial, so it reflows and scales
identically at every breakpoint. Clicking it opens `#logModal`, the
same popup Mobile Portrait's `#railLogBtn` already used, via the
project's shared `openModal()`/`closeModal()` (`js/ui/modal-ui.js`) —
so Desktop gets the exact same centered, backdrop, focus-trap, and
Escape-to-close behavior every other popup (Settings, Help, etc.)
already has, with no bespoke popup built for it. `#chatPanel` now
takes the freed-up vertical space (`flex: 1` instead of a fixed
140px), with its "Coming Soon" placeholder centered in the larger
area. No Log state or gameplay logging logic changed — `gameState.logs`
and everything that appends to it are untouched; `js/ui/log-ui.js`'s
`renderLog()` still builds identical markup and still writes it into
`#mobileLogContent` (shared by both entry points), it just no longer
also mirrors it into the now-removed `#logEntries` element. The
Walkthrough tutorial's Desktop "Leaderboard & Log" step (step 6,
`js/ui/walkthrough.js`) had its fallback target updated from the
removed `#logEntries` to `#logBtn` for the same reason. Mobile
Portrait is untouched — `#leftSidebar` (including the old `#gameLog`
markup) was already `display: none` there, and `#railLogBtn` opens
the identical `#logModal` it always did.

**Fix — Other Players stacked vertically instead of one row on Desktop (1.36.11):**
`#otherPlayers` (the compact opponent summary row above Party/Trash and
the Queue) had no `display` set outside its two Mobile-only overrides
(plain ≤600px, and the touch+portrait gameplay layer), so on Desktop it
fell back to `display: block` — `#topPlayer`/`#leftPlayer`/`#rightPlayer`
(three plain divs, one per opponent) simply stacked one above another
instead of appearing side by side. Added a new
`@media (min-width: 601px) and (pointer: fine)` rule — scoped to the
same fine/coarse-pointer split the Orientation Gate already uses
(`js/ui/orientation-ui.js`) to define "real Desktop", so it can never
interact with the touch+portrait Mobile layer's own wrapping-chips
treatment — making `#otherPlayers` a `flex-direction: row` with the
three columns sharing width evenly (`flex: 1 1 0`). Each opponent's
avatar, rank badge, name, and card count are all preserved; if a
column gets tight the **name** truncates first via ellipsis (same
priority already used for the human player's own deck name), while the
avatar and the card-count badge keep their own (slightly smaller,
since three now share the room one previously had alone) fixed sizes.
Verified the row fits without overflow at 1024px and every common
desktop/laptop width above it (1280, 1366, 1440, 1600, 1920, 2560).
Mobile (≤600px stacked, and the touch+portrait wrapping-chip layout)
is untouched — the new rule is gated on `(pointer: fine)`, which no
touch device ever matches.

**Fix — Queue Slot too small vs. Player Hand card on Mobile (1.36.10):**
On real touch+portrait phones (`@media (pointer: coarse) and
(orientation: portrait)` — the actual Mobile gameplay layer, since
Mobile landscape is gated behind the "please rotate" screen; see
`js/ui/orientation-ui.js`), the Queue slot sizing rule
(`#queue .card, .queue-slot`) was correctly matched to the Player
Hand's card size, but the *Hand* side of that pairing
(`#playerHand .card-back, .card-back`) targeted a class
(`.card-back`) that nothing in the current DOM actually carries —
`createCard()` (`js/ui/game-ui.js`) puts a plain `.card` class on
every real Hand/Queue/Party/Trash card. With no matching selector,
real Hand cards silently fell through to the larger desktop-tier
`#playerHand .card` rule while the Queue slot rule *did* apply,
leaving the Queue visibly smaller than the Hand on phones. Fixed by
targeting `#playerHand .card` (keeping `.card-back` alongside for any
future face-down element) at both the base Mobile Portrait tier and
its ≤380px narrow-phone tier, so Queue and Hand share the exact same
`clamp()` width/height (and therefore aspect ratio) at every mobile
size — same fix pattern the ≤600px and ≤380px non-portrait tiers
already had correct. Desktop and Tablet sizing are unchanged; the
Queue's existing wrap/scroll behavior and drag-and-drop, Ability
Preview overlay, and drag-ghost sizing were untouched.

**Fix — Player's own rank badge missing next to their in-game name (1.36.9):**
Opponents' compact name tags (`renderOtherPlayers()`, `js/ui/game-ui.js`)
already show a live rank/medal badge — the same standings computation
used by the Match Standings/Leaderboard popup
(`getPlayerRankIndexes()`/`getRankIcon()`,
`js/game/scoreManager.js`) — but the human player's own name tag next
to their hand/deck (`renderPlayerDeckInfo()`) never got the same
treatment; it only ever rendered the avatar and name.

Added a `#playerDeckRankBadge` span to `game.html`'s `#playerDeckInfo`
and wired `renderPlayerDeckInfo()` to populate it through the exact
same `getPlayerRankIndexes()`/`getRankIcon()` call opponents already
use, fed the same live `gameState` already passed into every render.
No new or parallel state: the badge is recomputed on every
`renderGame()`/`renderNonBoard()` pass — the same two render paths
that already refresh the opponents' badges and the player's own name
after every turn — so it always matches current standings and
disappears cleanly when there's no rank to show, never a
hardcoded/stuck value. Reuses the existing `.player-rank-badge` style
verbatim (same 14px medal icon, inline right before the name), so it
inherits the same Mobile/Desktop responsiveness and the name's
existing long-name truncation without any new CSS.

**Fix — Player avatars no longer shown inside a circular frame (1.36.8):**
Three of the game's avatar render surfaces still cropped the player's
avatar illustration into a circle (`border-radius: 50%` +
`overflow: hidden` + `object-fit: cover`): the human player's own
name+avatar tag above their hand in-game
(`.player-deck-avatar-wrap`/`.player-deck-avatar-img`), the
avatar-picker popover's choice buttons (`.avatar-choice`/
`.avatar-choice img`, used on Choose Bot Difficulty/Play vs Bot/Game
Modes), and Home's compact profile chip (`.home-profile-chip-avatar`).
Three siblings had already been fixed to show the full, uncropped
illustration instead — `.player-avatar-display` (Choose Bot
Difficulty's read-only avatar), `.avatar-trigger-btn` (the same
picker's trigger button), and `.profile-avatar-choice` (the Profile
modal's avatar grid, whose own CSS comment already says it "matches
`.player-avatar-display`'s untouched, uncropped look") — this finishes
that same fix everywhere else it hadn't landed yet.

All three now use `object-fit: contain` instead of `cover`, so the
avatar's full illustration shows with its real aspect ratio, no
cropping or distortion, and `border-radius: 0`, so no circular mask
remains. `.player-deck-avatar-wrap` keeps its colored player-identity
border — a separate, meaningful piece of UI (which player this is),
not the circular framing itself — just reshaped from a circle to a
small rounded rectangle (6px corners); `.avatar-choice` keeps its
border/active-state ring the same way. Bot avatars
(`.other-avatar`, an icon glyph, not an image) and the About Developer
panel's photo (`.about-avatar` — the app's creator, not a player)
were already circle-free and untouched. Fixed once, in the single
shared `css/style.css` (no per-page CSS or markup changes, since
there's no separate Avatar component to change — every render site
already reads through this one stylesheet), so every avatar surface
in the game is now consistent on both Mobile and Desktop.

**Cleanup — "Step-by-step Guidance" toggle removed from Settings (1.36.7):**
Settings had two independent ways to opt into the contextual per-card
guidance popups (`js/ui/cardGuidance-ui.js`): a "Step-by-step Guidance"
toggle in every Settings surface (Home's Settings page, its popup on
`index.html`, and `game.html`'s in-game Pause → Settings modal), and a
"Show step-by-step help?" prompt asked once before every new game
starts (`guidancePromptModal` on `game-modes.html`/
`bot-difficulty.html`). Both read and wrote the exact same
`wgl_stepGuidance` localStorage flag via
`isStepGuidanceEnabled()`/`setStepGuidanceEnabled()`, so they always
agreed with each other.

Only the Settings toggle is removed here — the pre-game prompt is a
similar-looking but genuinely independent surface for the same
underlying setting, and per this cleanup's own scope stays exactly as
it was. Removed: the `settings-row`/label/`#stepGuidanceToggle`
checkbox markup from all three Settings surfaces, the
`settingsStepGuidance` i18n key (en/fa/ar/tr), the
`initStepGuidanceToggle()` wiring function and its now-dead
`#stepGuidanceToggle:focus-visible` CSS rule, and its 4 call
sites/imports (`js/home-main.js`, `js/ui/ui.js`, `js/game-main.js`,
`js/settings-main.js`). Left alone, because they're the independent
prompt flow or the shared setting itself, not the Settings option:
`guidancePromptModal`/`guidanceRestartModal` and their i18n strings,
`isStepGuidanceEnabled`/`setStepGuidanceEnabled`/
`isGuidancePromptHidden`/`setGuidancePromptHidden` (still exported
from `js/ui/cardGuidance-ui.js` and used by
`js/game-modes-main.js`/`js/bot-difficulty-main.js`/
`js/ui/playVsBot-ui.js`), and the contextual guidance popups
themselves (`shouldShowGuidance`/`buildGuidancePayload`/
`showCardGuidance`, wired into `js/game/turnManager.js`).

Since the underlying `wgl_stepGuidance`/`wgl_hideGuidancePrompt`
localStorage keys and their reader/writer functions are all still
live (used by the surviving prompt flow), there's no migration
concern at all: an existing player's saved preference keeps applying
exactly as before. The only real-world change is that a player who'd
previously dismissed the pre-game prompt with "don't show again" now
has no remaining UI to change that preference — Settings no longer
offers it, by design, per this cleanup's scope.

**Fix — Cards/Animal Ability page safe-area-aware on Mobile (1.36.6):**
The Cards page (`cards.html` — Home's Card Guide destination, a
top-level `.screen-overlay` page, see § Navigation Architecture) had
only a flat `padding: 20px` on `.screen-content` at `≤600px`, with no
awareness of a device's notch/Dynamic Island or home indicator. On
devices with either, the top of the page (back link/title) could sit
flush against the notch, and the bottom of the scrollable Animal
Ability grid (`#animalGrid`, inside `.screen-content`, which is
already the scroll container via its base rule's `overflow-y: auto`)
could end flush against — or behind — the home indicator, with the
last row never fully clear of it.

Fixed at the shared container instead of per-page, the same approach
1.36.2 used for `.modal`: inside the existing
`@media (max-width: 600px)` rule, `.screen-content`'s padding is now
`max(20px, env(safe-area-inset-top))` on top and
`calc(20px + env(safe-area-inset-bottom, 0px))` on the bottom, instead
of a flat `20px` on every side. Because `.screen-content` is the
scroll container itself, the extra bottom padding is real scrollable
space, not just a static gap — the grid's last row scrolls fully past
the home indicator instead of stopping short of it. `env()` resolves
to `0` on devices without a notch/indicator, so plain phones keep the
exact same `20px` they always had, and Desktop (`>600px`, a separate
rule) is untouched entirely. Left/right stay a flat `20px` — the app
is portrait-only on touch (see the Orientation Gate), where a
notch/indicator only ever intrudes from the top or bottom, never the
sides. Every other `.screen-overlay` page sharing `.screen-content`
(Home, Profile, Settings, Game Modes, Coming Soon) picks up the same
fix for free, with no markup or per-page CSS changes needed.

**Cleanup — Power stat removed from Animal Ability Cards (1.36.5):**
Continuing the presentation-only change from 1.30.12 (which removed the
power digit from in-play cards but deliberately kept it on the Card
Guide and tutorial ability slide "for reference"), the Power stat is
now gone from every remaining Animal Ability Card surface too: the
Card Guide grid tiles and detail popup (`js/game/help.js`,
`.help-card-power`/`.power-badge`), the in-game "here's what just
happened" ability guidance chip (`js/ui/cardGuidance-ui.js`,
`.guide-chip-power`), and the tutorial's ability-examples slide
(`js/ui/tutorial-ui.js`, `.tut-ability-power`) no longer render a
numeric Power value or badge. The now-dead `.help-card-power`/
`.power-badge`/`.guide-chip-power`/`.tut-ability-power` CSS rules were
removed, `.power-badge` was dropped from the LTR-digit-direction
selector list, and the unused `"power"` fields in
`data/tutorial.json`'s diagram data (never read by any diagram
renderer) were deleted along with the stale "A few power examples"
label (now "A few ability examples"). The Card Guide modal's title
changed from "Animal Powers" to "Animal Abilities" in en/ar/tr (fa
already used this wording). None of this touches the load-bearing
`power` field itself — it's still the gameplay stat behind ability
dispatch, queue sorting, scoring, and AI evaluation
(`data/cardInfo.json`, `js/abilities/abilities.js`,
`js/services/dataLoader.js`, `js/game/scoreManager.js`,
`js/ai/ai.js`), nor the separate end-of-game/leaderboard "Power" score
label (`endgame-ui.js`/`leaderboard-ui.js`), which is a distinct
scoring feature, not an Animal Ability Card. No gameplay behavior
changed on either Desktop or Mobile.

**Bugfix — Mobile popup positioning: centered with edge/safe-area margin, not a bottom sheet (1.36.2):**
Every popup (Settings, Profile, Card Guide, About, Lucky Wheel,
Feedback, Tutorial, Log, card detail, Kangaroo, Help, Card Guidance,
Pause — all sharing the `.modal`/`.modal-content` shell, see §
Responsive Design / Panel Architecture) previously became a full-width
"bottom sheet" on Mobile Portrait: anchored to the bottom edge,
touching the left/right edges, only rounded on top. Per the Mobile
Popup Positioning brief, popups must instead be centered both
horizontally and vertically with a guaranteed gap from every edge,
clear the device's notch/home-indicator safe area, and adapt to any
portrait screen size or aspect ratio.

Fixed at the shared container instead of per-popup: `.modal` (the
fixed, `inset:0` backdrop, already `justify-content:center;
align-items:center` from its base rule) now gets `padding:
max(16px, env(safe-area-inset-*))` on all four sides — folding the
edge gap and the safe-area clearance into one calculation, with no
hardcoded coordinates. `.modal-content` sizes itself to
`width:100%; max-width:480px; max-height:100%` — 100% of `.modal`'s
own already-padded content box, not the raw viewport — so it can
never grow past the guaranteed gap; the old slide-up-from-bottom
animation and its bottom-sheet drag-handle affordance are replaced
with a centered fade/scale-in (`prefers-reduced-motion` still
respected).

The same `.modal-content` override lived twice — once for the plain
`≤600px` layer, once for real touch+portrait devices via
`@media (pointer: coarse) and (orientation: portrait)`, which is the
one that actually wins on a real phone — both were updated in lockstep
so neither silently reintroduces edge-to-edge sizing (see § Mobile
portrait). `#logModal`'s own fixed `70vh` height and `.tut-panel`'s
(Tutorial) own unconditional width/height, both of which measured
against the raw viewport instead of `.modal`'s padded box, are now
scoped the same way. The separate Leaderboard/Party/Trash overlay
(`#mobileLeaderboard`/`#partyArea`/`#trashArea`) already centered
itself with edge margin via auto-margins and was left unchanged.
Desktop/landscape popup sizing (`min(700px, 92vw)`, centered) is
untouched — this only affects the Mobile Portrait override layer.

**Style — Queue slots matched to Player Hand card size on mobile (1.36.1):**
On the ≤600px Mobile Portrait layout, `.queue-slot`/`#queue .card` had
its own, separately-tuned size that drifted from `#playerHand .card`
(and `.card-back`) at several breakpoints — most noticeably the main
≤600px tier and the ≤380px-wide touch-portrait tier, where Queue cards
rendered visibly smaller than Hand cards. A third, 320px-class tier
(`@media (pointer: coarse) and (orientation: portrait) and
(max-width: 340px)`) shrank the Queue further still with no matching
Hand override at all. All of these now use the exact same
`clamp()` width/height as the Player Hand card at their tier — the
340px tier's Queue-only override was removed entirely so it falls
back to the shared ≤380px value both elements already use, keeping
Queue and Hand one consistent card size across every mobile size
tested. CSS-only change (`css/style.css`); no JS or markup touched.

**Style — Party/Trash grouped into one row above the Queue (1.33.1):**
Per the gameplay screen's exact layout spec, Party and Trash are now
a single row directly above the Queue in Mobile Portrait, rather than
one above and one below it. `js/ui/game-ui.js`'s `renderQueue()` now
wraps both in `#queuePartyTrashRow` (a new element, `display: flex`
row) placed before `#queueInner`, so `#queueWithIcons` has exactly two
stacked children — the button row, then the Queue — instead of three.
Same ids, same click/keyboard wiring and popups as 1.32.0; only the
grouping and CSS (`.queue-icon` is now `flex: 1 1 0` inside the row
instead of `width: 100%` stacked alone) changed. See § Mobile portrait
— game board layout layer.

**Feature — Real asset-preload loading screen (1.33.0):**
The Startup screen's old spinner-only "Loading..." state (no
measurable progress, per its own code comment) is replaced with a
real one: `js/services/assetPreloader.js` fetches and `decode()`s
every image the game will ever show — icons, card art, branding,
avatars, assembled from the project's existing manifests, not a
hand-maintained list — while the Startup screen shows the splash
image (`config.json` → `branding.splash`, new key) with a progress
bar, live percentage, and rotating gameplay hints underneath, all
driven by real `(loaded, total)` counts from the preloader. Once
preloading finishes during Startup, nothing in the Queue, Hand, or
Opponent cards has to fetch or decode an image for the first time
mid-match. See § Startup / Loading Screen.

**Bugfix — Leaderboard/Party/Trash popups stuck open, legacy Party/Trash tab bar stuck visible (1.32.1):**
Two pre-existing, unrelated legacy `@media (max-width: 600px)` rules
were beating the popup system's own show/hide rules on every narrow
screen, regardless of the `.mobile-open` toggle:
`#mobileLeaderboard { display: block !important }` (two duplicate
copies of an old "inline leaderboard" design, since superseded by the
Leaderboard/Party/Trash popup system — see § Mobile portrait) forced
the Match Standings panel permanently open and unclosable; a plain
(non-`!important`, but still cascade-winning by source order)
`#mobileTabs { display: flex }` similarly force-showed the *old*
`#partyTab`/`#trashTab` tab bar, which the door/trash icons flanking
the Queue superseded. Both are now left unset for `display` in those
old blocks, so the base `display: none` / `.mobile-open` popup rules
(added for 1.32.0's Mobile Portrait redesign, but exposed to this
older, larger latent bug for the first time by real on-device testing
of that work) are the only thing controlling visibility, as intended.

**Feature — Mobile Portrait gameplay screen redesign (1.32.0):**
Party and Trash now render as full-width, labeled buttons stacked
above and below the Queue in Mobile Portrait (`#queueWithIcons`
switches from flanking the Queue left/right to a column — same
elements, same click/keyboard wiring and popups, see § Mobile
portrait — game board layout layer). Each opponent seat also gains a
rank medal next to their name (mirroring their current Match
Standings position) and an explicit hand-card count next to the
existing deck count. The rank math powering both the Match Standings
panel and these new badges was previously duplicated between
`leaderboard-ui.js` and `endgame-ui.js`; it's now consolidated in
`js/game/scoreManager.js` (previously an empty, unused stub) so the
two can never disagree. `endgame-ui.js`'s own final-results medal
display is unchanged.

**Feature — Ability Preview System + drag-to-play (1.31.0):** Hand
cards are no longer played by tapping/clicking — the player drags a
card onto the Queue instead, and a live Preview (full-card overlays
showing exactly what the card would do, computed from the same rules
real execution uses) appears on the affected Queue cards while
dragging. Bots preview their chosen card the same way, through the
same resolver, before playing it. See § Ability Preview System under
Main Systems, and § Core Gameplay → 3. Play a Card. The existing
hold-to-open-Card-Information gesture on hand cards is unchanged.

**Fix — Profile → Achievements had a second, nested scroll container on
Mobile, especially on Android (1.30.13):** `.ach-grid`
(`#profileAchievementsList`, inside Profile's `.modal-body`) kept its
own `max-height` + `overflow-y: auto` — a second independent scroll
container nested inside `.modal-body`'s, the same bug `#animalGrid`
(Card Guide) had already been fixed for in 1.30.6. A swipe starting on
an Achievement card scrolled that small fixed-height box in place
instead of the popup, and achievements past its `max-height` could
become unreachable. `.ach-grid`'s own scrolling/`max-height` (base
rule and both mobile-landscape tiers) is removed so it sizes to its
full content height and contributes to `.modal-body`'s natural
height, exactly like `#animalGrid` already does — `.modal-body` is
now the one and only scroll container for both the Card Guide and
Profile popups. No markup, gameplay, or Desktop behavior changed.

**Style — Animal Cards no longer show the power number on their face
(1.30.12):** The in-play card footer (`createCard()` in
`js/ui/game-ui.js`, used for hand/queue/party/trash alike) previously
showed the animal's power as a bare digit next to its name
(`.card-power`). That digit is now removed from the card face and
`.card-footer` is centered on the name alone; the matching "Your
hand" tutorial mock-up (`renderHandDiagram()` in
`js/ui/tutorial-ui.js`, `.tut-card-power`) was updated to match so it
keeps mirroring the real card. This is presentation-only — `power`
is still the load-bearing gameplay stat behind sorting, strength
comparisons, ability targeting, scoring, and AI evaluation (see
`data/cardInfo.json`, `js/abilities/abilities.js`,
`js/services/dataLoader.js`), and the technical `id` used for animal
identity (`CARD_IDS.*`) is untouched, so none of that logic changed.
The Card Guide grid and the Card Info detail popup (`js/game/help.js`,
`.help-card-power`/`.power-badge`) and the ability-examples tutorial
slide (`.tut-ability-power`) still show the power value on purpose —
it's genuinely useful reference information for learning the game's
strength hierarchy, not a leftover label, so it wasn't "obsolete" and
stayed.

**Fix — Queue door/trash icons showed on Desktop too (1.30.11):** The
Party-door/Trash-exit icons flanking the Queue (`#queueDoorIcon`/
`#queueTrashIcon`, see § Mobile portrait — game board layout layer and
`renderQueue()` in
`js/ui/game-ui.js`) are built unconditionally in JS and had no
viewport gating in CSS at all, so they rendered on Desktop next to a
Queue that already has its own always-visible Party/Trash sidebars —
a redundant, unintended second way to open the same two popups.
`.queue-icon` is now `display: none` by default (Desktop and every
other viewport) and only re-enabled inside the existing
`@media (pointer: coarse) and (orientation: landscape)` Mobile
Landscape layer, rather than `visibility: hidden` (which would have
still reserved their space) or deleting the elements. `#queueInner`
(`flex: 1`) already does the Queue's own centering inside
`#queueWithIcons`, so with the icons hidden the row just naturally
reflows around the Queue alone on Desktop — no leftover gap, no
Desktop-specific CSS needed beyond hiding the icons themselves. The
underlying elements, their click/keyboard wiring
(`js/ui/mobile-ui.js`), and the `#partyArea`/`#trashArea` popups are
all untouched, so Mobile Landscape's interaction is unaffected.
Desktop's own walkthrough targeting was already unaffected before
this fix too — step 5 already targets `#partyCards`/`#trashCards`
directly on Desktop (`isMobile()` decides which), never these icons.

**Fix — Pause and the Step-by-Step walkthrough didn't actually freeze
gameplay (1.30.10):** Pause (js/ui/pause-ui.js) and the in-game
Step-by-Step walkthrough (js/ui/walkthrough.js) both only ever stopped
the visible per-turn countdown (js/game/turnTimer.js) — nothing else in
the pipeline that plays a card (queue entry → ability resolution →
Queue-full → Party/Trash transition → draw → turn advance,
js/game/turnManager.js's playCard()) ever checked either state, so an
already-in-flight card could keep resolving, the Queue could still
fill Party/Trash, and a bot's turn could still begin — all invisibly,
underneath the Pause panel or the walkthrough's box. turnTimer.js's
freeze flag is now a `Set` of independent reasons ("pause",
"tutorial") instead of one boolean — `isPaused()`/`getGameRuntimeState()`
(RUNNING/PAUSED/STEP_BY_STEP) reflect whichever are currently held, and
`waitUntilResumed()` resolves once every reason clears. `playCard()`
now awaits that at each "point of no return" (before resolving a
card's ability, before a full Queue resolves into Party/Trash, before
drawing the next card, before advancing the turn), and the walkthrough
calls the exact same `pauseTurnTimer("tutorial")`/`resumeTurnTimer(
"tutorial")` the Pause panel already used (reason "pause") instead of
a second, competing mechanism — including js/game-main.js's portrait-
orientation gate, which already reused this same architecture before
this fix. A pending action (e.g. a Queue that just hit 5 right as
Pause was clicked) now waits and completes exactly once after Resume,
rather than executing silently or being lost. No card abilities, turn
order, AI difficulty, scoring, or Queue/Party/Trash rules changed —
synchronization only.

**Fix — Party/Trash Area popup: lopsided bottom padding on Mobile
Landscape (1.30.9):** The Mobile Landscape overlay for `#partyArea`/
`#trashArea` (and `#mobileLeaderboard`, which shares the same rule)
is a `position: fixed` box with both `top: 4dvh` and `bottom: 4dvh`
set. With no `margin`/`max-height` override, a box like that either
stretches to fill the whole band (`height: auto`) or — once the
inherited desktop `max-height: calc(100vh - 120px)` clamped it
shorter on most phones — settles anchored to `top` alone. Either way,
Party/Trash's actual content (often just a couple of cards) sat flush
against a small top gap while all the leftover space collected below
it as one large gap. Fix: an explicit `max-height: calc(100dvh - 8dvh)`
(replacing the inherited desktop value, which was tuned for a
different, always-visible sidebar layout) plus `margin: auto 0`
(vertical auto-margins only — the fixed `left`/`right` band keeps the
width unchanged) so the shrink-to-fit box is centered within the band
instead of stretched to fill it, top ≈ bottom either way. Same
treatment applied to the older, non-landscape `max-width: 600px`
version of this popup for consistency (in practice only reachable in
a narrow non-touch desktop window, since touch portrait is gated
behind a rotate overlay). `#partyCards`/`#trashCards` also picked up
`flex: 1 1 auto; min-height: 0` alongside their existing safety-net
`overflow-y: auto`, so that scrollbar can actually engage instead of
silently doing nothing while the parent's `overflow: hidden` clips
the excess — not the primary fix, just insurance against a future
party/trash pile too tall for the band (none exist today: a full
12-card grid fits comfortably at every tested landscape size). No
Party/Trash gameplay, card movement, or animations were touched —
layout/CSS only.

**Style — Store/Tournament/Leaderboard Coming Soon: popup instead of
a page navigation (1.30.8):** Home's bottom-nav Store, Tournament, and
Leaderboard buttons no longer navigate to `coming-soon.html`; per
AGENTS.md rule 4 ("Menu pages default to popups") they now open a
shared `#comingSoonModal` popup instead — the same treatment Lucky
Wheel already had, generalized instead of duplicated. The popup
identifies the selected feature by name + icon (set per feature in
`js/ui/home-ui.js`'s `openComingSoon()`) and reuses the existing
`comingSoonText` copy. It's built from the same `menu-popup` +
`lucky-wheel-panel` classes/markup shape as every other standardized
Home popup, so it inherits the shared modal lifecycle (backdrop/
Escape/focus-trap), Mobile Portrait sizing, and small-window
bottom-sheet treatment for free — no new CSS was needed.
`coming-soon.html`/`js/coming-soon-main.js` are unchanged and still
work by direct URL; they're just no longer linked from Home. No
Store/Tournament/Leaderboard functionality was implemented — still
Coming Soon only.

**Style — Game Header: removed Log and About Developer buttons (1.30.7):**
`game.html`'s in-game top bar (`#topRight`) no longer has its own
`#logBtn`/`#aboutBtn` icon buttons — the header now shows only
Pause / Help / Tutorial. Neither feature was deleted: Game Log
(`#logModal`) is still reachable on Mobile Portrait via the
`#mobileSideRail`'s `#railLogBtn` (see § Mobile portrait — game board
layout layer), and About Developer (`#aboutModal`) is still reachable
from Home's Settings popup (`#settingsAboutBtn`, see § Navigation
Architecture). `#topRight` is a plain flex row with `gap`/
`justify-content: flex-end` and `.top-btn` sizes itself with `clamp()`
rather than a fixed per-button width, so removing two buttons
reflows the remaining three without leaving an empty gap or requiring
new CSS, on both desktop and Mobile Portrait. Known gap: unlike Home,
`game.html`'s own in-game Settings modal (`#settingsModal`) has no
`#settingsAboutBtn`-style link to About Developer, so mid-match there
is currently no in-game entry point to it (only from Home) — see
Known Issues.

**Fix — Card Guide Animal Ability grid: two separate scrollbars on
Mobile (1.30.6):** 1.30.5 fixed the grid collapsing to 0px tall, but
did so by keeping `#animalGrid`'s own `overflow-y: auto` (plus a
`min-height: min-content` patch) — leaving the popup with two nested,
independent scroll containers: the popup's own `.modal-body` and the
grid itself. Visually/behaviourally that reads as two different
scrollbars for what the user experiences as one popup. Fixed by
removing `#animalGrid`'s own scrolling entirely (`overflow: visible`,
its default) so the grid simply sizes to its full content height, and
the **only** scroll container is `.modal-body` — exactly matching
Desktop and the documented Header/Scrollable-Body/Fixed-Footer
architecture. This also happens to be what fixes the original 0-height
collapse: an item with `overflow: visible` gets a normal content-based
automatic minimum size in flexbox, so the min-height patch from 1.30.5
is no longer needed either. Scoped to `#animalGrid` only at the time —
`.ach-grid` (Profile → Achievements) had the identical bug and was
left unrelated UI, untouched; it was fixed the same way in 1.30.13
above.

**Fix — Card Guide Animal Ability grid empty on Mobile (1.30.5,
superseded by 1.30.6 above):** `#animalGrid` (Card Guide's Animal
Ability grid, shared by Home's `#helpModal` popup and `game.html`'s
in-game Help modal) is a flex item of a column flex container
(`.help-body` on `index.html`; `.modal-content.help-layout` directly
on `game.html`). The Mobile Landscape no-scroll layer (see §
Responsive Design above) previously gave it the same plain
`overflow-y: auto` as `.ach-grid`, intended as a harmless fallback
scroll container. It wasn't harmless there: a flex item with
`overflow` other than `visible` loses its content-based "automatic
minimum size" and gets an automatic min-height of `0` instead. On the
short mobile-landscape heights this layer targets (568×320 up to
932×430), the modal's combined content (intro text + divider + title +
grid) is taller than the space available, so the flex-shrink algorithm
was free to shrink `#animalGrid` all the way to `0px` tall — its cards
still rendered at full size but were entirely clipped by their own
zero-height, `overflow:auto` box, i.e. invisible. This never showed on
Desktop (the layer is scoped to `pointer: coarse` + `orientation:
landscape`).
