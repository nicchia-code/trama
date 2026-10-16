import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToHost } from "../extension/src/host/messages";
import { delegationOf, planSettingChange, raisesDelegation, settingsSchema, settingTitle, settingValueError, storedValue, SETTING_GROUPS, type ManifestPackage, type SettingSchema } from "../extension/src/host/settings-schema";
import { disabledBy, groupSettings, numberFromText, workspaceOverride } from "../extension/src/webview/settings/logic";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const properties = manifest.contributes?.configuration?.properties ?? {};

/** The shape of the settings the Settings tab reads, independent of the manifest's current state. */
const fixture: ManifestPackage = {
  contributes: {
    configuration: {
      properties: {
        "trama.autoExit": { type: "boolean", default: true, scope: "application", markdownDescription: "Close the terminal." },
        "trama.language": { type: "string", default: "", markdownDescription: "Language." },
        "trama.maxParallelAgents": { type: "integer", default: 20, minimum: 1, scope: "application", markdownDescription: "Agents at once." },
        "trama.autoFixDrifts": { type: "boolean", default: false, scope: "application", markdownDescription: "Non-critical Drifts." },
        "trama.autoFixCriticalDrifts": { type: "boolean", default: false, scope: "application", markdownDescription: "Critical Drifts too." },
        "trama.submitWhileRunning": { type: "boolean", default: false, markdownDescription: "Runs overlap." },
        "trama.skillsDir": { type: "string", default: ".agents/skills", markdownDescription: "Skills folder." },
      },
    },
  },
};
const schema = settingsSchema(fixture);
const setting = (key: string): SettingSchema => {
  const found = schema.find((s) => s.key === key);
  if (found === undefined) throw new Error(`no setting ${key}`);
  return found;
};

test("every key the manifest declares belongs to exactly one group, and every grouped key is declared", () => {
  const grouped = SETTING_GROUPS.flatMap((group) => group.keys);
  expect(new Set(grouped).size).toBe(grouped.length);
  expect([...Object.keys(properties)].sort()).toEqual([...grouped].sort());
});

test("the groups and their keys keep the order of the Settings tab", () => {
  expect(SETTING_GROUPS.map((group) => [group.title, [...group.keys]])).toEqual([
    ["Agent", ["trama.agent", "trama.terminalLocation", "trama.autoExit", "trama.language"]],
    ["Models", ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"]],
    ["Auto Fix Drifts", ["trama.autoFixDrifts", "trama.autoFixCriticalDrifts"]],
    ["Runs", ["trama.submitWhileRunning"]],
    ["Project", ["trama.skillsDir"]],
  ]);
  expect(groupSettings(schema).map((g) => [g.title, g.settings.map((s) => s.key)])).toEqual([
    ["Agent", ["trama.autoExit", "trama.language"]],
    ["Models", ["trama.maxParallelAgents"]],
    ["Auto Fix Drifts", ["trama.autoFixDrifts", "trama.autoFixCriticalDrifts"]],
    ["Runs", ["trama.submitWhileRunning"]],
    ["Project", ["trama.skillsDir"]],
  ]);
});

test("controls follow the manifest type; maxParallelAgents is a whole number of at least 1", () => {
  expect(setting("trama.autoExit").control).toBe("boolean");
  expect(setting("trama.autoFixDrifts").control).toBe("boolean");
  expect(setting("trama.autoFixCriticalDrifts").control).toBe("boolean");
  expect(setting("trama.submitWhileRunning").control).toBe("boolean");
  expect(setting("trama.language").control).toBe("text");
  expect(setting("trama.maxParallelAgents")).toMatchObject({ control: "integer", minimum: 1, default: 20 });
});

test("titles come from the key without its prefix, except the one in the title map", () => {
  expect(settingTitle("trama.maxParallelAgents")).toBe("Max Parallel Agents");
  expect(settingTitle("trama.autoFixCriticalDrifts")).toBe("Auto Fix Critical Drifts");
  expect(settingTitle("trama.skillsDir")).toBe("Skills Dir");
  expect(settingTitle("trama.autoExit")).toBe("Auto Exit Terminal");
  expect(setting("trama.autoExit").title).toBe("Auto Exit Terminal");
});

test("a value is valid only when it conforms to the schema", () => {
  const max = setting("trama.maxParallelAgents");
  expect(settingValueError(max, 1)).toBeNull();
  expect(settingValueError(max, 0)).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(max, 1.5)).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(max, NaN)).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(max, "3")).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(setting("trama.autoFixDrifts"), true)).toBeNull();
  expect(settingValueError(setting("trama.autoFixDrifts"), "yes")).not.toBeNull();
  expect(settingValueError(setting("trama.autoExit"), "yes")).not.toBeNull();
});

test("the default and an empty text remove the value from the user settings", () => {
  expect(storedValue(setting("trama.maxParallelAgents"), 20)).toBeUndefined();
  expect(storedValue(setting("trama.autoFixDrifts"), false)).toBeUndefined();
  expect(storedValue(setting("trama.autoFixDrifts"), true)).toBe(true);
  expect(storedValue(setting("trama.skillsDir"), ".agents/skills")).toBeUndefined();
  expect(storedValue(setting("trama.language"), "   ")).toBeUndefined();
  expect(storedValue(setting("trama.language"), "  Italian ")).toBe("Italian");
  expect(storedValue(setting("trama.maxParallelAgents"), 3)).toBe(3);
});

