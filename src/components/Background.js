import BaseCard from "../core/BaseCard.js";
import DomUtils from "../utils/domUtils.js";
import AudioUtils from "../utils/audioUtils.js";
import { BACKGROUND_DEFAULTS } from "../constants/appConfig.js";

export default class Background extends BaseCard {
    constructor() {
        super();

        this.container = DomUtils.createElement("div", ["background-container"]);

        this.image = DomUtils.createElement("div", ["background-image"]);
        this.thumbnailContainer = DomUtils.createElement("div", ["background-thumbnail-container"]);
        this.thumbnail = DomUtils.createElement("div", ["background-thumbnail"]);
        this.filter = DomUtils.createElement("div", ["background-filter"]);

        this.customImageContainer = DomUtils.createElement("div", ["background-thumbnail-container"]);
        this.customImageElement = DomUtils.createElement("div", ["background-custom-image"]);

        this.thumbnailContainer.appendChild(this.thumbnail);
        this.image.appendChild(this.thumbnailContainer);
        this.image.appendChild(this.filter);

        this.customImageContainer.appendChild(this.customImageElement);
        this.container.appendChild(this.image);
        this.container.appendChild(this.customImageContainer);

        this.beatSensitivityDelta = BACKGROUND_DEFAULTS.beatSensitivity;

        this.thumbnailContainer.style.animationName = "rotate";
        this.thumbnailContainer.style.animationTimingFunction = "linear";
        this.thumbnailContainer.style.animationIterationCount = "infinite";
        this.thumbnailContainer.style.animationDuration = `${BACKGROUND_DEFAULTS.movementSpeed}s`;

        this.currentCustomImage = "";
    }

    updateThumbnail(event) {
        this.change(this.thumbnail, {
            style: {
                backgroundImage: `url(${event.thumbnail})`,
            },
        });
    }

    updateColors(event) {
        this.filter.style.backgroundColor = `${event.primaryColor}CC`;
    }

    beat(audioArray) {
        const monoArray = AudioUtils.makeMono(audioArray);
        const bass = AudioUtils.getRangeMean(monoArray, 0, 20);
        const beatScale = bass * this.beatSensitivityDelta + 1;
        this.thumbnail.style.scale = beatScale;
        this.customImageElement.style.scale = beatScale;
    }

    beatSensitivity = (sensitivity) => {
        this.beatSensitivityDelta = parseFloat(sensitivity);
    };

    movementSpeed = (speed) => {
        this.thumbnail.style.animationDuration = 241 - parseFloat(speed) == 241 ? "0s" : `${241 - parseFloat(speed)}s`;
    };

    customImage = (imagePath) => {
        if (imagePath !== this.currentCustomImage) {
            this.change(this.customImageElement, {
                style: {
                    backgroundImage: "url('file:///" + imagePath + "')",
                },
            });
            this.currentCustomImage = imagePath;
        }
    };

    customImageOpacity = (opacity) => {
        this.customImageContainer.style.opacity = opacity;
        //this.filter.style.opacity = opacity;
    };
}
