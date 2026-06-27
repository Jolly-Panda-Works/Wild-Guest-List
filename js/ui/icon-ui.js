let _iconConfig = null;

async function getIconConfig() {

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

            element.replaceChildren(img);

        } else {

            element.textContent = value;

        }

        element.dataset.iconLoaded = value;
    });
}