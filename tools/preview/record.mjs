// Records the wallpaper playing tools/preview/tracks.json in headless Chrome and writes a seamless looping GIF.
// Usage: npm run preview -- [--wide | --screenshots] [--width=256] [--frame-ms=…] [--palette-ms=track|ms|0] [--dither=12] [--tolerance=10] [--out=…] [--stills]
//   default:       the Wallpaper Engine preview, a 256×256 square GIF (WE allows up to 256×256 and 1 MB), at the
//                  highest frame rate that fits in 1 MB unless --frame-ms is given
//   --wide:        a 16:9 GIF, 720 px wide, for the Workshop page
//   --screenshots: one 1920×1080 PNG per track, for the Workshop page
//   --stills:      also saves the GIF's first and last frames (the loop seam) and each track's middle frame
// Covers go in tools/preview/covers/ (not committed). Set CHROME_PATH if Chrome is not in its default place.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import gifenc from "gifenc";
import pngjs from "pngjs";

// Both packages are CommonJS
const { GIFEncoder, applyPalette, quantize } = gifenc;
const { PNG } = pngjs;

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
// The square preview is recorded on a square screen, so the cards stay centered and nothing is cropped
const PRESETS = {
    square: { viewport: { width: 840, height: 840 }, width: 256, out: "tools/preview/output/preview.gif" },
    wide: { viewport: { width: 1280, height: 720 }, width: 720, frameMs: 60, out: "tools/preview/output/preview-wide.gif" },
    screenshots: { viewport: { width: 1920, height: 1080 }, width: 1920, out: "tools/preview/output/screenshot.png" },
};
const MAX_GIF_BYTES = 1024 * 1024; // Wallpaper Engine's limit for preview.gif
// Frame times tried for the square preview, smoothest first (GIF delays are whole centiseconds; browsers slow down
// anything under 20 ms)
const FRAME_MS_CANDIDATES = [20, 30, 40, 50, 60, 70, 80, 100, 120, 150];
const SCREENSHOT_TRACK_MS = 4000; // long enough for every cross-fade to finish before each screenshot
const SETTLE_MS = 5000; // fonts, card opening and the first cover fade before recording starts

const options = Object.fromEntries(
    process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")).map(([key, value]) => [key, value ?? true])
);
const preset = PRESETS[options.screenshots ? "screenshots" : options.wide ? "wide" : "square"];
const VIEWPORT = preset.viewport;
const width = Number(options.width ?? preset.width);
const fixedFrameMs = options["frame-ms"] ? Number(options["frame-ms"]) : preset.frameMs; // a multiple of 10 (centiseconds)
// When a new 256-color palette starts: "track" = at every track change (each track and its incoming cross-fade get
// their own colors, and the switch costs little since the screen changes there anyway), a number = every that many
// ms, 0 = one palette for the whole GIF (smallest file, but 4 color themes share 256 colors).
// Ordered (Bayer) dithering strength, 0-255 (0 = off). A fixed pattern turns color banding in gradients into fine
// noise, and since the pattern is the same in every frame, still areas stay identical and cost nothing.
const DITHER = Number(options.dither ?? 12);
// A pixel already on screen is kept while it stays within this distance (0-255, per channel) of the real color, so
// slow changes and dithering noise do not rewrite it every frame (the "lossy" trick of GIF optimizers; 0 = exact).
const TOLERANCE = Number(options.tolerance ?? 10);
const BAYER_8 = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

const PALETTE_CANDIDATES = options["palette-ms"] !== undefined ? [options["palette-ms"] === "track" ? "track" : Number(options["palette-ms"])] : ["track", 0];
const out = join(ROOT, options.out ?? preset.out);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".woff2": "font/woff2" };

function serve() {
    const server = createServer((request, response) => {
        const path = normalize(join(ROOT, decodeURIComponent(new URL(request.url, "http://x").pathname)));
        if (!path.startsWith(normalize(ROOT)) || !existsSync(path)) {
            response.writeHead(404).end();
            return;
        }
        response.writeHead(200, { "Content-Type": MIME[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path));
    });
    return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
    ];
    const found = candidates.find((path) => path && existsSync(path));
    if (!found) throw new Error("Chrome not found; set CHROME_PATH");
    return found;
}

