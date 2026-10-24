import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SETTINGS, applyDefaults, applySettings } from "../src/core/settings.js";
import { normalizeThumbnail, normalizeTrack, toPlaybackState } from "../src/core/wallpaperBridge.js";

const project = JSON.parse(readFileSync(new URL("../project.json", import.meta.url), "utf8").replace(/^﻿/, ""));
const properties = project.general.properties;

// Properties that only exist for the Wallpaper Engine UI
const UI_ONLY = new Set(["schemecolor", "information"]);

test("every project.json property is handled", () => {
    const missing = Object.entries(properties)
        .filter(([key, property]) => property.type !== "group" && !UI_ONLY.has(key))
        .map(([key]) => key)
        .filter((key) => !(key in SETTINGS));
    assert.deepEqual(missing, []);
});

test("every setting exists in project.json with the same default and range", () => {
    for (const [key, setting] of Object.entries(SETTINGS)) {
        const property = properties[key];
        assert.ok(property, `${key} is not in project.json`);
        assert.equal(setting.fallback, property.value, `${key} default`);
        if (property.type === "slider") {
            assert.equal(setting.min, property.min, `${key} min`);
            assert.equal(setting.max, property.max, `${key} max`);
        }
    }
});

/** A UI stand-in that records every call as "path(args)". */
function recordingUi() {
    const calls = [];
    const proxy = (path) =>
        new Proxy(() => {}, {
            get: (_, name) => proxy(`${path}.${String(name)}`),
            apply: (_, __, args) => calls.push(`${path.slice(1)}(${JSON.stringify(args)})`),
        });
    return { ui: proxy(""), calls };
}

test("applySettings parses values and ignores unknown keys", () => {
    const { ui, calls } = recordingUi();
    applySettings(ui, {
        clockcardshow: { value: "false" },
        audiobarsquantity: { value: 99.6 },
        somethingelse: { value: 1 },
    });
    assert.deepEqual(calls, ['clockCard.setVisible([false])', 'audioBars.configure([{"quantity":64}])']);
});

test("applyDefaults applies every setting once", () => {
    const { ui, calls } = recordingUi();
    applyDefaults(ui);
    assert.equal(calls.length, Object.keys(SETTINGS).length);
});

test("thumbnails with identical colors get readable fallbacks", () => {
    const same = normalizeThumbnail({ primaryColor: "#abcdef", textColor: "#abcdef", thumbnail: "x" });
    assert.equal(same.primaryColor, "#111111");
    assert.equal(same.textColor, "#ffffff");

    const different = normalizeThumbnail({ primaryColor: "#000000", textColor: "#ffffff" });
    assert.equal(different.primaryColor, "#000000");
});

test("tracks without a title are called Untitled", () => {
    assert.deepEqual(normalizeTrack({ title: "", artist: undefined }), { title: "Untitled", artist: "" });
});

test("playback states map to names", () => {
    assert.equal(toPlaybackState(1), "playing");
    assert.equal(toPlaybackState(2), "paused");
    assert.equal(toPlaybackState(0), "stopped");
});
