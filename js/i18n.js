/* ══════════════════════════════════════════
   i18n — Wild Guest List
   Supported: en, fa, ar, tr
══════════════════════════════════════════ */

let _strings = {};
let _lang    = "en";
const STORAGE_KEY = "wgl_lang";

const LANG_META = {
    en: { label: "English",  flag: "🇬🇧" },
    fa: { label: "فارسی",    flag: "🇮🇷" },
    ar: { label: "العربية", flag: "🇸🇦" },
    tr: { label: "Türkçe",   flag: "🇹🇷" }
};

/* ── Load translations ── */
export async function loadI18n() {
    const saved = localStorage.getItem(STORAGE_KEY) || "en";
    const res   = await fetch("./data/i18n.json");
    const all   = await res.json();
    _strings    = all;
    await applyLang(saved, all);
}

/* ── Get current string ── */
export function t(key) {
    return _strings[_lang]?.[key] ?? _strings["en"]?.[key] ?? key;
}

/* ── Get current lang ── */
export function getLang() { return _lang; }

/* ── Apply a language (update DOM + document dir) ── */
export async function applyLang(lang, allStrings) {
    if (!allStrings) allStrings = _strings;
    if (!allStrings[lang]) lang = "en";
    _lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    const dir = allStrings[lang].dir || "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir  = dir;

    // Apply data-i18n attributes
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        const val = allStrings[lang][key] ?? allStrings["en"][key] ?? key;
        if (el.tagName === "INPUT" && el.type !== "checkbox") {
            el.placeholder = val;
        } else {
            el.textContent = val;
        }
    });

    // Update data-i18n-placeholder (inputs with translatable placeholder)
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        el.placeholder = allStrings[lang][key] ?? allStrings["en"][key] ?? key;
    });

    // Update data-tooltip-key elements
    document.querySelectorAll("[data-tooltip-key]").forEach(el => {
        const key = el.dataset.tooltipKey;
        el.dataset.tooltip = allStrings[lang][key] ?? allStrings["en"][key] ?? key;
    });

    // Update data-title-key elements (top bar button tooltips)
    document.querySelectorAll("[data-title-key]").forEach(el => {
        const key = el.dataset.titleKey;
        el.dataset.title = allStrings[lang][key] ?? allStrings["en"][key] ?? key;
    });

    // Update active state on language buttons
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });

    // Notify listeners
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

/* ── Switch language (public) ── */
export async function setLang(lang) {
    await applyLang(lang, _strings);
}

/* ── Build language selector buttons ── */
export function buildLangSelector(container) {
    if (!container) return;
    container.innerHTML = Object.entries(LANG_META).map(([code, meta]) => `
        <button class="lang-btn ${code === _lang ? "active" : ""}"
                data-lang="${code}"
                aria-label="${meta.label}">
            <span class="lang-flag">${meta.flag}</span>
            <span class="lang-label">${meta.label}</span>
        </button>
    `).join("");

    container.addEventListener("click", e => {
        const btn = e.target.closest(".lang-btn");
        if (!btn) return;
        setLang(btn.dataset.lang);
    });
}

/* ── Player display name (respects nameKey for bots/you) ── */
export function playerDisplayName(player) {
    if (player.nameKey) return t(player.nameKey);
    return player.name;
}
