import { test } from "node:test";
import assert from "node:assert/strict";
import { toBool, toNumber, toText } from "../wallpaper/src/utils/parse.js";

test("toBool accepts booleans and their string forms", () => {
    assert.equal(toBool(true), true);
    assert.equal(toBool("true"), true);
    assert.equal(toBool(false, true), false);
    assert.equal(toBool("false", true), false);
});

test("toBool falls back on anything else", () => {
    assert.equal(toBool(undefined, true), true);
    assert.equal(toBool("yes", false), false);
    assert.equal(toBool(1, false), false);
});

test("toNumber parses, clamps and falls back on NaN", () => {
    assert.equal(toNumber("2.5"), 2.5);
    assert.equal(toNumber(12, { max: 10 }), 10);
    assert.equal(toNumber(-1, { min: 0 }), 0);
    assert.equal(toNumber("abc", { fallback: 50 }), 50);
    assert.equal(toNumber(undefined, { fallback: 1 }), 1);
    assert.equal(toNumber(0, { fallback: 50 }), 0, "0 is a valid value, not a missing one");
});

test("toText only accepts strings", () => {
    assert.equal(toText("MiSans"), "MiSans");
    assert.equal(toText(undefined, "Unageo"), "Unageo");
    assert.equal(toText(42, "Unageo"), "Unageo");
});
