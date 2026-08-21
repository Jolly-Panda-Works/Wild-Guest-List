// ══════════════════════════════════════════════════════════
// Startup — js/ui/startup-ui.js
//
// Drives #startupScreen's Splash → Loading → Error states around
// js/home-main.js's real boot sequence (bootHome()) — nothing about
// initialization is duplicated here, this just gates the existing
// sequence behind a UI instead of running it as bare top-level
// awaits. See index.html's #startupScreen comment and
// docs/ARCHITECTURE_PLAN.md.
//
// Flow:
//   - Splash (Jolly Panda logo) shows immediately, for at least
//     MIN_SPLASH_MS.
//   - If bootHome() is still running once that minimum has elapsed,
//     cross-fade to a real Loading state tied to bootHome()'s actual
//     promise (no fake progress numbers — there's nothing measurable
//     to show one for).
//   - If bootHome() finishes within MIN_SPLASH_MS, skip Loading
//     entirely and go straight to Home once the splash's minimum
//     time is up.
//   - If bootHome() throws, show an error state with Retry, which
//     re-invokes it.
// ══════════════════════════════════════════════════════════

import { getIconConfig } from "./icon-ui.js";

const MIN_SPLASH_MS = 900;
const EXIT_TRANSITION_MS = 400; // must match .startup-screen's CSS transition

let _bootFn = null;
let _retryWired = false;

function show(id) {
    document.getElementById(id)?.classList.remove("hidden");
}

function hide(id) {
    document.getElementById(id)?.classList.add("hidden");
}

async function loadSplashLogo() {
    const config = await getIconConfig();
    const src = config.branding?.developerLogo;
    const img = document.getElementById("startupLogo");
    if (img && src) img.src = src;
}

function showLoadingView() {
    hide("startupSplash");
    hide("startupError");
    show("startupLoading");
}

function showErrorView() {
    hide("startupSplash");
    hide("startupLoading");
    show("startupError");
}

function resetToSplash() {
    hide("startupLoading");
    hide("startupError");
    show("startupSplash");
    document.getElementById("startupScreen")?.classList.remove("startup-screen-exit");
}

function fadeOutAndRemove() {
    const screen = document.getElementById("startupScreen");
    if (!screen) return;
    screen.classList.add("startup-screen-exit");
    setTimeout(() => screen.remove(), EXIT_TRANSITION_MS);
}

async function attemptBoot() {
    resetToSplash();

    const minSplash  = new Promise(resolve => setTimeout(resolve, MIN_SPLASH_MS));
    const bootPromise = _bootFn();

    // Whichever settles first: the splash's minimum display time, or
    // boot itself (success or failure) finishing early.
    const raceResult = await Promise.race([
        bootPromise.then(() => "boot-ok", () => "boot-err"),
        minSplash.then(() => "min-wait"),
    ]);

    if (raceResult === "boot-ok") {
        // Boot finished within the splash's own minimum time — no
        // visible Loading state needed; just let the splash's minimum
        // duration finish so it doesn't flash by, then go to Home.
        await minSplash;
        fadeOutAndRemove();
        return;
    }

    if (raceResult === "boot-err") {
        await minSplash;
        showErrorView();
        return;
    }

    // "min-wait": splash's minimum time is up but boot is still
    // running — show real Loading until it settles.
    showLoadingView();
    try {
        await bootPromise;
        fadeOutAndRemove();
    } catch {
        showErrorView();
    }
}

/** Runs `bootFn` (js/home-main.js's bootHome) behind the Splash →
 *  Loading → Error UI. Call once at startup. `bootFn` must be
 *  re-invokable (Retry calls it again on failure) and must not
 *  duplicate one-time global wiring on a second call. */
export async function runStartup(bootFn) {
    _bootFn = bootFn;

    if (!_retryWired) {
        document.getElementById("startupRetryBtn")
            ?.addEventListener("click", () => attemptBoot());
        _retryWired = true;
    }

    // The logo isn't on the critical boot path — if it fails to
    // resolve for any reason, still proceed with the real boot rather
    // than getting stuck on a blank splash.
    await loadSplashLogo().catch(() => {});

    await attemptBoot();
}
