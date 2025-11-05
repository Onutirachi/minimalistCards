import BaseCard from "../core/BaseCard.js";
import DomUtils from "../utils/domUtils.js";
import AudioUtils from "../utils/audioUtils.js";

export default class TrackCard extends BaseCard {
    constructor() {
        super();

        this.container = DomUtils.createElement("div", ["track-card-container"]);
        this.content = DomUtils.createElement("div", ["track-card-content"]);

        this.trackInfo = DomUtils.createElement("div", ["track-card-track-info"]);
        this.cover = DomUtils.createElement("div", ["track-card-cover"]);
        this.title = DomUtils.createElement("div", ["track-card-title"]);
        this.artist = DomUtils.createElement("div", ["track-card-artist"]);

        this.beats = DomUtils.createElement("div", ["track-card-beats"]);
        this.beatBass = DomUtils.createElement("div", ["track-card-beat-bass"]);
        this.beatMedium = DomUtils.createElement("div", ["track-card-beat-medium"]);
        this.beatTreble = DomUtils.createElement("div", ["track-card-beat-treble"]);

        this.audioBars = DomUtils.createElement("div", ["track-card-audio-bars"]);

        this.timeline = DomUtils.createElement("div", ["track-card-timeline"]);
        this.timelineBar = DomUtils.createElement("div", ["track-card-timeline-bar"]);
        this.timelineBarProgress = DomUtils.createElement("div", ["track-card-timeline-bar-progress"]);
        this.timelineCurrentTime = DomUtils.createElement("div", ["track-card-timeline-current-time"]);
        this.timelineTotalTime = DomUtils.createElement("div", ["track-card-timeline-total-time"]);

        this.beats.appendChild(this.beatBass);
        this.beats.appendChild(this.beatMedium);
        this.beats.appendChild(this.beatTreble);

        this.timeline.appendChild(this.timelineCurrentTime);
        this.timelineBar.appendChild(this.timelineBarProgress);
        this.timeline.appendChild(this.timelineBar);
        this.timeline.appendChild(this.timelineTotalTime);

        this.trackInfo.appendChild(this.title);
        this.trackInfo.appendChild(this.artist);

        this.content.appendChild(this.trackInfo);
        this.content.appendChild(this.beats);
        this.content.appendChild(this.audioBars);
        this.content.appendChild(this.timeline);

        this.container.appendChild(this.cover);
        this.container.appendChild(this.content);

        this.height = 0;

        this.isOpened = false;

        this.currentTimelineDuration = 0;
        this.currentTimelineProgress = 0;

        this.timelinePaused = true;
    }

    initialize() {
        this.timelineCurrentTime.textContent = "00:00";
        this.timelineTotalTime.textContent = "00:00";
        this.height = this.container.clientHeight;
        this.container.style.maxHeight = "0px";
        this.container.style.opacity = "0";
        this.container.style.margin = "0px";
    }

    fitText(el) {
        if (el.childNodes.length > 1) {
            el.childNodes[1].remove();
        }

        const containerWidth = el.clientWidth;
        const textWidth = el.scrollWidth;

        if (textWidth <= containerWidth) return;

        const div1 = DomUtils.createElement("div");
        const div2 = DomUtils.createElement("div");

        const text = el.textContent;
        div1.textContent = text;
        div2.textContent = text;

        el.textContent = "";
        el.appendChild(div1);
        el.appendChild(div2);

        div1.style.marginRight = "80px";
        div2.style.marginRight = "80px";

        div1.style.display = "inline-block";
        div2.style.display = "inline-block";

        const rotationAnimation = [{ transform: "translateX(0)" }, { transform: `translateX(-${div1.offsetWidth + 80}px)` }];
        const animationProps = { duration: (div1.offsetWidth / 50) * 1000, iterations: Infinity, easing: "linear" };

        div1.animate(rotationAnimation, animationProps);
        div2.animate(rotationAnimation, animationProps);
    }

    beat(audioArray) {
        const monoArray = AudioUtils.makeMono(audioArray);
        const bass = AudioUtils.getRangeMean(monoArray, 0, 20);
        const medium = AudioUtils.getRangeMean(monoArray, 20, 40);
        const treble = AudioUtils.getRangeMean(monoArray, 40, 64);

        this.beatBass.style.scale = Math.min(0.5 + bass * 3, 1);
        this.beatMedium.style.scale = Math.min(0.5 + medium * 2, 1);
        this.beatTreble.style.scale = Math.min(0.5 + treble * 1.5, 1);
    }

    open(boolean) {
        if (boolean == "true" || boolean == true) {
            if (this.isOpened) return;
            this.isOpened = true;
            this.container.style.maxHeight = this.height + "px";
            this.container.style.margin = "10px";

            this.container.showTimeout = setTimeout(() => {
                this.animate(this.container, this.animation, () => {});
            }, this.animation.duration);
        }
        if (boolean == "true" || boolean == false) {
            if (!this.isOpened) return;
            this.isOpened = false;
            this.animate(this.container, { ...this.animation, direction: "reverse" }, () => {
                this.container.style.maxHeight = "0px";
                this.container.style.margin = "0px";
            });
        }
    }

