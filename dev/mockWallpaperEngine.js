// Stand-in for the Wallpaper Engine web API, to run the wallpaper in a normal browser.
// Keys: Space play/pause · N next track · S stop · P toggle setPaused · M toggle media integration
(() => {
    const PLAYBACK = { STOPPED: 0, PLAYING: 1, PAUSED: 2 };
    window.wallpaperMediaIntegration = { PLAYBACK_STOPPED: 0, PLAYBACK_PLAYING: 1, PLAYBACK_PAUSED: 2 };

    const listeners = {};
    for (const name of ["Audio", "MediaStatus", "MediaProperties", "MediaThumbnail", "MediaPlayback", "MediaTimeline"]) {
        window[`wallpaperRegister${name}Listener`] = (callback) => (listeners[name] = callback);
    }
    const emit = (name, data) => listeners[name]?.(data);

    const tracks = [
        // [primary, text, secondary, tertiary, high contrast]
        { title: "Minimal Dreams", artist: "The Placeholders", duration: 185, colors: ["#1d3557", "#f1faee", "#457b9d", "#a8dadc", "#e63946"] },
        { title: "A Title Long Enough To Need The Scrolling Marquee", artist: "Somebody feat. Somebody Else", duration: 242, colors: ["#6a040f", "#ffba08", "#d00000", "#e85d04", "#03071e"] },
        { title: "", artist: "Same Colors Fallback", duration: 97, colors: ["#444444", "#444444", "#444444", "#444444", "#444444"] },
    ];

    let index = 0;
    let state = PLAYBACK.PLAYING;
    let position = 0;
    let paused = false;
    let mediaEnabled = true;

    function cover([background, accent]) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d");
        const gradient = context.createLinearGradient(0, 0, 256, 256);
        gradient.addColorStop(0, background);
        gradient.addColorStop(1, accent);
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        context.fillStyle = accent;
        context.beginPath();
        context.arc(170, 90, 50, 0, Math.PI * 2);
        context.fill();
        return canvas.toDataURL("image/png");
    }

    function sendTimeline() {
        // Real apps report positions late and slightly off
        const jitter = (Math.random() - 0.5) * 0.6;
        emit("MediaTimeline", { position: Math.max(0, position + jitter), duration: tracks[index].duration });
    }

    function playTrack(next) {
        index = next % tracks.length;
        position = 0;
        const track = tracks[index];
        const [primary, text, secondary, tertiary, highContrast] = track.colors;
        emit("MediaProperties", { title: track.title, artist: track.artist });
        emit("MediaThumbnail", { thumbnail: cover(track.colors), primaryColor: primary, secondaryColor: secondary, tertiaryColor: tertiary, textColor: text, highContrastColor: highContrast });
        emit("MediaPlayback", { state });
        sendTimeline();
    }

    function setState(next) {
        state = next;
        emit("MediaPlayback", { state });
        sendTimeline();
    }

    let last = performance.now();
    setInterval(() => {
        const now = performance.now();
        if (state === PLAYBACK.PLAYING) position += (now - last) / 1000;
        last = now;
        if (position >= tracks[index].duration) playTrack(index + 1);
        if (paused) return;

        // ~120 bpm kick plus noise, louder in the low end
        const kick = Math.max(0, Math.sin((now / 1000) * Math.PI * 4)) ** 8;
        const audio = new Array(128);
        for (let i = 0; i < 64; i++) {
            const falloff = 1 - i / 64;
            const value = state === PLAYBACK.PLAYING ? (kick * 0.6 + Math.random() * 0.25) * falloff : 0;
            audio[i] = value;
            audio[64 + i] = value * (0.9 + Math.random() * 0.2);
        }
        emit("Audio", audio);
    }, 33);

    setInterval(() => state === PLAYBACK.PLAYING && sendTimeline(), 5000);

    window.addEventListener("keydown", (event) => {
        if (event.code === "Space") setState(state === PLAYBACK.PLAYING ? PLAYBACK.PAUSED : PLAYBACK.PLAYING);
        if (event.code === "KeyN") playTrack(index + 1);
        if (event.code === "KeyS") setState(PLAYBACK.STOPPED);
        if (event.code === "KeyP") {
            paused = !paused;
            window.wallpaperPropertyListener?.setPaused?.(paused);
        }
        if (event.code === "KeyM") {
            mediaEnabled = !mediaEnabled;
            emit("MediaStatus", { enabled: mediaEnabled });
        }
    });

    window.addEventListener("load", async () => {
        try {
            const project = await (await fetch("../project.json")).json();
            window.wallpaperPropertyListener?.applyUserProperties(project.general.properties);
        } catch (error) {
            console.warn("mock: could not load project.json", error);
        }
        emit("MediaStatus", { enabled: true });
        playTrack(0);
    });

    window.mockWallpaperEngine = { playTrack, setState, emit, PLAYBACK };
})();
