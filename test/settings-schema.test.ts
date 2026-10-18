import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToHost } from "../extension/src/host/messages";
import { delegationOf, planDelegationChange, planSettingChange, raisesDelegation, settingsSchema, settingTitle, settingValueError, storedValue, SETTING_GROUPS, type ManifestPackage, type SettingSchema } from "../extension/src/host/settings-schema";
import { groupSettings, numberFromText, workspaceOverride } from "../extension/src/webview/settings/logic";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const properties = manifest.contributes?.configuration?.properties ?? {};

/** The shape of the settings the Settings tab reads, independent of the manifest's current state. */
const fixture: ManifestPackage = {
  contributes: {
    configuration: {
      properties: {
        "trama.autoExit": { type: "boolean", default: true, scope: "application", markdownDescription: "Close the terminal." },
        "trama.language": { type: "string", default: "", markdownDescription: "Language." },
        "trama.experimentalDriftBlocker": { type: "boolean", default: false, scope: "application", markdownDescription: "Experimental." },
        "trama.maxParallelAgents": { type: "integer", default: 20, minimum: 1, scope: "application", markdownDescription: "Agents at once." },
        "trama.driftAutoPilot": { type: "string", enum: ["disabled", "enabled", "yolo"], enumDescriptions: ["Off level.", "Enabled level.", "Yolo level."], default: "disabled", scope: "application", markdownDescription: "Drift autopilot." },
        "trama.submitWhileRunning": { type: "boolean", default: false, markdownDescription: "Runs overlap." },
        "trama.skillsDir": { type: "string", default: ".agents/skills", markdownDescription: "Skills folder." },
      },
    },
  },
};
const schema = settingsSchema(fixture);
const DRIFT = "trama.driftAutoPilot";
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
    ["Agent", ["trama.agent", "trama.ompPath", "trama.terminalLocation", "trama.autoExit", "trama.language"]],
    ["Models", ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"]],
    ["Drift autopilot", ["trama.driftAutoPilot"]],
    ["Runs", ["trama.submitWhileRunning"]],
    ["Project", ["trama.skillsDir"]],
    ["Experimental", ["trama.experimentalDriftBlocker"]],
  ]);
  expect(groupSettings(schema).map((g) => [g.title, g.settings.map((s) => s.key)])).toEqual([
    ["Agent", ["trama.autoExit", "trama.language"]],
    ["Models", ["trama.maxParallelAgents"]],
    ["Drift autopilot", [DRIFT]],
    ["Runs", ["trama.submitWhileRunning"]],
    ["Project", ["trama.skillsDir"]],
    ["Experimental", ["trama.experimentalDriftBlocker"]],
  ]);
});

test("the Experimental Drift Blocker is the one checkbox of the last group, off by default and application-scoped", () => {
  const blocker = properties["trama.experimentalDriftBlocker"];
  expect(blocker?.type).toBe("boolean");
  expect(blocker?.default).toBe(false);
  expect(blocker?.scope).toBe("application");
  expect(settingTitle("trama.experimentalDriftBlocker")).toBe("Experimental Drift Blocker");
  const last = SETTING_GROUPS[SETTING_GROUPS.length - 1];
  expect(last?.title).toBe("Experimental");
  expect(last?.keys).toEqual(["trama.experimentalDriftBlocker"]);
  expect(settingsSchema(manifest).find((s) => s.key === "trama.experimentalDriftBlocker")?.control).toBe("boolean");
});

test("controls follow the manifest type; maxParallelAgents is a whole number of at least 1", () => {
  expect(setting("trama.autoExit").control).toBe("boolean");
  expect(setting(DRIFT).control).toBe("enum");
  expect(setting("trama.submitWhileRunning").control).toBe("boolean");
  expect(setting("trama.language").control).toBe("text");
  expect(setting("trama.maxParallelAgents")).toMatchObject({ control: "integer", minimum: 1, default: 20 });
});

test("titles come from the key without its prefix", () => {
  expect(settingTitle("trama.maxParallelAgents")).toBe("Max Parallel Agents");
  expect(settingTitle(DRIFT)).toBe("Drift Auto Pilot");
  expect(settingTitle("trama.skillsDir")).toBe("Skills Dir");
  expect(settingTitle("trama.autoExit")).toBe("Auto Exit");
  expect(setting("trama.autoExit").title).toBe("Auto Exit");
});

test("a value is valid only when it conforms to the schema", () => {
  const max = setting("trama.maxParallelAgents");
  expect(settingValueError(max, 1)).toBeNull();
  expect(settingValueError(max, 0)).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(max, 1.5)).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(max, NaN)).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(max, "3")).toBe("Enter a whole number of at least 1.");
  expect(settingValueError(setting(DRIFT), "yolo")).toBeNull();
  expect(settingValueError(setting(DRIFT), "on")).not.toBeNull();
  expect(settingValueError(setting("trama.autoExit"), "yes")).not.toBeNull();
});

