import { el } from "../utils/dom.js";
import { formatDuration } from "../utils/time.js";

const MAX_LOG_LINES = 50;
const SWATCHES = ["primaryColor", "secondaryColor", "tertiaryColor", "textColor", "highContrastColor"];

/** Overlay with the raw Wallpaper Engine data. Enabled with `?debug` in the URL or the "Show debug info" setting. */
export default class Debug {
    constructor(parent) {
        this.container = el("div", "debug", parent);

        // The event log gets its own column on the left; its lines are long and carry the instance id of each monitor
        this.eventLog = this.panel(this.container, "Events (time, monitor id, event)", "debug-events debug-log");

        const grid = el("div", "debug-grid", this.container);

        const track = this.panel(grid, "Properties", "debug-track");
        this.title = el("div", "", track);
        this.artist = el("div", "", track);

        this.pulse = el("div", "debug-pulse", this.panel(grid, "Audio"));

        const thumbnail = this.panel(grid, "Thumbnail", "debug-wide debug-thumbnail");
        this.thumbnailImage = el("img", "debug-thumbnail-image", thumbnail);
        this.swatches = SWATCHES.map((key) => [key, el("div", "debug-swatch", thumbnail)]);

        this.timelineText = el("div", "debug-big", this.panel(grid, "Timeline"));
        this.playbackText = el("div", "debug-big", this.panel(grid, "Playback"));

        this.log = this.panel(grid, "User Properties", "debug-wide debug-tall debug-log");
        this.lines = [];
    }

    panel(parent, title, className = "") {
        const panel = el("div", `debug-panel ${className}`, parent);
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

    events(lines) {
        this.eventLog.textContent = lines.join("\n");
        this.eventLog.scrollTop = this.eventLog.scrollHeight;
    }

    userProperties(properties) {
        for (const [key, property] of Object.entries(properties)) this.lines.push(`${key}: ${property?.value}`);
        this.lines = this.lines.slice(-MAX_LOG_LINES);
        this.log.textContent = this.lines.join("\n");
        this.log.scrollTop = this.log.scrollHeight;
    }
}
