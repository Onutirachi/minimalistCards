import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSITION_TIMEOUT_MARGIN } from "../wallpaper/src/config.js";
import { crossFade, fade } from "../wallpaper/src/core/transitions.js";

// An element whose animations never advance, like on a hidden or paused page
function stalledElement() {
    const animations = [];
    return {
        animations,
        animate() {
            const animation = { playState: "running", finished: new Promise(() => {}), finish() { this.playState = "finished"; } };
            animations.push(animation);
            return animation;
        },
    };
}

globalThis.getComputedStyle = () => ({ opacity: "1" });

test("a transition never waits forever on a stalled animation", async () => {
    const element = stalledElement();
    const start = Date.now();

    assert.equal(await fade(element, false, 10), true);
    assert.ok(Date.now() - start < 10 + TRANSITION_TIMEOUT_MARGIN + 200, "fade resolved after its timeout");
    assert.equal(element.animations[0].playState, "finished", "the stalled animation jumps to its end state");
});

test("a cross-fade still applies its change when the animation is stalled", async () => {
    const element = stalledElement();
    let applied = false;

    assert.equal(await crossFade(element, () => (applied = true), 20), true);
    assert.equal(applied, true);
});
