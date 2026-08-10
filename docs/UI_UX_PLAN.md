# UI_UX_PLAN.md — Wild Guest List

Covers: per-screen UI/UX review (current problem → recommendation → reason → priority) and design system recommendation.
Companion documents: `PROJECT_AUDIT.md`, `ARCHITECTURE_PLAN.md`, `PRODUCT_ROADMAP.md`

Priority key: **P0** critical / blocks target vision · **P1** high value · **P2** medium · **P3** polish

---

## 1. Navigation & App Shell (new)

| | |
|---|---|
| **Current problem** | No persistent shell exists. The app is splash → one match → full-page reload. There is nowhere to put Profile, Store, Settings, About, How to Play, Card Guide, Coin balance, or the Leaderboard/Tournament placeholders the target vision requires. |
| **Recommendation** | Build a Home screen as the new default entry point (splash still plays once, then routes to Home rather than directly into difficulty selection). Home reuses the existing top-bar visual language (same icon-button style already used in-game) so the header feels continuous between Home and an active match, per the brief's explicit requirement. |
| **Reason** | Every target-vision feature needs a home to launch from; without this shell, each new screen would otherwise need its own ad-hoc entry point. |
| **Priority** | **P0** |

## 2. Home Screen Layout

| | |
|---|---|
| **Current problem** | N/A — doesn't exist yet. |
| **Recommendation** | Large game banner (reuse `assets/img/Banner.png`/`Logo-larg.png`) at top; primary actions "Online Game" (visibly present but clearly disabled/"Coming Soon", not hidden) and "Offline Game" (enters the existing splash→difficulty→match flow unchanged) as the dominant call-to-action pair; secondary row for Profile / Settings / About / How to Play / Card Guide; coin balance pinned top-right, always visible; bottom bar with Store / Tournament / Leaderboard (Tournament and Leaderboard are navigable placeholders per the brief — tapping them should show a clear "coming soon" state, not a dead button or an error). |
| **Reason** | Matches the brief's explicit information architecture; keeps Online Game visible-but-disabled so users know it's coming rather than assuming the feature doesn't exist; placing coin balance top-right mirrors where players already expect it from the in-game top bar. |
| **Priority** | **P0** |

## 3. "Leaderboard" Naming Collision

