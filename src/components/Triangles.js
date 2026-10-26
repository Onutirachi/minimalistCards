import { TRIANGLES } from "../config.js";
import { el } from "../utils/dom.js";
import { toGlColor } from "../utils/color.js";
import { createProgram } from "../utils/gl.js";

// Positions and sizes arrive in device pixels. The color is computed per vertex; all three are equal, so it is flat.
const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aTriangle; // left, top, flipped, shade
layout(location = 2) in float aBrightness;

uniform vec2 uResolution;
uniform vec2 uSize; // side, height
uniform vec3 uColor;
uniform float uVariation;
uniform float uRestLevel;
uniform float uGlow;
uniform float uStrength; // 0-2: up to 1 scales how far a lit triangle brightens, above 1 pushes it towards white

out vec3 vColor;

void main() {
    vec2 corner = vec2(aCorner.x, aTriangle.z > 0.5 ? 1.0 - aCorner.y : aCorner.y);
    vec2 clip = (aTriangle.xy + corner * uSize) / uResolution * 2.0 - 1.0;
    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

    vec3 rest = uColor * uRestLevel * (1.0 - uVariation * aTriangle.w);
    vec3 lit = mix(mix(uColor, vec3(1.0), uGlow), vec3(1.0), max(0.0, uStrength - 1.0));
    vColor = mix(rest, lit, aBrightness * min(1.0, uStrength));
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(vColor, 1.0);
}`;

const UNIFORMS = ["uResolution", "uSize", "uColor", "uVariation", "uRestLevel", "uGlow", "uStrength"];

// An upward triangle in its bounding box; flipped instances mirror it vertically
const TRIANGLE = new Float32Array([0.5, 0, 0, 1, 1, 1]);

/**
 * Full-screen grid of equilateral triangles in one base color, each with a fixed random shade.
 * Every beat in the user's channel range (the bass by default) lights a few random triangles, which then fade out; the grid as a whole never pulses.
 */
export default class Triangles {
    constructor(parent) {
        this.canvas = el("canvas", "triangles", parent);
        this.options = { rows: 6, sensitivity: 0.35, beatThreshold: 1.3, rangeStart: 0, rangeEnd: 9, fadeInDuration: 0.1, fadeOutDuration: 1.5, glowStrength: 0.2, variation: 0.2 };
        this.visible = true;
        this.opacity = 0.33;

        this.color = [1, 1, 1];
        this.targetColor = [1, 1, 1];
        this.count = 0;
        this.instances = new Float32Array(0); // [left, top, flipped, shade] per triangle
        this.brightness = new Float32Array(0);
        this.rising = new Uint8Array(0); // 1 while a triangle fades in, 0 while it fades out

        this.sinceAudio = 0; // seconds since the last audio frame, so the fade follows real time
        this.levelAverage = 0;
        this.lastLevel = 0;
        this.cooldown = 0;

        this.layoutDirty = true;
        this.dirty = true;
        this.ready = false;

        this.gl = this.canvas.getContext("webgl2", { alpha: false, antialias: true });
        if (!this.gl) {
            console.warn("WebGL2 is not available; triangles are disabled.");
            this.updateVisibility();
            return;
        }

        this.canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault(); // allows the context to be restored
            this.ready = false;
        });
        this.canvas.addEventListener("webglcontextrestored", () => {
            this.setupGl();
            this.layoutDirty = true;
        });
        window.addEventListener("resize", () => (this.layoutDirty = true));

        this.setupGl();
        this.updateVisibility();
    }

    get active() {
        return this.ready && this.visible && this.opacity > 0;
    }

    setupGl() {
        const gl = this.gl;
        try {
            this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
            this.uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(this.program, name)]));

            this.vao = gl.createVertexArray();
            gl.bindVertexArray(this.vao);

            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            // Triangle data only changes with the layout; brightness is uploaded on every draw
            this.instanceBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(1, 1);

            this.brightnessBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.brightnessBuffer);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(2, 1);

            gl.bindVertexArray(null);
            this.ready = true;
        } catch (error) {
            console.error("Triangles setup failed:", error);
            this.ready = false;
        }
    }

    configure(options) {
        if ("rows" in options && options.rows !== this.options.rows) this.layoutDirty = true;
        Object.assign(this.options, options);
        this.dirty = true;
    }

    setColor(color) {
        this.targetColor = toGlColor(color);
    }

    setVisible(visible) {
        this.visible = visible;
        this.updateVisibility();
    }

    setOpacity(opacity) {
        this.opacity = opacity;
        this.updateVisibility();
    }

    updateVisibility() {
        const wasHidden = this.canvas.hidden;
        this.canvas.hidden = !this.active;
        this.canvas.style.opacity = this.opacity;

        // A color change while hidden has nothing to fade from
        if (wasHidden && this.active) {
            this.color = [...this.targetColor];
            this.dirty = true;
        }
    }

    /** Runs on every display frame while active; `analyzer` is only passed when a new audio frame arrived. */
    frame(dt, analyzer) {
        if (!this.ready) return;
        if (this.layoutDirty) this.layout();
        this.sinceAudio += dt;
        if (analyzer) {
            this.updateBrightness(this.level(analyzer), this.sinceAudio);
            this.sinceAudio = 0;
        }
        this.easeColor(dt);
        if (this.dirty) this.draw();
    }

    /** Sizes the canvas to the screen and rebuilds the grid; shades are drawn again. */
    layout() {
        const gl = this.gl;
        const ratio = window.devicePixelRatio || 1;
        const width = Math.round(window.innerWidth * ratio);
        const height = Math.round(window.innerHeight * ratio);

        this.canvas.width = width;
        this.canvas.height = height;
        gl.viewport(0, 0, width, height);

        const rows = this.options.rows;
        this.height = height / rows;
        this.side = (2 * this.height) / Math.sqrt(3);
        const step = this.side / 2;

        // A row only fully covers the space between its first and last apexes, so it overflows by more than a step on each side
        const columns = Math.ceil(width / step) + 2;
        const left = ((columns + 1) * step - width) / 2;

        this.count = rows * columns;
        this.instances = new Float32Array(this.count * 4);
        this.brightness = new Float32Array(this.count);
        this.rising = new Uint8Array(this.count);

        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const i = row * columns + column;
                this.instances.set([column * step - left, row * this.height, (row + column) % 2, Math.random()], i * 4);
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instances, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.brightnessBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.brightness.byteLength, gl.DYNAMIC_DRAW);

        this.layoutDirty = false;
        this.dirty = true;
    }

    /** Mean of the user's channel range, both ends included; an end before the start means the start channel only. */
    level(analyzer) {
        const { rangeStart, rangeEnd } = this.options;
        return analyzer.mean(rangeStart, Math.max(rangeStart, rangeEnd) + 1);
    }

    /**
     * A beat starts a random set of triangles fading in to full brightness over `fadeInDuration`,
     * then they fade out over `fadeOutDuration`. Both in seconds.
     */
    updateBrightness(level, elapsed) {
        const { fadeInDuration, fadeOutDuration } = this.options;
        const fadeIn = fadeInDuration > 0 ? elapsed / fadeInDuration : 1;
        const fadeOut = elapsed / fadeOutDuration;

        if (this.detectBeat(level)) {
            const lit = Math.round(this.count * this.options.sensitivity * TRIANGLES.beatShare);
            for (let n = 0; n < lit; n++) this.rising[Math.floor(Math.random() * this.count)] = 1;
        }

        let changed = false;
        for (let i = 0; i < this.count; i++) {
            const current = this.brightness[i];
            if (this.rising[i]) {
                const next = Math.min(1, current + fadeIn);
                this.brightness[i] = next;
                if (next === 1) this.rising[i] = 0;
                changed = true;
            } else if (current > 0) {
                this.brightness[i] = Math.max(0, current - fadeOut);
                changed = true;
            }
        }

        if (changed) this.dirty = true;
    }

    /** A beat is a rising level clearly above its recent average, at most once per cooldown. */
    detectBeat(level) {
        this.levelAverage += (level - this.levelAverage) * TRIANGLES.levelAverageRate;
        if (this.cooldown > 0) this.cooldown--;

        const rising = level > this.lastLevel;
        this.lastLevel = level;

        const beat = this.cooldown === 0 && rising && level >= TRIANGLES.minLevel && level > this.levelAverage * this.options.beatThreshold;
        if (beat) this.cooldown = TRIANGLES.beatCooldown;
        return beat;
    }

    easeColor(dt) {
        const amount = 1 - Math.exp(-dt * TRIANGLES.colorSpeed);

        for (let c = 0; c < 3; c++) {
            const difference = this.targetColor[c] - this.color[c];
            if (difference === 0) continue;
            this.color[c] = Math.abs(difference) < 0.002 ? this.targetColor[c] : this.color[c] + difference * amount;
            this.dirty = true;
        }
    }

    draw() {
        const gl = this.gl;

        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.uniforms.uSize, this.side, this.height);
        gl.uniform3fv(this.uniforms.uColor, this.color);
        gl.uniform1f(this.uniforms.uVariation, this.options.variation);
        gl.uniform1f(this.uniforms.uRestLevel, TRIANGLES.restLevel);
        gl.uniform1f(this.uniforms.uGlow, TRIANGLES.glow);
        gl.uniform1f(this.uniforms.uStrength, this.options.glowStrength);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.brightnessBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.brightness);
        gl.bindVertexArray(this.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, this.count);
        gl.bindVertexArray(null);

        this.dirty = false;
    }
}
