// ══════════════════════════════════════════════════════════
// Home Start Game tabs — js/ui/homeGameStart-ui.js
//
// Wires the Play vs Bot / Rank / Friendly tab bar on Home
// (index.html, .home-gamestart). This is a tab bar, not a Game
// Modes screen and not three separate Home buttons — switching
// tabs only swaps which panel is shown in place, no navigation.
//
// Only Play vs Bot is active today: its panel is exactly the
// existing "Play vs Bot" button, wired by js/ui/playVsBot-ui.js.
// Rank and Friendly are real, selectable tabs — the player can see
// their panel — but neither has a game flow or backend yet, so
// their panel content honestly says Coming Soon instead of starting
// a fake match. Gameplay itself is completely unchanged: Play vs
// Bot still always deals the same 1 human + 3 bots.
// ══════════════════════════════════════════════════════════

const TAB_IDS = ["playVsBot", "rank", "friendly"];

function elementsForTab(tabId) {
    const capitalized = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    return {
        tabBtn: document.getElementById(`homeTab${capitalized}`),
        panel:  document.getElementById(`homeTabPanel${capitalized}`),
    };
}

function selectTab(tabId) {
    TAB_IDS.forEach(id => {
        const { tabBtn, panel } = elementsForTab(id);
        const isActive = id === tabId;
        if (tabBtn) {
            tabBtn.setAttribute("aria-selected", String(isActive));
            tabBtn.tabIndex = isActive ? 0 : -1;
        }
        panel?.classList.toggle("hidden", !isActive);
    });
}

export function initHomeGameStart() {
    const tabsEl = document.querySelector(".home-tabs");
    if (!tabsEl) return;

    tabsEl.addEventListener("click", e => {
        const btn = e.target.closest(".home-tab");
        if (!btn) return;
        selectTab(btn.dataset.tab);
        btn.focus();
    });

    // Standard tablist keyboard behavior: Left/Right (or Up/Down)
    // moves focus and activates the adjacent tab; Home/End jump to
    // the first/last tab.
    tabsEl.addEventListener("keydown", e => {
        const tabs = TAB_IDS.map(id => elementsForTab(id).tabBtn).filter(Boolean);
        const currentIndex = tabs.findIndex(t => t === document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % tabs.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        } else if (e.key === "Home") {
            nextIndex = 0;
        } else if (e.key === "End") {
            nextIndex = tabs.length - 1;
        } else {
            return;
        }

        e.preventDefault();
        selectTab(TAB_IDS[nextIndex]);
        tabs[nextIndex].focus();
    });
}
