import { el } from "../utils/dom.js";
import { toCssColor, withAlpha } from "../utils/color.js";

/** Shared look and settings of the clock, track and date cards. Each card sets its own color variables. */
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

    setColors(background, text) {
        const style = this.container.style;
        style.setProperty("--card-background", toCssColor(background));
        style.setProperty("--card-text", toCssColor(text));
        style.setProperty("--card-text-muted", withAlpha(text, 0x50 / 255));
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
