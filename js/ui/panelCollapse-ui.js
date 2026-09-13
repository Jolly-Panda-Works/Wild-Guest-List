// ── Collapsible panel toggle ─────────────────────────────────
// Shared by the two persistent Desktop/Tablet panels — #gameLog
// (top-left) and #chatPanel (bottom-left) — both marked with the
// `.collapsible-panel` class and a `.panel-collapse-btn` in their
// header (see game.html). Toggling adds/removes `.collapsed` on the
// panel, which css/style.css collapses down to just the header via
// `.collapsible-panel.collapsed .panel-collapse-body { display: none }`.
//
// This is purely a presentation toggle: it never touches gameState,
// gameState.logs, or any Chat data — collapsing/expanding a panel has
// no gameplay effect. It only exists at the Desktop/Tablet breakpoint
// (the button itself is hidden elsewhere via CSS), but wiring it
// unconditionally here is harmless everywhere else since the button
// simply isn't visible/clickable off that breakpoint.
export function initPanelCollapse() {
    document.querySelectorAll(".collapsible-panel .panel-collapse-btn").forEach(btn => {
        const panel = btn.closest(".collapsible-panel");
        if (!panel || btn.dataset.collapseWired) return;
        btn.dataset.collapseWired = "1";

        btn.setAttribute("aria-expanded", "true");

        btn.addEventListener("click", () => {
            const collapsed = panel.classList.toggle("collapsed");
            btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        });
    });
}
