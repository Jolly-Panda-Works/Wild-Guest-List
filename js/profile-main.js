// ══════════════════════════════════════════════════════════
// Profile page bootstrap — js/profile-main.js
//
// Entry point for profile.html — a top-level destination, sibling
// of Home (index.html), not content rendered inside it. See
// js/ui/profile-ui.js for the page's own logic and
// docs/ARCHITECTURE_PLAN.md for the navigation architecture this
// is part of.
// ══════════════════════════════════════════════════════════

import { loadI18n } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { initProfilePage } from "./ui/profile-ui.js";
import { initOrientationGate } from "./ui/orientation-ui.js";

// Wired synchronously, before any awaited boot step, same as every
// other top-level page — see js/ui/orientation-ui.js.
initOrientationGate();

await loadI18n();
initProfilePage();
await loadIcons();
