import Card from "./Card.js";
import { el } from "../utils/dom.js";
import { crossFade } from "../core/transitions.js";
import { detectLocale, formatFullDate, formatWeekday } from "../utils/locale.js";

export default class DateCard extends Card {
    constructor(parent) {
        super(parent, "date-card");
        this.weekday = el("div", "date-card-weekday", this.container);
        this.fullDate = el("div", "date-card-full-date", this.container);
        this.fontTargets = { weekday: this.weekday, fullDate: this.fullDate };

        this.locale = detectLocale();
        this.day = "";
        this.tick();
    }

    /** Called every second; only formats when the day changes. */
    tick() {
        const now = new Date();
        const day = now.toDateString();
        if (day === this.day) return;

        const firstRender = this.day === "";
        this.day = day;
        this.setText(this.weekday, formatWeekday(now, this.locale), firstRender);
        this.setText(this.fullDate, formatFullDate(now, this.locale), firstRender);
    }

    setText(element, text, immediate) {
        if (element.textContent === text) return;
        if (immediate) element.textContent = text;
        else crossFade(element, () => (element.textContent = text));
    }
}
