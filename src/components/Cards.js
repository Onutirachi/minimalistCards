import DomUtils from "../utils/domUtils.js";

export default class Cards {
    constructor() {
        this.container = DomUtils.createElement("div", ["cards"]);
    }

    horizontalPosition = (percentage) => {
        const appRect = this.container.parentElement.getBoundingClientRect();
        const x = ((parseFloat(percentage) ?? 50) / 100) * appRect.width;
        this.container.style.left = x + "px";
    };

    verticalPosition = (percentage) => {
        const appRect = this.container.parentElement.getBoundingClientRect();
        const y = ((parseFloat(percentage) ?? 50) / 100) * appRect.height;
        this.container.style.top = y + "px";
    };

    size = (scale) => {
        this.container.style.transform = `translate(-50%, -50%) scale(${scale ?? 1})`;
    };

    show = (boolean) => {
        if (boolean == "true" || boolean == true) {
            this.container.style.opacity = 1;
        }
        if (boolean == "false" || boolean == false) {
            this.container.style.opacity = 0;
        }
    };
}
