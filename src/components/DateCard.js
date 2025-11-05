import BaseCard from "../core/BaseCard.js";
import DomUtils from "../utils/domUtils.js";
import TimeUtils from "../utils/timeUtils.js";

export default class DateCard extends BaseCard {
    constructor() {
        super();

        this.container = DomUtils.createElement("div", ["date-card-container"]);
        this.weekday = DomUtils.createElement("div", ["date-card-weekday"]);
        this.fullDate = DomUtils.createElement("div", ["date-card-full-date"]);

        this.container.appendChild(this.weekday);
        this.container.appendChild(this.fullDate);

        clearInterval(this.container.clockInterval);
        this.container.clockInterval = setInterval(() => {
            if (this.weekday.textContent != TimeUtils.getWeekdayLocalized()) {
                this.change(this.weekday, {
                    textContent: TimeUtils.getWeekdayLocalized(),
                });
            }
            if (this.fullDate.textContent != TimeUtils.getFullDateLocalized()) {
                this.change(this.fullDate, {
                    textContent: TimeUtils.getFullDateLocalized(),
                });
            }
        }, 1000);
    }

    updateColors(event) {
        this.container.style.color = event.textColor == "#000000" && event.primaryColor == "#000000" ? "#ffffff" : event.textColor;
        this.container.style.background = event.primaryColor == "#000000" ? "#111" : event.primaryColor;
    }

    show = (boolean) => {
        if (boolean == "true" || boolean == true) this.container.style.display = "flex";
        if (boolean == "false" || boolean == false) this.container.style.display = "none";
    };

    borderRadius = (radius) => {
        this.container.style.borderRadius = radius + "px";
    };

    weekdayFontFamily = (fontFamily) => {
        this.weekday.style.fontFamily = fontFamily;
    };

    weekdayFontWeight = (fontWeight) => {
        this.weekday.style.fontWeight = fontWeight;
    };

    fullDateFontFamily = (fontFamily) => {
        this.fullDate.style.fontFamily = fontFamily;
    };

    fullDateFontWeight = (fontWeight) => {
        this.fullDate.style.fontWeight = fontWeight;
    };
}
