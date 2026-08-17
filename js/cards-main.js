// ══════════════════════════════════════════════════════════
// Cards page bootstrap — js/cards-main.js
//
// Entry point for cards.html — Home's Card Guide destination, a
// top-level sibling of Home rather than content rendered inside it.
// Reuses the exact same Help content/loader game.html's in-game Help
// modal uses (js/game/help.js) — only the page shell is new; that
// module already knows how to run against either a modal (game.html)
// or plain page content (see the guard in its initHelp()).
// ══════════════════════════════════════════════════════════

import { loadI18n } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { initHelp, openHelp } from "./game/help.js";
import { initOrientationGate } from "./ui/orientation-ui.js";

initOrientationGate();

await loadI18n();
initHelp();
openHelp();
await loadIcons();
