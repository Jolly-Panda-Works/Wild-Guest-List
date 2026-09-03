import { openModal } from "./modal-ui.js";
import { showWarning } from "./game-ui.js";
import { t } from "../i18n.js";

export function initMobileUI() {

    initInfoPopups();

    document.getElementById("logBtn")?.addEventListener("click", () => {
        openModal("logModal");
    });

    // Landscape left-rail Log entry — same logModal as the top-bar Log
    // button above, just a second trigger point for the rail layout
    // (see css/style.css's `#mobileSideRail`).
    document.getElementById("railLogBtn")?.addEventListener("click", () => {
        openModal("logModal");
    });

    // Chat is a future feature — the rail button just surfaces the
    // same "Coming Soon" messaging already used elsewhere (e.g. Online
    // Play in js/game-modes-main.js), no real chat is implemented.
    document.getElementById("railChatBtn")?.addEventListener("click", () => {
        showWarning(t("comingSoonTitle"));
    });

    document.querySelectorAll(".closeModal").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".modal")?.classList.add("hidden");
        });
    });
}

export function initMobileTabs() {

    const leaderboardBtn = document.getElementById("leaderboardBtn");
    // Party/Trash now open from the door/trash icons that flank the
    // Queue itself (#queueWithIcons, built in renderQueue() —
    // js/ui/game-ui.js) rather than dedicated rail buttons — see the
    // mobile Landscape refinement notes in css/style.css. This call
    // must run after the Queue has rendered at least once (game-main.js
    // calls it after the first updateUI()) so these elements exist.
    const doorIcon  = document.getElementById("queueDoorIcon");
    const trashIcon = document.getElementById("queueTrashIcon");
    const leaderboard = document.getElementById("mobileLeaderboard");
    const party    = document.getElementById("partyArea");
    const trash    = document.getElementById("trashArea");

    function closePanels() {
        leaderboard?.classList.remove("mobile-open");
        party?.classList.remove("mobile-open");
        trash?.classList.remove("mobile-open");
        document.body.classList.remove("popup-open");
        leaderboardBtn?.classList.remove("active");
        doorIcon?.classList.remove("active");
        trashIcon?.classList.remove("active");
    }

    // Leaderboard / Party / Trash share one open-panel-at-a-time group:
    // opening one always closes the others.
    [
        { btn: leaderboardBtn, panel: leaderboard },
        { btn: doorIcon, panel: party },
        { btn: trashIcon, panel: trash },
    ].forEach(({ btn, panel }) => {
        const toggle = () => {
            const isOpen = panel?.classList.contains("mobile-open");
            closePanels();
            if (!isOpen) {
                panel?.classList.add("mobile-open");
                btn.classList.add("active");
                document.body.classList.add("popup-open");
            }
        };
        btn?.addEventListener("click", toggle);
        // .queue-icon-entry/.queue-icon-exit are divs (role="button"),
        // not real <button> elements, so Enter/Space activation isn't
        // free the way it is for leaderboardBtn — wire it explicitly.
        if (btn?.getAttribute("role") === "button") {
            btn.addEventListener("keydown", e => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                }
            });
        }
    });

    [leaderboard, party, trash].forEach(panel => {
        panel?.addEventListener("click", e => {
            if (e.target === panel) closePanels();
        });
        panel?.querySelector(".panel-close")?.addEventListener("click", closePanels);
    });
}

export function syncMobilePanels() {}

// Info tooltip as popup on mobile
export function initInfoPopups() {
    document.querySelectorAll(".panel-info-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            // Same reasoning as the Landscape layout layer in
            // css/style.css: width alone can't tell a landscape phone
            // (short but often >600px wide) from desktop, so this also
            // checks pointer type — desktop (fine pointer) still relies
            // on its CSS :hover tooltip and skips this click-to-open
            // popup regardless of window width.
            const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
            if (!isTouch && window.innerWidth > 600) return;
            e.stopPropagation();
            const text = btn.dataset.tooltip;
            if (!text) return;
            const popup = document.createElement("div");
            popup.className = "info-popup-overlay";
            popup.innerHTML = `
                <div class="info-popup-box">
                    <p>${text}</p>
                    <button class="screen-btn" style="margin-top:12px;padding:8px 20px;font-size:13px;">OK</button>
                </div>`;
            popup.querySelector("button").onclick = () => popup.remove();
            popup.onclick = e => { if (e.target === popup) popup.remove(); };
            document.body.appendChild(popup);
        });
    });
}
