import { test } from "node:test";
import assert from "node:assert/strict";
import EventLog from "../wallpaper/src/core/EventLog.js";

function memoryStorage() {
    const items = new Map();
    return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)) };
}

const texts = (lines) => lines.map((line) => line.split("  ")[1] ?? line);

test("a first load only shows its own lines", () => {
    const log = new EventLog(10, memoryStorage());
    log.add("loaded", 1000);
    assert.deepEqual(texts(log.lines()), ["loaded"]);
});

test("keeps only the newest lines", () => {
    const log = new EventLog(2, memoryStorage());
    ["a", "b", "c"].forEach((text, i) => log.add(text, i));
    assert.deepEqual(texts(log.lines()), ["b", "c"]);
});

test("the next load shows the previous session before its own", () => {
    const storage = memoryStorage();
    const crashed = new EventLog(10, storage);
    crashed.add("loaded", 0);
    crashed.add("last event", 1000);

    const log = new EventLog(10, storage);
    log.add("loaded again", 5000);
    assert.deepEqual(texts(log.lines()), ["--- previous session ---", "loaded", "last event", "--- this session ---", "loaded again"]);
});

test("broken or failing storage never throws", () => {
    assert.deepEqual(new EventLog(10, { getItem: () => "{not json" }).previous, []);

    const full = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
    const log = new EventLog(10, full);
    log.add("loaded", 0);
    assert.equal(log.lines().length, 1);
    assert.deepEqual(new EventLog(10, undefined).lines(), []);
});
