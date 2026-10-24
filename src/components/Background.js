import { BACKGROUND } from "../config.js";
import { el } from "../utils/dom.js";
import { withAlpha } from "../utils/color.js";
import { crossFade } from "../core/transitions.js";

/**
 * Rotating, beat-scaled album cover behind the cards.
 * The blur is baked into a small canvas once per cover, so each frame only transforms a ready texture
 * (the old full-screen backdrop-filter re-blurred the whole screen every frame).
 */
export default class Background {
    constructor(parent) {
        this.container = el("div", "background", parent);

        const image = el("div", "background-image", this.container);
        this.rotator = el("div", "background-rotator", image);
        this.thumbnail = el("canvas", "background-thumbnail", this.rotator);
        this.tint = el("div", "background-tint", image);

        this.customLayer = el("div", "background-custom", this.container);
        this.customImage = el("div", "background-custom-image", this.customLayer);

        this.thumbnail.width = this.thumbnail.height = BACKGROUND.canvasSize;
        this.context = this.thumbnail.getContext("2d");
        this.padded = document.createElement("canvas");

        this.source = null;
        this.loadToken = 0;
        this.customPath = null;
        this.beatSensitivity = 0.2;

        // One full turn per second at playbackRate 1; the rate sets the speed without restarting the rotation
        this.rotation = this.rotator.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
            duration: 1000,
            iterations: Infinity,
        });

        window.addEventListener("resize", () => this.redraw());
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

    setTint(primaryColor) {
        this.tint.style.backgroundColor = withAlpha(primaryColor, BACKGROUND.tintAlpha);
    }

    setBeat(bass) {
        const scale = 1 + bass * this.beatSensitivity;
        this.thumbnail.style.scale = scale;
        this.customImage.style.scale = scale;
    }

    setBeatSensitivity(sensitivity) {
        this.beatSensitivity = sensitivity;
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

        // Match the on-screen blur radius at the canvas resolution
        const screenSize = Math.max(window.innerWidth, window.innerHeight) * BACKGROUND.sizeFactor;
        const blur = (BACKGROUND.blur * BACKGROUND.canvasSize) / screenSize;
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
