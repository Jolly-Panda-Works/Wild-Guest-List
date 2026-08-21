# Tests

This project has no existing test framework or runner (no `package.json`,
no prior `tests/`/`spec/` folder, nothing wired into CI) — Wild Guest
List is a plain static-file, ES-modules-in-the-browser app. Rather than
inventing a full framework/build step per feature, these tests use
Node's built-in `node:test` + `node:assert/strict`, with `fetch`/
`localStorage`/a minimal DOM stubbed just enough for the real module
under test to run unmodified (no test-only code paths added to
`js/services/achievements.js` or `js/ui/orientation-ui.js`).

## Run

```
node --test tests/*.test.mjs
```

Run from the project root — polyfilled `fetch` calls resolve real
`./data/config.json` / `./data/cardInfo.json` requests relative to
`process.cwd()`.

## achievements.test.mjs

- **First Steps** — unlocks on any completed game (win or lose); does not
  unlock from session/tracking setup alone.
- **Crocodile Hunter** — only successful `CARD_EATEN` events increment
  progress; a Zebra-blocked attempt does not; unlocks at the configured
  target (5).
- **No Escape** — unlocks specifically on a Zebra blocking a Crocodile's
  eat attempt (`CARD_REACTED` / `flavor:"block"`); an ordinary Hippo push
  (`CARD_ESCAPED`) does **not** unlock it — see the "No Escape" note in
  `js/services/achievements.js` for why that event was chosen over the
  more generically-named `CARD_ESCAPED`.
- **Party Animal / Party Starter** — first real party entry vs. 3 entries.
- **Last One Standing** — only the genuinely sole surviving card in the
  queue unlocks it, not either card of an ordinary final pair.
- **Strategist** — 3+ unique successful abilities *and* a win; repeats of
  the same ability don't count multiple times; losing doesn't unlock it;
  session tracking resets between games (no cross-game accumulation).
- **Duel Master** — does **not** unlock in this game's standard 4-player
  deal (documented limitation — no 2-player Duel mode exists in the
  project yet); confirmed separately that the underlying config-driven
  condition is real logic, not dead code, by satisfying it directly.
- **Wild Champion** — needs 10 valid wins.
- **Perfect Timing** — unlocks only if the turn timer never had to
  auto-play on the human's behalf during that game.
- **`getAchievements()`** — returns all 10 definitions with valid
  locked/unlocked state and progress shape.

## Known gaps

- No test drives the actual DOM/UI layer (`js/ui/profile-ui.js`,
  `js/ui/achievementNotification-ui.js`) — the project has no DOM test
  harness (jsdom, Playwright, etc.) to hook into, and adding one was out
  of scope for this feature. These were verified by manual code review
  against the existing `js/ui/feedback-ui.js` toast pattern they mirror.
- No automated regression test re-runs the *existing* game/queue/ability
  test suite, because none exists to re-run — regression safety for
  those areas came from careful reading of `js/game/turnManager.js`,
  `js/game/queueManager.js`, and `js/abilities/abilities.js` to confirm
  every achievement hook is purely additive (new function calls reading
  already-computed events/state) and never changes an existing return
  value, mutation, or control-flow branch.

## profile.test.mjs

Exercises the coins/gems currency foundation added to
`js/services/profile.js` (storage only — no earn/spend/reward system
exists yet, see the module's own header comment):

- Coins and gems exist on the profile shape alongside `displayName`/
  `avatarId`.
- A brand-new profile starts at exactly `0` coins / `0` gems — no
  invented free currency.
- `setCoins()`/`setGems()` write through and `getCoins()`/`getGems()`
  read the new value.
- Balances persist across a simulated reload (fresh module import
  against the same `localStorage`, mirroring how a real browser reload
  works).
- `setCoins()`/`setGems()` reject negative, `NaN`, and non-number
  input, leaving the existing balance untouched — a balance can never
  go negative or non-numeric through this API.
- A profile saved before currencies existed (no `coins`/`gems` keys at
  all) loads as `0`/`0`, not `undefined`/`NaN`.
- A corrupted or negative stored balance (e.g. hand-edited
  `localStorage`) is sanitized back to `0` on load rather than trusted
  as-is.
- Changing currency never touches `displayName`/`avatarId`, and vice
  versa — confirms the fields are independent, not accidentally
  coupled by a shared code path.

**Known gap:** no test drives the actual DOM (Home's `#homeCoinPill`/
`#homeGemPill`, `js/ui/profile-ui.js`
`updateHomeCurrencyDisplay()`/`initHomeCurrencyDisplay()`) — same
DOM-test-harness gap noted under `achievements.test.mjs` above. This
was verified by manual code review against the existing
`updateHomeProfileChip()` pattern it mirrors, plus a manual reload
check (see Final Report).


Exercises `js/ui/orientation-ui.js` with a hand-rolled `matchMedia`/DOM
stub (not a general jsdom replacement — just enough surface for the
real module to run unmodified):

- **Desktop** (`pointer: fine`) never blocks, even in a tall/narrow
  browser window shaped like portrait — confirms the gate is driven by
  touch-primary detection, not raw window aspect ratio.
- **Mobile portrait** (`pointer: coarse` + `orientation: portrait`)
  blocks; **mobile landscape** and **tablet landscape** stay playable.
- **Rotation is reactive**: flipping the underlying `matchMedia` value
  in either direction shows/hides the gate immediately and fires the
  corresponding `onOrientationBlocked`/`onOrientationUnblocked`
  subscriber — no polling involved.
- Redundant re-checks of the same state never double-fire listeners.
- `initOrientationGate()` called twice (simulating an accidental
  duplicate init) never results in a duplicated blocked/unblocked
  firing — the "no duplicate initialization" requirement.
- The gate never touches anything outside its own element's classes —
  confirms it can't be the thing that destroys/resets game state.

**Known gap:** no test drives the actual game.html pause/resume
integration (`js/game-main.js`'s `onOrientationBlocked`/
`onOrientationUnblocked` wiring to `js/game/turnTimer.js`) — that
would need a much heavier gameplay-simulation harness than exists here.
It was verified by manual code review: the wiring only calls
`pauseTurnTimer()`/`resumeTurnTimer()` (already covered by the existing
Pause panel) and tracks a local `pausedByOrientation` flag so it never
auto-resumes a game the player paused manually.
