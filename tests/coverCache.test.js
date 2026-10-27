import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCover, saveCover } from "../wallpaper/src/media/coverCache.js";

function memoryStorage() {
    const items = new Map();
    return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)) };
}

const thumbnail = { thumbnail: "data:image/png;base64,AAAA", primaryColor: "#102030", textColor: "#ffffff" };

test("a stored cover is returned for the same track", () => {
    const storage = memoryStorage();
    saveCover({ title: "Song", artist: "Band" }, thumbnail, storage);
    assert.deepEqual(loadCover({ title: "Song", artist: "Band" }, storage), thumbnail);
});

test("a stored cover is not used for another track", () => {
    const storage = memoryStorage();
    saveCover({ title: "Song", artist: "Band" }, thumbnail, storage);
    assert.equal(loadCover({ title: "Other song", artist: "Band" }, storage), null);
    assert.equal(loadCover({ title: "Song", artist: "Other band" }, storage), null);
});

test("missing, broken or failing storage never throws", () => {
    assert.equal(loadCover({ title: "Song", artist: "Band" }, memoryStorage()), null);
    assert.equal(loadCover({ title: "Song", artist: "Band" }, { getItem: () => "{not json" }), null);
    assert.equal(loadCover({ title: "Song", artist: "Band" }, undefined), null);

    const full = { setItem: () => { throw new Error("QuotaExceededError"); } };
    assert.doesNotThrow(() => saveCover({ title: "Song", artist: "Band" }, thumbnail, full));
});
