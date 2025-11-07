import BaseCard from "../core/BaseCard.js";
import DomUtils from "../utils/domUtils.js";
import TimeUtils from "../utils/timeUtils.js";
import { CLOCK_CARD_DEFAULTS } from "../constants/appConfig.js";

export default class ClockCard extends BaseCard {
    constructor() {
        super();

        this.showSecondsBool = CLOCK_CARD_DEFAULTS.showSeconds;
        this.format12hBool = CLOCK_CARD_DEFAULTS.format12h;

        this.container = DomUtils.createElement("div", ["clock-card-container"]);
        this.container.textContent = TimeUtils.getTime(this.showSecondsBool, this.format12hBool);

        clearInterval(this.container.clockInterval);
        this.container.clockInterval = setInterval(() => {
            this.container.textContent = TimeUtils.getTime(this.showSecondsBool, this.format12hBool);
        }, 1000);
    }

    updateColors(event) {
        this.container.style.color = event.textColor;
        this.container.style.background = event.primaryColor;
    }

    show = (boolean) => {
        if (boolean == "true" || boolean == true) this.container.style.display = "flex";
        if (boolean == "false" || boolean == false) this.container.style.display = "none";
    };

    borderRadius = (radius) => {
        this.container.style.borderRadius = radius + "px";
    };

    fontFamily = (fontFamily) => {
        this.container.style.fontFamily = fontFamily;
    };

    fontWeight = (fontWeight) => {
        this.container.style.fontWeight = fontWeight;
    };

    showSeconds = (boolean = this.showSecondsBool) => {
        if (boolean == "true" || boolean == true) this.showSecondsBool = true;
        if (boolean == "false" || boolean == false) this.showSecondsBool = false;
    };

    format12h = (boolean = this.format12hBool) => {
        if (boolean == "true" || boolean == true) this.format12hBool = true;
        if (boolean == "false" || boolean == false) this.format12hBool = false;
    };
}