test("the delegation comes from the two checkboxes; critical Drifts alone grant nothing", () => {
  expect(delegationOf(false, false)).toBe("disabled");
  expect(delegationOf(false, true)).toBe("disabled");
  expect(delegationOf(true, false)).toBe("enabled");
  expect(delegationOf(true, true)).toBe("yolo");
  expect(delegationOf("true", true)).toBe("disabled");
  expect(delegationOf(undefined, true)).toBe("disabled");
  expect(raisesDelegation("disabled", "enabled")).toBe(true);
  expect(raisesDelegation("enabled", "yolo")).toBe(true);
  expect(raisesDelegation("yolo", "enabled")).toBe(false);
  expect(raisesDelegation("enabled", "enabled")).toBe(false);
});

test("the critical checkbox is disabled while Auto Fix Drifts is not on", () => {
  const critical = setting("trama.autoFixCriticalDrifts");
  expect(disabledBy(critical, { "trama.autoFixDrifts": { user: false } })).toBe(true);
  expect(disabledBy(critical, {})).toBe(true);
  expect(disabledBy(critical, { "trama.autoFixDrifts": { user: true } })).toBe(false);
  expect(disabledBy(setting("trama.autoFixDrifts"), {})).toBe(false);
});

test("raising the delegation asks first, with the explanation of the checkbox that grants it", () => {
  const user = (values: Record<string, unknown>) => (key: string) => values[key];
  const raiseMain = planSettingChange(schema, user({}), "trama.autoFixDrifts", true);
  expect(raiseMain).toEqual({
    ok: true,
    ask: { question: "Let the agent approve and fix non-critical Drifts on its own?", detail: "Non-critical Drifts." },
    writes: [{ key: "trama.autoFixDrifts", value: true }],
  });
  const raiseCritical = planSettingChange(schema, user({ "trama.autoFixDrifts": true }), "trama.autoFixCriticalDrifts", true);
  expect(raiseCritical.ok && raiseCritical.ask).toEqual({ question: "Let the agent approve and fix every Drift on its own, critical ones included?", detail: "Critical Drifts too." });
  const raiseMainWithCritical = planSettingChange(schema, user({ "trama.autoFixCriticalDrifts": true }), "trama.autoFixDrifts", true);
  expect(raiseMainWithCritical.ok && raiseMainWithCritical.ask?.question).toBe("Let the agent approve and fix every Drift on its own, critical ones included?");
  expect(raiseMainWithCritical.ok && raiseMainWithCritical.ask?.detail).toBe("Critical Drifts too.");
});

test("lowering the delegation asks nothing; turning Auto Fix Drifts off clears the critical one first", () => {
  const user = (values: Record<string, unknown>) => (key: string) => values[key];
  const off = planSettingChange(schema, user({ "trama.autoFixDrifts": true, "trama.autoFixCriticalDrifts": true }), "trama.autoFixDrifts", false);
  expect(off).toEqual({
    ok: true,
    writes: [
      { key: "trama.autoFixCriticalDrifts", value: undefined },
      { key: "trama.autoFixDrifts", value: undefined },
    ],
  });
  const lowerCritical = planSettingChange(schema, user({ "trama.autoFixDrifts": true, "trama.autoFixCriticalDrifts": true }), "trama.autoFixCriticalDrifts", false);
  expect(lowerCritical).toEqual({ ok: true, writes: [{ key: "trama.autoFixCriticalDrifts", value: undefined }] });
});

test("the host refuses a critical setting while Auto Fix Drifts is off", () => {
  const plan = planSettingChange(schema, () => undefined, "trama.autoFixCriticalDrifts", true);
  expect(plan.ok).toBe(false);
  expect(planSettingChange(schema, () => undefined, "trama.unknown", true).ok).toBe(false);
});

test("the workspace value is named only when it differs from the user's", () => {
  const language = setting("trama.language");
  expect(workspaceOverride(language, { user: "Italian", workspace: "Deutsch" })).toBe("Deutsch");
  expect(workspaceOverride(language, { user: "Italian", workspace: "Italian" })).toBeNull();
  expect(workspaceOverride(language, { workspace: "" })).toBeNull();
  expect(workspaceOverride(language, { user: "Italian", workspace: "" })).toBe("(empty)");
  expect(workspaceOverride(language, { user: "Italian" })).toBeNull();
});

test("a text typed in a whole-number field is a number only when it is one", () => {
  expect(numberFromText(" 4 ")).toBe(4);
  expect(numberFromText("")).toBeNaN();
  expect(numberFromText("x")).toBeNaN();
});

test("the host accepts a setting change only for a manifest key with a conforming value", () => {
  const set = (key: unknown, value: unknown) => parseToHost({ type: "setSetting", key, value }, schema);
  expect(set("trama.maxParallelAgents", 4)).toEqual({ ok: true, message: { type: "setSetting", key: "trama.maxParallelAgents", value: 4 } });
  expect(set("trama.autoExit", false).ok).toBe(true);
  expect(set("trama.autoFixDrifts", true).ok).toBe(true);
  expect(set("trama.autoFixCriticalDrifts", false).ok).toBe(true);
  expect(set("trama.language", "Italian").ok).toBe(true);
  expect(set("trama.maxParallelAgents", 0).ok).toBe(false);
  expect(set("trama.maxParallelAgents", "4").ok).toBe(false);
  expect(set("trama.autoExit", "true").ok).toBe(false);
  expect(set("trama.driftAutoPilot", "yolo").ok).toBe(false);
  expect(set("trama.unknown", "x").ok).toBe(false);
  expect(set("editor.fontSize", 12).ok).toBe(false);
  expect(parseToHost({ type: "setSetting", key: "trama.autoExit", value: true }).ok).toBe(false);
});
