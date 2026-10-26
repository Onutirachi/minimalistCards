import { BACKGROUND } from "../config.js";
import { el } from "../utils/dom.js";
import { toCssColor, withAlpha } from "../utils/color.js";
import { crossFade } from "../core/transitions.js";

/**
 * Background layers, bottom to top: base color, rotating album cover, triangles (a slot filled by App), background image.
 * The cover, the triangles and the background image are optional and have their own opacity.
 * The background image is the user's file or the current album cover, docked to the left, the right or the center.
 *
 * Rotating, beat-scaled album cover:
 * The blur is baked into a small canvas once per cover, so each frame only transforms a ready texture
 * (the old full-screen backdrop-filter re-blurred the whole screen every frame).
 */
export default class Background {
    constructor(parent) {
        this.container = el("div", "background", parent);

        this.album = el("div", "background-image", this.container);
        this.rotator = el("div", "background-rotator", this.album);
        this.thumbnail = el("canvas", "background-thumbnail", this.rotator);
        this.tint = el("div", "background-tint", this.album);

        this.trianglesSlot = el("div", "background-triangles", this.container);

        this.customLayer = el("div", "background-custom", this.container);
        this.customImage = el("div", "background-custom-image", this.customLayer);

        this.thumbnail.width = this.thumbnail.height = BACKGROUND.canvasSize;
        this.context = this.thumbnail.getContext("2d");
        this.padded = document.createElement("canvas");

        this.source = null;
        this.loadToken = 0;
        this.coverUrl = null;
        this.mediaActive = false;

        this.imageSource = "album";
        this.customPath = "";
        this.imageFit = "stretch";
        this.keepLastCover = false;
        this.coverPosition = "left";
        this.renderedImage = null;
        this.imageShown = false;
        this.albumBeatSensitivity = 0.2;
        this.customImageBeatSensitivity = 0;
        this.albumVisible = true;
        this.albumOpacity = 1;
        this.albumActive = true;
        this.blurPending = false;

        // One full turn per second at playbackRate 1; the rate sets the speed without restarting the rotation
        this.rotation = this.rotator.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
            duration: 1000,
            iterations: Infinity,
        });

        this.updateSize();
        window.addEventListener("resize", () => {
            this.updateSize();
            this.redraw();
        });
    }

    /** The rotating square must be as wide as the screen diagonal to cover it at any angle and aspect ratio. */
    updateSize() {
        this.size = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight)) + BACKGROUND.sizeMargin;
        this.container.style.setProperty("--background-size", `${this.size}px`);
    }

    /** Resolves to "loaded", "failed" or "stale" (a newer cover arrived meanwhile), for diagnostics. */
    async setThumbnail(url) {
        this.coverUrl = url;
        this.updateImage();

        const token = ++this.loadToken;
        const image = await loadImage(url).catch(() => null);
        if (token !== this.loadToken) return "stale";
        if (!image) return "failed";

        crossFade(this.thumbnail, () => {
            this.source = image;
            this.redraw();
        });
        return "loaded";
    }

    setBaseColor(color) {
        this.container.style.backgroundColor = toCssColor(color);
    }

    setAlbumVisible(visible) {
        this.albumVisible = visible;
        this.updateAlbum();
    }

    setAlbumOpacity(opacity) {
        this.albumOpacity = opacity;
        this.updateAlbum();
    }

    /** A hidden cover costs nothing: no rotation, no beat scaling, and its blur waits until it is shown again. */
    updateAlbum() {
        this.albumActive = this.albumVisible && this.albumOpacity > 0;
        this.album.hidden = !this.albumActive;
        this.album.style.opacity = this.albumOpacity;

        if (!this.albumActive) {
            this.rotation.pause();
            return;
        }
        this.rotation.play();
        if (this.blurPending) this.redraw();
    }

    setTint(primaryColor) {
        this.tint.style.backgroundColor = withAlpha(primaryColor, BACKGROUND.tintAlpha);
    }

    setBeat(bass) {
        if (this.albumActive) this.thumbnail.style.scale = 1 + bass * this.albumBeatSensitivity;
        if (this.imageShown) this.customImage.style.scale = 1 + bass * this.customImageBeatSensitivity;
    }

    setAlbumBeatSensitivity(sensitivity) {
        this.albumBeatSensitivity = sensitivity;
    }

    setCustomImageBeatSensitivity(sensitivity) {
        this.customImageBeatSensitivity = sensitivity;
    }

    /** 0 stops the rotation; 1-240 maps to one turn every 240-1 seconds. */
    setMovementSpeed(speed) {
        this.rotation.updatePlaybackRate(speed > 0 ? 1 / (241 - speed) : 0);
    }

    /** "none", "custom" (the user's file) or "album" (the current cover). */
    setImageSource(source) {
        this.imageSource = source;
        this.updateImage();
    }

    setCustomImage(path) {
        this.customPath = path;
        this.updateImage();
    }

    /** How the user's file fills the screen: "stretch", "fill", "fit", "center" or "tile". */
    setImageFit(fit) {
        this.imageFit = fit;
        this.updateImage();
    }

    /** Where the album cover image sits: "left", "right" or "center". */
    setCoverPosition(position) {
        this.coverPosition = position;
        this.updateImage();
    }

    setKeepLastCover(keep) {
        this.keepLastCover = keep;
        this.updateImage();
    }

    /** False when no media is playing; the album cover image then fades out unless the last cover is kept. */
    setMediaActive(active) {
        this.mediaActive = active;
        this.updateImage();
    }

    /** Cross-fades to the image and layout the settings describe, only when one of them changed. */
    updateImage() {
        const url = this.imageUrl();
        const layout = this.imageSource === "album" ? `album-${this.coverPosition}` : this.imageFit;
        const next = url ? `${layout} ${url}` : "";
        if (next === this.renderedImage) return;
        this.renderedImage = next;

        crossFade(this.customImage, () => {
            this.customImage.dataset.layout = layout;
            this.customImage.style.backgroundImage = url ? `url("${url.replace(/"/g, '\\"')}")` : "none";
            this.imageShown = Boolean(url);
            if (!url) this.customImage.style.scale = 1;
        });
    }

    imageUrl() {
        if (this.imageSource === "custom") return this.customPath ? `file:///${this.customPath}` : null;
        if (this.imageSource === "album" && (this.mediaActive || this.keepLastCover)) return this.coverUrl;
        return null;
    }

    setCustomImageOpacity(opacity) {
        this.customLayer.style.opacity = opacity;
    }

    redraw() {
        if (!this.source) return;
        if (!this.albumActive) {
            this.blurPending = true;
            return;
        }
        this.blurPending = false;

        // Match the on-screen blur radius at the canvas resolution
        const blur = (BACKGROUND.blur * BACKGROUND.canvasSize) / this.size;
        drawBlurred(this.context, this.padded, this.source, blur);
    }
}

