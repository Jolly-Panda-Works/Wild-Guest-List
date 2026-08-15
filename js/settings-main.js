// ══════════════════════════════════════════════════════════
// Settings page bootstrap — js/settings-main.js
//
// Entry point for settings.html — Home's Settings destination, a
// top-level sibling of Home rather than content rendered inside it.
// Reuses the exact same settings widgets/persistence Home's old
// in-page modal used (js/ui/cardColor-ui.js, js/ui/cardGuidance-ui.js,
// js/services/soundManager.js, js/i18n.js) — only the page shell is
// new. game.html keeps its own copy of this markup for the in-game
// Pause → Settings modal, which is a deliberate, separate use case
// (see js/ui/pause-ui.js) and is unaffected by this page.
// ══════════════════════════════════════════════════════════

import { loadI18n, buildLangSelector } from "./i18n.js";
import { loadIcons } from "./ui/icon-ui.js";
import { initCardColorPicker } from "./ui/cardColor-ui.js";
import { initStepGuidanceToggle } from "./ui/cardGuidance-ui.js";
import { initSoundToggle } from "./services/soundManager.js";

await loadI18n();
buildLangSelector(document.getElementById("langSelector"));

await initCardColorPicker();
initStepGuidanceToggle();
initSoundToggle();

await loadIcons();
