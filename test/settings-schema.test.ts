import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToHost } from "../extension/src/host/messages";
import { planSettingChange, settingsSchema, settingTitle, settingValueError, shownAgentValue, storedValue, SETTING_GROUPS, type ManifestPackage, type SettingSchema } from "../extension/src/host/settings-schema";
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
        "trama.experimentalAdvisorScanner": { type: "boolean", default: false, scope: "application", markdownDescription: "Advisor." },
        "trama.experimentalParallelExecution": { type: "boolean", default: false, scope: "application", markdownDescription: "Parallel." },
        "trama.maxParallelAgents": { type: "integer", default: 20, minimum: 1, scope: "application", markdownDescription: "Agents at once." },
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
    ["Appearance", ["trama.theme"]],
    ["Agent", ["trama.agent", "trama.ompPath", "trama.terminalLocation", "trama.autoExit", "trama.language"]],
    ["Models", ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"]],
    ["Project", ["trama.skillsDir"]],
    ["Experimental", ["trama.submitWhileRunning", "trama.experimentalDriftBlocker", "trama.experimentalAdvisorScanner", "trama.experimentalParallelExecution", "trama.experimentalAsyncDriftResolver"]],
  ]);
  expect(groupSettings(schema).map((g) => [g.title, g.settings.map((s) => s.key)])).toEqual([
    ["Agent", ["trama.autoExit", "trama.language"]],
    ["Models", ["trama.maxParallelAgents"]],
    ["Project", ["trama.skillsDir"]],
    ["Experimental", ["trama.submitWhileRunning", "trama.experimentalDriftBlocker", "trama.experimentalAdvisorScanner", "trama.experimentalParallelExecution"]],
  ]);
});

test("the Experimental Drift Blocker is a checkbox of the last group, off by default and application-scoped", () => {
  const blocker = properties["trama.experimentalDriftBlocker"];
  expect(blocker?.type).toBe("boolean");
  expect(blocker?.default).toBe(false);
  expect(blocker?.scope).toBe("application");
  expect(settingTitle("trama.experimentalDriftBlocker")).toBe("Experimental Drift Blocker");
  const last = SETTING_GROUPS[SETTING_GROUPS.length - 1];
  expect(last?.title).toBe("Experimental");
  expect(last?.keys).toContain("trama.experimentalDriftBlocker");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.experimentalDriftBlocker")?.control).toBe("boolean");
});

test("the Experimental Advisor Scanner is a checkbox of the last group, off by default and application-scoped", () => {
  const scanner = properties["trama.experimentalAdvisorScanner"];
  expect(scanner?.type).toBe("boolean");
  expect(scanner?.default).toBe(false);
  expect(scanner?.scope).toBe("application");
  expect(settingTitle("trama.experimentalAdvisorScanner")).toBe("Experimental Advisor Scanner");
  expect(SETTING_GROUPS[SETTING_GROUPS.length - 1]?.keys).toContain("trama.experimentalAdvisorScanner");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.experimentalAdvisorScanner")?.control).toBe("boolean");
});

test("the Experimental Parallel Execution is a checkbox right after the Advisor Scanner, off by default and application-scoped", () => {
  const parallel = properties["trama.experimentalParallelExecution"];
  expect(parallel?.type).toBe("boolean");
  expect(parallel?.default).toBe(false);
  expect(parallel?.scope).toBe("application");
  expect(settingTitle("trama.experimentalParallelExecution")).toBe("Experimental Parallel Execution");
  const keys = SETTING_GROUPS[SETTING_GROUPS.length - 1]?.keys ?? [];
  expect(keys.indexOf("trama.experimentalParallelExecution")).toBe(keys.indexOf("trama.experimentalAdvisorScanner") + 1);
  expect(settingsSchema(manifest).find((s) => s.key === "trama.experimentalParallelExecution")?.control).toBe("boolean");
});

test("the Experimental Async Drift Resolver is a checkbox right after the Parallel Execution, off by default and application-scoped", () => {
  const resolver = properties["trama.experimentalAsyncDriftResolver"];
  expect(resolver?.type).toBe("boolean");
  expect(resolver?.default).toBe(false);
  expect(resolver?.scope).toBe("application");
  expect(settingTitle("trama.experimentalAsyncDriftResolver")).toBe("Experimental Async Drift Resolver");
  const keys = SETTING_GROUPS[SETTING_GROUPS.length - 1]?.keys ?? [];
  expect(keys.indexOf("trama.experimentalAsyncDriftResolver")).toBe(keys.indexOf("trama.experimentalParallelExecution") + 1);
  expect(settingsSchema(manifest).find((s) => s.key === "trama.experimentalAsyncDriftResolver")?.control).toBe("boolean");
});

test("controls follow the manifest type; maxParallelAgents is a whole number of at least 1", () => {
  expect(setting("trama.autoExit").control).toBe("boolean");
  expect(setting("trama.submitWhileRunning").control).toBe("boolean");
  expect(setting("trama.language").control).toBe("text");
  expect(setting("trama.maxParallelAgents")).toMatchObject({ control: "integer", minimum: 1, default: 20 });
});

test("titles come from the key without its prefix", () => {
  expect(settingTitle("trama.maxParallelAgents")).toBe("Max Parallel Agents");
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
  expect(settingValueError(setting("trama.autoExit"), "yes")).not.toBeNull();
});

test("the default and an empty text remove the value from the user settings", () => {
  expect(storedValue(setting("trama.maxParallelAgents"), 20)).toBeUndefined();
  expect(storedValue(setting("trama.skillsDir"), ".agents/skills")).toBeUndefined();
  expect(storedValue(setting("trama.language"), "   ")).toBeUndefined();
  expect(storedValue(setting("trama.language"), "  Italian ")).toBe("Italian");
  expect(storedValue(setting("trama.maxParallelAgents"), 3)).toBe(3);
});

test("an unknown Trama key is refused in a setting change", () => {
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
  expect(set("trama.unknown", "x").ok).toBe(false);
  expect(set("editor.fontSize", 12).ok).toBe(false);
  expect(parseToHost({ type: "setSetting", key: "trama.autoExit", value: true }).ok).toBe(false);
});

test("a left-over chat or claude, or any other value, is shown as cursor; cursor and omp stay, unset stays unset", () => {
  expect(shownAgentValue("chat")).toBe("cursor");
  expect(shownAgentValue("claude")).toBe("cursor");
  expect(shownAgentValue("nonsense")).toBe("cursor");
  expect(shownAgentValue("cursor")).toBe("cursor");
  expect(shownAgentValue("omp")).toBe("omp");
  expect(shownAgentValue(undefined)).toBeUndefined();
});

test("the host no longer accepts a delegation message or the old Drift autopilot key", () => {
  expect(parseToHost({ type: "setDelegation", mode: "yolo" }).ok).toBe(false);
  expect(parseToHost({ type: "setSetting", key: "trama.driftAutoPilot", value: "yolo" }, schema).ok).toBe(false);
  expect(properties["trama.driftAutoPilot"]).toBeUndefined();
});
