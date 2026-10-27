// Wallpaper Engine's browser can report an English language regardless of the system language,
// so an English locale is double-checked against the time zone.
const TIME_ZONE_LOCALES = [
    ["Sao_Paulo", "pt-BR"],
    ["Lisbon", "pt-PT"],
    ["Madrid", "es-ES"],
    ["Paris", "fr-FR"],
    ["Berlin", "de-DE"],
    ["Tokyo", "ja-JP"],
];

export function detectLocale(language = globalThis.navigator?.language, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "") {
    if (language && !language.startsWith("en")) return language;
    const match = TIME_ZONE_LOCALES.find(([zone]) => timeZone.includes(zone));
    return match ? match[1] : language || "en-US";
}

const formatters = new Map();

function formatter(locale, options) {
    const key = `${locale}|${JSON.stringify(options)}`;
    if (!formatters.has(key)) {
        let format;
        try {
            format = new Intl.DateTimeFormat(locale, options);
        } catch {
            format = new Intl.DateTimeFormat("en-US", options);
        }
        formatters.set(key, format);
    }
    return formatters.get(key);
}

export function formatWeekday(date, locale) {
    return formatter(locale, { weekday: "long" })
        .format(date)
        .replace(/^./, (c) => c.toUpperCase())
        .replace(/-feira/, "-Feira"); // pt: "Sexta-Feira"
}

export function formatFullDate(date, locale) {
    return formatter(locale, { day: "2-digit", month: "long", year: "numeric" })
        .format(date)
        .replace(/de ([a-zç]+)/i, (_, month) => `de ${month[0].toUpperCase()}${month.slice(1)}`); // pt/es: "de Outubro"
}
