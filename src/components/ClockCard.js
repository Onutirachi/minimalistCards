import Card from "./Card.js";
import { formatClock } from "../utils/time.js";

export default class ClockCard extends Card {
    constructor(parent) {
        super(parent, "clock-card");
        this.fontTargets = { time: this.container };
        this.showSeconds = true;
        this.format12h = false;
        this.tick();
    }

    /** Called by the render loop whenever the wall-clock second changes. */
    tick() {
        this.container.textContent = formatClock(new Date(), this);
    }

    setShowSeconds(showSeconds) {
        this.showSeconds = showSeconds;
        this.tick();
    }

    setFormat12h(format12h) {
        this.format12h = format12h;
        this.tick();
    }
}
