import { FALLBACK_COLORS } from "../config.js";

/**
 * Parses "#rgb", "#rrggbb", "#rrggbbaa", "rgb()/rgba()" or Wallpaper Engine's "r g b" (0-1 floats)
 * into [r, g, b] (0-255), or null.
 */
export function parseColor(color) {
    if (typeof color !== "string") return null;
    const value = color.trim();

    const floats = value.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/);
    if (floats) {
        const parts = floats.slice(1).map(Number);
        if (parts.every((part) => Number.isFinite(part) && part <= 1)) return parts.map((part) => Math.round(part * 255));
        return null;
    }

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

/** Any color parseColor understands, as a CSS color. */
export function toCssColor(color, fallback = "#000000") {
    const rgb = parseColor(color);
    return rgb ? `rgb(${rgb.join(", ")})` : fallback;
}

export function toGlColor(color, fallback = [1, 1, 1]) {
    const rgb = parseColor(color);
    return rgb ? rgb.map((channel) => channel / 255) : fallback;
}

// Color sources a user can pick for a background layer; anything else means the custom color
const ALBUM_COLORS = {
    primary: ["primaryColor", FALLBACK_COLORS.primary],
    secondary: ["secondaryColor", FALLBACK_COLORS.primary],
    tertiary: ["tertiaryColor", FALLBACK_COLORS.primary],
    text: ["textColor", FALLBACK_COLORS.text],
    highcontrast: ["highContrastColor", FALLBACK_COLORS.text],
};

/** Resolves a color source ("custom" or an album color name) against the current cover's colors (may be null). */
export function pickColor(source, customColor, album) {
    const entry = ALBUM_COLORS[source];
    if (!entry) return customColor;

    const [key, fallback] = entry;
    return parseColor(album?.[key]) ? album[key] : fallback;
}

export function isAlbumColor(source) {
    return source in ALBUM_COLORS;
}

/** Raises the HSL lightness (0-1) of `color` to at least `min`, keeping hue and saturation. */
export function withMinLightness(color, min) {
    const rgb = parseColor(color);
    if (!rgb) return color;

    const [h, s, l] = rgbToHsl(rgb);
    if (l >= min) return color;
    return `rgb(${hslToRgb(h, s, min).join(", ")})`;
}

function rgbToHsl([r, g, b]) {
    [r, g, b] = [r / 255, g / 255, b / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [0, 0, l];

    const s = d / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map((channel) => Math.round((channel + m) * 255));
}
