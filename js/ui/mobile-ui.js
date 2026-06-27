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

    const partyBtn = document.getElementById("partyTab");
    const trashBtn = document.getElementById("trashTab");
    const party    = document.getElementById("partyArea");
    const trash    = document.getElementById("trashArea");

    function closePanels() {
        party?.classList.remove("mobile-open");
        trash?.classList.remove("mobile-open");
        document.body.classList.remove("popup-open");
        partyBtn?.classList.remove("active");
        trashBtn?.classList.remove("active");
    }

    partyBtn?.addEventListener("click", () => {
        const isOpen = party?.classList.contains("mobile-open");
        closePanels();
        if (!isOpen) {
            party?.classList.add("mobile-open");
            partyBtn.classList.add("active");
            document.body.classList.add("popup-open");
        }
    });

    trashBtn?.addEventListener("click", () => {
        const isOpen = trash?.classList.contains("mobile-open");
        closePanels();
        if (!isOpen) {
            trash?.classList.add("mobile-open");
            trashBtn.classList.add("active");
            document.body.classList.add("popup-open");
        }
    });

    [party, trash].forEach(panel => {
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
            if (window.innerWidth > 600) return;
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