async function loadImage(url) {
    const image = new Image();
    image.src = url;
    try {
        await image.decode();
    } catch {
        // decode() can reject while the page is hidden even for a valid image; fall back to the load event
        if (!image.complete) {
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });
        }
        if (!image.naturalWidth) throw new Error("The cover could not be loaded");
    }
    return image;
}

/**
 * Blurs `image` into `context`. The image is first surrounded by mirrored copies,
 * so the blur has content to sample at the edges instead of fading to transparent.
 */
function drawBlurred(context, padded, image, blur) {
    const size = context.canvas.width;
    const margin = Math.ceil(blur * 3);

    padded.width = padded.height = size + margin * 2;
    const paddedContext = padded.getContext("2d");

    for (const column of [-1, 0, 1]) {
        for (const row of [-1, 0, 1]) {
            const flipX = column === 0 ? 1 : -1;
            const flipY = row === 0 ? 1 : -1;
            const x = margin + (flipX === 1 ? column : column + 1) * size;
            const y = margin + (flipY === 1 ? row : row + 1) * size;
            paddedContext.setTransform(flipX, 0, 0, flipY, x, y);
            paddedContext.drawImage(image, 0, 0, size, size);
        }
    }

    context.clearRect(0, 0, size, size);
    context.filter = `blur(${blur}px)`;
    context.drawImage(padded, -margin, -margin);
    context.filter = "none";
}
