import { test } from "node:test";
import assert from "node:assert/strict";
import { parseColor, toGlColor, withAlpha } from "../src/utils/color.js";

test("parseColor reads hex in every length", () => {
    assert.deepEqual(parseColor("#ffffff"), [255, 255, 255]);
    assert.deepEqual(parseColor("#f00"), [255, 0, 0]);
    assert.deepEqual(parseColor("#00ff0080"), [0, 255, 0]);
    assert.deepEqual(parseColor("#0f08"), [0, 255, 0]);
});

test("parseColor reads rgb() and rgba()", () => {
    assert.deepEqual(parseColor("rgb(1, 2, 3)"), [1, 2, 3]);
    assert.deepEqual(parseColor("rgba(10 20 30 / 0.5)"), [10, 20, 30]);
});

test("parseColor rejects invalid input", () => {
    assert.equal(parseColor("#12345"), null);
    assert.equal(parseColor("red"), null);
    assert.equal(parseColor(undefined), null);
});

test("withAlpha builds rgba and keeps unknown colors untouched", () => {
    assert.equal(withAlpha("#111111", 0.8), "rgba(17, 17, 17, 0.8)");
    assert.equal(withAlpha("red", 0.8), "red");
});

test("toGlColor normalizes to 0-1 with a fallback", () => {
    assert.deepEqual(toGlColor("#ff0000"), [1, 0, 0]);
    assert.deepEqual(toGlColor("nope"), [1, 1, 1]);
});
