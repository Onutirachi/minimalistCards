export default class TimeUtils {
    static getAutomaticLocale() {
        // 1. Tenta usar o idioma do navegador
        let locale = navigator.language || navigator.userLanguage;

        // 2. Se for en-US (ou não definido), tenta detectar pelo timezone
        if (!locale || locale.startsWith("en")) {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            if (tz.includes("Sao_Paulo")) locale = "pt-BR";
            else if (tz.includes("Lisbon")) locale = "pt-PT";
            else if (tz.includes("Madrid")) locale = "es-ES";
            else if (tz.includes("Paris")) locale = "fr-FR";
            else if (tz.includes("Berlin")) locale = "de-DE";
            else if (tz.includes("Tokyo")) locale = "ja-JP";
            else locale = "en-US";
        }

        return locale;
    }

    static getTime(showSeconds = true, format12h = false) {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        let suffix = "";
        if (format12h) {
            suffix = hours >= 12 ? " PM" : " AM";
            hours = hours % 12 || 12;
        }

        hours = String(hours).padStart(2, "0");

        return showSeconds ? `${hours}:${minutes}:${seconds}${suffix}` : `${hours}:${minutes}${suffix}`;
    }

    static getWeekdayLocalized(date = new Date(), locale = this.getAutomaticLocale()) {
        const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
        return weekday
            .replace(/^./, (c) => c.toUpperCase()) // primeira letra maiúscula
            .replace(/-feira/, "-Feira"); // mantém padrão pt-BR se for o caso
    }

    static getFullDateLocalized(date = new Date(), locale = this.getAutomaticLocale()) {
        const formatted = new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }).format(date);

        // Capitaliza a primeira letra do mês se for um idioma latino (ex: pt, es, fr, it)
        return formatted.replace(/de ([a-zç]+)/i, (match, month) => `de ${month.charAt(0).toUpperCase() + month.slice(1)}`);
    }
}