test("the default and an empty text remove the value from the user settings", () => {
  expect(storedValue(setting("trama.maxParallelAgents"), 20)).toBeUndefined();
  expect(storedValue(setting(DRIFT), "disabled")).toBeUndefined();
  expect(storedValue(setting(DRIFT), "enabled")).toBe("enabled");
  expect(storedValue(setting("trama.skillsDir"), ".agents/skills")).toBeUndefined();
  expect(storedValue(setting("trama.language"), "   ")).toBeUndefined();
  expect(storedValue(setting("trama.language"), "  Italian ")).toBe("Italian");
  expect(storedValue(setting("trama.maxParallelAgents"), 3)).toBe(3);
});

test("the delegation is the value of the Drift autopilot setting; unset or unknown counts as disabled", () => {
  expect(delegationOf(undefined)).toBe("disabled");
  expect(delegationOf("disabled")).toBe("disabled");
  expect(delegationOf("enabled")).toBe("enabled");
  expect(delegationOf("yolo")).toBe("yolo");
  expect(delegationOf("on")).toBe("disabled");
  expect(delegationOf(true)).toBe("disabled");
  expect(raisesDelegation("disabled", "enabled")).toBe(true);
  expect(raisesDelegation("enabled", "yolo")).toBe(true);
  expect(raisesDelegation("yolo", "enabled")).toBe(false);
  expect(raisesDelegation("enabled", "enabled")).toBe(false);
});

test("the Drift autopilot menu takes its levels, explanations and default from the manifest", () => {
  expect(settingsSchema(manifest).find((s) => s.key === DRIFT)).toMatchObject({
    group: "Drift autopilot",
    control: "enum",
    default: properties[DRIFT]?.default,
    values: properties[DRIFT]?.enum,
    descriptions: properties[DRIFT]?.enumDescriptions,
  });
});

test("raising the delegation asks first, with the manifest's explanation of the level chosen", () => {
  const drift = setting(DRIFT);
  expect(planDelegationChange(drift, undefined, "enabled")).toEqual({
    ok: true,
    ask: { question: "Let the agent approve and fix non-critical Drifts on its own?", detail: "Enabled level." },
    writes: [{ key: DRIFT, value: "enabled" }],
  });
  expect(planDelegationChange(drift, "enabled", "yolo")).toEqual({
    ok: true,
    ask: { question: "Let the agent approve and fix every Drift on its own, critical ones included?", detail: "Yolo level." },
    writes: [{ key: DRIFT, value: "yolo" }],
  });
  expect(planDelegationChange(drift, undefined, "yolo")).toEqual({
    ok: true,
    ask: { question: "Let the agent approve and fix every Drift on its own, critical ones included?", detail: "Yolo level." },
    writes: [{ key: DRIFT, value: "yolo" }],
  });
});

test("lowering the delegation asks nothing; Off clears the setting; the same level writes nothing", () => {
  const drift = setting(DRIFT);
  expect(planDelegationChange(drift, "yolo", "enabled")).toEqual({ ok: true, writes: [{ key: DRIFT, value: "enabled" }] });
  expect(planDelegationChange(drift, "yolo", "disabled")).toEqual({ ok: true, writes: [{ key: DRIFT, value: undefined }] });
  expect(planDelegationChange(drift, "enabled", "disabled")).toEqual({ ok: true, writes: [{ key: DRIFT, value: undefined }] });
  expect(planDelegationChange(drift, "yolo", "yolo")).toEqual({ ok: true, writes: [] });
});

test("the Drift autopilot key changes only through the menu; the host refuses it in a generic change", () => {
  expect(planSettingChange(schema, DRIFT, "yolo").ok).toBe(false);
  expect(planSettingChange(schema, "trama.unknown", true).ok).toBe(false);
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
  expect(set("trama.language", "Italian").ok).toBe(true);
  expect(set("trama.maxParallelAgents", 0).ok).toBe(false);
  expect(set("trama.maxParallelAgents", "4").ok).toBe(false);
  expect(set("trama.autoExit", "true").ok).toBe(false);
  expect(set(DRIFT, "on").ok).toBe(false);
  expect(set("trama.unknown", "x").ok).toBe(false);
  expect(set("editor.fontSize", 12).ok).toBe(false);
  expect(parseToHost({ type: "setSetting", key: "trama.autoExit", value: true }).ok).toBe(false);
});

test("the host accepts a Drift autopilot level only as one of the three", () => {
  expect(parseToHost({ type: "setDelegation", mode: "yolo" }).ok).toBe(true);
  expect(parseToHost({ type: "setDelegation", mode: "on" }).ok).toBe(false);
  expect(parseToHost({ type: "setDelegation" }).ok).toBe(false);
});
