// ══════════════════════════════════════════════════════════
// Coming Soon page bootstrap — js/coming-soon-main.js
//
// Entry point for coming-soon.html — a shared top-level destination
// for Home's not-yet-built features. Which feature is showing comes
// from the ?feature= query param (e.g. coming-soon.html?feature=shop),
// so each one still has its own real, bookmarkable/refreshable URL
// and is architecturally independent from Home, without a
// near-duplicate page per feature. See js/ui/home-ui.js for the
// features currently wired to this page.
// ══════════════════════════════════════════════════════════

import { loadI18n, t } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";

// i18n key for each feature's display name. Extending Home with a
// new "Coming Soon" entry point (Daily Challenge, Progress,
// Achievements, News/Events, Friends, ...) only needs a new entry
// here plus an i18n key — the page/route itself already works.
const FEATURE_NAME_KEYS = {
    shop:        "homeStore",
    tournament:  "homeTournament",
    leaderboard: "homeLeaderboard",
    online:      "gameModesOnline",
};

await loadI18n();

const feature = new URLSearchParams(location.search).get("feature");
const nameKey = FEATURE_NAME_KEYS[feature];

document.getElementById("comingSoonFeatureName").textContent =
    nameKey ? t(nameKey) : t("comingSoonTitle");

await loadIcons();
