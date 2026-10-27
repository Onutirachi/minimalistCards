import { test } from "node:test";
import assert from "node:assert/strict";
import EventLog from "../src/core/EventLog.js";

function memoryStorage() {
    const items = new Map();
    return {
        get length() {
            return items.size;
        },
        key: (index) => [...items.keys()][index] ?? null,
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => items.set(key, String(value)),
        removeItem: (key) => items.delete(key),
        keys: () => [...items.keys()],
    };
}

const MINUTE = 60000;

test("a new log without earlier sessions only shows its own lines, tagged with its id", () => {
    const log = new EventLog(10, memoryStorage(), 0);
    log.add("loaded", 1000);
    assert.equal(log.lines().length, 1);
    assert.match(log.lines()[0], new RegExp(` ${log.id}  loaded$`));
});

test("keeps only the newest lines", () => {
    const log = new EventLog(2, memoryStorage(), 0);
    ["a", "b", "c"].forEach((text, i) => log.add(text, i));
    assert.deepEqual(log.lines().map((line) => line.split("  ")[1]), ["b", "c"]);
});

test("shows every monitor of the previous start merged by time, and not the monitors starting with it", () => {
    const storage = memoryStorage();
    const first = new EventLog(10, storage, 0);
    const second = new EventLog(10, storage, 1000);
    first.add("first loaded", 0);
    second.add("second loaded", 1000);
    first.add("first crashed", 2000);

    const sibling = new EventLog(10, storage, 10 * MINUTE);
    sibling.add("sibling loaded", 10 * MINUTE);
    const log = new EventLog(10, storage, 10 * MINUTE + 2000);

    const texts = log.lines().map((line) => line.split("  ")[1] ?? line);
    assert.deepEqual(texts, ["--- previous start ---", "first loaded", "second loaded", "first crashed", "--- this start ---"]);
});

test("only the latest earlier start is shown", () => {
    const storage = memoryStorage();
    new EventLog(10, storage, 0).add("old", 0);
    new EventLog(10, storage, 5 * MINUTE).add("recent", 5 * MINUTE);
    const log = new EventLog(10, storage, 10 * MINUTE);
    assert.deepEqual(log.previous.map((line) => line.split("  ")[1]), ["recent"]);
});

test("old sessions are deleted", () => {
    const storage = memoryStorage();
    for (let i = 0; i < 30; i++) new EventLog(10, storage, i * MINUTE).add("loaded", i * MINUTE);
    assert.ok(storage.keys().length <= 17);
});

test("broken or failing storage never throws", () => {
    const storage = memoryStorage();
    storage.setItem("minimalistcards.eventLog.0.AB", "{not json");
    assert.deepEqual(new EventLog(10, storage, MINUTE).previous, []);

    const full = { length: 0, key: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
    const log = new EventLog(10, full, 0);
    log.add("loaded", 0);
    assert.equal(log.lines().length, 1);
    assert.deepEqual(new EventLog(10, undefined, 0).lines(), []);
});
