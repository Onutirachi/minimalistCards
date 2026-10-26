// The last cover and the track it belongs to, kept across reloads (REQ-WE-14).
// Wallpaper Engine only sends media events on change, so after switching wallpapers and back the cover may never be resent.

const KEY = "minimalistcards.lastCover";

/** Stores `thumbnail` (the normalized thumbnail event) as the cover of `track`. Storage failures are ignored. */
export function saveCover(track, thumbnail, storage = globalThis.localStorage) {
    try {
        storage.setItem(KEY, JSON.stringify({ title: track.title, artist: track.artist, thumbnail }));
    } catch {
        // Full, blocked or unavailable storage only costs the cached cover
    }
}

/** The stored thumbnail event when it belongs to `track`, otherwise null. */
export function loadCover(track, storage = globalThis.localStorage) {
    try {
        const cached = JSON.parse(storage.getItem(KEY));
        return cached && cached.title === track.title && cached.artist === track.artist ? cached.thumbnail : null;
    } catch {
        return null;
    }
}
