import AudioUtils from "../utils/audioUtils.js";
import { AUDIO_BARS_DEFAULTS } from "../constants/appConfig.js";

export default class AudioBarsWebGL {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.gl = null;
        this.program = null;

        // Estado das barras
        this.prevBars = new Float32Array(64);
        this.peakDots = new Float32Array(64);
        this.peakHoldTime = new Uint8Array(64);

        // Configurações padrão
        this._quantity = AUDIO_BARS_DEFAULTS.quantity;
        this._gap = AUDIO_BARS_DEFAULTS.gap;
        this._borderRadius = AUDIO_BARS_DEFAULTS.borderRadius;
        this._opacity = AUDIO_BARS_DEFAULTS.opacity;
        this._barsColor = AUDIO_BARS_DEFAULTS.barsColor;

        // Peak dots
        this._showPeakDots = AUDIO_BARS_DEFAULTS.showPeakDots;
        this._peakDotsColor = AUDIO_BARS_DEFAULTS.peakDotsColor;
        this._peakDotsBorderRadius = AUDIO_BARS_DEFAULTS.peakDotsBorderRadius;
        this._peakDotsOpacity = AUDIO_BARS_DEFAULTS.peakDotsOpacity;
        this._peakDotsHoldFrames = AUDIO_BARS_DEFAULTS.peakDotsHoldFrames;
        this._peakDotsFallSpeed = AUDIO_BARS_DEFAULTS.peakDotsFallSpeed;
        this._peakDotsSize = AUDIO_BARS_DEFAULTS.peakDotsSize;
        this._peakDotsGap = AUDIO_BARS_DEFAULTS.peakDotsGap;

        this.maxBarHeight = 0;
        this.needsResize = true;

