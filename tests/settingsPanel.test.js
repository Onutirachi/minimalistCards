import { test } from "node:test";
import assert from "node:assert/strict";
import { readProjectText, serializeProject } from "../tools/projectJson.mjs";
import { buildPanel, describeDefault } from "../tools/settingsPanel.mjs";

const text = readProjectText();
const project = JSON.parse(text);
const properties = project.general.properties;

test("project.json keeps Wallpaper Engine's format", () => {
    assert.equal(serializeProject(project), text);
});

test("project.json is in sync with the settings panel (run `npm run panel`)", () => {
    assert.equal(serializeProject(buildPanel(project)), text);
});

test("every option tip shows the option's current default", () => {
    for (const [key, property] of Object.entries(properties)) {
        if (!key.startsWith("hint")) continue;
        const option = properties[key.slice("hint".length)];
        assert.ok(option, `${key} has no option`);
        assert.ok(property.text.includes(`Default value = ${describeDefault(option)}</small>`), `${key} should show "${describeDefault(option)}"`);
    }
});

test("describeDefault reads each property type", () => {
    assert.equal(describeDefault({ type: "bool", value: true }), "On");
    assert.equal(describeDefault({ type: "slider", value: 0.25 }), "0.25");
    assert.equal(describeDefault({ type: "combo", value: "b", options: [{ label: "A", value: "a" }, { label: "Bee", value: "b" }] }), "Bee");
    assert.equal(describeDefault({ type: "file", value: "" }), "none");
    assert.equal(describeDefault({ type: "color", value: "0 0 0" }), "black");
    assert.equal(describeDefault({ type: "color", value: "1 0.5 0" }), "#FF8000");
});

test("an option missing from the panel is reported", () => {
    const changed = structuredClone(project);
    changed.general.properties.newoption = { type: "bool", value: true, text: "New" };
    assert.throws(() => buildPanel(changed), /newoption/);
});
