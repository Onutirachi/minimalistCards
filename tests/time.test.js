import { test } from "node:test";
import assert from "node:assert/strict";
import { formatClock, formatDuration } from "../wallpaper/src/utils/time.js";
import { detectLocale, formatFullDate, formatWeekday } from "../wallpaper/src/utils/locale.js";

test("formatDuration renders mm:ss and handles bad input", () => {
    assert.equal(formatDuration(0), "00:00");
    assert.equal(formatDuration(65.9), "01:05");
    assert.equal(formatDuration(-3), "00:00");
    assert.equal(formatDuration(NaN), "00:00");
});

test("formatClock supports 24h, 12h and hidden seconds", () => {
    const evening = new Date(2026, 9, 24, 21, 5, 9);
    const midnight = new Date(2026, 9, 24, 0, 30, 0);

    assert.equal(formatClock(evening), "21:05:09");
    assert.equal(formatClock(evening, { showSeconds: false }), "21:05");
    assert.equal(formatClock(evening, { format12h: true }), "09:05:09 PM");
    assert.equal(formatClock(midnight, { format12h: true, showSeconds: false }), "12:30 AM");
});

test("detectLocale keeps non-English languages", () => {
    assert.equal(detectLocale("de-DE", "America/Sao_Paulo"), "de-DE");
});

test("detectLocale double-checks English against the time zone", () => {
    assert.equal(detectLocale("en-US", "America/Sao_Paulo"), "pt-BR");
    assert.equal(detectLocale("en-GB", "Europe/London"), "en-GB");
    assert.equal(detectLocale(null, "UTC"), "en-US");
});

test("Portuguese dates are capitalized", () => {
    const friday = new Date(2026, 9, 23);
    assert.equal(formatWeekday(friday, "pt-BR"), "Sexta-Feira");
    assert.equal(formatFullDate(friday, "pt-BR"), "23 de Outubro de 2026");
});

test("invalid locales fall back instead of throwing", () => {
    assert.doesNotThrow(() => formatWeekday(new Date(), "not a locale!"));
});
