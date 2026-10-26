// The Wallpaper Engine settings panel: sections, labels, tips and conditions (docs/specs/20261025-191730-settings-panel.md).
// `npm run panel` applies it to project.json. Only labels, order and conditions are written; option keys, types,
// defaults and ranges stay as the WE editor created them, so users keep their saved settings.
// Every option is followed by a full-width "hint<key>" text property: its tip, its default and a separator line.
import { fileURLToPath } from "node:url";
import { readProjectText, writeProject } from "./projectJson.mjs";

// Labels shrink to their text, so a plain <hr> is only as wide as the tip; a fixed width spans the panel
const SEPARATOR_WIDTH = 260;

const group = (key, text, condition) => [[key, { type: "group", value: "", text, condition }]];
const label = (key, text, condition) => [[key, { type: "text", value: false, text, condition }]];
const opt = (key, text, tip, condition, extra = {}) => [
    [key, { text, condition, ...extra }],
    [`hint${key}`, { type: "text", value: false, text: `<small>${tip}</small><hr width="${SEPARATOR_WIDTH}">`, condition }],
];

const CLOCK = "clockcardshow.value == true";
const TRACK = "trackcardshow.value == true";
const BARS = `${TRACK} && trackcardshowbars.value == true`;
const DOTS = `${BARS} && audiobarsshowpeakdots.value == true`;
const DATE = "datecardshow.value == true";
const ALBUM = "albumspinshow.value == true";
const TRI = "trianglesshow.value == true";
const MY_IMAGE = "backgroundimagesource.value == 'custom'";
const ALBUM_IMAGE = "backgroundimagesource.value == 'album'";
const ANY_IMAGE = `${MY_IMAGE} || ${ALBUM_IMAGE}`;
const WEIGHT = "100 = thin, 900 = bold.";
const ROUND = "0 = square corners, higher = rounder.";

const COLOR_SOURCES = [
    { label: "My color", value: "custom" },
    { label: "Album: main color", value: "primary" },
    { label: "Album: second color", value: "secondary" },
    { label: "Album: third color", value: "tertiary" },
    { label: "Album: text color", value: "text" },
    { label: "Album: high contrast color", value: "highcontrast" },
];

const IMAGE_SOURCES = [
    { label: "None", value: "none" },
    { label: "My image", value: "custom" },
    { label: "Album cover", value: "album" },
];

const IMAGE_FITS = [
    { label: "Stretch", value: "stretch" },
    { label: "Fill", value: "fill" },
    { label: "Fit", value: "fit" },
    { label: "Center", value: "center" },
    { label: "Tile", value: "tile" },
];

const COVER_POSITIONS = [
    { label: "Left", value: "left" },
    { label: "Right", value: "right" },
    { label: "Center", value: "center" },
];

const COLOR_NAMES = { "0 0 0": "black", "1 1 1": "white", "0.2 0.4 1": "blue" };

