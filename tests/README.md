# Tests

This project has no existing test framework or runner (no `package.json`,
no prior `tests/`/`spec/` folder, nothing wired into CI) — Wild Guest
List is a plain static-file, ES-modules-in-the-browser app. Rather than
inventing a full framework/build step for one feature, `achievements.test.mjs`
uses Node's built-in `node:test` + `node:assert/strict`, with `fetch` and
`localStorage` minimally polyfilled so it can import and exercise
`js/services/achievements.js` exactly as shipped (no test-only code paths
added to the module itself).

## Run

```
node --test tests/achievements.test.mjs
```

Run from the project root — the polyfilled `fetch` resolves the module's
real `./data/config.json` and `./data/cardInfo.json` requests relative
to `process.cwd()`.

## Coverage

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
