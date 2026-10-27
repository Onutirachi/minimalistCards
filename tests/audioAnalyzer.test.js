import { test } from "node:test";
import assert from "node:assert/strict";
import AudioAnalyzer from "../wallpaper/src/audio/AudioAnalyzer.js";
import { AUTO_VOLUME } from "../wallpaper/src/config.js";

/** Builds a Wallpaper Engine audio array: 64 left samples followed by 64 right samples. */
function audioArray(left, right = left) {
    return [...Array.from({ length: 64 }, (_, i) => left(i)), ...Array.from({ length: 64 }, (_, i) => right(i))];
}

test("averages left and right into mono", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.update(audioArray(() => 1, () => 0));
    assert.equal(analyzer.length, 64);
    assert.ok(analyzer.mono.every((v) => v === 0.5));
});

test("computes bass, mid and treble means", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.update(audioArray((i) => (i < 20 ? 1 : i < 40 ? 0.5 : 0)));
    assert.equal(analyzer.bass, 1);
    assert.equal(analyzer.mid, 0.5);
    assert.equal(analyzer.treble, 0);
});

test("channels keeps the peak of each group for every quantity", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.update(audioArray((i) => i / 64));

    for (const count of [9, 40, 64]) {
        const out = new Float32Array(count);
        analyzer.channels(out, count);
        assert.ok(out.every(Number.isFinite), `non-finite value for ${count}`);
        assert.ok(out[count - 1] >= out[0], "rising input should give rising groups");
        assert.ok(Math.abs(out[count - 1] - 63 / 64) < 1e-6, "last group should hold the last peak");
    }
});

test("handles short arrays without NaN", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.update([0.2, 0.4]);
    assert.equal(analyzer.length, 1);
    assert.ok(Number.isFinite(analyzer.treble));
    const out = new Float32Array(9);
    analyzer.channels(out, 9);
    assert.ok(out.every(Number.isFinite));
});

test("auto volume is off by default", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.update(audioArray(() => 0.1));
    assert.ok(Math.abs(analyzer.bass - 0.1) < 1e-6);
});

test("auto volume amplifies quiet music up to the recent peak, within its limits", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.setAutoVolume(true);

    analyzer.update(audioArray((i) => (i === 0 ? 0.25 : 0.1)));
    assert.ok(Math.abs(analyzer.mono[0] - 1) < 1e-6, "the loudest sample reaches 1");
    assert.ok(Math.abs(analyzer.mono[1] - 0.4) < 1e-6, "the rest keeps its proportion");

    const veryQuiet = new AudioAnalyzer();
    veryQuiet.setAutoVolume(true);
    veryQuiet.update(audioArray(() => 0.01));
    assert.ok(Math.abs(veryQuiet.mono[0] - 0.01 * AUTO_VOLUME.maxGain) < 1e-6, "gain is capped");

    const silent = new AudioAnalyzer();
    silent.setAutoVolume(true);
    silent.update(audioArray(() => AUTO_VOLUME.silence / 2));
    assert.ok(Math.abs(silent.mono[0] - AUTO_VOLUME.silence / 2) < 1e-9, "silence is not amplified");

    const loud = new AudioAnalyzer();
    loud.setAutoVolume(true);
    loud.update(audioArray(() => 1.5));
    assert.ok(Math.abs(loud.mono[0] - 1.5) < 1e-6, "loud music is never turned down");
});

test("auto volume keeps a recent loud peak, so a quieter moment stays quieter", () => {
    const analyzer = new AudioAnalyzer();
    analyzer.setAutoVolume(true);
    analyzer.update(audioArray(() => 0.5));
    analyzer.update(audioArray(() => 0.25));
    assert.ok(analyzer.mono[0] < 0.6, "right after a loud frame, a quieter one is not pushed back to 1");
});