const PANEL = [
    label("labelintro", "<h2>Minimalist Cards</h2><small>Clock, date and music cards over a background that moves with your music.</small><br>&nbsp;"),
    label("labeltip", "<small>🎨 The background is made of layers: color, Album Spin, Triangles and image. Use their opacity sliders to blend them together. To remove an effect, turn it off or set its opacity to 0.</small><br>&nbsp;"),
    label("information", "<small>💡 If something looks wrong after an update, press <b>Reset</b> in the wallpaper settings.</small><br>&nbsp;"),

    group("cards", "📐 Layout"),
    label("labelcards", "<small>Size and position of all the cards together.</small>"),
    opt("cardssize", "Size", "1 = normal, 2 = double."),
    opt("cardshorizontalposition", "Horizontal position", "0 = left edge, 50 = center, 100 = right edge."),
    opt("cardsverticalposition", "Vertical position", "0 = top, 50 = center, 100 = bottom."),

    group("clockcard", "🕒 Clock"),
    label("labelclock", "<small>The card with the current time.</small>"),
    opt("clockcardshow", "Show clock", "Turn off to hide the clock card."),
    opt("clockcardshowseconds", "Show seconds", "Adds the seconds to the time.", CLOCK),
    opt("clockcardformat12h", "12-hour format", "Shows AM / PM instead of 0–23 h.", CLOCK),
    opt("clockcardfontfamily", "Font", "Font of the time.", CLOCK),
    opt("clockcardfontweight", "Font weight", WEIGHT, CLOCK),
    opt("clockcardborderradius", "Corner roundness", ROUND, CLOCK),

    group("trackcard", "🎵 Now Playing"),
    label("labeltrack", "<small>The song playing on your PC, with cover, title and artist. Hides itself when nothing is playing.</small>"),
    opt("trackcardshow", "Show now playing", "Turn off to hide the music card."),
    opt("trackcardshowtimeline", "Show progress bar", "Elapsed and total time of the song.", TRACK),
    opt("trackcardshowbars", "Show audio bars", "Bars that dance with the music.", TRACK),
    opt("trackcardshowbeats", "Show beat blocks", "Three blocks that pulse with the bass, mids and treble.", TRACK),
    opt("trackcardtitlefontfamily", "Song title font", "Font of the song name.", TRACK),
    opt("trackcardtitlefontweight", "Song title font weight", WEIGHT, TRACK),
    opt("trackcardartitsfontfamily", "Artist font", "Font of the artist name.", TRACK),
    opt("trackcardartitsfontweight", "Artist font weight", WEIGHT, TRACK),
    opt("trackcardborderradius", "Corner roundness", ROUND, TRACK),

    group("audiobars", "📊 Audio Bars", BARS),
    label("labelaudiobars", "<small>The bars inside the now playing card.</small>", BARS),
    opt("audiobarsquantity", "Number of bars", "More bars = thinner bars.", BARS),
    opt("audiobarsgap", "Space between bars", "0 = bars touch each other.", BARS),
    opt("audiobarsborderradius", "Bar roundness", ROUND, BARS),
    opt("audiobarsopacity", "Bar opacity", "Lower = more see-through.", BARS),
    opt("audiobarsshowpeakdots", "Show peak dots", "Small dots that mark the highest point of each bar and fall slowly.", BARS),
    opt("audiobarspeakdotssize", "Dot size", "Height of each dot.", DOTS),
    opt("audiobarspeakdotsgap", "Space between dot and bar", "Distance between the dot and the top of its bar.", DOTS),
    opt("audiobarspeakdotsborderradius", "Dot roundness", ROUND, DOTS),
    opt("audiobarspeakdotsopacity", "Dot opacity", "Lower = more see-through.", DOTS),

    group("datecard", "📅 Date"),
    label("labeldate", "<small>The card with the weekday and the date, in your system language.</small>"),
    opt("datecardshow", "Show date", "Turn off to hide the date card."),
    opt("datecardweekdayfontfamily", "Weekday font", "Font of the day of the week.", DATE),
    opt("datecardweekdayfontweight", "Weekday font weight", WEIGHT, DATE),
    opt("datecardfulldatefontfamily", "Date font", "Font of the day, month and year.", DATE),
    opt("datecardfulldatefontweight", "Date font weight", WEIGHT, DATE),
    opt("datecardborderradius", "Corner roundness", ROUND, DATE),

    group("background", "🖼️ Background"),
    label("labelbackground", "<small>The background is made of layers, from bottom to top: <b>color → Album Spin → Triangles → image</b>. This section has the bottom and the top layers; Album Spin and Triangles have their own sections. Use the opacity sliders to mix them.</small>"),
    opt("backgroundcolorsource", "Background color", "Solid color at the very bottom. Your own color, or a color taken from the album cover.", undefined, { options: COLOR_SOURCES }),
    opt("backgroundcolor", "Pick a color", "Used when the background color is “My color”.", "backgroundcolorsource.value == 'custom'"),
    opt("backgroundimagesource", "Image", "Top layer: an image of your own, or the cover of the song playing.", undefined, { options: IMAGE_SOURCES }),
    opt("backgroundimage", "Your image", "The image file to show.", MY_IMAGE),
    opt("backgroundimagefit", "Image fit", "Stretch = fills the screen, may distort. Fill = fills without distorting, cuts the edges. Fit = shows the whole image. Center = original size. Tile = repeats the image.", MY_IMAGE, { options: IMAGE_FITS }),
    opt("backgroundimagecoverposition", "Cover position", "Left and Right fade out towards the center, like the cover in the music card. Center fades a little on both sides.", ALBUM_IMAGE, { options: COVER_POSITIONS }),
    opt("backgroundimagekeepcover", "Keep last cover", "Keeps showing the last cover when no music is playing. Off = the cover fades out.", ALBUM_IMAGE),
    opt("backgroundimageopacity", "Image opacity", "Lower = more of the layers below show through.", ANY_IMAGE),
    opt("backgroundimagebeatsensitivity", "Image beat pulse", "How much the image grows with the bass. 0 = off.", ANY_IMAGE),

    group("albumspin", "💿 Album Spin"),
    label("labelalbumspin", "<small>The cover of the song playing, blurred and slowly spinning behind the cards. Its color follows each song.</small>"),
    opt("albumspinshow", "Show Album Spin", "Turn off to hide the spinning cover."),
    opt("albumspinopacity", "Opacity", "Lower = more of the background color shows through.", ALBUM),
    opt("albumspinrotationspeed", "Rotation speed", "0 = stopped, higher = faster.", ALBUM),
    opt("albumspinbeatsensitivity", "Beat pulse", "How much the cover grows with the bass. 0 = off.", ALBUM),

    group("triangles", "🔺 Triangles"),
    label("labeltriangles", "<small>A grid of triangles in one color. On each beat of the music, a few random triangles light up and fade away.</small>"),
    opt("trianglesshow", "Show triangles", "Turn off to hide the triangles."),
    opt("trianglesopacity", "Opacity", "Lower = more of the layers below show through.", TRI),
    opt("trianglesrows", "Rows", "More rows = smaller triangles.", TRI),
    opt("trianglescolorsource", "Color", "Your own color, or a color taken from the album cover.", TRI, { options: COLOR_SOURCES }),
    opt("trianglescolor", "Pick a color", "Used when the color is “My color”.", `${TRI} && trianglescolorsource.value == 'custom'`),
    opt("trianglesbeatsensitivity", "Triangles per beat", "How many light up on each beat.", TRI),
    opt("trianglesglowstrength", "Glow strength", "How bright they get. Above 1 they turn white.", TRI),
    opt("trianglesfadeinduration", "Fade in (seconds)", "How long they take to light up.", TRI),
    opt("trianglesfadeoutduration", "Fade out (seconds)", "How long they take to go dark.", TRI),
    opt("trianglesvariation", "Texture", "Shade difference between triangles. 0 = all the same.", TRI),
    opt("trianglesrangestart", "Reaction range start", "64 channels (0–63)<br>0 = deepest bass", TRI),
    opt("trianglesrangeend", "Reaction range end", "64 channels (0–63)<br>63 = highest treble", TRI),
    opt("trianglesbeatthreshold", "Beat threshold", "Higher = only strong beats light triangles.", TRI),

    group("troubleshooting", "🛠️ Troubleshooting"),
    label("labeltroubleshooting", "<small>Tools to find out what is wrong when something does not show up.</small>"),
    opt("debugshow", "Show debug info", "Shows what Wallpaper Engine sends to the wallpaper: song, cover, playback and a log of events. Take a screenshot of it when reporting a problem."),
].flat();

