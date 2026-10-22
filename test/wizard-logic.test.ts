import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, type SettingsValues, settingsSchema } from "../extension/src/host/settings-schema";
import {
  agentCheckLine,
  changedWrites,
  checkState,
  confirmLabel,
  exclusions,
  hasPrevious,
  ignoresInstructionFiles,
  nextBlock,
  nextStep,
  openStep,
  openWizard,
  previousStep,
  setChoice,
  setInvalid,
  setRoot,
  setValue,
  skipAdvanced,
  STEP_SENTENCES,
  stepsFor,
  summaryRows,
  toggleExcluded,
  type Tree,
  visibleKeys,
  type WizardState,
} from "../extension/src/webview/wizard/logic";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const schema = settingsSchema(manifest);
const setting = (key: string) => schema.find((s) => s.key === key)!;
const open = (mode: "first" | "settings" | "empty-model" = "first", values: Record<string, SettingsValues> = {}) => openWizard(mode, null, values, "/work/app");

test("each mode and path shows its steps in order", () => {
  expect(stepsFor("first", null)).toEqual(["Path", "Agent", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("first", "scratch")).toEqual(["Path", "Agent", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("first", "import")).toEqual(["Path", "Agent", "Models", "Project", "Folders", "Advanced", "Summary"]);
  expect(stepsFor("settings", null)).toEqual(["Agent", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("settings", "import")).toEqual(["Agent", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("empty-model", "import")).toEqual(["Agent", "Models", "Project", "Folders", "Advanced", "Summary"]);
  expect(stepsFor("empty-model", "scratch")).toEqual(["Agent", "Models", "Project", "Advanced", "Summary"]);
});

test("the wizard opens on the first step of its mode, with the user values of the settings", () => {
  expect(open("first").step).toBe("Path");
  expect(open("settings").step).toBe("Agent");
  expect(open("empty-model").step).toBe("Agent");
  const state = open("settings", { "trama.agent": { user: "omp" }, "trama.scan": { user: "gpt-5" }, "trama.theme": {} });
  expect(state.values["trama.agent"]).toBe("omp");
  expect(state.values["trama.scan"]).toBe("gpt-5");
  expect(state.values["trama.theme"]).toBeUndefined();
  expect(Object.keys(state.values)).not.toContain("trama.language");
});

test("Back and Next keep the choices; Back is missing on the first step of the mode", () => {
  let state = setChoice(open("first"), "import");
  expect(hasPrevious(state)).toBe(false);
  state = setValue(nextStep(state), "trama.scan", "gpt-5");
  expect(state.step).toBe("Agent");
  expect(hasPrevious(state)).toBe(true);
  state = nextStep(nextStep(nextStep(state)));
  expect(state.step).toBe("Folders");
  state = previousStep(previousStep(previousStep(previousStep(previousStep(state)))));
  expect(state.step).toBe("Path");
  expect(state.choice).toBe("import");
  expect(state.values["trama.scan"]).toBe("gpt-5");
  expect(previousStep(state).step).toBe("Path");
  const settings = open("settings");
  expect(hasPrevious(settings)).toBe(false);
  expect(openStep(settings, "Folders").step).toBe("Agent");
  expect(openStep(settings, "Summary").step).toBe("Summary");
});

test("Next of Path needs a path, Next of Models a valid number of sub-agents, Next of Folders something still included", () => {
  const path = open("first");
  expect(nextBlock(schema, path)).toBe("Choose how to start");
  expect(nextBlock(schema, setChoice(path, "scratch"))).toBeNull();

  const models = { ...open("settings"), step: "Models" as const };
  expect(nextBlock(schema, models)).toBeNull();
  const invalid = setInvalid(models, "trama.maxParallelAgents", true);
  expect(nextBlock(schema, invalid)).toContain("Max Parallel Agents");
  expect(nextBlock(schema, setInvalid(invalid, "trama.maxParallelAgents", false))).toBeNull();

  const folders = { ...open("empty-model"), choice: "import" as const, step: "Folders" as const };
  expect(nextBlock(schema, folders)).toBe("Reading the folders");
  const tree: Tree = { "": [{ name: "src", kind: "folder", hasChildren: true }, { name: "README.md", kind: "file", hasChildren: false }] };
  expect(nextBlock(schema, { ...folders, tree })).toBeNull();
  expect(nextBlock(schema, { ...folders, tree, excluded: ["README.md", "src"] })).toBe("Include at least one folder or file");
  expect(nextBlock(schema, { ...folders, tree, excluded: ["README.md"] })).toBeNull();
});

test("Skip brings the keys of Advanced back to the values the step started with, then goes to the summary", () => {
  let state: WizardState = { ...open("settings", { "trama.theme": { user: "dark" } }), step: "Advanced" };
  state = setValue(setValue(state, "trama.theme", "light"), "trama.experimentalDriftBlocker", true);
  state = setValue(state, "trama.scan", "gpt-5");
  const skipped = skipAdvanced(state);
  expect(skipped.step).toBe("Summary");
  expect(skipped.values["trama.theme"]).toBe("dark");
  expect(skipped.values["trama.experimentalDriftBlocker"]).toBeUndefined();
  expect(skipped.values["trama.scan"]).toBe("gpt-5");
});

test("a new folder to initialize forgets the exclusions and the folders read", () => {
  const state = { ...open("first"), excluded: ["a"], tree: { "": [] } as Tree };
  expect(setRoot(state, "/work/app")).toBe(state);
  const moved = setRoot(state, "/work/other");
  expect(moved.root).toBe("/work/other");
  expect(moved.excluded).toEqual([]);
  expect(moved.tree).toEqual({});
});

test("the keys of omp show only with omp, and the language is never in the wizard", () => {
  expect(visibleKeys("Agent", "cursor")).toEqual(["trama.agent"]);
  expect(visibleKeys("Agent", "omp")).toEqual(["trama.agent", "trama.ompPath", "trama.terminalLocation", "trama.ignoreInstructionFiles"]);
  expect(visibleKeys("Models", "cursor")).toEqual(["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"]);
  expect(visibleKeys("Advanced", "cursor")[0]).toBe("trama.theme");
  expect(visibleKeys("Advanced", "cursor")).toHaveLength(7);
  for (const step of ["Agent", "Models", "Project", "Advanced"] as const) for (const key of visibleKeys(step, "omp")) expect(schema.some((s) => s.key === key)).toBe(true);
});

test("the Models step gives the advice in words and the note about ignored files shows only with omp and the setting on", () => {
  expect(STEP_SENTENCES.Models).toBe("Choose the model for each kind of work. Analysis works best with your most capable model, Execution with a mid-range one, Scan with a fast, light one.");
  let state = open("settings");
  expect(ignoresInstructionFiles(schema, state)).toBe(false);
  state = setValue(setValue(state, "trama.agent", "omp"), "trama.ignoreInstructionFiles", true);
  expect(ignoresInstructionFiles(schema, state)).toBe(true);
  expect(ignoresInstructionFiles(schema, setValue(state, "trama.agent", undefined))).toBe(false);
  expect(ignoresInstructionFiles(schema, setValue(state, "trama.ignoreInstructionFiles", undefined))).toBe(false);
});

test("the summary marks a key whose value differs from the user value now, comparing as Settings does", () => {
  const current = { "trama.scan": { user: "gpt-5" }, "trama.theme": { user: "dark" } } satisfies Record<string, SettingsValues>;
  let state = open("settings", current);
  // Same value with spaces, the default and an empty text count as no change.
  state = setValue(state, "trama.scan", " gpt-5 ");
  state = setValue(state, "trama.analysis", "");
  state = setValue(state, "trama.theme", "auto");
  state = setValue(state, "trama.maxParallelAgents", 4);
  const rows = summaryRows(schema, state, current, []);
  const row = (title: string) => rows.find((r) => r.title === title)!;
  expect(row("Scan").changed).toBe(false);
  expect(row("Analysis").changed).toBe(false);
  expect(row("Theme").changed).toBe(true);
  expect(row("Theme").was).toBe("dark");
  expect(row("Theme").value).toBe("auto");
  expect(row("Theme").isDefault).toBe(true);
  expect(row("Max Parallel Agents").changed).toBe(true);
  expect(row("Max Parallel Agents").mono).toBe(true);
  expect(row("Max Parallel Agents").was).toBe(String(setting("trama.maxParallelAgents").default));
  expect(row("Auto Exit")).toBeUndefined();
});

test("a value changed from outside while the wizard is open does not change the wizard; the summary compares with the value of that moment", () => {
  const state = open("settings", { "trama.scan": { user: "gpt-5" } });
  const outside = { "trama.scan": { user: "other" } } satisfies Record<string, SettingsValues>;
  expect(state.values["trama.scan"]).toBe("gpt-5");
  const row = summaryRows(schema, state, outside, []).find((r) => r.title === "Scan")!;
  expect(row.changed).toBe(true);
  expect(row.was).toBe("other");
});

test("the keys of omp are in the summary and the writes only with omp", () => {
  let state = open("settings");
  state = setValue(state, "trama.ompPath", "/opt/omp");
  expect(summaryRows(schema, state, {}, []).some((r) => r.title === "Omp Path")).toBe(false);
  expect(changedWrites(schema, state, {})).toEqual([]);
  state = setValue(state, "trama.agent", "omp");
  expect(summaryRows(schema, state, {}, []).some((r) => r.title === "Omp Path")).toBe(true);
  expect(changedWrites(schema, state, {})).toEqual([
    { key: "trama.agent", value: "omp" },
    { key: "trama.ompPath", value: "/opt/omp" },
  ]);
});

test("the writes are the changed keys in the order of the steps; a repeated confirmation writes only what still differs", () => {
  let state = open("settings");
  state = setValue(state, "trama.experimentalDriftBlocker", true);
  state = setValue(state, "trama.skillsDir", ".claude/skills");
  state = setValue(state, "trama.scan", "gpt-5");
  expect(changedWrites(schema, state, {}).map((w) => w.key)).toEqual(["trama.scan", "trama.skillsDir", "trama.experimentalDriftBlocker"]);
  const afterFailure = { "trama.scan": { user: "gpt-5" }, "trama.skillsDir": { user: ".claude/skills" } } satisfies Record<string, SettingsValues>;
  expect(changedWrites(schema, state, afterFailure)).toEqual([{ key: "trama.experimentalDriftBlocker", value: true }]);
});

test("the summary shows the path, the folder only with several folders, and the excluded folders", () => {
  const state = { ...setChoice(open("first"), "import"), excluded: ["b/c", "docs"] };
  const folders = [{ name: "app", root: "/work/app" }, { name: "lib", root: "/work/lib" }];
  const rows = summaryRows(schema, state, {}, folders);
  expect(rows.slice(0, 2).map((r) => [r.title, r.value])).toEqual([["Path", "Import from Code"], ["Folder", "app"]]);
  expect(rows.find((r) => r.title === "Excluded folders")?.value).toBe("b/c, docs");
  expect(summaryRows(schema, { ...state, excluded: [] }, {}, [folders[0]!]).find((r) => r.title === "Excluded folders")?.value).toBe("None");
  expect(summaryRows(schema, state, {}, [folders[0]!]).some((r) => r.title === "Folder")).toBe(false);
  expect(summaryRows(schema, open("settings"), {}, folders).some((r) => r.step === "Path" || r.step === "Folders")).toBe(false);
});

test("the confirmation button names the mode and the path", () => {
  expect(confirmLabel(open("first"))).toBe("Set up Trama");
  expect(confirmLabel(open("settings"))).toBe("Save settings");
  expect(confirmLabel(setChoice(open("empty-model"), "import"))).toBe("Save and import");
  expect(confirmLabel(setChoice(open("empty-model"), "scratch"))).toBe("Save and start");
});

const tree: Tree = {
  "": [
    { name: "docs", kind: "folder", hasChildren: true },
    { name: "src", kind: "folder", hasChildren: true },
    { name: "README.md", kind: "file", hasChildren: false },
  ],
  src: [
    { name: "core", kind: "folder", hasChildren: true },
    { name: "cli", kind: "folder", hasChildren: true },
  ],
  "src/core": [
    { name: "a.ts", kind: "file", hasChildren: false },
    { name: "b.ts", kind: "file", hasChildren: false },
  ],
};

test("removing a folder removes everything it holds; a folder with some entries removed shows the mixed box", () => {
  let excluded = toggleExcluded([], tree, "src/core/a.ts");
  expect(excluded).toEqual(["src/core/a.ts"]);
  expect(checkState(excluded, "src/core/a.ts")).toBe("unchecked");
  expect(checkState(excluded, "src/core")).toBe("indeterminate");
  expect(checkState(excluded, "src")).toBe("indeterminate");
  expect(checkState(excluded, "docs")).toBe("checked");
  // The mixed box includes all; the next press removes the folder with everything inside.
  excluded = toggleExcluded(excluded, tree, "src");
  expect(excluded).toEqual([]);
  excluded = toggleExcluded(excluded, tree, "src");
  expect(excluded).toEqual(["src"]);
  expect(checkState(excluded, "src/core/b.ts")).toBe("unchecked");
});

test("putting an entry back inside a removed folder puts the folder back without the other entries", () => {
  const excluded = toggleExcluded(["src"], tree, "src/core/a.ts");
  expect(excluded).toEqual(["src/cli", "src/core/b.ts"]);
  expect(checkState(excluded, "src/core/a.ts")).toBe("checked");
  expect(checkState(excluded, "src/core")).toBe("indeterminate");
  expect(checkState(excluded, "src")).toBe("indeterminate");
  expect(toggleExcluded(["docs", "src"], tree, "docs")).toEqual(["src"]);
});

test("a mixed box includes everything inside; a folder whose entries are all removed is removed itself", () => {
  expect(toggleExcluded(["src/cli", "src/core/b.ts"], tree, "src")).toEqual([]);
  let excluded = toggleExcluded([], tree, "src/core/a.ts");
  excluded = toggleExcluded(excluded, tree, "src/core/b.ts");
  expect(excluded).toEqual(["src/core"]);
  excluded = toggleExcluded(excluded, tree, "src/cli");
  expect(excluded).toEqual(["src"]);
});

test("the exclusions never repeat what a removed folder holds and are sorted", () => {
  expect(exclusions(["src/core/a.ts", "src", "docs", "docs"])).toEqual(["docs", "src"]);
  expect(exclusions(["b/c", "a", "b/a"])).toEqual(["a", "b/a", "b/c"]);
});

test("the Agent step says what the check found, without blocking", () => {
  expect(agentCheckLine(null)).toEqual({ tone: "checking", text: "Checking the agent…" });
  expect(agentCheckLine({ agent: "omp", ompPath: "", ok: true, models: 12 })).toEqual({ tone: "ok", text: "omp answered with 12 models." });
  expect(agentCheckLine({ agent: "omp", ompPath: "/x", ok: false, error: "omp not found at /x" })).toEqual({ tone: "warning", text: "omp not found at /x. You can go on and fix it later." });
  expect(agentCheckLine({ agent: "cursor", ompPath: "", ok: true })).toEqual({ tone: "ok", text: "Cursor's chat is available." });
  expect(agentCheckLine({ agent: "cursor", ompPath: "", ok: false })).toEqual({ tone: "warning", text: "Cursor's chat works only in Cursor. You can go on and fix it later." });
});