/** Minimal Chrome DevTools Protocol client over the page's WebSocket. */
async function connect(port) {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
        await sleep(200);
        try {
            target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
        } catch {
            // Chrome is still starting
        }
    }
    if (!target) throw new Error("Could not connect to Chrome");

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener("open", resolve));
    let id = 0;
    const pending = new Map();
    const handlers = new Map();
    socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id) pending.get(message.id)?.(message);
        else handlers.get(message.method)?.(message.params);
    });

    const send = (method, params = {}) =>
        new Promise((resolve, reject) => {
            pending.set(++id, (message) => (message.error ? reject(new Error(message.error.message)) : resolve(message.result)));
            socket.send(JSON.stringify({ id, method, params }));
        });
    const evaluate = async (expression) => {
        const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
        return result.value;
    };
    return { send, evaluate, on: (method, handler) => handlers.set(method, handler), close: () => socket.close() };
}

async function record() {
    const config = JSON.parse(readFileSync(join(ROOT, "tools/preview/tracks.json"), "utf8"));
    const trackMs = options.screenshots ? SCREENSHOT_TRACK_MS : config.trackSeconds * 1000;
    const totalMs = trackMs * config.tracks.length;

    const server = await serve();
    const debugPort = 9300 + Math.floor(Math.random() * 600);
    const profile = mkdtempSync(join(tmpdir(), "minimalistcards-preview-"));
    const chrome = spawn(findChrome(), [
        "--headless=new",
        `--remote-debugging-port=${debugPort}`,
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
        "--hide-scrollbars",
        `--lang=${config.language ?? "en-US"}`,
        `--user-data-dir=${profile}`,
        "about:blank",
    ], { stdio: "ignore" });

    try {
        const page = await connect(debugPort);
        await page.send("Page.enable");
        await page.send("Emulation.setDeviceMetricsOverride", { ...VIEWPORT, deviceScaleFactor: 1, mobile: false });
        // The date card infers the locale from the time zone when the language is English (REQ-DATE-2)
        await page.send("Emulation.setLocaleOverride", { locale: config.language ?? "en-US" });
        await page.send("Emulation.setTimezoneOverride", { timezoneId: config.timezone ?? "America/New_York" });
        await page.send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/tools/preview/preview.html` });

        await page.evaluate("new Promise((resolve) => (document.readyState === 'complete' ? resolve() : addEventListener('load', resolve)))");
        await page.evaluate("window.preview.ready.then(() => true)");
        await page.evaluate("window.preview.applySettings()");
        // The loop starts with the switch from the last track to the first (see runSequence in mock.js)
        await page.evaluate(`window.preview.playTrack(${config.tracks.length - 1})`);
        console.log(`Settling for ${SETTLE_MS / 1000} s…`);
        await sleep(SETTLE_MS);

        if (options.screenshots) {
            await screenshots(page, config, trackMs);
            page.close();
            return null;
        }

        const frames = [];
        page.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
            frames.push({ data, time: metadata.timestamp * 1000 });
            page.send("Page.screencastFrameAck", { sessionId });
        });
        await page.send("Page.startScreencast", { format: "png", maxWidth: width, maxHeight: Math.round((width * VIEWPORT.height) / VIEWPORT.width) });

        const start = await page.evaluate(`window.preview.runSequence(${trackMs})`);
        console.log(`Recording ${totalMs / 1000} s…`);
        await sleep(trackMs / 2 + totalMs + 500);
        await page.send("Page.stopScreencast");
        page.close();

        return { frames, start, trackMs, totalMs, tracks: config.tracks.length };
    } finally {
        chrome.kill();
        server.close();
        await sleep(500);
        rmSync(profile, { recursive: true, force: true });
    }
}

/** Plays the sequence once and saves a full-resolution PNG in the middle of each track, after its cross-fade. */
async function screenshots(page, config, trackMs) {
    await page.evaluate(`window.preview.runSequence(${trackMs})`);
    mkdirSync(dirname(out), { recursive: true });

    // The loop starts in the middle of the first track; each next track is centered one track later
    await sleep(trackMs / 2);
    for (const [i, track] of config.tracks.entries()) {
        if (i > 0) await sleep(trackMs);
        const { data } = await page.send("Page.captureScreenshot", { format: "png" });
        const file = join(dirname(out), `screenshot-${i + 1} ${track.title.replace(/[\\/:*?"<>|]/g, "")}.png`);
        writeFileSync(file, Buffer.from(data, "base64"));
        console.log(file);
    }
}

/** The screencast frames shown at each GIF frame time (`frameMs` apart), decoded once each (cached across calls). */
const decodedFrames = new Map();
function pickFrames({ frames, start, totalMs }, frameMs) {
    if (!frames.length) throw new Error("No frames were captured");
    const picked = [];
    let source = 0;
    for (let t = 0; t < totalMs; t += frameMs) {
        while (source + 1 < frames.length && frames[source + 1].time <= start + t) source++;
        if (!decodedFrames.has(source)) decodedFrames.set(source, PNG.sync.read(Buffer.from(frames[source].data, "base64")));
        picked.push({ t, source, image: decodedFrames.get(source) });
    }
    return picked;
}

/**
 * One palette for the whole GIF (so colors do not flicker between frames) and, after the first frame, only the
 * pixels that changed: the others are transparent and show the previous frame, which keeps the file small.
 */
/** `data` (RGBA) with the ordered dithering offset of each pixel added, ready for applyPalette. */
function dither(data, w, h) {
    if (!DITHER) return data;
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const offset = ((BAYER_8[(y % 8) * 8 + (x % 8)] + 0.5) / 64 - 0.5) * DITHER;
            const p = (y * w + x) * 4;
            out[p] = data[p] + offset;
            out[p + 1] = data[p + 1] + offset;
            out[p + 2] = data[p + 2] + offset;
            out[p + 3] = 255;
        }
    }
    return out;
}

/** A 255-color palette (index 255 is left for transparency) from up to 24 frames spread over `frames`. */
function buildPalette(frames, w, h) {
    const samples = frames.filter((_, i) => i % Math.ceil(frames.length / 24) === 0);
    const sample = new Uint8Array(samples.length * w * h * 4);
    samples.forEach(({ image }, i) => sample.set(image.data, i * w * h * 4));
    return quantize(sample, 255);
}

/**
 * Builds the GIF the way good GIF optimizers do:
 * - each frame stores only the rectangle of pixels whose (quantized) color changed; the rest is transparent and shows
 *   the frame below (disposal "do not dispose"), so a mostly still screen costs little;
 * - a frame with no change is not stored: the previous frame just lasts longer;
 * - a new palette per track (or every `palette` ms), so each color theme has its own 256 colors. A palette in GIF only
 *   applies to its own frame, so every frame carries the palette of its group (except the first group's, global).
 * Also measures the average color error (0-255 per channel) the palettes introduce.
 */
function encode(recording, frameMs, palette) {
    const picked = pickFrames(recording, frameMs);
    const { width: w, height: h } = picked[0].image;
    // The loop starts mid first track and tracks change at trackMs / 2 + k × trackMs; the last part is the first track again
    const { trackMs, tracks } = recording;
    const groupOf = ({ t }) =>
        palette === "track" ? Math.floor((t + trackMs / 2) / trackMs) % tracks : palette > 0 ? Math.floor(t / palette) : 0;

    const palettes = new Map();
    for (const frame of picked) {
        const group = groupOf(frame);
        if (!palettes.has(group)) palettes.set(group, buildPalette(picked.filter((other) => groupOf(other) === group), w, h));
    }

    const shown = new Uint8Array(w * h * 3); // the colors on screen after the frames so far
    const entries = [];
    let error = 0;

    for (const frame of picked) {
        const palette = palettes.get(groupOf(frame));
        const transparent = palette.length;
        const data = frame.image.data;
        const indexed = applyPalette(dither(data, w, h), palette);

        let minX = w, minY = h, maxX = -1, maxY = -1;
        const changed = new Uint8Array(w * h);
        for (let p = 0; p < w * h; p++) {
            const color = palette[indexed[p]];
            const [r, g, b] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2]];
            const [sr, sg, sb] = [shown[p * 3], shown[p * 3 + 1], shown[p * 3 + 2]];
            const unchanged = sr === color[0] && sg === color[1] && sb === color[2];
            const closeEnough = Math.max(Math.abs(sr - r), Math.abs(sg - g), Math.abs(sb - b)) <= TOLERANCE;
            if (entries.length && (unchanged || closeEnough)) {
                error += Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb);
                continue;
            }
            error += Math.abs(r - color[0]) + Math.abs(g - color[1]) + Math.abs(b - color[2]);

            changed[p] = 1;
            shown.set(color, p * 3);
            const x = p % w, y = (p - x) / w;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        if (maxX < 0) {
            entries[entries.length - 1].delay += frameMs; // nothing changed: the previous frame lasts longer
            continue;
        }

        const rw = maxX - minX + 1, rh = maxY - minY + 1;
        const pixels = new Uint8Array(rw * rh);
        for (let y = 0; y < rh; y++) {
            for (let x = 0; x < rw; x++) {
                const p = (minY + y) * w + minX + x;
                pixels[y * rw + x] = changed[p] ? indexed[p] : transparent;
            }
        }
        entries.push({ pixels, x: minX, y: minY, w: rw, h: rh, palette, delay: frameMs, first: entries.length === 0 });
    }

    const global = palettes.get(0);
    const gif = GIFEncoder();
    const descriptors = [];
    for (const entry of entries) {
        const start = gif.bytes().length;
        gif.writeFrame(entry.pixels, entry.first ? w : entry.w, entry.first ? h : entry.h, {
            palette: entry.first || entry.palette !== global ? [...entry.palette, [0, 0, 0]] : undefined,
            delay: entry.delay,
            repeat: 0,
            transparent: !entry.first,
            transparentIndex: entry.palette.length,
            dispose: 1, // keep what is on screen under the transparent pixels
        });
        descriptors.push(start);
    }
    gif.finish();

    // gifenc always writes frames at 0,0: set each frame's position in its image descriptor (0x2C, left, top)
    const bytes = gif.bytes();
    entries.forEach((entry, i) => {
        if (entry.first) return;
        const descriptor = bytes.indexOf(0x2c, descriptors[i] + 8); // right after the 8-byte graphic control extension
        bytes[descriptor + 1] = entry.x & 0xff;
        bytes[descriptor + 2] = entry.x >> 8;
        bytes[descriptor + 3] = entry.y & 0xff;
        bytes[descriptor + 4] = entry.y >> 8;
    });

    return { bytes, picked, error: error / (picked.length * w * h * 3) };
}