        this.init();
    }

    init() {
        this.setupWebGL();
        this.setupShaders();
        this.setupBuffers();
    }

    setupWebGL() {
        // Tenta WebGL2 primeiro
        const contextOptions = {
            alpha: true,
            antialias: true,
            desynchronized: true,
            powerPreference: "high-performance",
            premultipliedAlpha: false,
        };

        this.gl = this.canvas.getContext("webgl2", contextOptions) || this.canvas.getContext("webgl", contextOptions);

        if (!this.gl) {
            throw new Error("WebGL not supported");
        }

        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        this.canvas.style.backgroundColor = "transparent";
    }

    setupShaders() {
        const gl = this.gl;

        // Vertex Shader otimizado
        const vsSource = `#version 300 es
            precision highp float;
            
            in vec2 aPosition;
            in float aBarIndex;
            in float aBarHeight;
            in vec3 aColor;
            in float aOpacity;
            
            uniform vec2 uResolution;
            uniform float uBarsQuantity;
            uniform float uGap;
            uniform float uMaxBarHeight;
            uniform float uDotSize;
            uniform float uDotGap;
            uniform bool uIsDot;
            uniform float uBorderRadius;
            uniform float uPeakDotBorderRadius;
            
            out vec3 vColor;
            out float vOpacity;
            out vec2 vLocalPos;
            out vec2 vSize;
            out float vRadius;
            
            void main() {
                float barWidth = uResolution.x / uBarsQuantity;
                float drawWidth = barWidth - uGap;
                
                float height, yOffset;
                
                if (uIsDot) {
                    height = uDotSize;
                    float peakHeight = uMaxBarHeight * aBarHeight;
                    yOffset = uResolution.y - peakHeight - uDotGap - uDotSize;
                    vRadius = uPeakDotBorderRadius;
                } else {
                    height = uMaxBarHeight * aBarHeight;
                    yOffset = uResolution.y - height;
                    vRadius = uBorderRadius;
                }
                
                float xPos = aBarIndex * barWidth + uGap * 0.5;
                
                vec2 screenPos = vec2(
                    xPos + aPosition.x * drawWidth,
                    yOffset + aPosition.y * height
                );
                
                // Convert to clip space
                vec2 clipSpace = (screenPos / uResolution) * 2.0 - 1.0;
                clipSpace.y *= -1.0;
                
                gl_Position = vec4(clipSpace, 0.0, 1.0);
                
                vColor = aColor;
                vOpacity = aOpacity;
                vLocalPos = aPosition;
                vSize = vec2(drawWidth, height);
            }
        `;

        // Fragment Shader otimizado com SDF para bordas arredondadas
        const fsSource = `#version 300 es
            precision highp float;
            
            in vec3 vColor;
            in float vOpacity;
            in vec2 vLocalPos;
            in vec2 vSize;
            in float vRadius;
            
            out vec4 fragColor;
            
            float roundedBoxSDF(vec2 p, vec2 b, float r) {
                vec2 d = abs(p) - b + r;
                return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
            }
            
            void main() {
                // Convert to pixel coordinates
                vec2 pixelPos = vLocalPos * vSize;
                vec2 center = vSize * 0.5;
                
                // Calculate actual radius in pixels (0-50% of smallest dimension)
                float maxRadius = min(vSize.x, vSize.y) * 0.5;
                float radius = vRadius * 0.01 * maxRadius;
                
                // SDF for rounded rectangle
                float distance = roundedBoxSDF(pixelPos - center, center, radius);
                
                // Smooth anti-aliasing
                float alpha = 1.0 - smoothstep(-1.0, 1.0, distance);
                alpha *= vOpacity;
                
                if (alpha < 0.01) discard;
                
                fragColor = vec4(vColor, alpha);
            }
        `;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error("Shader program failed to link");
        }

        // Cache de locations
        this.attribs = {
            position: gl.getAttribLocation(this.program, "aPosition"),
            barIndex: gl.getAttribLocation(this.program, "aBarIndex"),
            barHeight: gl.getAttribLocation(this.program, "aBarHeight"),
            color: gl.getAttribLocation(this.program, "aColor"),
            opacity: gl.getAttribLocation(this.program, "aOpacity"),
        };

        this.uniforms = {
            resolution: gl.getUniformLocation(this.program, "uResolution"),
            barsQuantity: gl.getUniformLocation(this.program, "uBarsQuantity"),
            gap: gl.getUniformLocation(this.program, "uGap"),
            maxBarHeight: gl.getUniformLocation(this.program, "uMaxBarHeight"),
            dotSize: gl.getUniformLocation(this.program, "uDotSize"),
            dotGap: gl.getUniformLocation(this.program, "uDotGap"),
            isDot: gl.getUniformLocation(this.program, "uIsDot"),
            borderRadius: gl.getUniformLocation(this.program, "uBorderRadius"),
            peakDotBorderRadius: gl.getUniformLocation(this.program, "uPeakDotBorderRadius"),
        };
    }

    compileShader(type, source) {
        const gl = this.gl;
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

    setupBuffers() {
        const gl = this.gl;

        // Buffer de vértices para um quadrado unitário
        const vertices = new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]);

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Buffers para dados de instância
        this.instanceBuffers = {
            barIndex: gl.createBuffer(),
            barHeight: gl.createBuffer(),
            color: gl.createBuffer(),
            opacity: gl.createBuffer(),
        };
    }

    updateCanvasSize() {
        if (!this.canvas.parentNode) return;

        const width = this.canvas.parentNode.offsetWidth;
        const height = this.canvas.parentNode.offsetHeight;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.gl.viewport(0, 0, width, height);
            this.updateMaxBarHeight();
            this.needsResize = false;
        }
    }

    updateMaxBarHeight() {
        this.maxBarHeight = this._showPeakDots ? Math.max(0, this.canvas.height - this._peakDotsSize - this._peakDotsGap) : this.canvas.height;
    }

    hexToRgb(hex) {
        hex = hex.replace(/^#/, "");
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const bigint = parseInt(hex, 16);
        return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
    }

    // ========== MÉTODOS PÚBLICOS ==========

    beat(audioArray) {
        if (this.needsResize) {
            this.updateCanvasSize();
        }

        const gl = this.gl;
        const monoArray = AudioUtils.makeMono(audioArray);
        const channelsArray = AudioUtils.extractChannelQuantity(monoArray, this._quantity);

        // Atualiza arrays se necessário
        if (this.prevBars.length !== this._quantity) {
            this.prevBars = new Float32Array(this._quantity);
            this.peakDots = new Float32Array(this._quantity);
            this.peakHoldTime = new Uint8Array(this._quantity);
        }

        // Processamento de áudio
        this.processAudioData(channelsArray);

        // Renderização
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        this.setUniforms();
        this.renderBars();

        if (this._showPeakDots) {
            this.renderPeakDots();
        }
    }

    processAudioData(channelsArray) {
        for (let i = 0; i < this._quantity; i++) {
            // Suavização
            this.prevBars[i] = this.prevBars[i] * 0.6 + channelsArray[i] * 0.4;
            this.prevBars[i] = Math.max(0, Math.min(1, this.prevBars[i]));

            // Peak dots
            if (this._showPeakDots) {
                const current = this.prevBars[i];

                if (current > this.peakDots[i]) {
                    this.peakDots[i] = current;
                    this.peakHoldTime[i] = this._peakDotsHoldFrames;
                } else if (this.peakHoldTime[i] > 0) {
                    this.peakHoldTime[i]--;
                } else {
                    this.peakDots[i] = Math.max(current, this.peakDots[i] - this._peakDotsFallSpeed);
                }
            }
        }
    }

    setUniforms() {
        const gl = this.gl;

        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.barsQuantity, this._quantity);
        gl.uniform1f(this.uniforms.gap, this._gap);
        gl.uniform1f(this.uniforms.maxBarHeight, this.maxBarHeight);
        gl.uniform1f(this.uniforms.dotSize, this._peakDotsSize);
        gl.uniform1f(this.uniforms.dotGap, this._peakDotsGap);
        gl.uniform1f(this.uniforms.borderRadius, this._borderRadius);
        gl.uniform1f(this.uniforms.peakDotBorderRadius, this._peakDotsBorderRadius);
    }

    renderBars() {
        const gl = this.gl;
        gl.uniform1i(this.uniforms.isDot, 0);

        const barsRgb = this.hexToRgb(this._barsColor);
        const barOpacity = this._opacity / 100;

        this.drawInstanced(this.prevBars, barsRgb, barOpacity);
    }

    renderPeakDots() {
        const gl = this.gl;
        gl.uniform1i(this.uniforms.isDot, 1);

        const dotsRgb = this.hexToRgb(this._peakDotsColor);
        const dotOpacity = this._peakDotsOpacity / 100;

        this.drawInstanced(this.peakDots, dotsRgb, dotOpacity);
    }

    drawInstanced(heights, color, opacity) {
        const gl = this.gl;
        const count = heights.length;

        // Prepara dados de instância
        const barIndices = new Float32Array(count);
        const barHeights = new Float32Array(count);
        const colors = new Float32Array(count * 3);
        const opacities = new Float32Array(count);

        let visibleCount = 0;

        for (let i = 0; i < count; i++) {
            if (heights[i] < 0.001) continue;

            barIndices[visibleCount] = i;
            barHeights[visibleCount] = heights[i];

            colors[visibleCount * 3 + 0] = color[0];
            colors[visibleCount * 3 + 1] = color[1];
            colors[visibleCount * 3 + 2] = color[2];

            opacities[visibleCount] = opacity;
            visibleCount++;
        }

        if (visibleCount === 0) return;

        // Configura atributos
        this.setupAttributes(barIndices, barHeights, colors, opacities, visibleCount);

        // Renderização instanciada
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, visibleCount);
    }

    setupAttributes(barIndices, barHeights, colors, opacities, count) {
        const gl = this.gl;

        // Vértices básicos
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.attribs.position);
        gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

        // Dados de instância
        const setupInstanceBuffer = (buffer, attrib, size, data) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(attrib);
            gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(attrib, 1);
        };

        setupInstanceBuffer(this.instanceBuffers.barIndex, this.attribs.barIndex, 1, barIndices);
        setupInstanceBuffer(this.instanceBuffers.barHeight, this.attribs.barHeight, 1, barHeights);
        setupInstanceBuffer(this.instanceBuffers.color, this.attribs.color, 3, colors);
        setupInstanceBuffer(this.instanceBuffers.opacity, this.attribs.opacity, 1, opacities);
    }

    updateColors(event) {
        this._barsColor = event.textColor;
        this._peakDotsColor = event.textColor;
    }

    // ========== SETTERS (ARROW FUNCTIONS) ==========

    quantity = (value) => {
        const quantity = Math.max(8, Math.min(512, parseInt(value) || 64));
        this._quantity = quantity;
        this.prevBars = new Float32Array(quantity);
        this.peakDots = new Float32Array(quantity);
        this.peakHoldTime = new Uint8Array(quantity);
    };

    gap = (value) => {
        this._gap = Math.max(0, Math.min(20, parseFloat(value) || 2));
    };

    borderRadius = (value) => {
        this._borderRadius = Math.max(0, Math.min(100, parseFloat(value) || 20));
    };

    opacity = (value) => {
        this._opacity = Math.max(0, Math.min(100, parseInt(value) || 100));
    };

    showPeakDots = (value) => {
        this._showPeakDots = value === "true" || value === true;
        this.updateMaxBarHeight();
    };

    peakDotsBorderRadius = (value) => {
        this._peakDotsBorderRadius = Math.max(0, Math.min(100, parseFloat(value) || 20));
    };

    peakDotsOpacity = (value) => {
        this._peakDotsOpacity = Math.max(0, Math.min(100, parseInt(value) || 100));
    };

    peakDotsHoldFrames = (value) => {
        this._peakDotsHoldFrames = Math.max(0, Math.min(60, parseInt(value) || 10));
    };

    peakDotsFallSpeed = (value) => {
        const num = parseFloat(value) || 0.008;
        // Converte 0-100 para 0.001-0.05
        this._peakDotsFallSpeed = num > 1 ? 0.001 + (Math.min(100, num) / 100) * 0.049 : Math.max(0.0001, Math.min(0.05, num));
    };

    peakDotsSize = (value) => {
        this._peakDotsSize = Math.max(2, Math.min(12, parseFloat(value) || 3));
        this.updateMaxBarHeight();
    };

    peakDotsGap = (value) => {
        this._peakDotsGap = Math.max(0, Math.min(20, parseFloat(value) || 2));
        this.updateMaxBarHeight();
    };

    destroy() {
        if (!this.gl) return;

        const gl = this.gl;
        gl.deleteProgram(this.program);
        gl.deleteBuffer(this.vertexBuffer);

        Object.values(this.instanceBuffers).forEach((buffer) => {
            gl.deleteBuffer(buffer);
        });
    }
}
