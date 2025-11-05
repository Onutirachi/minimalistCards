export default class DomUtils {
    static createElement(tag, classes = [], styles = {}) {
        const element = document.createElement(tag);
        element.classList.add(...classes);
        Object.assign(element.style, styles);
        return element;
    }

    static applyChanges(element, changes) {
        Object.entries(changes).forEach(([key, value]) => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
                if (!element[key]) element[key] = {};
                this.applyChanges(element[key], value);
            } else {
                element[key] = value;
            }
        });
    }
}