    updateTrack(event) {
        if (!this.isOpened) this.open(true);
        this.change(this.title, {
            textContent: event.title,
            style: {
                color: event.textColor,
            },
        });

        this.change(this.artist, {
            textContent: event.artist,
            style: {
                color: event.textColor,
            },
        });

        setTimeout(() => {
            this.fitText(this.title);
            this.fitText(this.artist);
        }, 520);
    }

    updateColors(event) {
        this.container.style.backgroundColor = event.primaryColor;
        this.title.style.color = event.textColor;
        this.artist.style.color = event.textColor;
        this.beatBass.style.backgroundColor = event.textColor;
        this.beatMedium.style.backgroundColor = event.textColor;
        this.beatTreble.style.backgroundColor = event.textColor;
        this.timelineBar.style.backgroundColor = event.textColor + "50";
        this.timelineBarProgress.style.backgroundColor = event.textColor;
        this.timelineCurrentTime.style.color = event.textColor;
        this.timelineTotalTime.style.color = event.textColor;
    }

    updateThumbnail(event) {
        this.change(this.cover, {
            style: {
                backgroundImage: `url(${event.thumbnail})`,
            },
        });
    }

    updateTimeline(event) {
        const formatTime = (s) => {
            const m = Math.floor(s / 60)
                .toString()
                .padStart(2, "0");
            const sec = Math.floor(s % 60)
                .toString()
                .padStart(2, "0");
            return `${m}:${sec}`;
        };

        // Cancela animação anterior se existir
        if (this.timelineAnimationFrame) {
            cancelAnimationFrame(this.timelineAnimationFrame);
        }

        // Se é a primeira vez ou houve salto grande, sincroniza direto
        if (this.currentTimelineProgress === undefined || Math.abs(event.position - this.currentTimelineProgress) > 2) {
            this.currentTimelineProgress = event.position;
        } else {
            // Se a diferença é pequena (1-2s), ajusta suavemente
            const diff = event.position - this.currentTimelineProgress;
            this.currentTimelineProgress += diff * 0.5;
        }

        const duration = event.duration;
        this.timelineDuration = duration;
        let lastTime = performance.now();

        const animate = (currentTime) => {
            // Se está pausado, não anima mas continua o loop
            if (this.timelinePaused) {
                lastTime = currentTime; // atualiza lastTime para evitar salto ao resumir
                this.timelineAnimationFrame = requestAnimationFrame(animate);
                return;
            }

            const elapsed = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Incrementa a posição em tempo real
            this.currentTimelineProgress += elapsed;

            // Limita para não ultrapassar a duração
            if (this.currentTimelineProgress > duration) {
                this.currentTimelineProgress = duration;
            }

            // Atualiza visualmente
            const progressPercent = Math.floor((this.currentTimelineProgress * 100) / duration);
            this.timelineBarProgress.style.maxWidth = progressPercent + "%";
            this.timelineCurrentTime.textContent = formatTime(this.currentTimelineProgress);
            this.timelineTotalTime.textContent = formatTime(duration);

            // Continua animando
            this.timelineAnimationFrame = requestAnimationFrame(animate);
        };

        this.timelineAnimationFrame = requestAnimationFrame(animate);
    }

    pauseTimeline(boolean) {
        if (boolean == "true" || boolean == true) {
            this.timelinePaused = true;
        }
        if (boolean == "false" || boolean == false) {
            this.timelinePaused = false;
        }
    }

    show = (boolean) => {
        if (boolean == "true" || boolean == true) this.container.style.display = "flex";
        if (boolean == "false" || boolean == false) this.container.style.display = "none";
    };

    borderRadius = (radius) => {
        this.container.style.borderRadius = radius + "px";
    };

    titleFontFamily = (fontFamily) => {
        this.title.style.fontFamily = fontFamily;
    };

    titleFontWeight = (fontWeight) => {
        this.title.style.fontWeight = fontWeight;
    };

    artistFontFamily = (fontFamily) => {
        this.artist.style.fontFamily = fontFamily;
    };

    artistFontWeight = (fontWeight) => {
        this.artist.style.fontWeight = fontWeight;
    };

    showBeats = (boolean) => {
        if (boolean == "true" || boolean == true) this.beats.style.display = "flex";
        if (boolean == "false" || boolean == false) this.beats.style.display = "none";
    };

    showBars = (boolean) => {
        if (boolean == "true" || boolean == true) this.audioBars.style.display = "flex";
        if (boolean == "false" || boolean == false) this.audioBars.style.display = "none";
    };

    showTimeline = (boolean) => {
        if (boolean == "true" || boolean == true) this.timeline.style.display = "flex";
        if (boolean == "false" || boolean == false) this.timeline.style.display = "none";
    };
}
