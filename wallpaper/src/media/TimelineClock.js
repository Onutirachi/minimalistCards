import { TIMELINE } from "../config.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Estimates the playback position between Wallpaper Engine timeline events.
 *
 * Each event becomes an anchor ("at `anchorTime` the track was at `anchorPosition`"), so the
 * real position is always anchor + elapsed time and errors never accumulate. The displayed
 * position follows it by speeding up or slowing down slightly instead of jumping, and only moves
 * backwards on a real seek (a difference above `snapThreshold`).
 */
/**
 * True when two timeline reports `{ position, duration, time }` (time in ms) show the track really advancing.
 * Used while the playback state is unknown, since a paused track keeps reporting the same position.
 */
export function timelineAdvanced(previous, current) {
    if (!previous || previous.duration !== current.duration) return false;
    const elapsed = (current.time - previous.time) / 1000;
    const advanced = current.position - previous.position;
    return advanced >= Math.max(TIMELINE.playingEvidenceMin, elapsed * TIMELINE.playingEvidenceRate);
}

export default class TimelineClock {
    constructor() {
        this.duration = 0;
        this.anchorPosition = 0;
        this.anchorTime = 0;
        this.playing = false;
        this.position = 0;
    }

    get progress() {
        return this.duration > 0 ? this.position / this.duration : 0;
    }

    target(now) {
        const elapsed = this.playing ? (now - this.anchorTime) / 1000 : 0;
        return clamp(this.anchorPosition + elapsed, 0, this.duration);
    }

    sync(position, duration, now) {
        const trackChanged = duration !== this.duration;
        this.duration = Math.max(0, duration);
        this.anchorPosition = position;
        this.anchorTime = now;

        if (trackChanged || Math.abs(this.target(now) - this.position) > TIMELINE.snapThreshold) {
            this.position = this.target(now);
        }
    }

    setPlaying(playing, now) {
        if (playing === this.playing) return;
        this.anchorPosition = this.target(now);
        this.anchorTime = now;
        this.playing = playing;
    }

    update(now, dt) {
        const target = this.target(now);
        const error = target - this.position;

        if (Math.abs(error) > TIMELINE.snapThreshold) {
            this.position = target;
        } else if (this.playing) {
            const rate = clamp(1 + error * TIMELINE.correctionGain, TIMELINE.minRate, TIMELINE.maxRate);
            this.position += Math.min(dt, TIMELINE.maxFrameDelta) * rate;
        } else if (error > 0) {
            this.position = target;
        }

        this.position = clamp(this.position, 0, this.duration);
        return this.position;
    }
}
