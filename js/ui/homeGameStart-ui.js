// ══════════════════════════════════════════════════════════
// Home Start Game tabs — js/ui/homeGameStart-ui.js
//
// Wires the primary Play vs Bot / Play vs Human tab bar on Home
// (index.html, .home-gamestart). This only handles the PRIMARY
// level — switching which panel is shown, no navigation. Each
// panel's own secondary options (the 1/2/3 Bot buttons, Rank/
// Friendly) are wired separately in js/ui/home-ui.js, since those
// actually start a match / open a modal rather than just toggling
// visibility.
//
// Play vs Bot is the default primary tab, since it's the only fully
// playable game type today. Play vs Human is a real, selectable tab
// — its panel is visible — but both options inside it are honest
// Coming Soon placeholders.
// ══════════════════════════════════════════════════════════

const TAB_IDS = ["playVsBot", "playVsHuman"];

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
