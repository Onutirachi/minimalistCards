import DomUtils from "../utils/domUtils.js";
import AudioUtils from "../utils/audioUtils.js";

export default class Debug {
    constructor() {
        this.container = DomUtils.createElement("div", ["debug"]);

        this.propertiesContainer = DomUtils.createElement("div", ["debug-container", "debug-properties-container"]);
        this.thumbnailContainer = DomUtils.createElement("div", ["debug-container", "debug-thumbnail-container"]);
        this.audioContainer = DomUtils.createElement("div", ["debug-container", "debug-audio-container"]);
        this.timelineContainer = DomUtils.createElement("div", ["debug-container", "debug-timeline-container"]);
        this.playbackContainer = DomUtils.createElement("div", ["debug-container", "debug-playback-container"]);
        this.userPropertiesContainer = DomUtils.createElement("div", ["debug-container", "debug-user-properties-container"]);

        this.applyTitle(this.propertiesContainer, "Properties");
        this.applyTitle(this.thumbnailContainer, "Thumbnail");
        this.applyTitle(this.audioContainer, "Audio");
        this.applyTitle(this.timelineContainer, "Timeline");
        this.applyTitle(this.playbackContainer, "Playback");
        this.applyTitle(this.userPropertiesContainer, "User Properties");

        this.propertiesContent = DomUtils.createElement("div", ["debug-content", "debug-properties-content"]);
        this.thumbnailContent = DomUtils.createElement("div", ["debug-content", "debug-thumbnail-content"]);
        this.audioContent = DomUtils.createElement("div", ["debug-content", "debug-audio-content"]);
        this.timelineContent = DomUtils.createElement("div", ["debug-content", "debug-timeline-content"]);
        this.playbackContent = DomUtils.createElement("div", ["debug-content", "debug-playback-content"]);
        this.userPropertiesContent = DomUtils.createElement("div", ["debug-content", "debug-user-properties-content"]);

        this.propertiesContainer.appendChild(this.propertiesContent);
        this.thumbnailContainer.appendChild(this.thumbnailContent);
        this.audioContainer.appendChild(this.audioContent);
        this.timelineContainer.appendChild(this.timelineContent);
        this.playbackContainer.appendChild(this.playbackContent);
        this.userPropertiesContainer.appendChild(this.userPropertiesContent);

        this.container.appendChild(this.propertiesContainer);
        this.container.appendChild(this.audioContainer);
        this.container.appendChild(this.thumbnailContainer);

        this.container.appendChild(this.timelineContainer);
        this.container.appendChild(this.playbackContainer);
        this.container.appendChild(this.userPropertiesContainer);

        this.initPropertiesElements();
        this.initAudioElements();
        this.initThumbnailElements();
        this.initTimelineElements();
        this.initPlaybackElements();
        this.initUserPropertiesElements();
    }

    initPropertiesElements() {
        this.propertiesTitle = DomUtils.createElement("div", ["debug-properties-title"]);
        this.propertiesArtist = DomUtils.createElement("div", ["debug-properties-artist"]);

        this.propertiesContent.append(this.propertiesTitle, this.propertiesArtist);
    }

    initAudioElements() {
        this.audioPulse = DomUtils.createElement("div", ["debug-audio-pulse"]);

        this.audioContent.appendChild(this.audioPulse);
    }

    initThumbnailElements() {
        this.thumbnailThumbnail = DomUtils.createElement("img", ["debug-thumbnail-thumbnail"]);
        this.thumbnailPrimaryColor = DomUtils.createElement("div", ["debug-thumbnail-color"]);
        this.thumbnailSecondaryColor = DomUtils.createElement("div", ["debug-thumbnail-color"]);
        this.thumbnailTertiaryColor = DomUtils.createElement("div", ["debug-thumbnail-color"]);
        this.thumbnailTextColor = DomUtils.createElement("div", ["debug-thumbnail-color"]);
        this.thumbnailHighContrastColor = DomUtils.createElement("div", ["debug-thumbnail-color"]);

        this.thumbnailContent.append(this.thumbnailThumbnail, this.thumbnailPrimaryColor, this.thumbnailSecondaryColor, this.thumbnailTertiaryColor, this.thumbnailTextColor, this.thumbnailHighContrastColor);
    }

    initTimelineElements() {}

    initPlaybackElements() {}

    initUserPropertiesElements() {}

    applyTitle(el, title) {
        const titleElement = DomUtils.createElement("div", ["debug-title"]);
        titleElement.innerText = title;
        el.appendChild(titleElement);
    }

    properties(event) {
        this.debug(() => {
            this.propertiesTitle.innerText = event.title;
            this.propertiesArtist.innerText = event.artist;
        });
    }

    thumbnail(event) {
        this.debug(() => {
            this.thumbnailThumbnail.src = event.thumbnail;
            this.thumbnailPrimaryColor.style.backgroundColor = event.primaryColor;
            this.thumbnailSecondaryColor.style.backgroundColor = event.secondaryColor;
            this.thumbnailTertiaryColor.style.backgroundColor = event.tertiaryColor;
            this.thumbnailTextColor.style.backgroundColor = event.textColor;
            this.thumbnailHighContrastColor.style.backgroundColor = event.highContrastColor;
        });
    }

    audio(audioArray) {
        this.debug(() => {
            const audioMean = Math.min(AudioUtils.getRangeMean(audioArray, 0, audioArray.length));
            const easing = Math.pow(audioMean, 0.3);
            this.audioPulse.style.opacity = easing;
        });
    }

    timeline(event) {
        this.debug(() => {
            const formatTime = (s) => {
                const m = Math.floor(s / 60)
                    .toString()
                    .padStart(2, "0");
                const sec = Math.floor(s % 60)
                    .toString()
                    .padStart(2, "0");
                return `${m}:${sec}`;
            };
            const text = `${formatTime(event.position)} / ${formatTime(event.duration)}`;
            this.timelineContent.innerText = text;
        });
    }

    playback(event) {
        this.debug(() => {
            var state = "";
            if (event.state == window.wallpaperMediaIntegration.PLAYBACK_PLAYING) {
                state = "Playing";
            }

            if (event.state == window.wallpaperMediaIntegration.PLAYBACK_PAUSED) {
                state = "Paused";
            }

            if (event.state == window.wallpaperMediaIntegration.PLAYBACK_STOPPED) {
                state = "Stopped";
            }

            this.playbackContent.innerText = state;
        });
    }

    userProperties(event) {
        this.debug(() => {
            const text = `${event.key}: ${event.value}\n`;
            this.userPropertiesContent.innerText += text;
        });
        this.userPropertiesContent.scrollTo(0, this.userPropertiesContent.scrollHeight);
    }

    debug(callback) {
        if (this.showDebug) callback();
    }
}
