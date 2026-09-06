// ══════════════════════════════════════════════════════════
// Startup — js/ui/startup-ui.js
//
// Drives #startupScreen's Splash+Progress → Error states around
// js/home-main.js's real boot sequence (bootHome()) — nothing about
// initialization is duplicated here, this just gates the existing
// sequence behind a UI instead of running it as bare top-level
// awaits, and reflects its real image-preload progress. See
// index.html's #startupScreen comment and docs/ARCHITECTURE_PLAN.md.
//
// Flow:
//   - The splash image (config.json → branding.splash) and a 0%
//     progress bar show immediately.
//   - bootFn(onProgress) — js/home-main.js's bootHome() — is called
//     with a progress callback; bootHome() forwards it into
//     js/services/assetPreloader.js's preloadAllImages(), so the bar
//     fill/percent here are driven by actual image-load counts, not
//     a simulated animation. A short MIN_SPLASH_MS floor just keeps
//     the splash from flashing by instantly on a fully-cached repeat
//     visit — it's a minimum display time, not a fake loading delay.
//   - A hint (data/i18n.json's startupHint1..6) rotates underneath
//     independent of progress, purely to give someone on a slow
//     connection something to read.
//   - If bootFn() throws, show an error state with Retry, which
//     re-invokes it.
// ══════════════════════════════════════════════════════════

import { getIconConfig } from "./icon-ui.js";
import { t } from "../i18n.js";

const MIN_SPLASH_MS = 500;
const EXIT_TRANSITION_MS = 400; // must match .startup-screen's CSS transition
const HINT_ROTATE_MS = 2600;
const HINT_COUNT = 6; // data/i18n.json's startupHint1..startupHint6

let _bootFn = null;
let _retryWired = false;
let _hintTimer = null;

function show(id) {
    document.getElementById(id)?.classList.remove("hidden");
}

function hide(id) {
    document.getElementById(id)?.classList.add("hidden");
}

async function loadSplashImage() {
    const config = await getIconConfig();
    const src = config.branding?.splash;
    const img = document.getElementById("startupSplashImage");
    if (img && src) img.src = src;
}

function setProgress(loaded, total) {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 100;
    const fill = document.getElementById("startupProgressFill");
    const label = document.getElementById("startupPercent");
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${pct}%`;
}

function startHintRotation() {
    const hintEl = document.getElementById("startupHint");
    if (!hintEl) return;

    let index = 0;
    const applyHint = () => {
        hintEl.style.opacity = "0";
        setTimeout(() => {
            hintEl.textContent = t(`startupHint${(index % HINT_COUNT) + 1}`);
            hintEl.style.opacity = "1";
            index++;
        }, 300);
    };

    applyHint();
    _hintTimer = setInterval(applyHint, HINT_ROTATE_MS);
}

function stopHintRotation() {
    clearInterval(_hintTimer);
    _hintTimer = null;
}

function showErrorView() {
    stopHintRotation();
    hide("startupSplash");
    show("startupError");
}

function resetToSplash() {
    hide("startupError");
    show("startupSplash");
    setProgress(0, 1);
    document.getElementById("startupScreen")?.classList.remove("startup-screen-exit");
}

function fadeOutAndRemove() {
    stopHintRotation();
    const screen = document.getElementById("startupScreen");
    if (!screen) return;
    screen.classList.add("startup-screen-exit");
    setTimeout(() => screen.remove(), EXIT_TRANSITION_MS);
}

async function attemptBoot() {
    resetToSplash();
    startHintRotation();

    const minSplash = new Promise(resolve => setTimeout(resolve, MIN_SPLASH_MS));

    try {
        await Promise.all([_bootFn(setProgress), minSplash]);
        fadeOutAndRemove();
    } catch {
        await minSplash;
        showErrorView();
    }
}

/** Runs `bootFn` (js/home-main.js's bootHome) behind the
 *  Splash+Progress → Error UI. Call once at startup. `bootFn` is
 *  called as `bootFn(onProgress)` — see js/services/assetPreloader.js
 *  for the `(loaded, total)` signature `onProgress` is invoked with —
 *  and must be re-invokable (Retry calls it again on failure) and
 *  must not duplicate one-time global wiring on a second call. */
export async function runStartup(bootFn) {
    _bootFn = bootFn;

    if (!_retryWired) {
        document.getElementById("startupRetryBtn")
            ?.addEventListener("click", () => attemptBoot());
        _retryWired = true;
    }

    // The image isn't on the critical boot path — if it fails to
    // resolve for any reason, still proceed with the real boot rather
    // than getting stuck on a blank splash.
    await loadSplashImage().catch(() => {});

    await attemptBoot();
}
