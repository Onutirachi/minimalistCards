// Reads and writes project.json in Wallpaper Engine's own format (tabs, CRLF, sorted keys, " : "),
// so generated changes produce the same diff the WE editor would.
import { readFileSync, writeFileSync } from "node:fs";

export const PROJECT_JSON = new URL("../project.json", import.meta.url);

const NEWLINE = "\r\n";

function serializeValue(value, depth) {
    const pad = "\t".repeat(depth);

    if (Array.isArray(value)) {
        if (value.every((item) => typeof item !== "object" || item === null)) return `[ ${value.map((item) => JSON.stringify(item)).join(", ")} ]`;
        const items = value.map((item) => `${pad}\t${serializeValue(item, depth + 1).replace(/^\r\n\t*/, "")}`);
        return `${NEWLINE}${pad}[${NEWLINE}${items.join(`,${NEWLINE}`)}${NEWLINE}${pad}]`;
    }

    if (value && typeof value === "object") {
        const entries = Object.keys(value)
            .sort()
            .map((key) => `${pad}\t${JSON.stringify(key)} : ${serializeValue(value[key], depth + 1)}`);
        return `${NEWLINE}${pad}{${NEWLINE}${entries.join(`,${NEWLINE}`)}${NEWLINE}${pad}}`;
    }

    return JSON.stringify(value);
}

export function serializeProject(project) {
    return serializeValue(project, 0).replace(/^\r\n/, "");
}

export function readProjectText() {
    return readFileSync(PROJECT_JSON, "utf8");
}

export function writeProject(project) {
    writeFileSync(PROJECT_JSON, serializeProject(project));
}
