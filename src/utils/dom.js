export function el(tag, className = "", parent = null) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (parent) parent.appendChild(element);
    return element;
}