| | |
|---|---|
| **Current problem** | `ui/leaderboard-ui.js` and the desktop `#leftSidebar` panel are currently labeled "Leaderboard" but only ever show the *current match's* live standings — this will directly collide with the new persistent, cross-match Leaderboard feature once it exists in the bottom nav. |
| **Recommendation** | Rename the in-match panel (label + i18n key + component name) to something like "Match Standings" or "Round Score," reserving "Leaderboard" exclusively for the new persistent feature. Pure rename — no logic change. |
| **Reason** | Two different features sharing one name will confuse players and complicate analytics/support ("which leaderboard do you mean?"); cheap to fix now, awkward to fix after both ship. |
| **Priority** | **P1** (should land before or alongside the Home screen, since that's when both concepts first coexist in the UI) |

## 4. Coin Visibility

| | |
|---|---|
| **Current problem** | No coin concept exists anywhere in the UI today. |
| **Recommendation** | A small, consistent "coin pill" component (icon + number) in the top-right of both Home and the in-game top bar, per the brief. Tapping it could deep-link to the Store (common, expected pattern) even before the full Store is built out. |
| **Reason** | Coins are referenced from Home, Store, game-end rewards, and quests — a single reusable component avoids four slightly different implementations. |
| **Priority** | **P0** (blocks Store/Rewards/Quests UX, all of which need to show or reference balance) |

## 5. Store UX (new)

| | |
|---|---|
| **Current problem** | Doesn't exist. |
| **Recommendation** | Two clearly separated sections: Coin Packs (grid of purchasable packs showing coins + bonus + price) and Cosmetics (tabbed or filterable by category — Avatars / Card Colors / Card Patterns / Themes — rendered from the data-driven catalog in `ARCHITECTURE_PLAN.md` §6.1, not hardcoded per item). Each cosmetic card should clearly show owned/not-owned/locked (with unlock requirement if applicable) state before purchase. |
| **Reason** | Matches the data-driven catalog design; showing ownership state up front avoids a bad "I already own this, why is it for sale" moment. |
| **Priority** | **P1** |

## 6. Profile UX (new)

| | |
|---|---|
| **Current problem** | No profile exists; player name is retyped every game and never persisted. |
| **Recommendation** | Profile screen showing name (editable, with clear inline uniqueness validation feedback — "checking...", "available", "taken"), avatar (opens Customization's Avatar tab), level, score, total games/wins/losses, and per-mode stats. A distinct, simpler "public profile" view (read-only, what another player would see) should be reachable for preview so the private/public split from `ARCHITECTURE_PLAN.md` §7.2 is legible to the user, not just to the backend. |
| **Reason** | Directly implements the brief's Profile requirements; previewing the public view helps players understand what they're sharing, which matters once profiles become visible to others. |
| **Priority** | **P1** |

## 7. Customization UX (new)

| | |
|---|---|
| **Current problem** | Doesn't exist. |
| **Recommendation** | Tabbed layout (Avatar / Card Color / Card Pattern / Game Theme, extensible), each tab a grid of owned+unowned items from the catalog; locked items shown dimmed with a lock icon and price/unlock-requirement rather than hidden; one clear "Equip"/"Equipped" state per item, consistent with the ownership-vs-equipped data model. |
| **Reason** | Showing locked items (rather than hiding them) is a well-established pattern for driving Store conversion and matches the "data-driven, ownership ≠ equipped" architecture directly. |
| **Priority** | **P2** |

## 8. Settings UX

| | |
|---|---|
| **Current problem** | Sound toggle isn't persisted (resets every reload); version number is hardcoded in HTML rather than sourced from config; language and onboarding-seen flags live in three separate ad-hoc `localStorage` keys with no single "settings" abstraction. |
| **Recommendation** | Consolidate into one local-settings module (per `ARCHITECTURE_PLAN.md` §5) and persist sound state; source the version string from a single config value so it can't drift from the actual deployed build; add a "Remove Ads" purchase entry here once Store/Payments exist, per the brief. |
| **Reason** | Small, low-risk fixes that remove a real inconsistency flagged in the audit; natural place to add Remove Ads since it's an account-level setting, not a gameplay one. |
| **Priority** | **P2** (persistence/version fixes) / **P1** (Remove Ads entry, once Payments exists) |

## 9. Quest UX (new)

| | |
|---|---|
| **Current problem** | Doesn't exist. |
| **Recommendation** | A dedicated Daily Quests panel (accessible from Home) showing active quests with progress bars, clear "claim" affordance only once completed, and a visible reset countdown. Weekly/Seasonal tabs can exist in the UI shell but should show an explicit "coming soon" rather than an empty list, consistent with how Leaderboard/Tournament are treated. |
| **Reason** | Matches the config-driven quest architecture; showing a clear claim state (vs. auto-claim) gives the player a moment of reward and matches typical quest-UX expectations. |
| **Priority** | **P2** (P3 for Weekly/Seasonal placeholders) |

## 10. Game-End UX

| | |
|---|---|
| **Current problem** | `endgame-ui.js` shows a final score table and win/lose message, but nothing about rewards (they don't exist yet) — and the win/lose framing is binary even though the target vision implies all 4 placements matter (1st–3rd earn coins, 4th doesn't). |
| **Recommendation** | Below the existing standings table, add a Rewards section per player-placement (coins + score multiplier, sourced from the reward table, server-confirmed before display — client shows an optimistic/pending state if the server confirmation hasn't returned yet rather than guessing the amount). Keep the existing win/lose headline framing for the human player; it works well and needs no change. |
| **Reason** | Implements the brief's reward-display requirement without disturbing what already works well on this screen. |
| **Priority** | **P1** |

## 11. Empty / Loading / Error / Disabled States

| | |
|---|---|
| **Current problem** | None are designed anywhere in the current project. JSON fetches (`cardInfo.json`, `config.json`, `i18n.json`, `tutorial.json`) have no visible failure handling today — a failed fetch just breaks rendering silently, and there's no loading indicator during the initial fetch chain on slower connections. |
| **Recommendation** | Define a small shared set: a loading skeleton/spinner pattern for any screen that fetches on open (Store, Profile, Quests, and the existing initial data loads); a lightweight inline error state ("Couldn't load — Retry") for failed fetches instead of silent breakage; disabled-button styling (already partially present via the Online Game button's planned disabled state, extend consistently — greyed, non-interactive, with a tooltip/label explaining why) reused everywhere a feature is gated (locked cosmetics, insufficient coins, quota exhausted). |
| **Reason** | Currently a real gap even in the existing app (a slow or failed JSON fetch today gives no feedback at all), and becomes more visible as more screens depend on network calls once a backend exists. |
| **Priority** | **P1** |

## 12. Responsive / Mobile Usability

| | |
|---|---|
| **Current problem** | The existing in-game mobile handling (`mobile-ui.js`, tab-based panels) is solid, but none of the new screens (Home, Store, Profile, Customization, Quests) have been designed with mobile in mind yet, by definition, since they don't exist. |
| **Recommendation** | Reuse the existing patterns already proven in-game: bottom-tab-style navigation for Home's Store/Tournament/Leaderboard row on narrow viewports (mirroring the existing party/trash mobile tabs), modal-or-full-screen takeover for Profile/Customization/Store on mobile (mirroring how Settings/Help already behave), and the same `--radius`/spacing custom properties already defined in `css/style.css` so new screens feel native rather than bolted on. |
| **Reason** | The project already solved this problem once, well — reuse rather than reinvent. |
| **Priority** | **P1** |

## 13. Accessibility

| | |
|---|---|
| **Current problem** | Some ARIA is already present (e.g. `role="dialog" aria-modal="true"` on the tutorial modal) but it's inconsistent — most other modals (`helpModal`, `settingsModal`, `cardModal`) lack it; icon-only buttons (top-bar icon buttons) rely on `data-title`/tooltip text rather than `aria-label`; color is sometimes the only signal (per-player colors `--p1`–`--p4` distinguishing hands/cards). |
| **Recommendation** | Apply the tutorial modal's existing ARIA pattern consistently to all modals; add `aria-label` to all icon-only buttons; ensure player-color coding is always paired with a text/icon differentiator (already partially true via name labels — verify consistently as new screens are added, especially Leaderboard/Profile rows that may lean on color alone). |
| **Reason** | Low effort since a correct pattern already exists in the codebase to copy from; avoids compounding the gap as new screens are added. |
| **Priority** | **P2** |

## 14. Animation / Micro-interactions

| | |
|---|---|
| **Current problem** | The existing card-play animation (`animateCardPlay` in `game-ui.js`) is a nice, already-solved reference implementation; nothing analogous exists yet for coin-balance changes, quest-claim moments, or purchase confirmations, since none of those features exist. |
| **Recommendation** | Reuse the existing FLIP-style clone-and-transition technique for a "coins added" pulse/count-up on the coin pill after any reward/purchase; a simple confirmation state (checkmark/toast) for purchases and quest claims. Keep new motion consistent with the existing `cubic-bezier(.4,0,.2,1)` easing already used in-game rather than introducing a second animation style. |
| **Reason** | Consistency with an already-good existing pattern; avoids a jarring stylistic seam between old and new screens. |
| **Priority** | **P3** |

## 15. Visual Hierarchy, Typography, Spacing, Color System

| | |
|---|---|
| **Current problem** | The existing `:root` CSS custom properties (player colors, `--bg-*`, `--text-*`, `--radius-*`, `--shadow-card`) form a reasonable de facto design token set, but they were clearly authored for the in-game board specifically — there's no documented set of tokens intended for "app chrome" (Home, Store, Profile) as opposed to "game board." |
| **Recommendation** | Formalize the existing tokens as the base palette, and add a small number of clearly-named additions for new screens as needed (e.g., semantic tokens like `--surface-card`, `--surface-elevated` for Store/Profile cards) rather than inventing a parallel system. Typography currently relies on Google Fonts already loaded per-language (Poppins/Vazirmatn/Noto Sans Arabic/Noto Sans TR) — keep this, just ensure new screens use the same font-family cascade already defined rather than redeclaring it. |
| **Reason** | The existing token foundation is genuinely good (per the audit's strengths); extending it is far cheaper and more consistent than a parallel system. |
| **Priority** | **P2** |

---

## 16. Design System Recommendation

**Should the project adopt a reusable design system?** Yes, but a lightweight, CSS-and-vanilla-JS-native one — not a component framework migration. The project's existing card-factory pattern (`createCard()` in `game-ui.js`, a single function that builds a consistent card DOM structure from data) is exactly the right model to replicate for the new screens' repeated elements. **Avoid unnecessary abstraction**: only formalize components that will genuinely be reused across 2+ screens.

Recommended reusable components (each as a small, focused JS function returning a DOM node, following the existing `createCard()` convention, plus a shared CSS partial):

| Component | Reused by |
|---|---|
| **Button** (primary/secondary/disabled variants) | Every screen — currently ad hoc per screen (`screen-btn`, `top-btn`, `diff-btn` are all slightly different today); worth unifying. |
| **Modal shell** (header, close button, ARIA wiring) | Currently duplicated per-modal in HTML; a shared JS helper (build on the existing `openModal`/`closeModal` pair in `modal-ui.js`) removes repetition as modal count grows (Store item detail, Cosmetic preview, etc.). |
| **Coin display** ("coin pill") | Home, in-game top bar, Store, Game-End rewards. |
| **Player/Avatar card** | Profile, public profile preview, Customization's Avatar tab, other-players board display (partially exists already in `renderOtherPlayers`). |
| **Store item card** | Store's coin packs + cosmetics grids. |
| **Quest card** | Quests screen. |
| **Game result / reward card** | Game-End screen. |
| **Leaderboard row** | Future Leaderboard screen; can share structure with the existing (soon renamed) match-standings row. |
| **Loading skeleton** | Every screen with a fetch-on-open. |
| **Toast / confirmation** | Purchases, quest claims, error states — a lightweight version of the existing `showWarning()` toast pattern already in `game-ui.js`, generalized. |
| **Confirmation dialog** | Purchases (especially real-money ones), destructive actions. |

**Explicitly not recommended:** a full component framework migration (React/Vue/etc.), a CSS-in-JS system, or a generic "Card" abstraction so broad it tries to serve both game cards and store items (they have different enough content/behavior that forcing one component would add complexity, not remove it — two small focused components beat one overloaded one).

---

*See `PRODUCT_ROADMAP.md` for how these items map to phases and priorities alongside the rest of the roadmap.*
