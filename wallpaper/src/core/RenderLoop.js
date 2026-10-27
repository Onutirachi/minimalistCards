/**
 * The only requestAnimationFrame loop in the wallpaper.
 * While the page is hidden the browser stops calling it, so no work piles up.
 */
export default class RenderLoop {
    constructor() {
        this.tasks = [];
        this.running = false;
        this.frameId = 0;
        this.lastTime = 0;
        this.reportedErrors = new Set();
    }

    add(task) {
        this.tasks.push(task);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(this.frame);
    }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.frameId);
    }

    frame = (now) => {
        if (!this.running) return;

        const dt = Math.max(0, (now - this.lastTime) / 1000);
        this.lastTime = now;

        for (const task of this.tasks) {
            try {
                task(now, dt);
            } catch (error) {
                // A failing task must not stop the others, nor flood the console every frame
                if (!this.reportedErrors.has(error.message)) {
                    this.reportedErrors.add(error.message);
                    console.error(error);
                }
            }
        }

        this.frameId = requestAnimationFrame(this.frame);
    };
}