/** The fixed frame time, or for the square preview the smoothest one that fits in Wallpaper Engine's 1 MB. */
function encodeBest(recording) {
    const candidates = (fixedFrameMs ? [fixedFrameMs] : FRAME_MS_CANDIDATES).flatMap((frameMs) => PALETTE_CANDIDATES.map((palette) => ({ frameMs, palette })));
    let result;
    let frameMs;
    let palette;
    for ({ frameMs, palette } of candidates) {
        result = encode(recording, frameMs, palette);
        const paletteLabel = palette === "track" ? "per track" : palette > 0 ? `every ${palette} ms` : "single";
        console.log(`  ${(1000 / frameMs).toFixed(1)} fps, palette ${paletteLabel}: ${(result.bytes.length / 1024).toFixed(0)} KB, color error ${result.error.toFixed(2)}`);
        if (result.bytes.length <= MAX_GIF_BYTES || options.wide) break;
    }

    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, result.bytes);
    console.log(`${out}: ${result.picked.length} frames at ${(1000 / frameMs).toFixed(1)} fps, ${(result.bytes.length / 1024).toFixed(0)} KB`);
    if (result.bytes.length > MAX_GIF_BYTES && !options.wide) console.warn("Still larger than Wallpaper Engine's 1 MB preview limit");
    if (options.stills) saveStills(recording, result.picked, frameMs);
}

/** The first and last frames (the loop seam) and the middle of each track, to check them. */
function saveStills({ frames, totalMs, trackMs }, picked, frameMs) {
    for (const { t, source } of picked) {
        const last = t + frameMs >= totalMs;
        const middle = t > 0 && t % trackMs < frameMs; // tracks 2..n are centered on multiples of trackMs
        if (t === 0 || last || middle) {
            writeFileSync(join(dirname(out), `still-${String(t).padStart(5, "0")}.png`), Buffer.from(frames[source].data, "base64"));
        }
    }
}

const recording = await record();
if (recording) encodeBest(recording);
