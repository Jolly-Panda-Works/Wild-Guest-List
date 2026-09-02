import { openModal } from "./modal-ui.js";

export function initMobileUI() {

    initInfoPopups();

    document.getElementById("logBtn")?.addEventListener("click", () => {
        openModal("logModal");
    });

    document.querySelectorAll(".closeModal").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".modal")?.classList.add("hidden");
        });
    });
}

export function initMobileTabs() {

    const leaderboardBtn = document.getElementById("leaderboardBtn");
    const partyBtn = document.getElementById("partyTab");
    const trashBtn = document.getElementById("trashTab");
    const leaderboard = document.getElementById("mobileLeaderboard");
    const party    = document.getElementById("partyArea");
    const trash    = document.getElementById("trashArea");

    function closePanels() {
        leaderboard?.classList.remove("mobile-open");
        party?.classList.remove("mobile-open");
        trash?.classList.remove("mobile-open");
        document.body.classList.remove("popup-open");
        leaderboardBtn?.classList.remove("active");
        partyBtn?.classList.remove("active");
        trashBtn?.classList.remove("active");
    }

    // All three (Leaderboard/Party/Trash) share one open-panel-at-a-time
    // group: opening one always closes the others, same behavior Party/
    // Trash already had — a single small helper instead of three near-
    // identical listeners.
    [
        { btn: leaderboardBtn, panel: leaderboard },
        { btn: partyBtn, panel: party },
        { btn: trashBtn, panel: trash },
    ].forEach(({ btn, panel }) => {
        btn?.addEventListener("click", () => {
            const isOpen = panel?.classList.contains("mobile-open");
            closePanels();
            if (!isOpen) {
                panel?.classList.add("mobile-open");
                btn.classList.add("active");
                document.body.classList.add("popup-open");
            }
        });
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