// Properties Wallpaper Engine manages itself
const UNMANAGED = new Set(["schemecolor"]);
const LABEL_TYPES = new Set(["text", "group"]);

/** An option's default as a user reads it. */
export function describeDefault(property) {
    const { type, value } = property;
    if (type === "bool") return value ? "On" : "Off";
    if (type === "combo") return property.options.find((option) => option.value === value)?.label ?? value;
    if (type === "file") return value || "none";
    if (type === "color") {
        const hex = value
            .split(" ")
            .map((channel) => Math.round(Number(channel) * 255).toString(16).padStart(2, "0"))
            .join("");
        return COLOR_NAMES[value] ?? `#${hex.toUpperCase()}`;
    }
    return String(value);
}

/** Returns a copy of `project` with the panel applied. Throws if an option is missing from the panel. */
export function buildPanel(project) {
    const result = structuredClone(project);
    const properties = result.general.properties;
    const entries = PANEL.map(([key, value]) => [key, { ...value }]);

    // The last option of a section has no separator: the next section title already separates it
    entries.forEach(([key, value], i) => {
        const next = entries[i + 1];
        if (key.startsWith("hint") && (!next || next[1].type === "group")) value.text = value.text.replace(/<hr[^>]*>$/, "");
    });

    const placed = new Set(entries.map(([key]) => key));
    const unplaced = Object.keys(properties).filter((key) => !placed.has(key) && !UNMANAGED.has(key));
    const options = unplaced.filter((key) => !LABEL_TYPES.has(properties[key].type));
    if (options.length) throw new Error(`Options missing from the settings panel: ${options.join(", ")}`);
    unplaced.forEach((key) => delete properties[key]); // labels that are no longer used

    const panelValues = new Map(entries);
    entries.forEach(([key, value], i) => {
        if (!(key in properties) && !value.type) throw new Error(`Unknown option in the settings panel: ${key}`);

        const property = { ...properties[key], ...value, condition: value.condition ?? "", order: 100 + i, index: i };
        const optionKey = key.slice("hint".length);
        if (key.startsWith("hint") && optionKey in properties && !LABEL_TYPES.has(properties[optionKey].type)) {
            const option = { ...properties[optionKey], ...panelValues.get(optionKey) };
            property.text = property.text.replace("</small>", `<br>Default value = ${describeDefault(option)}</small>`);
        }
        properties[key] = property;
    });

    return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    writeProject(buildPanel(JSON.parse(readProjectText())));
    console.log("project.json: settings panel updated");
}
