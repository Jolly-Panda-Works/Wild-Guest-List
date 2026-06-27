import { loadIcons } from "./icon-ui.js"
import { t, getLang } from "../i18n.js"

let slides = [];
let currentSlide = 0;
let isFirstTime = false;

export async function initializeTutorial(){

    const response = await fetch("./data/tutorial.json");
    const data     = await response.json();
    slides         = data.slides;

    bindTutorialEvents();

    // Re-render current slide when language changes
    window.addEventListener("langchange", () => {
        if (!document.getElementById("tutorialModal").classList.contains("hidden")) {
            renderSlide();
        }
    });
}

export function openTutorial(firstTime = false){
    isFirstTime  = firstTime;
    currentSlide = 0;
    renderSlide();
    updateCloseButton();
    document.getElementById("tutorialModal").classList.remove("hidden");
}

export function closeTutorial(){
    document.getElementById("tutorialModal").classList.add("hidden");
    localStorage.setItem("tutorialSeen", "true");
    // stop video if playing
    const iframe = document.getElementById("tutorialVideoFrame");
    if (iframe) iframe.src = iframe.src; // reset
}

function updateCloseButton(){
    const closeBtn = document.getElementById("closeTutorial");
    if (!closeBtn) return;
    const isLast   = currentSlide === slides.length - 1;
    const canClose = !isFirstTime || isLast;
    closeBtn.style.visibility   = canClose ? "visible" : "hidden";
    closeBtn.setAttribute("aria-hidden", canClose ? "false" : "true");
}

/* ── Diagram renderers ── */

function renderHandDiagram(diagram){
    const cards = diagram.cards.map(c => `
        <div class="tut-card">
            <div class="tut-card-emoji">${c.emoji}</div>
            <div class="tut-card-name">${c.name}</div>
            <div class="tut-card-power">⚡${c.power}</div>
        </div>
    `).join("");
    return `
        <div class="tut-diagram">
            <div class="tut-diagram-label">${diagram.label}</div>
            <div class="tut-hand">${cards}</div>
        </div>
    `;
}

function renderQueueAddDiagram(diagram){
    const beforeCards = diagram.before.map(c => `
        <div class="tut-card tut-card-sm">
            <div class="tut-card-emoji">${c.emoji}</div>
            <div class="tut-card-name">${c.name}</div>
        </div>
    `).join('<span class="tut-arrow">›</span>');
    const addedCard = `
        <div class="tut-card tut-card-sm tut-card-new">
            <div class="tut-card-emoji">${diagram.added.emoji}</div>
            <div class="tut-card-name">${diagram.added.name}</div>
            <div class="tut-card-badge">NEW</div>
        </div>
    `;
    return `
        <div class="tut-diagram">
            <div class="tut-diagram-label">${diagram.label}</div>
            <div class="tut-queue-row">${beforeCards}<span class="tut-arrow">›</span>${addedCard}</div>
        </div>
    `;
}

function renderAbilityExamples(diagram){
    const items = diagram.examples.map(e => `
        <div class="tut-ability-card">
            <span class="tut-ability-emoji">${e.emoji}</span>
            <div class="tut-ability-info">
                <span class="tut-ability-name">${e.name}</span>
                <span class="tut-ability-hint">${e.hint}</span>
            </div>
            <span class="tut-ability-power">⚡${e.power}</span>
        </div>
    `).join("");
    return `
        <div class="tut-diagram">
            <div class="tut-diagram-label">${diagram.label}</div>
            <div class="tut-ability-list">${items}</div>
        </div>
    `;
}

function renderResolveDiagram(diagram){
    const queue = diagram.queue;
    const cards = queue.map((c, i) => {
        let role = "stay";
        if (diagram.party.includes(i)) role = "party";
        if (diagram.trash.includes(i)) role = "trash";
        const badges = {
            party: `<span class="tut-role-badge badge-party">🎉 ${t("partyPanel")}</span>`,
            trash: `<span class="tut-role-badge badge-trash">🗑️ ${t("trashPanel")}</span>`,
            stay:  `<span class="tut-role-badge badge-stay">⏳</span>`
        };
        return `
            <div class="tut-card tut-card-sm tut-card-${role}">
                <div class="tut-card-emoji">${c.emoji}</div>
                <div class="tut-card-name">${c.name}</div>
                ${badges[role]}
            </div>
        `;
    }).join('<span class="tut-arrow">›</span>');

    return `
        <div class="tut-diagram">
            <div class="tut-diagram-label">${diagram.label}</div>
            <div class="tut-queue-row tut-queue-wrap">${cards}</div>
            <div class="tut-resolve-legend">
                <span class="badge-party tut-legend-dot">🎉 ${t("partyPanel")}</span>
                <span class="badge-stay  tut-legend-dot">⏳</span>
                <span class="badge-trash tut-legend-dot">🗑️ ${t("trashPanel")}</span>
            </div>
        </div>
    `;
}

