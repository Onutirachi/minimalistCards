import { AUDIO } from "../config.js";

/**
 * Turns Wallpaper Engine's audio array (64 left + 64 right samples) into the values the UI needs.
 * Runs once per audio frame and is shared by every consumer; buffers are preallocated.
 */
export default class AudioAnalyzer {
    constructor(size = 64) {
        this.mono = new Float32Array(size);
        this.length = 0;
        this.bass = 0;
        this.mid = 0;
        this.treble = 0;
    }

    update(audioArray) {
        const half = Math.floor(audioArray.length / 2);
        const length = Math.min(half, this.mono.length);

        for (let i = 0; i < length; i++) {
            this.mono[i] = (audioArray[i] + audioArray[half + i]) / 2;
        }

        this.length = length;
        this.bass = this.mean(...AUDIO.bands.bass);
        this.mid = this.mean(...AUDIO.bands.mid);
        this.treble = this.mean(...AUDIO.bands.treble);
    }

    mean(from, to) {
        const end = Math.min(to, this.length);
        if (end <= from) return 0;

        let sum = 0;
        for (let i = from; i < end; i++) sum += this.mono[i];
        return sum / (end - from);
    }

    /** Splits the mono samples into `count` groups and writes the peak of each into `out`. */
    channels(out, count) {
        const delta = this.length / count;

        for (let i = 0; i < count; i++) {
            const start = Math.trunc(i * delta);
            const end = Math.min(this.length, Math.max(start + 1, Math.trunc((i + 1) * delta)));

            let peak = 0;
            for (let j = start; j < end; j++) {
                if (this.mono[j] > peak) peak = this.mono[j];
            }
            out[i] = peak;
        }
    }
}
