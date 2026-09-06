// ══════════════════════════════════════════════════════════
// assetPreloader.js — preload/decode every game image up front, on
// the Startup screen (see js/ui/startup-ui.js), so nothing has to
// fetch or decode for the first time mid-match — the Queue, Hand,
// and Opponent cards all just reuse whatever the browser already
// warmed here.
//
// The image list is never hand-maintained: it's assembled from the
// project's own existing manifests — data/config.json's icons and
// branding, data/cardInfo.json's card art (via the existing
// js/services/dataLoader.js, reused rather than re-fetched), and
// js/constants/avatars.js's player avatars — so adding a new icon or
// card elsewhere in the project doesn't require touching this file.
// See STATIC_IMAGE_PATHS below for the one narrow exception.
// ══════════════════════════════════════════════════════════

import { getIconConfig } from "../ui/icon-ui.js";
import { loadCardData } from "./dataLoader.js";
import { PLAYER_AVATARS } from "../constants/avatars.js";

const IMAGE_EXT_RE = /\.(png|jpg|jpeg|svg|webp|gif)$/i;

// Real image files referenced directly in HTML/CSS rather than
// through data/config.json — the Home banner (an <img> in
// index.html/game.html) and the small header logo (a CSS
// background-image in css/style.css). favicon.ico is deliberately
// NOT included: the browser fetches it on its own via <link
// rel="icon">, and it's never drawn as an in-game <img>, so there's
// nothing this module needs to pre-warm for it.
const STATIC_IMAGE_PATHS = [
    "assets/img/branding/banner.png",
    "assets/img/branding/logo-small.png",
];

async function collectImageUrls() {
    const urls = new Set(STATIC_IMAGE_PATHS);

    // Icons — same "is this an image path or an emoji/text fallback"
    // test js/ui/icon-ui.js's loadIcons() already uses, so this list
    // can never drift from what actually gets rendered as an <img>.
    const config = await getIconConfig();
    Object.values(config.icons || {}).forEach(value => {
        if (IMAGE_EXT_RE.test(value)) urls.add(value);
    });
    if (config.branding?.developerLogo) urls.add(config.branding.developerLogo);
    if (config.branding?.splash) urls.add(config.branding.splash);

    // Card artwork — reuses the existing cached loader rather than a
    // second raw fetch of data/cardInfo.json (js/game/help.js has its
    // own separate one already; not this module's job to fix that).
    try {
        const { CARDS } = await loadCardData();
        Object.values(CARDS).forEach(card => { if (card.image) urls.add(card.image); });
    } catch { /* card art just won't be pre-warmed; game still works */ }

    PLAYER_AVATARS.forEach(avatar => { if (avatar.src) urls.add(avatar.src); });

    return [...urls];
}

// Kept alive for the whole page lifetime so the browser never has a
// reason to evict the decoded bitmap from its in-memory image cache
// once loaded — letting these Image objects get garbage-collected
// would only guarantee the (cheap) HTTP cache stays warm, not the
// (expensive) decode step this module specifically exists to pay for
// up front.
const _warmImages = [];

function preloadOne(url) {
    return new Promise(resolve => {
        const img = new Image();
        _warmImages.push(img);

        // A missing/broken asset must never block the whole game from
        // starting — resolve (not reject) either way, same fallback
        // philosophy as js/ui/icon-ui.js's loadIcons().
        img.onerror = () => resolve({ url, ok: false });

        img.onload = () => {
            // decode() gives a decoded, paint-ready guarantee, not
            // just "downloaded" — closer to what "no reload needed
            // mid-game" actually promises. Falls back to plain load
            // in engines without it.
            if (typeof img.decode === "function") {
                img.decode().then(
                    () => resolve({ url, ok: true }),
                    () => resolve({ url, ok: true }), // downloaded fine; decode() itself is best-effort
                );
            } else {
                resolve({ url, ok: true });
            }
        };

        img.src = url;
    });
}

/** Preloads + decodes every known game image, reporting progress as
 *  it goes. `onProgress(loadedCount, totalCount)` fires once up front
 *  with `loadedCount === 0`, then again after each image settles
 *  (success or failure) — never more than once per image, in
 *  completion order rather than list order. Resolves once every
 *  image has settled; never rejects. */
export async function preloadAllImages(onProgress) {
    const urls = await collectImageUrls();
    const total = urls.length;
    let loaded = 0;

    onProgress?.(0, total);

    await Promise.all(urls.map(url =>
        preloadOne(url).then(result => {
            loaded++;
            onProgress?.(loaded, total);
            return result;
        })
    ));
}
