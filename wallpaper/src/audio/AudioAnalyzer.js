import { AUDIO, AUTO_VOLUME } from "../config.js";

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

        this.autoVolume = false;
        this.peaks = new Float32Array(AUTO_VOLUME.windowFrames); // loudest sample of each recent frame
        this.peakIndex = 0;
        this.peak = 0;
        this.gain = null;
    }

    update(audioArray) {
        const half = Math.floor(audioArray.length / 2);
        const length = Math.min(half, this.mono.length);

        for (let i = 0; i < length; i++) {
            this.mono[i] = (audioArray[i] + audioArray[half + i]) / 2;
        }

        this.length = length;
        if (this.autoVolume) this.normalize();

        this.bass = this.mean(...AUDIO.bands.bass);
        this.mid = this.mean(...AUDIO.bands.mid);
        this.treble = this.mean(...AUDIO.bands.treble);
    }

    setAutoVolume(enabled) {
        this.autoVolume = enabled;
        this.peaks.fill(0);
        this.peak = 0;
        this.gain = null;
    }

    /**
     * Amplifies the mono samples so the loudest moment of the last few seconds reaches 1, whatever the system or
     * player volume. A sliding window (not a decaying peak) adapts to any volume drop within the same few seconds.
     */
    normalize() {
        let max = 0;
        for (let i = 0; i < this.length; i++) if (this.mono[i] > max) max = this.mono[i];

        this.peaks[this.peakIndex] = max;
        this.peakIndex = (this.peakIndex + 1) % this.peaks.length;
        this.peak = 0;
        for (let i = 0; i < this.peaks.length; i++) if (this.peaks[i] > this.peak) this.peak = this.peaks[i];

        const target = this.peak < AUTO_VOLUME.silence ? 1 : Math.min(AUTO_VOLUME.maxGain, Math.max(1, 1 / this.peak));
        // Louder music lowers the gain at once (never overshoots); a quieter one raises it smoothly (no jumps)
        this.gain = this.gain === null || target < this.gain ? target : this.gain + (target - this.gain) * AUTO_VOLUME.gainSmoothing;

        for (let i = 0; i < this.length; i++) this.mono[i] *= this.gain;
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
