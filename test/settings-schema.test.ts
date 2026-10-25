import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToHost } from "../extension/src/host/messages";
import { groupKeys, planSettingChange, settingsSchema, settingTitle, settingValueError, storedValue, SETTING_GROUPS, type ManifestPackage, type SettingSchema } from "../extension/src/host/settings-schema";
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
        "trama.advisorScanner": { type: "boolean", default: false, scope: "application", markdownDescription: "Advisor." },
        "trama.parallelExecution": { type: "boolean", default: false, scope: "application", markdownDescription: "Parallel." },
        "trama.maxParallelAgents": { type: "integer", default: 20, minimum: 1, scope: "application", markdownDescription: "Agents at once." },
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

test("every manifest description is at most two short sentences of about 160 characters; the language one is the text `ui#agents` fixes and the System Certificates one the text of `ui#developer.REFRESH_SYSTEM_CERTIFICATES`", () => {
  for (const [key, entry] of Object.entries(properties)) {
    const text = entry.markdownDescription ?? "";
    expect(text.length, key).toBeGreaterThan(0);
    if (key !== "trama.language" && key !== "trama.systemCertificates") expect(text.length, key).toBeLessThanOrEqual(170);
  }
  expect(properties["trama.systemCertificates"]).toEqual({
    type: "boolean",
    default: false,
    scope: "application",
    markdownDescription: "On: omp and your agent's commands trust the certificates your system trusts, for proxies that inspect HTTPS. Replaces `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE` and similar variables.",
  });
  expect(properties["trama.language"]?.markdownDescription).toBe(
    "The language the agent writes tasks, drifts, proposals, questions and replies in, for example `Italian`. The Model, Requirements, Specs and code stay in English. Empty (the default) keeps English.",
  );
  expect(properties["trama.theme"]?.markdownDescription).toBe("Colours of the Trama panel. Auto (the default) follows the editor's theme; Light and Dark fix it.");
});

/** The keys of the group Advanced, subgroups after subgroups. */
const advancedKeys = (): string[] => groupKeys(SETTING_GROUPS[SETTING_GROUPS.length - 1] as (typeof SETTING_GROUPS)[number]);

test("every key the manifest declares belongs to exactly one group or subgroup, and every grouped key is declared", () => {
  const grouped = SETTING_GROUPS.flatMap(groupKeys);
  expect(new Set(grouped).size).toBe(grouped.length);
  expect([...Object.keys(properties)].sort()).toEqual([...grouped].sort());
});

