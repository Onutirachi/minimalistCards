import { MARQUEE } from "../config.js";
import { el } from "./dom.js";

/** Sets the text and, when it overflows the element, turns it into a seamless scrolling loop. */
export function setMarqueeText(element, text) {
    element.textContent = text;
    if (element.scrollWidth <= element.clientWidth) return;

    element.textContent = "";
    const copies = [el("span", "marquee-item", element), el("span", "marquee-item", element)];
    for (const copy of copies) {
        copy.textContent = text;
        copy.style.marginRight = `${MARQUEE.gap}px`;
    }

    const textWidth = copies[0].offsetWidth;
    const keyframes = [{ transform: "translateX(0)" }, { transform: `translateX(-${textWidth + MARQUEE.gap}px)` }];
    const timing = { duration: (textWidth / MARQUEE.speed) * 1000, iterations: Infinity, easing: "linear" };
    for (const copy of copies) copy.animate(keyframes, timing);
}
