import Debug from "./components/Debug.js";
import Cards from "./components/Cards.js";
import Background from "./components/Background.js";
import AudioBars from "./components/AudioBars.js";
import ClockCard from "./components/ClockCard.js";
import TrackCard from "./components/TrackCard.js";
import DateCard from "./components/DateCard.js";

class MinimalistCards {
    constructor() {
        this.debug = new Debug();
        this.showDebug = false;
        this.debug.showDebug = this.showDebug;

        this.components = {};

        this.initializeComponents();
        this.setupEventListeners();

        this.propertiesMap = {
            cardsverticalposition: this.components.cards.verticalPosition,
            cardshorizontalposition: this.components.cards.horizontalPosition,
            cardssize: this.components.cards.size,

            clockcardshow: this.components.clockCard.show,
            clockcardborderradius: this.components.clockCard.borderRadius,
            clockcardfontfamily: this.components.clockCard.fontFamily,
            clockcardfontweight: this.components.clockCard.fontWeight,
            clockcardshowseconds: this.components.clockCard.showSeconds,
            clockcardformat12h: this.components.clockCard.format12h,

            trackcardshow: this.components.trackCard.show,
            trackcardborderradius: this.components.trackCard.borderRadius,
            trackcardtitlefontfamily: this.components.trackCard.titleFontFamily,
            trackcardtitlefontweight: this.components.trackCard.titleFontWeight,
            trackcardartitsfontfamily: this.components.trackCard.artistFontFamily,
            trackcardartitsfontweight: this.components.trackCard.artistFontWeight,
            trackcardshowbeats: this.components.trackCard.showBeats,
            trackcardshowbars: this.components.trackCard.showBars,
            trackcardshowtimeline: this.components.trackCard.showTimeline,

            audiobarsquantity: this.components.audioBars.quantity,
            audiobarsgap: this.components.audioBars.gap,
            audiobarsborderradius: this.components.audioBars.borderRadius,
            audiobarsopacity: this.components.audioBars.opacity,
            audiobarsshowpeakdots: this.components.audioBars.showPeakDots,
            audiobarspeakdotsborderradius: this.components.audioBars.peakDotsBorderRadius,
            audiobarspeakdotsopacity: this.components.audioBars.peakDotsOpacity,
            audiobarspeakdotsholdframes: this.components.audioBars.peakDotsHoldFrames,
            audiobarspeakdotsfallspeed: this.components.audioBars.peakDotsFallSpeed,
            audiobarspeakdotssize: this.components.audioBars.peakDotsSize,
            audiobarspeakdotsgap: this.components.audioBars.peakDotsGap,

            datecardshow: this.components.dateCard.show,
            datecardborderradius: this.components.dateCard.borderRadius,
            datecardweekdayfontfamily: this.components.dateCard.weekdayFontFamily,
            datecardweekdayfontweight: this.components.dateCard.weekdayFontWeight,
            datecardfulldatefontfamily: this.components.dateCard.fullDateFontFamily,
            datecardfulldatefontweight: this.components.dateCard.fullDateFontWeight,

            backgroundbeatsensitivity: this.components.background.beatSensitivity,
            backgroundmovementspeed: this.components.background.movementSpeed,
            backgroundcustomimage: this.components.background.customImage,
        };

        this.restoreUserProperties();
    }

    initializeComponents() {
        this.components.cards = new Cards();
        this.components.background = new Background();
        this.components.audioBars = new AudioBars();
        this.components.clockCard = new ClockCard();
        this.components.trackCard = new TrackCard();
        this.components.dateCard = new DateCard();

        this.components.cards.container.appendChild(this.components.clockCard.container);
        this.components.cards.container.appendChild(this.components.trackCard.container);
        this.components.cards.container.appendChild(this.components.dateCard.container);

        const app = document.getElementById("app");
        app.appendChild(this.components.background.container);

        if (this.showDebug) app.appendChild(this.debug.container);

        app.appendChild(this.components.cards.container);

        this.components.trackCard.audioBars.appendChild(this.components.audioBars.canvas);

        this.components.trackCard.initialize();
        this.components.audioBars.updateCanvasSize();
    }

    setupEventListeners() {
        window.wallpaperRegisterMediaPropertiesListener(this.handleWallpaperMediaProperties.bind(this));
        window.wallpaperRegisterMediaThumbnailListener(this.handleWallpaperMediaThumbnail.bind(this));
        window.wallpaperRegisterAudioListener(this.handleWallpaperAudio.bind(this));
        window.wallpaperRegisterMediaPlaybackListener(this.handleWallpaperMediaPlayback.bind(this));
        window.wallpaperRegisterMediaTimelineListener(this.handleWallpaperMediaTimeline.bind(this));
        window.wallpaperPropertyListener = {
            applyUserProperties: this.handleApplyUserProperties.bind(this),
        };
    }

    handleWallpaperMediaProperties(event) {
        this.debug.properties(event);

        requestAnimationFrame(() => {
            this.components.trackCard.updateTrack(event);
        });
    }

    handleWallpaperMediaThumbnail(event) {
        this.debug.thumbnail(event);
        requestAnimationFrame(() => {
            this.components.background.updateThumbnail(event);
            this.components.trackCard.updateThumbnail(event);
            this.components.background.updateColors(event);
            this.components.clockCard.updateColors(event);
            this.components.trackCard.updateColors(event);
            this.components.audioBars.updateColors(event);
            this.components.dateCard.updateColors(event);
        });
    }

    handleWallpaperAudio(audioArray) {
        this.debug.audio(audioArray);
        requestAnimationFrame(() => {
            this.components.audioBars.beat(audioArray);
            this.components.trackCard.beat(audioArray);
            this.components.background.beat(audioArray);
        });
    }

    handleWallpaperMediaTimeline(event) {
        this.debug.timeline(event);
        requestAnimationFrame(() => {
            this.components.trackCard.updateTimeline(event);
        });
    }

    handleWallpaperMediaPlayback(event) {
        this.debug.playback(event);
        requestAnimationFrame(() => {
            if (event.state == window.wallpaperMediaIntegration.PLAYBACK_PLAYING) {
                this.components.trackCard.open(true);
                this.components.trackCard.pauseTimeline(false);
            }

            if (event.state == window.wallpaperMediaIntegration.PLAYBACK_PAUSED) {
                this.components.trackCard.open(true);
                this.components.trackCard.pauseTimeline(true);
            }

            if (event.state == window.wallpaperMediaIntegration.PLAYBACK_STOPPED) {
                this.components.trackCard.open(false);
                this.components.trackCard.pauseTimeline(true);
            }
        });
    }

    handleApplyUserProperties(properties) {
        for (const key in properties) {
            const value = properties[key].value;

            const fn = this.propertiesMap[key];
            if (fn) fn(value);

            localStorage.setItem(key, value);
            this.debug.userProperties({ key, value });
        }
    }

    restoreUserProperties() {
        for (const key in this.propertiesMap) {
            //console.log(key);
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                this.propertiesMap[key](stored);
            }
        }
    }
}

new MinimalistCards();