test("the groups, the subgroups of Advanced and their keys keep the order of the Settings tab and the wizard", () => {
  expect(SETTING_GROUPS.map((group) => [group.title, [...group.keys], (group.subgroups ?? []).map((sub) => [sub.title, [...sub.keys]])])).toEqual([
    ["omp", ["trama.ompPath", "trama.terminalLocation", "trama.ignoreInstructionFiles", "trama.autoExit", "trama.language", "trama.systemCertificates"], []],
    ["Models", ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"], []],
    ["Project", ["trama.skillsDir"], []],
    [
      "Advanced",
      [],
      [
        ["Appearance", ["trama.theme"]],
        ["Drifts", ["trama.advisorScanner", "trama.asyncDriftResolver"]],
        ["Agents", ["trama.parallelExecution", "trama.subagentsContextSharing", "trama.autoUpdateStaleProposals"]],
        ["omp Chat", ["trama.ompChat", "trama.ompChatApproval", "trama.ompChatIntentTracing"]],
        ["Notifications", ["trama.ntfyServer", "trama.ntfyTopic"]],
      ],
    ],
  ]);
  expect(SETTING_GROUPS.some((group) => group.title === "Features")).toBe(false);
  expect(groupSettings(schema).map((g) => [g.title, g.settings.map((s) => s.key), g.subgroups.map((sub) => [sub.title, sub.settings.map((s) => s.key)])])).toEqual([
    ["omp", ["trama.autoExit", "trama.language"], []],
    ["Models", ["trama.maxParallelAgents"], []],
    ["Project", ["trama.skillsDir"], []],
    ["Advanced", [], [["Drifts", ["trama.advisorScanner"]], ["Agents", ["trama.parallelExecution"]]]],
  ]);
});

test("the schema of the settings message carries each key's group and, for Advanced, its subgroup", () => {
  const all = settingsSchema(manifest);
  expect(all.map((s) => [s.group, s.subgroup ?? null])).toEqual(
    SETTING_GROUPS.flatMap((group) => [...group.keys.map(() => [group.title, null]), ...(group.subgroups ?? []).flatMap((sub) => sub.keys.map(() => [group.title, sub.title]))]),
  );
  expect(all.find((s) => s.key === "trama.theme")).toMatchObject({ group: "Advanced", subgroup: "Appearance" });
  expect(all.find((s) => s.key === "trama.autoExit")).toMatchObject({ group: "omp" });
  expect(all.find((s) => s.key === "trama.autoExit")?.subgroup).toBeUndefined();
  expect(schema.find((s) => s.key === "trama.advisorScanner")).toMatchObject({ group: "Advanced", subgroup: "Drifts" });
});

test("no group, title or description of the settings says Experimental", () => {
  expect(SETTING_GROUPS.some((group) => /experimental/i.test(group.title))).toBe(false);
  for (const entry of Object.values(properties)) expect(entry.markdownDescription ?? "").not.toMatch(/experimental/i);
});

test("there is no Drift Blocker setting: not in the manifest, not in any group, and the Drifts subgroup holds the Advisor Scanner and the Async Drift Resolver", () => {
  expect(properties["trama.driftBlocker"]).toBeUndefined();
  expect(SETTING_GROUPS.flatMap(groupKeys)).not.toContain("trama.driftBlocker");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.driftBlocker")).toBeUndefined();
  const advanced = SETTING_GROUPS[SETTING_GROUPS.length - 1];
  expect(advanced?.title).toBe("Advanced");
  expect(advanced?.subgroups?.find((sub) => sub.title === "Drifts")?.keys).toEqual(["trama.advisorScanner", "trama.asyncDriftResolver"]);
});

test("the Advisor Scanner is a checkbox of the last group, on by default and application-scoped", () => {
  const scanner = properties["trama.advisorScanner"];
  expect(scanner?.type).toBe("boolean");
  expect(scanner?.default).toBe(true);
  expect(scanner?.scope).toBe("application");
  expect(settingTitle("trama.advisorScanner")).toBe("Advisor Scanner");
  expect(advancedKeys()).toContain("trama.advisorScanner");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.advisorScanner")?.control).toBe("boolean");
});

test("the Parallel Execution is a checkbox, first of the Agents subgroup, on by default and application-scoped", () => {
  const parallel = properties["trama.parallelExecution"];
  expect(parallel?.type).toBe("boolean");
  expect(parallel?.default).toBe(true);
  expect(parallel?.scope).toBe("application");
  expect(settingTitle("trama.parallelExecution")).toBe("Parallel Execution");
  const agents = settingsSchema(manifest).filter((s) => s.subgroup === "Agents").map((s) => s.key);
  expect(agents[0]).toBe("trama.parallelExecution");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.parallelExecution")?.control).toBe("boolean");
});

test("the Async Drift Resolver is a checkbox right after the Advisor Scanner, last of the Drifts subgroup, on by default and application-scoped", () => {
  const resolver = properties["trama.asyncDriftResolver"];
  expect(resolver?.type).toBe("boolean");
  expect(resolver?.default).toBe(true);
  expect(resolver?.scope).toBe("application");
  expect(settingTitle("trama.asyncDriftResolver")).toBe("Async Drift Resolver");
  const drifts = settingsSchema(manifest).filter((s) => s.subgroup === "Drifts").map((s) => s.key);
  expect(drifts.indexOf("trama.asyncDriftResolver")).toBe(drifts.indexOf("trama.advisorScanner") + 1);
  expect(drifts[drifts.length - 1]).toBe("trama.asyncDriftResolver");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.asyncDriftResolver")?.control).toBe("boolean");
});

test("the Sub-agents Context Sharing is a checkbox right after the Parallel Execution, on by default, with its explicit title", () => {
  const sharing = properties["trama.subagentsContextSharing"];
  expect(sharing?.type).toBe("boolean");
  expect(sharing?.default).toBe(true);
  expect(sharing?.scope).toBe("application");
  expect(settingTitle("trama.subagentsContextSharing")).toBe("Sub-agents Context Sharing");
  const keys = advancedKeys();
  expect(keys.indexOf("trama.subagentsContextSharing")).toBe(keys.indexOf("trama.parallelExecution") + 1);
  expect(settingsSchema(manifest).find((s) => s.key === "trama.subagentsContextSharing")?.control).toBe("boolean");
});

test("the five optional features are on by default, their descriptions start with `On (the default):`, and ticking On saves nothing while Off is saved", () => {
  const keys = ["trama.advisorScanner", "trama.parallelExecution", "trama.asyncDriftResolver", "trama.subagentsContextSharing", "trama.autoUpdateStaleProposals"];
  const schema = settingsSchema(manifest);
  for (const key of keys) {
    const setting = schema.find((s) => s.key === key);
    expect(properties[key]?.default, key).toBe(true);
    expect(properties[key]?.markdownDescription, key).toStartWith("On (the default): ");
    expect(setting?.default, key).toBe(true);
    expect(storedValue(setting as never, true), key).toBeUndefined();
    expect(storedValue(setting as never, false), key).toBe(false);
  }
});

test("controls follow the manifest type; maxParallelAgents is a whole number of at least 1", () => {
  expect(setting("trama.autoExit").control).toBe("boolean");
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

test("the host no longer accepts a delegation message or the old Drift autopilot key", () => {
  expect(parseToHost({ type: "setDelegation", mode: "yolo" }).ok).toBe(false);
  expect(parseToHost({ type: "setSetting", key: "trama.driftAutoPilot", value: "yolo" }, schema).ok).toBe(false);
  expect(properties["trama.driftAutoPilot"]).toBeUndefined();
});

test("omp Chat is a checkbox in the omp Chat subgroup after Sub-agents Context Sharing, on by default, with its title and description", () => {
  const chat = properties["trama.ompChat"];
  expect(chat?.type).toBe("boolean");
  expect(chat?.default).toBe(true);
  expect(chat?.scope).toBe("application");
  expect(chat?.markdownDescription).toBe("Trama's jobs open a conversation in the omp Chat view instead of a terminal.");
  expect(settingTitle("trama.ompChat")).toBe("omp Chat");
  const keys = advancedKeys();
  expect(keys.indexOf("trama.autoUpdateStaleProposals")).toBe(keys.indexOf("trama.subagentsContextSharing") + 1);
  expect(keys.indexOf("trama.ompChat")).toBe(keys.indexOf("trama.autoUpdateStaleProposals") + 1);
  expect(settingsSchema(manifest).find((s) => s.key === "trama.ompChat")?.control).toBe("boolean");
});

test("a write of trama.ompChat is planned like any other", () => {
  expect(planSettingChange(settingsSchema(manifest), "trama.ompChat", false)).toEqual({ ok: true, writes: [{ key: "trama.ompChat", value: false }] });
  expect(planSettingChange(settingsSchema(manifest), "trama.advisorScanner", true).ok).toBe(true);
});

test("omp Chat Approval is a select right after omp Chat in its subgroup: yolo by default, ask or yolo, user scope, with its explicit title", () => {
  const approval = properties["trama.ompChatApproval"];
  expect(approval?.type).toBe("string");
  expect(approval?.enum).toEqual(["ask", "yolo"]);
  expect(approval?.default).toBe("yolo");
  expect(approval?.scope).toBe("application");
  expect(approval?.markdownDescription).toContain("`yolo` (the default): omp runs every command without asking");
  expect(approval?.markdownDescription).toContain("`ask`: omp asks permission as in the terminal");
  expect(settingTitle("trama.ompChatApproval")).toBe("omp Chat Approval");
  const keys = advancedKeys();
  expect(keys.indexOf("trama.ompChatApproval")).toBe(keys.indexOf("trama.ompChat") + 1);
  expect(settingsSchema(manifest).find((s) => s.key === "trama.ompChatApproval")?.control).toBe("enum");
});

test("omp Chat Intent Tracing is a checkbox last in the omp Chat subgroup, on by default, user scope, with its explicit title and description", () => {
  const tracing = properties["trama.ompChatIntentTracing"];
  expect(tracing?.type).toBe("boolean");
  expect(tracing?.default).toBe(true);
  expect(tracing?.scope).toBe("application");
  expect(tracing?.markdownDescription).toBe("On: in omp Chat the agent writes why it calls each tool. Off saves tokens. Applies to conversations started afterwards.");
  expect(settingTitle("trama.ompChatIntentTracing")).toBe("omp Chat Intent Tracing");
  const keys = SETTING_GROUPS[SETTING_GROUPS.length - 1]?.subgroups?.find((sub) => sub.title === "omp Chat")?.keys ?? [];
  expect(keys[keys.length - 1]).toBe("trama.ompChatIntentTracing");
  expect(settingsSchema(manifest).find((s) => s.key === "trama.ompChatIntentTracing")?.control).toBe("boolean");
});

test("the Notifications subgroup is the last of Advanced, after omp Chat: ntfy Server then ntfy Topic, both text fields read from the user settings only, with explicit titles and the descriptions of the Settings tab", () => {
  const advanced = SETTING_GROUPS[SETTING_GROUPS.length - 1];
  expect(advanced?.subgroups?.map((sub) => sub.title)).toEqual(["Appearance", "Drifts", "Agents", "omp Chat", "Notifications"]);
  expect(advanced?.subgroups?.at(-1)?.keys).toEqual(["trama.ntfyServer", "trama.ntfyTopic"]);
  expect(properties["trama.ntfyServer"]).toEqual({ type: "string", default: "https://ntfy.sh", scope: "application", markdownDescription: "Server that receives Trama's notifications. The default is the public ntfy.sh." });
  expect(properties["trama.ntfyTopic"]).toEqual({
    type: "string",
    default: "",
    scope: "application",
    markdownDescription: "Topic for a notification when omp Chat jobs finish or wait for you. Empty (the default) sends nothing; on ntfy.sh anyone who knows it can read them.",
  });
  expect(settingTitle("trama.ntfyServer")).toBe("ntfy Server");
  expect(settingTitle("trama.ntfyTopic")).toBe("ntfy Topic");
  const all = settingsSchema(manifest);
  expect(all.filter((s) => s.subgroup === "Notifications").map((s) => [s.key, s.control, s.group])).toEqual([
    ["trama.ntfyServer", "text", "Advanced"],
    ["trama.ntfyTopic", "text", "Advanced"],
  ]);
  // The older `trama.ntfy` is neither declared nor grouped.
  expect(properties["trama.ntfy"]).toBeUndefined();
  expect(SETTING_GROUPS.flatMap(groupKeys)).not.toContain("trama.ntfy");
});
