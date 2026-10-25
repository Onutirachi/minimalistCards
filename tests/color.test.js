import { test } from "node:test";
import assert from "node:assert/strict";
import { isAlbumColor, parseColor, pickColor, toCssColor, toGlColor, withAlpha, withMinLightness } from "../src/utils/color.js";

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

test("parseColor reads Wallpaper Engine colors (0-1 floats)", () => {
    assert.deepEqual(parseColor("0 0 0"), [0, 0, 0]);
    assert.deepEqual(parseColor("1 0.5 0.2"), [255, 128, 51]);
    assert.equal(parseColor("1 2 3"), null);
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

test("toCssColor turns any parsed color into rgb()", () => {
    assert.equal(toCssColor("0 0 1"), "rgb(0, 0, 255)");
    assert.equal(toCssColor("nope"), "#000000");
});

const album = { primaryColor: "#102030", secondaryColor: "#405060", tertiaryColor: "#708090", textColor: "#ffffff", highContrastColor: "#ff0000" };

test("pickColor picks the custom color or the matching album color", () => {
    assert.equal(pickColor("custom", "0 0 0", album), "0 0 0");
    assert.equal(pickColor("primary", "0 0 0", album), "#102030");
    assert.equal(pickColor("secondary", "0 0 0", album), "#405060");
    assert.equal(pickColor("tertiary", "0 0 0", album), "#708090");
    assert.equal(pickColor("text", "0 0 0", album), "#ffffff");
    assert.equal(pickColor("highcontrast", "0 0 0", album), "#ff0000");
    assert.equal(pickColor("unknown", "0 0 0", album), "0 0 0");
});

test("pickColor falls back when there is no cover or the color is missing", () => {
    assert.equal(pickColor("primary", "0 0 0", null), "#111111");
    assert.equal(pickColor("highcontrast", "0 0 0", null), "#ffffff");
    assert.equal(pickColor("secondary", "0 0 0", { primaryColor: "#102030" }), "#111111");
});

test("isAlbumColor tells album sources from custom", () => {
    assert.equal(isAlbumColor("primary"), true);
    assert.equal(isAlbumColor("custom"), false);
});

test("withMinLightness raises dark colors and keeps the hue", () => {
    assert.equal(withMinLightness("#ffffff", 0.5), "#ffffff");
    assert.equal(withMinLightness("#000000", 0.5), "rgb(128, 128, 128)");
    assert.equal(withMinLightness("#330000", 0.5), "rgb(255, 0, 0)");
    assert.equal(withMinLightness("nope", 0.5), "nope");
});
