import { BACKGROUND } from "../config.js";
import { el } from "../utils/dom.js";
import { toCssColor, withAlpha } from "../utils/color.js";
import { crossFade } from "../core/transitions.js";

/**
 * Background layers, bottom to top: base color, rotating album cover, triangles (a slot filled by App), custom image.
 * The cover, the triangles and the custom image are optional and have their own opacity.
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
        this.customPath = null;
        this.albumBeatSensitivity = 0.2;
        this.customImageBeatSensitivity = 0.2;
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

    async setThumbnail(url) {
        const token = ++this.loadToken;
        const image = await loadImage(url).catch(() => null);
        if (!image || token !== this.loadToken) return;

        crossFade(this.thumbnail, () => {
            this.source = image;
            this.redraw();
        });
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
        this.customImage.style.scale = 1 + bass * this.customImageBeatSensitivity;
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

    setCustomImage(path) {
        if (path === this.customPath) return;
        this.customPath = path;

        crossFade(this.customImage, () => {
            this.customImage.style.backgroundImage = path ? `url("file:///${path.replace(/"/g, '\\"')}")` : "none";
        });
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

function loadImage(url) {
    const image = new Image();
    image.src = url;
    return image.decode().then(() => image);
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
