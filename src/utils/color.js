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

// The album colors a user can pick, by setting value
const ALBUM_COLOR_KEYS = {
    primary: "primaryColor",
    secondary: "secondaryColor",
    tertiary: "tertiaryColor",
    text: "textColor",
    highcontrast: "highContrastColor",
};

/** The requested color of the current cover (a thumbnail event), or null when there is none. */
export function albumColor(source, album) {
    const color = album?.[ALBUM_COLOR_KEYS[source]];
    return parseColor(color) ? color : null;
}

/**
 * The color of a colored element (a card, the base color, the triangles): the user's `color`, replaced by the
 * `album` color while album colors are active (`albumColors` is null otherwise), unless `keep` is on.
 */
export function layerColor({ color, album, keep }, albumColors) {
    const fromAlbum = keep ? null : albumColor(album, albumColors);
    return fromAlbum ? { color: fromAlbum, fromAlbum: true } : { color, fromAlbum: false };
}

/** A card's text color: "auto" (best contrast with `background`), "custom" (`color`) or "album" (falls back to auto). */
export function textColor({ mode, color, album }, background, albumColors) {
    if (mode === "custom" && parseColor(color)) return color;
    if (mode === "album") {
        const fromAlbum = albumColor(album, albumColors);
        if (fromAlbum) return fromAlbum;
    }
    return contrastColor(background);
}

/** Black or white, whichever has the higher WCAG contrast with `background`. */
export function contrastColor(background) {
    const rgb = parseColor(background) ?? [0, 0, 0];
    const [r, g, b] = rgb.map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Contrast with black is (L + 0.05) / 0.05, with white 1.05 / (L + 0.05); they are equal at L ≈ 0.179
    return luminance > 0.179 ? "#000000" : "#ffffff";
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
