import { toBool, toNumber, toText } from "../utils/parse.js";
import { parseColor } from "../utils/color.js";

const bool = (fallback) => ({ fallback, parse: (value) => toBool(value, fallback) });
const number = (fallback, min, max) => ({ fallback, min, max, parse: (value) => toNumber(value, { min, max, fallback }) });
const text = (fallback) => ({ fallback, parse: (value) => toText(value, fallback) });
const color = (fallback) => ({ fallback, parse: (value) => (parseColor(value) ? value : fallback) });

/**
 * Every user property from project.json: default, parser and how it is applied to the UI.
 * Keys must match project.json exactly (including the legacy "artits" typo), otherwise users lose saved settings.
 * tests/settings.test.js keeps defaults and ranges in sync with project.json.
 */
export const SETTINGS = {
    cardssize: { ...number(1, 0.1, 5), apply: (ui, v) => ui.setCardsScale(v) },
    cardshorizontalposition: { ...number(50, 0, 100), apply: (ui, v) => ui.cards.setPosition("x", v) },
    cardsverticalposition: { ...number(50, 0, 100), apply: (ui, v) => ui.cards.setPosition("y", v) },

    clockcardshow: { ...bool(true), apply: (ui, v) => ui.clockCard.setVisible(v) },
    clockcardshowseconds: { ...bool(true), apply: (ui, v) => ui.clockCard.setShowSeconds(v) },
    clockcardformat12h: { ...bool(false), apply: (ui, v) => ui.clockCard.setFormat12h(v) },
    clockcardborderradius: { ...number(10, 0, 40), apply: (ui, v) => ui.clockCard.setBorderRadius(v) },
    clockcardfontfamily: { ...text("Unageo"), apply: (ui, v) => ui.clockCard.setFont("time", v) },
    clockcardfontweight: { ...number(600, 100, 900), apply: (ui, v) => ui.clockCard.setFontWeight("time", v) },

    trackcardshow: { ...bool(true), apply: (ui, v) => ui.setTrackCardVisible(v) },
    trackcardborderradius: { ...number(10, 0, 40), apply: (ui, v) => ui.trackCard.setBorderRadius(v) },
    trackcardtitlefontfamily: { ...text("Unageo"), apply: (ui, v) => ui.trackCard.setFont("title", v) },
    trackcardtitlefontweight: { ...number(600, 100, 900), apply: (ui, v) => ui.trackCard.setFontWeight("title", v) },
    trackcardartitsfontfamily: { ...text("Unageo"), apply: (ui, v) => ui.trackCard.setFont("artist", v) },
    trackcardartitsfontweight: { ...number(300, 100, 900), apply: (ui, v) => ui.trackCard.setFontWeight("artist", v) },
    trackcardshowbeats: { ...bool(true), apply: (ui, v) => ui.trackCard.setShowBeats(v) },
    trackcardshowbars: { ...bool(true), apply: (ui, v) => ui.setShowBars(v) },
    trackcardshowtimeline: { ...bool(true), apply: (ui, v) => ui.trackCard.setShowTimeline(v) },

    audiobarsquantity: { ...number(40, 9, 64), apply: (ui, v) => ui.audioBars.configure({ quantity: Math.round(v) }) },
    audiobarsgap: { ...number(4, 0, 10), apply: (ui, v) => ui.audioBars.configure({ gap: v }) },
    audiobarsborderradius: { ...number(60, 0, 100), apply: (ui, v) => ui.audioBars.configure({ borderRadius: v }) },
    audiobarsopacity: { ...number(100, 10, 100), apply: (ui, v) => ui.audioBars.configure({ opacity: v }) },
    audiobarsshowpeakdots: { ...bool(true), apply: (ui, v) => ui.audioBars.configure({ showPeakDots: v }) },
    audiobarspeakdotsborderradius: { ...number(80, 0, 100), apply: (ui, v) => ui.audioBars.configure({ peakDotsBorderRadius: v }) },
    audiobarspeakdotsopacity: { ...number(80, 10, 100), apply: (ui, v) => ui.audioBars.configure({ peakDotsOpacity: v }) },
    audiobarspeakdotssize: { ...number(5, 1, 10), apply: (ui, v) => ui.audioBars.configure({ peakDotsSize: v }) },
    audiobarspeakdotsgap: { ...number(4, 0, 10), apply: (ui, v) => ui.audioBars.configure({ peakDotsGap: v }) },

    datecardshow: { ...bool(true), apply: (ui, v) => ui.dateCard.setVisible(v) },
    datecardborderradius: { ...number(10, 0, 40), apply: (ui, v) => ui.dateCard.setBorderRadius(v) },
    datecardweekdayfontfamily: { ...text("Unageo"), apply: (ui, v) => ui.dateCard.setFont("weekday", v) },
    datecardweekdayfontweight: { ...number(600, 100, 900), apply: (ui, v) => ui.dateCard.setFontWeight("weekday", v) },
    datecardfulldatefontfamily: { ...text("Unageo"), apply: (ui, v) => ui.dateCard.setFont("fullDate", v) },
    datecardfulldatefontweight: { ...number(300, 100, 900), apply: (ui, v) => ui.dateCard.setFontWeight("fullDate", v) },

    backgroundcolorsource: { ...text("custom"), apply: (ui, v) => ui.setColorSource("background", v) },
    backgroundcolor: { ...color("0 0 0"), apply: (ui, v) => ui.setCustomColor("background", v) },
    backgroundalbumshow: { ...bool(true), apply: (ui, v) => ui.background.setAlbumVisible(v) },
    backgroundalbumopacity: { ...number(1, 0, 1), apply: (ui, v) => ui.background.setAlbumOpacity(v) },
    backgroundbeatsensitivity: { ...number(0.2, 0, 1), apply: (ui, v) => ui.background.setBeatSensitivity(v) },
    backgroundmovementspeed: { ...number(120, 0, 240), apply: (ui, v) => ui.background.setMovementSpeed(v) },
    backgroundcustomimage: { ...text(""), apply: (ui, v) => ui.background.setCustomImage(v) },
    backgroundcustomimageopacity: { ...number(1, 0, 1), apply: (ui, v) => ui.background.setCustomImageOpacity(v) },

    trianglesshow: { ...bool(true), apply: (ui, v) => ui.triangles.setVisible(v) },
    trianglesopacity: { ...number(0.5, 0, 1), apply: (ui, v) => ui.triangles.setOpacity(v) },
    trianglesrows: { ...number(6, 2, 20), apply: (ui, v) => ui.triangles.configure({ rows: Math.round(v) }) },
    trianglescolorsource: { ...text("primary"), apply: (ui, v) => ui.setColorSource("triangles", v) },
    trianglescolor: { ...color("0.2 0.4 1"), apply: (ui, v) => ui.setCustomColor("triangles", v) },
    trianglesbeatsensitivity: { ...number(0.25, 0, 1), apply: (ui, v) => ui.triangles.configure({ sensitivity: v }) },
    trianglesrangestart: { ...number(0, 0, 63), apply: (ui, v) => ui.triangles.configure({ rangeStart: Math.round(v) }) },
    trianglesrangeend: { ...number(9, 0, 63), apply: (ui, v) => ui.triangles.configure({ rangeEnd: Math.round(v) }) },
    trianglesbeatthreshold: { ...number(1.3, 1, 3), apply: (ui, v) => ui.triangles.configure({ beatThreshold: v }) },
    trianglesfadeinduration: { ...number(0.1, 0, 1), apply: (ui, v) => ui.triangles.configure({ fadeInDuration: v }) },
    trianglesfadeoutduration: { ...number(1.5, 0.1, 5), apply: (ui, v) => ui.triangles.configure({ fadeOutDuration: v }) },
    trianglesglowstrength: { ...number(0.2, 0, 2), apply: (ui, v) => ui.triangles.configure({ glowStrength: v }) },
    trianglesvariation: { ...number(0.2, 0, 1), apply: (ui, v) => ui.triangles.configure({ variation: v }) },
};

/** Applies the properties Wallpaper Engine sent (all on load, then only the changed ones). Unknown keys are ignored. */
export function applySettings(ui, properties) {
    for (const [key, property] of Object.entries(properties)) {
        const setting = SETTINGS[key];
        if (setting) setting.apply(ui, setting.parse(property?.value));
    }
}

export function applyDefaults(ui) {
    for (const setting of Object.values(SETTINGS)) setting.apply(ui, setting.fallback);
}