function renderScoreboard(diagram){
    const rows = diagram.players.map(p => `
        <div class="tut-score-row ${p.winner ? "tut-score-winner" : ""}">
            <span class="tut-score-name">${p.winner ? "🏆 " : ""}${p.name}</span>
            <span class="tut-score-bar-wrap">
                <span class="tut-score-bar" style="width:${(p.score / 12) * 100}%"></span>
            </span>
            <span class="tut-score-num">${p.score} / 12</span>
        </div>
    `).join("");
    return `
        <div class="tut-diagram">
            <div class="tut-diagram-label">${diagram.label}</div>
            <div class="tut-scoreboard">${rows}</div>
        </div>
    `;
}

function buildDiagramHTML(diagram){
    if (!diagram) return "";
    switch(diagram.type){
        case "hand":             return renderHandDiagram(diagram);
        case "queue-add":        return renderQueueAddDiagram(diagram);
        case "ability-examples": return renderAbilityExamples(diagram);
        case "resolve":          return renderResolveDiagram(diagram);
        case "scoreboard":       return renderScoreboard(diagram);
        default: return "";
    }
}

/* ── Video block ── */
function buildVideoHTML(videoUrl){
    if (!videoUrl) return "";
    return `
        <div class="tut-video-wrap">
            <button class="tut-video-toggle" id="tutVideoToggle">
                <span class="tut-video-icon">▶</span>
                <span>${t("tutVideoLabel")}</span>
            </button>
            <div class="tut-video-container hidden" id="tutVideoContainer">
                <iframe
                    id="tutorialVideoFrame"
                    src="${videoUrl}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    `;
}

/* ── Core render ── */
function renderSlide(){
    const slide = slides[currentSlide];

    // Title — use i18n key if available
    const titleText = slide.title_key ? t(slide.title_key) : slide.title;
    document.getElementById("tutorialTitle").textContent = titleText;

    // Text — use i18n key if available
    const rawText = slide.text_key ? t(slide.text_key) : slide.text;
    document.getElementById("tutorialText").innerHTML = rawText
        .split("\n")
        .filter(l => l.trim() !== "")
        .map(line => `<p>${line}</p>`)
        .join("");

    // Image
    const img = document.getElementById("tutorialImage");
    if (slide.image){
        img.src = slide.image;
        img.style.display = "block";
    } else {
        img.style.display = "none";
    }

    // Diagram
    const diagramEl = document.getElementById("tutorialDiagram");
    if (diagramEl){
        diagramEl.innerHTML = buildDiagramHTML(slide.diagram || null);
    }

    // Video (only on last slide if `video` field exists)
    const videoEl = document.getElementById("tutorialVideo");
    if (videoEl){
        videoEl.innerHTML = buildVideoHTML(slide.video || "");
        // bind toggle
        const toggleBtn = document.getElementById("tutVideoToggle");
        const container = document.getElementById("tutVideoContainer");
        if (toggleBtn && container){
            toggleBtn.addEventListener("click", () => {
                const hidden = container.classList.toggle("hidden");
                toggleBtn.querySelector(".tut-video-icon").textContent = hidden ? "▶" : "⏸";
                if (hidden){
                    // stop iframe
                    const iframe = document.getElementById("tutorialVideoFrame");
                    if (iframe) iframe.src = iframe.src;
                }
            });
        }
    }

    // Progress dots
    const dotsEl = document.getElementById("tutorialDots");
    if (dotsEl){
        dotsEl.innerHTML = slides.map((_, i) =>
            `<span class="tut-dot ${i === currentSlide ? "active" : ""}"></span>`
        ).join("");
    }

    document.getElementById("tutorialCounter").textContent =
        `${currentSlide + 1} / ${slides.length}`;

    // Progress bar
    const bar = document.getElementById("tutorialProgressBar");
    if (bar){
        bar.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;
    }

    updateButtons();
    updateCloseButton();
}

async function updateButtons(){
    const prev = document.getElementById("tutorialPrev");
    const next = document.getElementById("tutorialNext");
    if (!prev || !next) return;

    prev.disabled = currentSlide === 0;

    if (currentSlide === slides.length - 1){
        next.innerHTML = '<span data-icon="play"></span>';
        next.classList.add("finish-btn");
    } else {
        next.innerHTML = '<span data-icon="next"></span>';
        next.classList.remove("finish-btn");
    }
    await loadIcons();
}

function nextSlide(){
    if (currentSlide < slides.length - 1){
        currentSlide++;
        renderSlide();
        return;
    }
    closeTutorial();
}

function previousSlide(){
    if (currentSlide <= 0) return;
    currentSlide--;
    renderSlide();
}

function bindTutorialEvents(){
    document.getElementById("tutorialNext")
        ?.addEventListener("click", nextSlide);
    document.getElementById("tutorialPrev")
        ?.addEventListener("click", previousSlide);
    document.getElementById("closeTutorial")
        ?.addEventListener("click", () => {
            const isLast = currentSlide === slides.length - 1;
            if (!isFirstTime || isLast) closeTutorial();
        });
}
