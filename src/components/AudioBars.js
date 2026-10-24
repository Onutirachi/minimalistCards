import { AUDIO_BARS } from "../config.js";
import { el } from "../utils/dom.js";
import { toGlColor } from "../utils/color.js";

// Pixel sizes arrive in device pixels, already multiplied by the canvas pixel ratio.
const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in float aIndex;
layout(location = 2) in float aHeight;

uniform vec2 uResolution;
uniform float uCount;
uniform float uGap;
uniform float uMaxHeight;
uniform float uDotSize;
uniform float uDotGap;
uniform bool uIsDot;

out vec2 vLocal;
out vec2 vSize;

void main() {
    float slot = uResolution.x / uCount;
    float width = slot - uGap;
    float height = uIsDot ? uDotSize : uMaxHeight * aHeight;
    float top = uIsDot
        ? uResolution.y - uMaxHeight * aHeight - uDotGap - uDotSize
        : uResolution.y - height;

    vec2 pixel = vec2(aIndex * slot + uGap * 0.5 + aCorner.x * width, top + aCorner.y * height);
    vec2 clip = pixel / uResolution * 2.0 - 1.0;

    gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    vLocal = aCorner;
    vSize = vec2(width, height);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vLocal;
in vec2 vSize;

uniform vec3 uColor;
uniform float uOpacity;
uniform float uRadius; // 0-100, percentage of the largest possible radius

out vec4 fragColor;

float roundedBoxSDF(vec2 p, vec2 halfSize, float r) {
    vec2 d = abs(p) - halfSize + r;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

void main() {
    vec2 halfSize = vSize * 0.5;
    float radius = uRadius * 0.01 * min(halfSize.x, halfSize.y);
    float dist = roundedBoxSDF(vLocal * vSize - halfSize, halfSize, radius);
    float alpha = (1.0 - smoothstep(-1.0, 1.0, dist)) * uOpacity;
    if (alpha < 0.01) discard;
    fragColor = vec4(uColor, alpha);
}`;

const UNIFORMS = ["uResolution", "uCount", "uGap", "uMaxHeight", "uDotSize", "uDotGap", "uIsDot", "uColor", "uOpacity", "uRadius"];

// Two triangles covering the unit square
const QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

export default class AudioBars {
    constructor(parent) {
        this.canvas = el("canvas", "audio-bars", parent);
        this.options = { quantity: 40, gap: 4, borderRadius: 60, opacity: 100, showPeakDots: true, peakDotsBorderRadius: 80, peakDotsOpacity: 80, peakDotsSize: 5, peakDotsGap: 4 };
        this.color = [1, 1, 1];

        this.levels = new Float32Array(AUDIO_BARS.maxQuantity);
        this.peaks = new Float32Array(AUDIO_BARS.maxQuantity);
        this.holds = new Uint8Array(AUDIO_BARS.maxQuantity);
        this.channels = new Float32Array(AUDIO_BARS.maxQuantity);
        this.instances = new Float32Array(AUDIO_BARS.maxQuantity * 2); // [index, height] per bar

        this.pixelRatio = 1;
        this.sizeDirty = true;
        this.framesSinceResize = 0;
        this.ready = false;

        this.gl = this.canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false });
        if (!this.gl) {
            console.warn("WebGL2 is not available; audio bars are disabled.");
            this.canvas.hidden = true;
            return;
        }

        this.canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault(); // allows the context to be restored
            this.ready = false;
        });
        this.canvas.addEventListener("webglcontextrestored", () => {
            this.setupGl();
            this.sizeDirty = true;
        });

        this.setupGl();
    }

    setupGl() {
        const gl = this.gl;
        try {
            this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
            this.uniforms = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(this.program, name)]));

            const quad = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

            // Bars and dots get separate buffers so the second upload never waits on the first draw
            this.bars = this.createLayer(quad);
            this.dots = this.createLayer(quad);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.clearColor(0, 0, 0, 0);
            this.ready = true;
        } catch (error) {
            console.error("Audio bars setup failed:", error);
            this.ready = false;
        }
    }

    createLayer(quad) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.instances.byteLength, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 8, 0);
        gl.vertexAttribDivisor(1, 1);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8, 4);
        gl.vertexAttribDivisor(2, 1);

        gl.bindVertexArray(null);
        return { vao, buffer };
    }

    configure(options) {
        Object.assign(this.options, options);
        if ("quantity" in options) {
            this.levels.fill(0);
            this.peaks.fill(0);
            this.holds.fill(0);
        }
    }

    setColor(color) {
        this.color = toGlColor(color);
    }

    invalidateSize() {
        this.sizeDirty = true;
    }

    /** Sizes the drawing buffer to the on-screen size (including the cards' scale) so bars stay sharp. */
    resize() {
        this.framesSinceResize = 0;

        const parent = this.canvas.parentElement;
        const cssWidth = parent.offsetWidth;
        const cssHeight = parent.offsetHeight;
        if (!cssWidth || !cssHeight) return;

        const ratio = (parent.getBoundingClientRect().width / cssWidth) * (window.devicePixelRatio || 1);
        const width = Math.round(cssWidth * ratio);
        const height = Math.round(cssHeight * ratio);

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.gl.viewport(0, 0, width, height);
        this.pixelRatio = ratio;
        this.sizeDirty = false;
    }

    /** Called once per new audio frame, so smoothing and peak timing follow the audio rate, not the display rate. */
    render(analyzer) {
        if (!this.ready) return;
        if (this.sizeDirty || ++this.framesSinceResize >= AUDIO_BARS.resizeCheckInterval) this.resize();
        if (this.sizeDirty) return;

        const { quantity } = this.options;
        analyzer.channels(this.channels, quantity);
        this.updateLevels(quantity);
        this.draw(quantity);
    }

    updateLevels(quantity) {
        const { showPeakDots } = this.options;

        for (let i = 0; i < quantity; i++) {
            const smoothed = this.levels[i] * (1 - AUDIO_BARS.smoothing) + this.channels[i] * AUDIO_BARS.smoothing;
            const level = Math.min(1, Math.max(0, smoothed));
            this.levels[i] = level;

            if (!showPeakDots) continue;

            if (level > this.peaks[i]) {
                this.peaks[i] = level;
                this.holds[i] = AUDIO_BARS.peakHoldFrames;
            } else if (this.holds[i] > 0) {
                this.holds[i]--;
            } else {
                this.peaks[i] = Math.max(level, this.peaks[i] - AUDIO_BARS.peakFallSpeed);
            }
            // Dots never disappear; they rest on the floor
            this.peaks[i] = Math.max(AUDIO_BARS.minPeak, this.peaks[i]);
        }
    }

    draw(quantity) {
        const gl = this.gl;
        const options = this.options;
        const ratio = this.pixelRatio;
        const { width, height } = this.canvas;
        const dotSpace = (options.peakDotsSize + options.peakDotsGap) * ratio;
        const maxHeight = options.showPeakDots ? Math.max(10 * ratio, height - dotSpace) : height;

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.uniform2f(this.uniforms.uResolution, width, height);
        gl.uniform1f(this.uniforms.uCount, quantity);
        gl.uniform1f(this.uniforms.uGap, options.gap * ratio);
        gl.uniform1f(this.uniforms.uMaxHeight, maxHeight);
        gl.uniform1f(this.uniforms.uDotSize, options.peakDotsSize * ratio);
        gl.uniform1f(this.uniforms.uDotGap, options.peakDotsGap * ratio);
        gl.uniform3fv(this.uniforms.uColor, this.color);

        this.drawLayer(this.bars, this.levels, quantity, false, options.borderRadius, options.opacity);
        if (options.showPeakDots) {
            this.drawLayer(this.dots, this.peaks, quantity, true, options.peakDotsBorderRadius, options.peakDotsOpacity);
        }
    }

    drawLayer(layer, heights, quantity, isDot, radius, opacity) {
        const gl = this.gl;

        for (let i = 0; i < quantity; i++) {
            this.instances[i * 2] = i;
            // Near-silent bars collapse to nothing; dots always draw
            this.instances[i * 2 + 1] = isDot || heights[i] >= AUDIO_BARS.minPeak ? heights[i] : 0;
        }

        gl.uniform1i(this.uniforms.uIsDot, isDot ? 1 : 0);
        gl.uniform1f(this.uniforms.uRadius, radius);
        gl.uniform1f(this.uniforms.uOpacity, opacity / 100);

        gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instances, 0, quantity * 2);
        gl.bindVertexArray(layer.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, quantity);
        gl.bindVertexArray(null);
    }
}

function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    const shaders = [compileShader(gl, gl.VERTEX_SHADER, vertexSource), compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)];
    shaders.forEach((shader) => gl.attachShader(program, shader));
    gl.linkProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info}`);
    }
    return shader;
}
