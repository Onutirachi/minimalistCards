import BaseCard from "../core/BaseCard.js";
import DomUtils from "../utils/domUtils.js";
import AudioUtils from "../utils/audioUtils.js";
import { BACKGROUND_DEFAULTS } from "../constants/appConfig.js";

export default class Background extends BaseCard {
    constructor() {
        super();

        this.container = DomUtils.createElement("div", ["background-container"]);
        this.image = DomUtils.createElement("div", ["background-image"]);
        this.filter = DomUtils.createElement("div", ["background-filter"]);

        this.innerImage = DomUtils.createElement("div", ["background-inner-image"]);
        this.customImageElement = DomUtils.createElement("div", ["background-custom-image"]);

        this.image.appendChild(this.innerImage);
        this.container.appendChild(this.image);
        this.container.appendChild(this.filter);
        this.container.appendChild(this.customImageElement);

        this.beatSensitivityDelta = BACKGROUND_DEFAULTS.beatSensitivity;

        this.image.style.animationName = "rotate";
        this.image.style.animationTimingFunction = "linear";
        this.image.style.animationIterationCount = "infinite";
        this.image.style.animationDuration = `${BACKGROUND_DEFAULTS.movementSpeed}s`;

        this.currentCustomImage = "";
    }

    updateThumbnail(event) {
        this.change(this.innerImage, {
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
        this.image.style.scale = beatScale;
        this.customImageElement.style.scale = beatScale;
    }

    beatSensitivity = (sensitivity) => {
        this.beatSensitivityDelta = parseFloat(sensitivity);
    };

    movementSpeed = (speed) => {
        this.image.style.animationDuration = 241 - parseFloat(speed) == 241 ? "0s" : `${241 - parseFloat(speed)}s`;
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
}
