import { test } from "node:test";
import assert from "node:assert/strict";
import { albumColor, contrastColor, layerColor, parseColor, textColor, toCssColor, toGlColor, withAlpha, withMinLightness } from "../wallpaper/src/utils/color.js";

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

test("albumColor reads each album color and returns null when missing", () => {
    assert.equal(albumColor("primary", album), "#102030");
    assert.equal(albumColor("secondary", album), "#405060");
    assert.equal(albumColor("tertiary", album), "#708090");
    assert.equal(albumColor("text", album), "#ffffff");
    assert.equal(albumColor("highcontrast", album), "#ff0000");
    assert.equal(albumColor("primary", null), null);
    assert.equal(albumColor("secondary", { primaryColor: "#102030" }), null);
    assert.equal(albumColor("unknown", album), null);
});

test("layerColor uses the album color only while album colors are active and not kept", () => {
    const layer = { color: "0 0 0", album: "secondary", keep: false };
    assert.deepEqual(layerColor(layer, album), { color: "#405060", fromAlbum: true });
    assert.deepEqual(layerColor(layer, null), { color: "0 0 0", fromAlbum: false });
    assert.deepEqual(layerColor({ ...layer, keep: true }, album), { color: "0 0 0", fromAlbum: false });
    assert.deepEqual(layerColor(layer, { primaryColor: "#102030" }), { color: "0 0 0", fromAlbum: false });
});

test("textColor follows its mode and falls back to the best contrast", () => {
    assert.equal(textColor({ mode: "auto" }, "#ffffff", album), "#000000");
    assert.equal(textColor({ mode: "auto" }, "#111111", album), "#ffffff");
    assert.equal(textColor({ mode: "custom", color: "1 0 0" }, "#111111", album), "1 0 0");
    assert.equal(textColor({ mode: "album", album: "highcontrast" }, "#111111", album), "#ff0000");
    assert.equal(textColor({ mode: "album", album: "highcontrast" }, "#eeeeee", null), "#000000");
});

test("contrastColor picks black on light and white on dark backgrounds", () => {
    assert.equal(contrastColor("#ffffff"), "#000000");
    assert.equal(contrastColor("#000000"), "#ffffff");
    assert.equal(contrastColor("#ffcc00"), "#000000");
    assert.equal(contrastColor("#1d3557"), "#ffffff");
    assert.equal(contrastColor("0.5 0.5 0.5"), "#000000");
});

test("withMinLightness raises dark colors and keeps the hue", () => {
    assert.equal(withMinLightness("#ffffff", 0.5), "#ffffff");
    assert.equal(withMinLightness("#000000", 0.5), "rgb(128, 128, 128)");
    assert.equal(withMinLightness("#330000", 0.5), "rgb(255, 0, 0)");
    assert.equal(withMinLightness("nope", 0.5), "nope");
});
