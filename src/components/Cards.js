import { el } from "../utils/dom.js";
import { withAlpha } from "../utils/color.js";

/** Positions, scales and colors the column of cards. */
export default class Cards {
    constructor(parent) {
        this.container = el("div", "cards", parent);
    }

    // Percentages, so the position survives resolution changes
    setPosition(axis, percent) {
        this.container.style[axis === "x" ? "left" : "top"] = `${percent}%`;
    }

    setScale(scale) {
        this.container.style.setProperty("--cards-scale", scale);
    }

    setColors({ primaryColor, textColor }) {
        this.container.style.setProperty("--card-background", primaryColor);
        this.container.style.setProperty("--card-text", textColor);
        this.container.style.setProperty("--card-text-muted", withAlpha(textColor, 0x50 / 255));
    }

    show() {
        requestAnimationFrame(() => this.container.classList.add("is-visible"));
    }
}
