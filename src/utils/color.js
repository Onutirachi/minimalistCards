/** Parses "#rgb", "#rrggbb", "#rrggbbaa" or "rgb()/rgba()" into [r, g, b] (0-255), or null. */
export function parseColor(color) {
    if (typeof color !== "string") return null;
    const value = color.trim();

    const hex = value.match(/^#([0-9a-f]+)$/i)?.[1];
    if (hex) {
        const full = hex.length === 3 || hex.length === 4 ? [...hex].map((c) => c + c).join("") : hex;
        if (full.length !== 6 && full.length !== 8) return null;
        return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    }

    const rgb = value.match(/^rgba?\(([^)]+)\)$/i)?.[1];
    if (rgb) {
        const parts = rgb.split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
        if (parts.length === 3 && parts.every(Number.isFinite)) return parts;
    }

    return null;
}

export function withAlpha(color, alpha) {
    const rgb = parseColor(color);
    return rgb ? `rgba(${rgb.join(", ")}, ${alpha})` : color;
}

export function toGlColor(color, fallback = [1, 1, 1]) {
    const rgb = parseColor(color);
    return rgb ? rgb.map((channel) => channel / 255) : fallback;
}
