import { ANIMATION_DEFAULTS } from "../constants/appConfig.js";

export default class BaseCard {
    constructor() {
        this.animation = ANIMATION_DEFAULTS;
    }

    change(element, changes, animation = {}, removeAnimation = false) {
        console.log(element.classList[0], removeAnimation);
        const animationObject = { ...this.animation, ...animation };

        const halfDuration = animationObject.duration / 2;

        const reverseAnimation = {
            ...animationObject,
            duration: halfDuration,
            direction: "reverse",
        };
        const normalAnimation = {
            ...animationObject,
            duration: halfDuration,
        };

        this.animate(
            element,
            reverseAnimation,
            () => {
                this.apply(element, changes);
                this.animate(element, normalAnimation);
            },
            removeAnimation
        );
    }

    animate(element, animation = {}, callback = () => {}, removeAnimation = false) {
        const animationObject = { ...this.animation, direction: "normal", ...animation };
        const animationString = `${animationObject.name} ${animationObject.duration}ms ${animationObject.easing} ${animationObject.direction} forwards`;

        element.style.animation = "";
        element.offsetHeight;
        element.style.animation = animationString;
        clearTimeout(element.animationTimeout);

        element.animationTimeout = setTimeout(() => {
            callback();
            if (removeAnimation) {
                setTimeout(() => {
                    element.style.animation = "";
                }, animationObject.duration);
            }
        }, animationObject.duration);
    }

    apply(element, changes) {
        Object.keys(changes).forEach((key) => {
            const value = changes[key];

            if (value && typeof value === "object" && !Array.isArray(value)) {
                // se não existe no element, cria
                if (!element[key]) element[key] = {};
                // chama recursivamente
                this.apply(element[key], value);
            } else {
                element[key] = value;
            }
        });
    }
}
