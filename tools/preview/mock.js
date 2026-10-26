// Stand-in for the Wallpaper Engine web API that plays the tracks of tracks.json, driven by record.mjs.
// Unlike dev/mockWallpaperEngine.js it has no keyboard controls: record.mjs calls window.preview.
(() => {
    // The clock shows a fixed time of day (tracks.json "clock") that advances normally, so a short recording
    // never crosses a minute and the loop seam is invisible
    const RealDate = Date;
    let clockOffset = 0;
    window.Date = class extends RealDate {
        constructor(...args) {
            super(...(args.length ? args : [RealDate.now() + clockOffset]));
        }

        static now() {
            return RealDate.now() + clockOffset;
        }
    };

    function setClock(time) {
        const [hours, minutes] = time.split(":").map(Number);
        const today = new RealDate();
        clockOffset = new RealDate(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0).getTime() - RealDate.now();
    }

    window.wallpaperMediaIntegration = { PLAYBACK_STOPPED: 0, PLAYBACK_PLAYING: 1, PLAYBACK_PAUSED: 2 };

    const listeners = {};
    for (const name of ["Audio", "MediaStatus", "MediaProperties", "MediaThumbnail", "MediaPlayback", "MediaTimeline"]) {
        window[`wallpaperRegister${name}Listener`] = (callback) => (listeners[name] = callback);
    }
    const emit = (name, data) => listeners[name]?.(data);

    let tracks = [];
    let index = 0;
    let position = 0;
    let lastTime = performance.now();

    /** Wallpaper Engine sends covers as base64 PNG data URLs. */
    async function toPngDataUrl(url) {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d").drawImage(image, 0, 0);
        return canvas.toDataURL("image/png");
    }

    let config = {};

    async function load() {
        config = await (await fetch("./tracks.json")).json();
        if (config.clock) setClock(config.clock);
        tracks = await Promise.all(
            config.tracks.map(async (track) => ({ ...track, thumbnail: await toPngDataUrl(`./covers/${encodeURIComponent(track.cover)}`) }))
        );
        emit("MediaStatus", { enabled: true });
        return config;
    }

    /** Settings that differ from the defaults, only for the recording. Called once the wallpaper is running. */
    function applySettings() {
        const properties = Object.fromEntries(Object.entries(config.settings ?? {}).map(([key, value]) => [key, { value }]));
        window.wallpaperPropertyListener.applyUserProperties(properties);
    }

    function sendTimeline() {
        if (tracks[index]) emit("MediaTimeline", { position, duration: tracks[index].duration });
    }

    function playTrack(next, start = 0) {
        index = next;
        const track = tracks[index];
        position = start;
        emit("MediaProperties", { title: track.title, artist: track.artist });
        emit("MediaThumbnail", { thumbnail: track.thumbnail, ...track.colors });
        emit("MediaPlayback", { state: 1 });
        sendTimeline();
    }

    function seek(seconds) {
        position = seconds;
        sendTimeline();
    }

    /**
     * A seamless loop. Called while the last track plays: it switches to the first track now, and the loop begins
     * half a track later, in the middle of the first track. The other tracks follow, then the same switch from the
     * last track to the first one happens again, from the same position, and the loop ends half a track after it.
     * The last frame is then the first one again, even when a track is too short for its cross-fades to finish.
     * Returns the start time (real epoch ms, as the recorder's screencast timestamps) where the loop begins.
     */
    function runSequence(trackMs, firstPosition = 4) {
        const now = RealDate.now();
        playTrack(0, firstPosition);
        for (let i = 1; i < tracks.length; i++) setTimeout(() => playTrack(i), i * trackMs);
        setTimeout(() => playTrack(0, firstPosition), tracks.length * trackMs);
        return now + trackMs / 2;
    }

    // Playback position and ~120 bpm kick plus noise, louder in the low end, like dev/mockWallpaperEngine.js
    setInterval(() => {
        const now = performance.now();
        position += (now - lastTime) / 1000;
        lastTime = now;

        const kick = Math.max(0, Math.sin((now / 1000) * Math.PI * 4)) ** 8;
        const audio = new Array(128);
        for (let i = 0; i < 64; i++) {
            const value = (kick * 0.6 + Math.random() * 0.25) * (1 - i / 64);
            audio[i] = value;
            audio[64 + i] = value * (0.9 + Math.random() * 0.2);
        }
        emit("Audio", audio);
    }, 33);
    setInterval(sendTimeline, 1000);

    window.preview = { ready: load(), applySettings, playTrack, seek, runSequence };
})();
