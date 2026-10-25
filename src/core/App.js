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
import { DEBUG, TRIANGLES } from "../config.js";
import { isAlbumColor, pickColor, withMinLightness } from "../utils/color.js";
import { applyDefaults, applySettings } from "./settings.js";

/**
 * Owns the components and the single render loop.
 * Wallpaper Engine handlers (the `on*` methods) only store or apply state; per-frame work happens in `frame`.
 */
export default class App {
    constructor(root) {
        this.background = new Background(root);
        this.cards = new Cards(root);
        this.clockCard = new ClockCard(this.cards.container);
        this.trackCard = new TrackCard(this.cards.container);
        this.dateCard = new DateCard(this.cards.container);
        this.audioBars = new AudioBars(this.trackCard.audioBarsSlot);
        this.triangles = new Triangles(this.background.trianglesSlot);
        this.debug = DEBUG ? new Debug(root) : null;

        this.analyzer = new AudioAnalyzer();
        this.audio = null;
        this.audioVersion = 0;
        this.renderedAudioVersion = 0;
        this.lastSecond = -1;

        // Each colored background layer uses its custom color or one of the current cover's colors
        this.albumColors = null;
        this.colors = { background: { source: "custom", custom: "" }, triangles: { source: "custom", custom: "" } };

        this.loop = new RenderLoop();
        this.loop.add(this.frame);

        applyDefaults(this);
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

    // Wallpaper Engine handlers

    onAudio = (audioArray) => {
        // Only keep the latest frame; nothing is queued while the wallpaper is hidden or paused
        this.audio = audioArray;
        this.audioVersion++;
    };

    onPaused = (paused) => {
        if (paused) this.loop.stop();
        else this.loop.start();
    };

    onProperties = (properties) => {
        applySettings(this, properties);
        this.debug?.userProperties(properties);
    };

    onMediaStatus = (enabled) => {
        if (!enabled) this.trackCard.close();
    };

    onTrack = (track) => {
        this.trackCard.setTrack(track);
        this.debug?.track(track);
    };

    onThumbnail = (thumbnail) => {
        this.background.setThumbnail(thumbnail.thumbnail);
        this.background.setTint(thumbnail.primaryColor);
        this.trackCard.setCover(thumbnail.thumbnail);
        this.cards.setColors(thumbnail);
        this.audioBars.setColor(thumbnail.textColor);
        this.albumColors = thumbnail;
        this.updateColors();
        this.debug?.thumbnail(thumbnail);
    };

    onPlayback = (state) => {
        this.trackCard.setPlaying(state === "playing", performance.now());

        if (state === "stopped") {
            this.trackCard.close();
        } else {
            this.trackCard.open();
            this.audioBars.invalidateSize();
        }
        this.debug?.playback(state);
    };

    onTimeline = ({ position, duration }) => {
        this.trackCard.syncTimeline(position, duration, performance.now());
        this.debug?.timeline(position, duration);
    };
}
