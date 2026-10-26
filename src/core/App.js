import RenderLoop from "./RenderLoop.js";
import AudioAnalyzer from "../audio/AudioAnalyzer.js";
import Background from "../components/Background.js";
import Cards from "../components/Cards.js";
import ClockCard from "../components/ClockCard.js";
import TrackCard from "../components/TrackCard.js";
import DateCard from "../components/DateCard.js";
import AudioBars from "../components/AudioBars.js";
import Triangles from "../components/Triangles.js";
import Debug from "../components/Debug.js";
import { DEBUG, DEBUG_LOG_LINES, TRIANGLES } from "../config.js";
import { isAlbumColor, pickColor, withMinLightness } from "../utils/color.js";
import { loadCover, saveCover } from "../media/coverCache.js";
import { timelineAdvanced } from "../media/TimelineClock.js";
import { applyDefaults, applySettings } from "./settings.js";

/**
 * Owns the components and the single render loop.
 * Wallpaper Engine handlers (the `on*` methods) only store or apply state; per-frame work happens in `frame`.
 */
export default class App {
    constructor(root) {
        this.root = root;
        this.background = new Background(root);
        this.cards = new Cards(root);
        this.clockCard = new ClockCard(this.cards.container);
        this.trackCard = new TrackCard(this.cards.container);
        this.dateCard = new DateCard(this.cards.container);
        this.audioBars = new AudioBars(this.trackCard.audioBarsSlot);
        this.triangles = new Triangles(this.background.trianglesSlot);
        this.debug = null;

        this.analyzer = new AudioAnalyzer();
        this.audio = null;
        this.audioVersion = 0;
        this.renderedAudioVersion = 0;
        this.lastSecond = -1;

        // Each colored background layer uses its custom color or one of the current cover's colors
        this.albumColors = null;
        this.colors = { background: { source: "custom", custom: "" }, triangles: { source: "custom", custom: "" } };

        // Latest media state and an event log, so the debug overlay can show them even when turned on later
        this.track = null;
        this.thumbnail = null;
        this.playback = null;
        this.playbackAssumed = false;
        this.lastTimeline = null;
        this.thumbnailReceived = false;
        this.events = [];
        this.logEvent("wallpaper loaded");
        document.addEventListener("visibilitychange", () => this.logEvent(`page ${document.visibilityState}`));

        this.loop = new RenderLoop();
        this.loop.add(this.frame);

        applyDefaults(this);
        if (DEBUG) this.setDebugVisible(true);
        window.addEventListener("resize", () => this.audioBars.invalidateSize());
    }

    start() {
        this.loop.start();
        document.fonts.ready.then(() => {
            this.trackCard.refitText();
            this.cards.show();
        });
    }

    frame = (now, dt) => {
        const second = Math.floor(Date.now() / 1000);
        if (second !== this.lastSecond) {
            this.lastSecond = second;
            this.clockCard.tick();
            this.dateCard.tick();
        }

        this.trackCard.updateTimeline(now, dt);

        // Audio-driven work runs once per audio frame, never more than once per display frame
        const newAudio = this.audio && this.audioVersion !== this.renderedAudioVersion;
        if (newAudio) {
            this.renderedAudioVersion = this.audioVersion;
            this.analyzer.update(this.audio);
            this.background.setBeat(this.analyzer.bass);
            this.trackCard.setBeats(this.analyzer);
            if (this.trackCard.barsVisible) this.audioBars.render(this.analyzer);
            this.debug?.audio(this.analyzer);
        }

        // Also runs between audio frames, for color transitions and redraws after setting changes
        if (this.triangles.active) this.triangles.frame(dt, newAudio ? this.analyzer : null);
    };

    // Settings that affect the audio bars' on-screen size

    setCardsScale(scale) {
        this.cards.setScale(scale);
        this.audioBars.invalidateSize();
    }

    setTrackCardVisible(visible) {
        this.trackCard.setVisible(visible);
        this.audioBars.invalidateSize();
    }

    setShowBars(show) {
        this.trackCard.setShowBars(show);
        this.audioBars.invalidateSize();
    }

    // Background colors

    setColorSource(layer, source) {
        this.colors[layer].source = source;
        this.updateColors();
    }

    setCustomColor(layer, color) {
        this.colors[layer].custom = color;
        this.updateColors();
    }

    updateColors() {
        const { background, triangles } = this.colors;
        this.background.setBaseColor(pickColor(background.source, background.custom, this.albumColors));

        // Album colors are often too dark to visibly light up; a custom color is used as chosen
        const trianglesColor = pickColor(triangles.source, triangles.custom, this.albumColors);
        this.triangles.setColor(isAlbumColor(triangles.source) ? withMinLightness(trianglesColor, TRIANGLES.minAlbumLightness) : trianglesColor);
    }

