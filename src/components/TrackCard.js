import Card from "./Card.js";
import TimelineClock from "../media/TimelineClock.js";
import { FADE_DURATION } from "../config.js";
import { el } from "../utils/dom.js";
import { formatDuration } from "../utils/time.js";
import { setMarqueeText } from "../utils/marquee.js";
import { crossFade, fade, wait } from "../core/transitions.js";

export default class TrackCard extends Card {
    constructor(parent) {
        super(parent, "track-card");

        this.cover = el("div", "track-card-cover", this.container);
        const content = el("div", "track-card-content", this.container);

        const info = el("div", "track-card-info", content);
        this.title = el("div", "track-card-title", info);
        this.artist = el("div", "track-card-artist", info);

        this.beats = el("div", "track-card-beats", content);
        this.beatBlocks = [0, 1, 2].map(() => el("div", "track-card-beat", this.beats));

        this.audioBarsSlot = el("div", "track-card-audio-bars", content);

        this.timeline = el("div", "track-card-timeline", content);
        this.currentTime = el("div", "track-card-time", this.timeline);
        const progressBar = el("div", "track-card-progress", this.timeline);
        this.progress = el("div", "track-card-progress-fill", progressBar);
        this.totalTime = el("div", "track-card-time", this.timeline);

        this.fontTargets = { title: this.title, artist: this.artist };
        this.texts = { title: "If you're reading this,", artist: "reopen your music app." };
        this.title.textContent = this.texts.title;
        this.artist.textContent = this.texts.artist;
        this.currentTime.textContent = this.totalTime.textContent = "00:00";

        this.clock = new TimelineClock();
        this.renderedSecond = -1;
        this.renderedDuration = -1;
        this.renderedProgress = -1;

        this.isOpen = false;
        this.openToken = 0;
    }

    get barsVisible() {
        return this.visible && this.isOpen && !this.audioBarsSlot.hidden;
    }

    async open() {
        if (this.isOpen) return;
        this.isOpen = true;
        const token = ++this.openToken;

        // Expand first (CSS transition), then fade the content in
        this.container.classList.add("is-open");
        await wait(FADE_DURATION);
        if (token === this.openToken) fade(this.container, true);
    }

    async close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        const token = ++this.openToken;

        await fade(this.container, false);
        if (token === this.openToken) this.container.classList.remove("is-open");
    }

    setTrack({ title, artist }) {
        this.texts = { title, artist };
        crossFade(this.title, () => setMarqueeText(this.title, title));
        crossFade(this.artist, () => setMarqueeText(this.artist, artist));
    }

    /** Re-measures the texts; needed whenever fonts or visibility change their width. */
    refitText() {
        setMarqueeText(this.title, this.texts.title);
        setMarqueeText(this.artist, this.texts.artist);
    }

    setCover(url) {
        crossFade(this.cover, () => (this.cover.style.backgroundImage = `url("${url}")`));
    }

    setBeats({ bass, mid, treble }) {
        if (!this.isOpen || this.beats.hidden) return;
        this.beatBlocks[0].style.scale = Math.min(0.5 + bass * 3, 1);
        this.beatBlocks[1].style.scale = Math.min(0.5 + mid * 2, 1);
        this.beatBlocks[2].style.scale = Math.min(0.5 + treble * 1.5, 1);
    }

    syncTimeline(position, duration, now) {
        this.clock.sync(position, duration, now);
    }

    setPlaying(playing, now) {
        this.clock.setPlaying(playing, now);
    }

    /** Called every frame by the render loop. */
    updateTimeline(now, dt) {
        const position = this.clock.update(now, dt);
        if (!this.isOpen || this.timeline.hidden) return;

        const progress = this.clock.progress;
        if (progress !== this.renderedProgress) {
            this.renderedProgress = progress;
            this.progress.style.transform = `translateX(${(progress - 1) * 100}%)`;
        }

        const second = Math.floor(position);
        if (second !== this.renderedSecond) {
            this.renderedSecond = second;
            this.currentTime.textContent = formatDuration(position);
        }

        if (this.clock.duration !== this.renderedDuration) {
            this.renderedDuration = this.clock.duration;
            this.totalTime.textContent = formatDuration(this.clock.duration);
        }
    }

    setVisible(visible) {
        super.setVisible(visible);
        if (visible) this.refitText();
    }

    setFont(target, family) {
        super.setFont(target, family);
        this.refitText();
    }

    setFontWeight(target, weight) {
        super.setFontWeight(target, weight);
        this.refitText();
    }

    setShowBeats(show) {
        this.beats.hidden = !show;
    }

    setShowBars(show) {
        this.audioBarsSlot.hidden = !show;
    }

    setShowTimeline(show) {
        this.timeline.hidden = !show;
    }
}
