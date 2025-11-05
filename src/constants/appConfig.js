export const ANIMATION_DEFAULTS = {
    name: "fade",
    easing: "linear",
    duration: 1000,
};

export const AUDIO_BARS_DEFAULTS = {
    quantity: 40,
    gap: 4,
    borderRadius: 60, // 0-100%
    opacity: 100, // 0-100%
    barsColor: "#ffffff",

    showPeakDots: true,
    peakDotsColor: "#ffffff",
    peakDotsBorderRadius: 80, // 0-100%
    peakDotsOpacity: 80, // 0-100%
    peakDotsHoldFrames: 10, // 0-60 frames
    peakDotsFallSpeed: 0.008, // 0.001-0.05
    peakDotsSize: 5, // 2-12px
    peakDotsGap: 4, // 0-20px
};

export const BACKGROUND_DEFAULTS = {
    movementSpeed: 120,
    beatSensitivity: 0.2,
};

export const CLOCK_CARD_DEFAULTS = {
    showSeconds: true,
    format12h: false,
};
