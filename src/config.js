// Internal tuning values. User-facing defaults live in core/settings.js (mirroring project.json).

export const DEBUG = typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");

export const FADE_DURATION = 1000; // ms

export const FALLBACK_COLORS = { primary: "#111111", text: "#ffffff" };

export const UNTITLED_TRACK = "Untitled";

export const AUDIO = {
    // Ranges over the 64 mono samples Wallpaper Engine provides
    bands: { bass: [0, 20], mid: [20, 40], treble: [40, 64] },
};

export const AUDIO_BARS = {
    maxQuantity: 64,
    smoothing: 0.4, // weight of the newest sample
    peakHoldFrames: 10,
    peakFallSpeed: 0.008,
    minPeak: 0.001,
    resizeCheckInterval: 60, // audio frames between layout checks
};

export const TIMELINE = {
    snapThreshold: 2, // seconds; larger differences are seeks or track changes
    correctionGain: 0.5, // playback rate change per second of error
    minRate: 0.5,
    maxRate: 1.5,
    maxFrameDelta: 0.25, // seconds
};

export const BACKGROUND = {
    blur: 100, // px on screen
    canvasSize: 256,
    sizeFactor: 1.148, // thumbnail side relative to max(vw, vh), keep in sync with background.css
    tintAlpha: 0.8,
};

export const MARQUEE = {
    gap: 80, // px between the two copies
    speed: 50, // px per second
};
