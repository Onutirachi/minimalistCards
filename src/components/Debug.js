import { el } from "../utils/dom.js";
import { formatDuration } from "../utils/time.js";

const MAX_LOG_LINES = 50;
const SWATCHES = ["primaryColor", "secondaryColor", "tertiaryColor", "textColor", "highContrastColor"];

/** Overlay with the raw Wallpaper Engine data. Enabled with `?debug` in the URL. */
export default class Debug {
    constructor(parent) {
        this.container = el("div", "debug", parent);

        const track = this.panel("Properties", "debug-track");
        this.title = el("div", "", track);
        this.artist = el("div", "", track);

        this.pulse = el("div", "debug-pulse", this.panel("Audio"));

        const thumbnail = this.panel("Thumbnail", "debug-wide debug-thumbnail");
        this.thumbnailImage = el("img", "debug-thumbnail-image", thumbnail);
        this.swatches = SWATCHES.map((key) => [key, el("div", "debug-swatch", thumbnail)]);

        this.timelineText = el("div", "debug-big", this.panel("Timeline"));
        this.playbackText = el("div", "debug-big", this.panel("Playback"));

        this.log = this.panel("User Properties", "debug-wide debug-log");
        this.lines = [];
    }

    panel(title, className = "") {
        const panel = el("div", `debug-panel ${className}`, this.container);
        el("div", "debug-title", panel).textContent = title;
        return el("div", "debug-content", panel);
    }

    track({ title, artist }) {
        this.title.textContent = title;
        this.artist.textContent = artist;
    }

    thumbnail(event) {
        this.thumbnailImage.src = event.thumbnail;
        for (const [key, swatch] of this.swatches) swatch.style.backgroundColor = event[key];
    }

    audio(analyzer) {
        this.pulse.style.opacity = Math.pow(analyzer.mean(0, analyzer.length), 0.3);
    }

    timeline(position, duration) {
        this.timelineText.textContent = `${formatDuration(position)} / ${formatDuration(duration)}`;
    }

    playback(state) {
        this.playbackText.textContent = state[0].toUpperCase() + state.slice(1);
    }

    userProperties(properties) {
        for (const [key, property] of Object.entries(properties)) this.lines.push(`${key}: ${property?.value}`);
        this.lines = this.lines.slice(-MAX_LOG_LINES);
        this.log.textContent = this.lines.join("\n");
        this.log.scrollTop = this.log.scrollHeight;
    }
}
