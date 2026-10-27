import { test } from "node:test";
import assert from "node:assert/strict";
import TimelineClock, { timelineAdvanced } from "../wallpaper/src/media/TimelineClock.js";

const FRAME = 1000 / 60;

/** Runs the clock for `seconds` of 60 fps frames and returns every displayed position. */
function run(clock, start, seconds) {
    const positions = [];
    let now = start;
    for (let i = 0; i < seconds * 60; i++) {
        now += FRAME;
        positions.push(clock.update(now, FRAME / 1000));
    }
    return { positions, now };
}

test("the first event snaps to the reported position", () => {
    const clock = new TimelineClock();
    clock.sync(30, 200, 0);
    assert.equal(clock.position, 30);
    assert.equal(clock.progress, 30 / 200);
});

test("advances in real time while playing", () => {
    const clock = new TimelineClock();
    clock.sync(10, 200, 0);
    clock.setPlaying(true, 0);
    run(clock, 0, 2);
    assert.ok(Math.abs(clock.position - 12) < 0.05, `expected ~12, got ${clock.position}`);
});

test("a small correction never moves the display backwards and converges", () => {
    const clock = new TimelineClock();
    clock.sync(10, 200, 0);
    clock.setPlaying(true, 0);
    let { now } = run(clock, 0, 1);

    // The app reports it is 0.4s behind what we display
    clock.sync(clock.position - 0.4, 200, now);
    const { positions, now: end } = run(clock, now, 5);

    for (let i = 1; i < positions.length; i++) {
        assert.ok(positions[i] >= positions[i - 1], `went backwards at frame ${i}`);
    }
    assert.ok(Math.abs(clock.position - clock.target(end)) < 0.05, "did not converge");
});

test("a seek snaps immediately", () => {
    const clock = new TimelineClock();
    clock.sync(10, 200, 0);
    clock.setPlaying(true, 0);
    clock.sync(120, 200, 100);
    assert.equal(clock.position, 120);
});

test("a new track (different duration) snaps even for small differences", () => {
    const clock = new TimelineClock();
    clock.sync(1, 200, 0);
    clock.sync(0, 180, 10);
    assert.equal(clock.position, 0);
});

test("pausing freezes the position and resuming continues from it", () => {
    const clock = new TimelineClock();
    clock.sync(50, 200, 0);
    clock.setPlaying(true, 0);
    let { now } = run(clock, 0, 1);

    clock.setPlaying(false, now);
    const paused = clock.position;
    ({ now } = run(clock, now, 3));
    assert.equal(clock.position, paused);

    clock.setPlaying(true, now);
    run(clock, now, 1);
    assert.ok(Math.abs(clock.position - (paused + 1)) < 0.05);
});

test("a long gap (hidden wallpaper) catches up instead of drifting", () => {
    const clock = new TimelineClock();
    clock.sync(0, 300, 0);
    clock.setPlaying(true, 0);
    clock.update(60_000, 60); // one frame after a minute in the background
    assert.equal(clock.position, 60);
});

test("stays within [0, duration] and handles unknown durations", () => {
    const clock = new TimelineClock();
    clock.sync(199.5, 200, 0);
    clock.setPlaying(true, 0);
    run(clock, 0, 2);
    assert.equal(clock.position, 200);

    const empty = new TimelineClock();
    empty.sync(5, 0, 0);
    assert.equal(empty.progress, 0);
});

test("timelineAdvanced confirms playback only when the position really moves", () => {
    const at = (position, seconds, duration = 200) => ({ position, duration, time: seconds * 1000 });

    assert.equal(timelineAdvanced(at(10, 0), at(15, 5)), true, "playing: 5 s in 5 s");
    assert.equal(timelineAdvanced(at(10, 0), at(10, 5)), false, "paused: same position");
    assert.equal(timelineAdvanced(at(10, 0), at(10.4, 5)), false, "paused with reporting jitter");
    assert.equal(timelineAdvanced(at(10, 0), at(11, 1)), true, "playing, reported every second");
    assert.equal(timelineAdvanced(at(10, 0), at(15, 5, 180)), false, "another track");
    assert.equal(timelineAdvanced(null, at(15, 5)), false, "a single report proves nothing");
});
