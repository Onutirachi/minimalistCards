import { FALLBACK_COLORS, UNTITLED_TRACK } from "../config.js";

/**
 * Connects the Wallpaper Engine web API to `handlers`.
 * Must run synchronously while the page loads, so no early event or property is missed.
 * Handlers only record or apply state; they never schedule work per event.
 */
export function connectWallpaperEngine(handlers) {
    window.wallpaperPropertyListener = {
        applyUserProperties: (properties) => handlers.onProperties(properties),
        setPaused: (paused) => handlers.onPaused(paused),
    };

    register("wallpaperRegisterAudioListener", (audioArray) => handlers.onAudio(audioArray));
    register("wallpaperRegisterMediaStatusListener", (event) => handlers.onMediaStatus(event.enabled));
    register("wallpaperRegisterMediaPropertiesListener", (event) => handlers.onTrack(normalizeTrack(event)));
    register("wallpaperRegisterMediaThumbnailListener", (event) => handlers.onThumbnail(normalizeThumbnail(event)));
    register("wallpaperRegisterMediaPlaybackListener", (event) => handlers.onPlayback(toPlaybackState(event.state)));
    register("wallpaperRegisterMediaTimelineListener", (event) => handlers.onTimeline(normalizeTimeline(event)));
}

function register(name, listener) {
    if (typeof window[name] === "function") window[name](listener);
    else console.warn(`${name} is not available; running outside Wallpaper Engine?`);
}

export function normalizeTrack(event) {
    return { title: event.title || UNTITLED_TRACK, artist: event.artist || "" };
}

export function normalizeThumbnail(event) {
    // Some covers produce identical colors, which would make the text invisible
    const sameColors = event.primaryColor === event.textColor;
    return {
        ...event,
        primaryColor: sameColors ? FALLBACK_COLORS.primary : event.primaryColor,
        textColor: sameColors ? FALLBACK_COLORS.text : event.textColor,
    };
}

/**
 * True for the cover Wallpaper Engine sends when the player closes: no image (or a data URL without data).
 * A real PNG cover is always far longer than this.
 */
export function isEmptyThumbnail(event) {
    const image = typeof event?.thumbnail === "string" ? event.thumbnail : "";
    return image.length < 100;
}

export function normalizeTimeline(event) {
    return { position: Number(event.position) || 0, duration: Number(event.duration) || 0 };
}

export function toPlaybackState(state) {
    const media = globalThis.wallpaperMediaIntegration ?? {};
    if (state === (media.PLAYBACK_PLAYING ?? 1)) return "playing";
    if (state === (media.PLAYBACK_PAUSED ?? 2)) return "paused";
    return "stopped";
}
