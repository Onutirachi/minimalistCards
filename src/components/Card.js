import { el } from "../utils/dom.js";

/** Shared look and settings of the clock, track and date cards. Colors come from CSS variables set on `.cards`. */
export default class Card {
    constructor(parent, className) {
        this.container = el("div", `card ${className}`, parent);
        this.fontTargets = {};
        this.visible = true;
    }

    setVisible(visible) {
        this.visible = visible;
        this.container.hidden = !visible;
    }

    setBorderRadius(radius) {
        this.container.style.borderRadius = `${radius}px`;
    }

    setFont(target, family) {
        this.fontTargets[target].style.fontFamily = `"${family}", sans-serif`;
    }

    setFontWeight(target, weight) {
        this.fontTargets[target].style.fontWeight = weight;
    }
}
