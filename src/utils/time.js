const pad = (value) => String(value).padStart(2, "0");

/** Seconds to "mm:ss". */
export function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds) || 0);
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function formatClock(date, { showSeconds = true, format12h = false } = {}) {
    let hours = date.getHours();
    let suffix = "";

    if (format12h) {
        suffix = hours >= 12 ? " PM" : " AM";
        hours = hours % 12 || 12;
    }

    const time = `${pad(hours)}:${pad(date.getMinutes())}`;
    return (showSeconds ? `${time}:${pad(date.getSeconds())}` : time) + suffix;
}
