import { FADE_DURATION, TRANSITION_TIMEOUT_MARGIN } from "../config.js";

// Latest transition per element; older transitions see a stale token and stop.
const tokens = new WeakMap();

function nextToken(element) {
    const token = (tokens.get(element) ?? 0) + 1;
    tokens.set(element, token);
    return token;
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fadeTo(element, opacity, duration) {
    const from = getComputedStyle(element).opacity;
    const animation = element.animate([{ opacity: from }, { opacity }], { duration, easing: "linear", fill: "forwards" });

    // A hidden or paused page may never advance the animation; a transition must not wait on it forever
    await Promise.race([animation.finished.catch(() => {}), wait(duration + TRANSITION_TIMEOUT_MARGIN)]);
    if (animation.playState === "running") animation.finish();
}

/** Fades in or out. Resolves to false when a newer transition took over the element. */
export async function fade(element, visible, duration = FADE_DURATION) {
    const token = nextToken(element);
    await fadeTo(element, visible ? 1 : 0, duration);
    return tokens.get(element) === token;
}

/**
 * Fades out, runs `apply`, fades back in.
 * When calls overlap on the same element only the latest `apply` runs, so fast track skipping never shows stale data.
 */
export async function crossFade(element, apply, duration = FADE_DURATION) {
    const token = nextToken(element);
    await fadeTo(element, 0, duration / 2);
    if (tokens.get(element) !== token) return false;

    apply();
    fadeTo(element, 1, duration / 2);
    return true;
}
