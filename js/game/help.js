import { t, getLang } from "../i18n.js";
import { loadIcons } from "../ui/icon-ui.js";
let helpCards = null;

/** Ensures cardInfo.json is loaded, without opening/rendering the Help
 *  grid — used by callers (e.g. long-press) that only need lookup data. */
async function ensureHelpCardsLoaded() {
    if (!helpCards) {
        const res = await fetch("./data/cardInfo.json");
        helpCards = await res.json();
    }
    return helpCards;
}

/** Opens the existing Card Information modal for the gameplay card with
 *  the given `power` (cardInfo.json entries are keyed by power, same as
 *  in-game card objects — see js/services/dataLoader.js). This is the
 *  SAME modal/rendering used by the Help grid's "click a card" flow;
 *  nothing here duplicates it. Used by the long-press gesture on cards
 *  in the player's hand (see js/ui/game-ui.js). */
export async function openCardInfoByPower(power) {
    const cards = await ensureHelpCardsLoaded();
    const card = cards.find(c => c.power === power);
    if (!card) {
        console.warn("[help] no cardInfo entry for power", power);
        return;
    }
    openCardInfo(card);
}

/** Opens the Card Guide (the existing Help modal's animal grid) and
 *  loads its data if needed. Shared by the in-game helpBtn (top bar)
 *  and the Home screen's Card Guide entry (js/ui/home-ui.js) — one
 *  modal, one loader, no duplicated "collection" screen. */
export function openHelp() {
    document.getElementById("helpModal")?.classList.remove("hidden");
    loadHelpCards();
}

let _initialized = false;

export function initHelp() {
    // Guard against double-binding: initHelp() is called once at boot
    // (so Home's Card Guide entry works before a match exists) and
    // historically was also called from js/main.js on every new game.
    if (_initialized) return;
    _initialized = true;

    const helpBtn   = document.getElementById("helpBtn");
    const helpModal = document.getElementById("helpModal");
    const closeHelp = document.getElementById("closeHelp");
    const cardModal    = document.getElementById("cardModal");
    const cardBackBtn  = document.getElementById("cardBackBtn");

    helpBtn.addEventListener("click", openHelp);

    closeHelp.addEventListener("click", () => helpModal.classList.add("hidden"));

    helpModal.addEventListener("click", e => {
        if (e.target === helpModal) helpModal.classList.add("hidden");
    });

    cardBackBtn.addEventListener("click", () => cardModal.classList.add("hidden"));

    cardModal.addEventListener("click", e => {
        if (e.target === cardModal) cardModal.classList.add("hidden");
    });

    // Re-render help grid when language changes
    window.addEventListener("langchange", () => {
        if (!helpModal.classList.contains("hidden") && helpCards) {
            renderHelpCards(helpCards);
        }
    });
}

async function loadHelpCards() {
    if (!helpCards) {
        const res = await fetch("./data/cardInfo.json");
        helpCards = await res.json();
    }
    renderHelpCards(helpCards);
}

function getCardTranslation(card) {
    const lang = getLang();
    return card.translations?.[lang] || {};
}

function renderHelpCards(cards) {
    const grid = document.getElementById("animalGrid");
    grid.innerHTML = "";
    cards.forEach(card => {
        const tr = getCardTranslation(card);
        const name = tr.name || card.name;

        const div = document.createElement("div");
        div.className = "card-info";

        const visual = card.image
            ? `<img class="card-image" src="${card.image}" alt="${name}" />`
            : `<div class="help-card-emoji">${card.emoji}</div>`;

        div.innerHTML = `
            ${visual}
            <div class="help-card-footer">
                <div class="help-card-name">${name}</div>
                <div class="help-card-power">${card.power}</div>
            </div>
        `;

        div.addEventListener("click", () => openCardInfo(card));
        grid.appendChild(div);
    });
}

function openCardInfo(card) {
    const modal = document.getElementById("cardModal");
    modal.classList.remove("hidden");

    const tr = getCardTranslation(card);
    const name        = tr.name        || card.name;
    const description = tr.description || card.description;
    const exampleText = tr.example     || card.example;

    const lines  = exampleText.split("\n");
    const before = lines[0] || "";
    const after  = lines[1] || "";

    const visual = card.image
        ? `<img src="${card.image}" alt="${name}" class="detail-image" />`
        : `<div class="detail-emoji">${card.emoji}</div>`;

    document.getElementById("cardModalContent").innerHTML = `
        <div class="help-card-detail">
            ${visual}
            <h2>${name}</h2>
            <div class="power-badge"><span data-icon="power"></span> Power ${card.power}</div>

            <h3>${t("howItWorks")}</h3>
            <p class="desc-text">${description}</p>

            <h3>${t("example")}</h3>
            <div class="example-container">
                <div class="example-box before">
                    <div class="label">${t("queueBefore")}</div>
                    <div class="text">${before}</div>
                </div>
                <div class="arrow">→</div>
                <div class="example-box after">
                    <div class="label">${t("queueAfter")}</div>
                    <div class="text">${after}</div>
                </div>
            </div>

            <div class="help-tip">
                <span data-icon="tip"></span> <strong>Tip:</strong> ${t("helpTip")}
            </div>
        </div>
    `;

    loadIcons(document.getElementById("cardModalContent"));
}
