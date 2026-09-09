// devEnv.js — runtime Development-vs-Production detection.
//
// Wild Guest List has no build step, no bundler, and no `NODE_ENV`
// (see README.md § Running Locally: Live Server or `python -m
// http.server`; § Deployment: "any static web server" — the same
// static files are served as-is everywhere). There is nothing a build
// tool could strip or swap for us.
//
// The closest equivalent to `process.env.NODE_ENV !== "production"`
// in that kind of project is reading the *actual environment the page
// is being served from*, rather than a hardcoded boolean baked into
// the shipped code. A hardcoded flag can be left `true` by mistake and
// ship to production; this check cannot — a real deployment (GitHub
// Pages / Netlify / Vercel / any real domain, per README.md §
// Deployment) never runs on `localhost`/`127.0.0.1`/a `file:` URL, so
// it always evaluates to `false` there regardless of what the source
// contains.
//
// Anything gated behind isDevEnvironment() should treat a `false`
// result as "this feature does not exist" — no listener registered,
// no global exposed, no DOM touched — not just "hidden".

const DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function isDevEnvironment() {
    if (typeof window === "undefined" || !window.location) return false;

    const { hostname, protocol } = window.location;

    // Opened directly as a local file (double-clicked, or a "Preview"
    // that doesn't spin up a local server) — no hostname at all.
    if (protocol === "file:") return true;

    return DEV_HOSTNAMES.has(hostname);
}
