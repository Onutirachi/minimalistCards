// Wallpaper Engine sends typed values, but anything may arrive as a string (e.g. older saved settings).

export function toBool(value, fallback = false) {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return fallback;
}

export function toNumber(value, { min = -Infinity, max = Infinity, fallback = 0 } = {}) {
    const number = typeof value === "number" ? value : parseFloat(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
}

export function toText(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
}