    // Diagnostics

    setDebugVisible(visible) {
        if (DEBUG) visible = true;
        if (visible === Boolean(this.debug)) return;

        if (!visible) {
            this.debug.container.remove();
            this.debug = null;
            return;
        }

        this.debug = new Debug(this.root);
        if (this.track) this.debug.track(this.track);
        if (this.thumbnail) this.debug.thumbnail(this.thumbnail);
        if (this.playback) this.debug.playback(this.playback);
        this.debug.events(this.events);
    }

    logEvent(text) {
        const time = new Date().toLocaleTimeString([], { hour12: false });
        this.events.push(`${time}  ${text}`);
        if (this.events.length > DEBUG_LOG_LINES) this.events.shift();
        this.debug?.events(this.events);
    }

    applyThumbnail(thumbnail) {
        this.thumbnail = thumbnail;
        this.background.setThumbnail(thumbnail.thumbnail).then((result) => this.logEvent(`album spin cover ${result}`));
        this.background.setTint(thumbnail.primaryColor);
        this.trackCard.setCover(thumbnail.thumbnail);
        this.cards.setColors(thumbnail);
        this.audioBars.setColor(thumbnail.textColor);
        this.albumColors = thumbnail;
        this.updateColors();
        this.debug?.thumbnail(thumbnail);
    }

    // Wallpaper Engine handlers

    onAudio = (audioArray) => {
        // Only keep the latest frame; nothing is queued while the wallpaper is hidden or paused
        this.audio = audioArray;
        this.audioVersion++;
    };

    onPaused = (paused) => {
        this.logEvent(paused ? "paused" : "resumed");
        if (paused) this.loop.stop();
        else this.loop.start();
    };

    onProperties = (properties) => {
        applySettings(this, properties);
        this.debug?.userProperties(properties);
    };

    onMediaStatus = (enabled) => {
        this.logEvent(`media integration ${enabled ? "on" : "off"}`);
        if (!enabled) {
            this.trackCard.close();
            this.background.setMediaActive(false);
        }
    };

    /** `advanceTimeline` is false while playback is only assumed, so a paused track's progress bar stays still. */
    applyPlayback(state, advanceTimeline = state === "playing") {
        this.playback = state;
        this.trackCard.setPlaying(advanceTimeline, performance.now());

        this.background.setMediaActive(state !== "stopped");
        if (state === "stopped") {
            this.trackCard.close();
        } else {
            this.trackCard.open();
            this.audioBars.invalidateSize();
        }
        this.debug?.playback(state);
    }

    /**
     * Wallpaper Engine only sends playback changes, so after switching wallpapers and back a song can be playing
     * (or paused) without any playback event. Media data before the first playback event opens the music card,
     * but the progress bar only moves once the timeline shows the song advancing (see onTimeline).
     */
    assumePlaying(reason) {
        if (this.playback) return;
        this.logEvent(`playback assumed (${reason} before any playback event); progress bar waits for the timeline`);
        this.playbackAssumed = true;
        this.applyPlayback("playing", false);
    }

    onTrack = (track) => {
        this.logEvent(`track: ${track.title} / ${track.artist}`);
        this.assumePlaying("track");
        this.track = track;
        this.trackCard.setTrack(track);
        this.debug?.track(track);

        if (this.thumbnailReceived) {
            saveCover(track, this.thumbnail);
            return;
        }
        // No cover since the wallpaper loaded: Wallpaper Engine may not resend it, so reuse this track's stored one
        const cached = loadCover(track);
        if (cached) {
            this.logEvent("cover restored from cache");
            this.applyThumbnail(cached);
        }
    };

    onThumbnail = (thumbnail) => {
        this.logEvent(`cover received (${Math.round((thumbnail.thumbnail?.length ?? 0) / 1024)} KB)`);
        this.assumePlaying("cover");
        this.thumbnailReceived = true;
        this.applyThumbnail(thumbnail);
        if (this.track) saveCover(this.track, thumbnail);
    };

    onPlayback = (state) => {
        this.logEvent(`playback ${state}`);
        this.playbackAssumed = false;
        this.applyPlayback(state);
    };

    onTimeline = ({ position, duration }) => {
        const now = performance.now();
        this.assumePlaying("timeline");
        this.trackCard.syncTimeline(position, duration, now);
        this.debug?.timeline(position, duration);

        const report = { position, duration, time: now };
        if (this.playbackAssumed && timelineAdvanced(this.lastTimeline, report)) {
            this.logEvent("playback confirmed by the timeline; progress bar moves");
            this.playbackAssumed = false;
            this.trackCard.setPlaying(true, now);
        }
        this.lastTimeline = report;
    };
}
