// ══════════════════════════════════════════════════════════
// Development environment gate — tests (tests/devEnv.test.mjs)
//
// isDevEnvironment() is the safety gate the Reward Popup dev trigger
// (js/dev/rewardPopupDevTrigger.js) hangs everything off of — a real
// production deployment (any real domain, per README.md § Deployment)
// must always get `false` here, no exceptions.
//
// Run with:  node --test tests/devEnv.test.mjs
// ══════════════════════════════════════════════════════════

import { test } from "node:test";
import assert from "node:assert/strict";
import { isDevEnvironment } from "../js/services/devEnv.js";

function withWindow(location, fn) {
    const original = globalThis.window;
    globalThis.window = { location };
    try {
        return fn();
    } finally {
        if (original === undefined) delete globalThis.window;
        else globalThis.window = original;
    }
}

test("localhost (any port) is a Development environment", () => {
    withWindow({ hostname: "localhost", protocol: "http:" }, () => {
        assert.equal(isDevEnvironment(), true);
    });
});

test("127.0.0.1 / 0.0.0.0 / ::1 are Development environments", () => {
    for (const hostname of ["127.0.0.1", "0.0.0.0", "::1"]) {
        withWindow({ hostname, protocol: "http:" }, () => {
            assert.equal(isDevEnvironment(), true, `${hostname} should be treated as Development`);
        });
    }
});

test("a file:// URL (opened directly, no local server) is a Development environment", () => {
    withWindow({ hostname: "", protocol: "file:" }, () => {
        assert.equal(isDevEnvironment(), true);
    });
});

test("a real production-looking domain is NOT a Development environment", () => {
    for (const hostname of ["wildguestlist.com", "wild-guest-list.netlify.app", "example.github.io"]) {
        withWindow({ hostname, protocol: "https:" }, () => {
            assert.equal(isDevEnvironment(), false, `${hostname} must never be treated as Development`);
        });
    }
});

test("no window/location at all (e.g. a non-browser context) is NOT a Development environment", () => {
    const original = globalThis.window;
    delete globalThis.window;
    try {
        assert.equal(isDevEnvironment(), false);
    } finally {
        if (original !== undefined) globalThis.window = original;
    }
});
