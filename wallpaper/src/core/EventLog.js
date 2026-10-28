// Wallpaper Engine events for the debug overlay, kept across reloads and crashes so the next load shows what came before.
// Wallpaper Engine gives every monitor its own storage, so each monitor keeps its own log.

const KEY = "minimalistcards.eventLog";

export default class EventLog {
    constructor(maxLines, storage = globalThis.localStorage) {
        this.maxLines = maxLines;
        this.storage = storage;
        this.entries = [];
        this.previous = this.loadPrevious();
    }

    add(text, time = Date.now()) {
        this.entries.push({ time, text });
        if (this.entries.length > this.maxLines) this.entries.shift();
        try {
            this.storage.setItem(KEY, JSON.stringify(this.entries));
        } catch {
            // Full, blocked or unavailable storage only costs the log of this session
        }
    }

    lines() {
        const current = this.entries.map(formatLine);
        if (!this.previous.length) return current;
        return ["--- previous session ---", ...this.previous.map(formatLine), "--- this session ---", ...current];
    }

    loadPrevious() {
        try {
            const entries = JSON.parse(this.storage.getItem(KEY));
            return Array.isArray(entries) ? entries.filter((entry) => Number.isFinite(entry?.time)) : [];
        } catch {
            return [];
        }
    }
}

function formatLine({ time, text }) {
    return `${new Date(time).toLocaleTimeString([], { hour12: false })}  ${text}`;
}
