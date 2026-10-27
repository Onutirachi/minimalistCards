import { el } from "../utils/dom.js";

/** Positions and scales the column of cards. */
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

    show() {
        requestAnimationFrame(() => this.container.classList.add("is-visible"));
    }
}
