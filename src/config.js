// Internal tuning values. User-facing defaults live in core/settings.js (mirroring project.json).

export const DEBUG = typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");
export const DEBUG_LOG_LINES = 40;

export const FADE_DURATION = 1000; // ms
export const TRANSITION_TIMEOUT_MARGIN = 250; // ms a transition waits past its duration for a stalled animation

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
    // Two timeline events prove playback when the position advanced by at least this share of the elapsed time...
    playingEvidenceRate: 0.5,
    playingEvidenceMin: 0.5, // ...and by at least this many seconds, so reporting jitter is not mistaken for playback
};

export const BACKGROUND = {
    blur: 100, // px on screen
    canvasSize: 256,
    sizeMargin: 2, // px added to the screen diagonal so antialiased edges never show
    tintAlpha: 0.8,
};

export const TRIANGLES = {
    restLevel: 0.35, // brightness of an unlit triangle, relative to the base color
    glow: 0.45, // how far a lit triangle moves from the base color towards white
    beatShare: 0.2, // share of the triangles lit per beat at sensitivity 1
    minLevel: 0.05, // a beat must be at least this loud, besides the user's threshold over the recent average
    levelAverageRate: 0.05, // weight of the newest sample in the recent average
    beatCooldown: 6, // audio frames between beats
    colorSpeed: 3, // color transition rate per second (exponential)
    minAlbumLightness: 0.45, // album colors are often too dark to light up
};

export const MARQUEE = {
    gap: 80, // px between the two copies
    speed: 50, // px per second
};
