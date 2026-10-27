// Wallpaper Engine events for the debug overlay, kept across reloads and crashes so the next load shows what came before.
// Every monitor runs its own instance on the same storage, so each instance writes its own entry, tagged with a short id.

const PREFIX = "minimalistcards.eventLog.";
const KEPT_SESSIONS = 16;
const SAME_START = 30000; // ms; instances started this close together belong to the same Wallpaper Engine start

export default class EventLog {
    constructor(maxLines, storage = globalThis.localStorage, now = Date.now()) {
        this.maxLines = maxLines;
        this.storage = storage;
        this.started = now;
        this.id = Math.random().toString(36).slice(2, 4).toUpperCase().padEnd(2, "0");
        this.key = `${PREFIX}${this.started}.${this.id}`;
        this.entries = [];
        this.previous = this.loadPrevious();
    }

    add(text, time = Date.now()) {
        this.entries.push({ time, text });
        if (this.entries.length > this.maxLines) this.entries.shift();
        try {
            this.storage.setItem(this.key, JSON.stringify(this.entries));
        } catch {
            // Full, blocked or unavailable storage only costs the log of this session
        }
    }

    lines() {
        const current = this.entries.map((entry) => formatLine(entry, this.id));
        if (!this.previous.length) return current;
        return ["--- previous start ---", ...this.previous, "--- this start ---", ...current];
    }

    /**
     * The merged lines of every instance from the latest earlier start (all monitors stop together on a crash).
     * Old sessions beyond `KEPT_SESSIONS` are deleted.
     */
    loadPrevious() {
        try {
            const sessions = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                const match = key?.startsWith(PREFIX) && key.slice(PREFIX.length).match(/^(\d+)\.(\w+)$/);
                if (match) sessions.push({ key, started: Number(match[1]), id: match[2] });
            }
            sessions.sort((a, b) => b.started - a.started);
            for (const session of sessions.slice(KEPT_SESSIONS)) this.storage.removeItem(session.key);

            const earlier = sessions.slice(0, KEPT_SESSIONS).filter((session) => session.started < this.started - SAME_START);
            if (!earlier.length) return [];
            const latest = earlier[0].started;
            const group = earlier.filter((session) => latest - session.started < SAME_START);

            return group
                .flatMap((session) => readEntries(this.storage, session.key).map((entry) => ({ ...entry, id: session.id })))
                .sort((a, b) => a.time - b.time)
                .map((entry) => formatLine(entry, entry.id));
        } catch {
            return [];
        }
    }
}

function readEntries(storage, key) {
    try {
        const entries = JSON.parse(storage.getItem(key));
        return Array.isArray(entries) ? entries.filter((entry) => Number.isFinite(entry?.time)) : [];
    } catch {
        return [];
    }
}

function formatLine({ time, text }, id) {
    return `${new Date(time).toLocaleTimeString([], { hour12: false })} ${id}  ${text}`;
}
