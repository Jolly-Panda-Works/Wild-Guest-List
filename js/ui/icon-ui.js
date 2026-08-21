let _iconConfig = null;

/** Fetches + caches data/config.json — the project's single centralized
 *  asset config (icons, sounds, branding). Exported so other modules
 *  (e.g. js/ui/startup-ui.js for the splash logo) can resolve assets
 *  through the same cached fetch instead of hitting config.json again. */
export async function getIconConfig() {

    if (_iconConfig) return _iconConfig;

    const response = await fetch("./data/config.json");

    if (!response.ok) {
        throw new Error(`Failed to load config.json (${response.status})`);
    }

    _iconConfig = await response.json();

    return _iconConfig;
}

export async function loadIcons(root = document) {

    const config = await getIconConfig();

    // اگر Element یا Document نبود
    if (!root || typeof root.querySelectorAll !== "function") {
        root = document;
    }

    const targets = [];

    // اگر خود root دارای data-icon باشد
    if (root instanceof Element && root.matches("[data-icon]")) {
        targets.push(root);
    }

    // فرزندان دارای data-icon
    targets.push(...root.querySelectorAll("[data-icon]"));

    targets.forEach(element => {

        const name = element.dataset.icon;
        const value = config.icons?.[name];

        if (!value) return;

        if (element.dataset.iconLoaded === value) {
            return;
        }

        if (/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(value)) {

            const img = document.createElement("img");

            img.src = value;
            img.alt = name;
            img.className = "icon-image";

            // Asset fallback: a missing/broken image file must never
            // show the browser's broken-image icon or crash anything —
            // just fall back to an empty (but still laid-out) element.
            img.addEventListener("error", () => {
                element.replaceChildren();
                element.dataset.iconLoaded = "";
            }, { once: true });

            element.replaceChildren(img);

        } else {

            element.textContent = value;

        }

        element.dataset.iconLoaded = value;
    });

    // Version display: single source of truth is config.json's
    // app.version, not a hardcoded string in index.html (was previously
    // stuck at "1.9.0" across dozens of releases — see PRODUCT_ROADMAP.md
    // task 0.10). Reuses the already-fetched/cached config above.
    const versionTargets = [];

    if (root instanceof Element && root.matches("[data-app-version]")) {
        versionTargets.push(root);
    }

    versionTargets.push(...root.querySelectorAll("[data-app-version]"));

    versionTargets.forEach(element => {
        const version = config.app?.version;
        if (!version) return;
        element.textContent = version;
    });
}