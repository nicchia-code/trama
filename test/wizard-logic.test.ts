import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, type SettingsValues, SETTING_GROUPS, settingsSchema } from "../extension/src/host/settings-schema";
import { ADVANCED_GROUP_SENTENCE, ignoresInstructionFiles, ROLE_ADVICE, STEP_SENTENCES } from "../extension/src/webview/setup-shared";
import {
  advancedSubgroups,
  agentCheckLine,
  ompAnswers,
  ompMissing,
  changedWrites,
  checkState,
  chosenSolo,
  confirmLabel,
  exclusions,
  hasPrevious,
  nextBlock,
  nextStep,
  offersSolo,
  openStep,
  openWizard,
  previousStep,
  previousSteps,
  setChoice,
  setInvalid,
  setRoot,
  setValue,
  showsFolderNotice,
  skipAdvanced,
  soloAvailable,
  soloRows,
  stepPosition,
  stepsFor,
  summaryRows,
  toggleExcluded,
  type Tree,
  STEP_KEYS,
  valueParts,
  type WizardState,
  type WizardStep,
  wizardTitle,
} from "../extension/src/webview/wizard/logic";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const schema = settingsSchema(manifest);
const setting = (key: string) => schema.find((s) => s.key === key)!;
const open = (mode: "first" | "settings" | "empty-model" = "first", values: Record<string, SettingsValues> = {}) => openWizard(mode, null, values, "/work/app");

test("each mode and path shows its steps in order", () => {
  expect(stepsFor("first", null)).toEqual(["Path", "omp", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("first", "scratch")).toEqual(["Path", "omp", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("first", "import")).toEqual(["Path", "omp", "Models", "Project", "Folders", "Advanced", "Summary"]);
  expect(stepsFor("settings", null)).toEqual(["omp", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("settings", "import")).toEqual(["omp", "Models", "Project", "Advanced", "Summary"]);
  expect(stepsFor("empty-model", "import")).toEqual(["omp", "Models", "Project", "Folders", "Advanced", "Summary"]);
  expect(stepsFor("empty-model", "scratch")).toEqual(["omp", "Models", "Project", "Advanced", "Summary"]);
});

test("the wizard opens on the first step of its mode, with the user values of the settings", () => {
  expect(open("first").step).toBe("Path");
  expect(open("settings").step).toBe("omp");
  expect(open("empty-model").step).toBe("omp");
  const state = open("settings", { "trama.ompPath": { user: "/x/omp" }, "trama.scan": { user: "gpt-5" }, "trama.theme": {} });
  expect(state.values["trama.ompPath"]).toBe("/x/omp");
  expect(state.values["trama.scan"]).toBe("gpt-5");
  expect(state.values["trama.theme"]).toBeUndefined();
  expect(Object.keys(state.values)).toContain("trama.language");
  expect(state.values["trama.language"]).toBeUndefined();
  expect(open("settings", { "trama.language": { user: "Italian" } }).values["trama.language"]).toBe("Italian");
});

test("Back and Next keep the choices; Back is missing on the first step of the mode", () => {
  let state = setChoice(open("first"), "import");
  expect(hasPrevious(state)).toBe(false);
  state = setValue(nextStep(state), "trama.scan", "gpt-5");
  expect(state.step).toBe("omp");
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
  // A step reached only with Next: the indicator never leads forward.
  expect(openStep(settings, "Folders").step).toBe("omp");
  expect(openStep(settings, "Summary").step).toBe("omp");
});

test("Next of Path needs a path, Next of Models a valid number of sub-agents, Next of Folders something still included", () => {
  const path = open("first");
  expect(nextBlock(schema, path, null)).toBe("Choose how to start");
  expect(nextBlock(schema, setChoice(path, "scratch"), null)).toBeNull();

  const models = { ...open("settings"), step: "Models" as const };
  expect(nextBlock(schema, models, null)).toBeNull();
  const invalid = setInvalid(models, "trama.maxParallelAgents", true);
  expect(nextBlock(schema, invalid, null)).toContain("Max Parallel Agents");
  expect(nextBlock(schema, setInvalid(invalid, "trama.maxParallelAgents", false), null)).toBeNull();

  const folders = { ...open("empty-model"), choice: "import" as const, step: "Folders" as const };
  expect(nextBlock(schema, folders, null)).toBe("Reading the folders");
  const tree: Tree = { "": [{ name: "src", kind: "folder", hasChildren: true }, { name: "README.md", kind: "file", hasChildren: false }] };
  expect(nextBlock(schema, { ...folders, tree }, null)).toBeNull();
  expect(nextBlock(schema, { ...folders, tree, excluded: ["README.md", "src"] }, null)).toBe("Include at least one folder or file");
  expect(nextBlock(schema, { ...folders, tree, excluded: ["README.md"] }, null)).toBeNull();
});

test("Skip brings the keys of Advanced back to the values the step started with, then goes to the summary", () => {
  let state: WizardState = { ...open("settings", { "trama.theme": { user: "dark" } }), step: "Advanced" };
  state = setValue(setValue(state, "trama.theme", "light"), "trama.advisorScanner", false);
  state = setValue(state, "trama.scan", "gpt-5");
  const skipped = skipAdvanced(state);
  expect(skipped.step).toBe("Summary");
  expect(skipped.values["trama.theme"]).toBe("dark");
  expect(skipped.values["trama.advisorScanner"]).toBeUndefined();
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

test("the keys of each step are always shown: the omp step asks the language, never Auto Exit", () => {
  expect(STEP_KEYS.omp).toEqual(["trama.ompPath", "trama.terminalLocation", "trama.ignoreInstructionFiles", "trama.language", "trama.systemCertificates"]);
  expect(STEP_KEYS.Models).toEqual(["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"]);
  expect(STEP_KEYS.Project).toEqual(["trama.skillsDir"]);
  expect(STEP_KEYS.Advanced?.[0]).toBe("trama.theme");
  expect(STEP_KEYS.Advanced?.slice(-3)).toEqual(["trama.ompChat", "trama.ompChatApproval", "trama.ompChatIntentTracing"]);
  for (const step of ["omp", "Models", "Project", "Advanced"] as const) for (const key of STEP_KEYS[step] ?? []) expect(schema.some((s) => s.key === key)).toBe(true);
});

test("Advanced has four subgroups with their subtitles, in order, from the schema of the shared groups, and they are its keys in order", () => {
  const advanced = SETTING_GROUPS.find((group) => group.title === "Advanced");
  // The wizard skips the Notifications subgroup: its two keys are set only in the Settings tab, and no step or summary row has them.
  expect(advanced?.subgroups?.at(-1)).toEqual({ title: "Notifications", keys: ["trama.ntfyServer", "trama.ntfyTopic"] });
  expect(advancedSubgroups(schema)).toEqual((advanced?.subgroups ?? []).filter((sub) => sub.title !== "Notifications").map((sub) => ({ title: sub.title, keys: [...sub.keys] })));
  expect(Object.values(STEP_KEYS).flat()).not.toContain("trama.ntfyServer");
  expect(Object.values(STEP_KEYS).flat()).not.toContain("trama.ntfyTopic");
  expect(advancedSubgroups(schema).map((group) => [group.title, group.keys])).toEqual([
    ["Appearance", ["trama.theme"]],
    ["Drifts", ["trama.advisorScanner", "trama.asyncDriftResolver"]],
    ["Agents", ["trama.parallelExecution", "trama.subagentsContextSharing", "trama.autoUpdateStaleProposals"]],
    ["omp Chat", ["trama.ompChat", "trama.ompChatApproval", "trama.ompChatIntentTracing"]],
  ]);
  expect(STEP_KEYS.Advanced).toEqual(advancedSubgroups(schema).flatMap((group) => group.keys));
  const rows = summaryRows(schema, open("settings"), {}, []).filter((row) => row.step === "Advanced");
  expect(rows.map((row) => row.group)).toEqual(["Appearance", "Drifts", "Drifts", "Agents", "Agents", "Agents", "omp Chat", "omp Chat", "omp Chat"]);
  expect(summaryRows(schema, open("settings"), {}, []).filter((row) => row.step !== "Advanced").every((row) => row.group === null)).toBe(true);
});

test("the title of the page, the sentences of the steps, the advice of the roles and where the notice of Get Started shows", () => {
  expect(wizardTitle("first")).toBe("Set up Trama");
  expect(wizardTitle("settings")).toBe("Guided setup");
  expect(wizardTitle("empty-model")).toBe("Guided setup");
  expect(STEP_SENTENCES).toEqual({
    Path: "Choose how Trama starts in this folder.",
    omp: "omp is required: Trama runs every agent with omp.",
    Models: "Choose the model for each kind of work.",
    Project: "Choose where Trama installs the agent skills.",
    Folders: "Uncheck the folders the agent should not import.",
    Advanced: "Theme and optional features. You can skip this step.",
    Summary: "Check your choices, then confirm.",
  });
  expect(ROLE_ADVICE).toEqual({ "trama.analysis": "Your most capable model.", "trama.execution": "A mid-range model.", "trama.scan": "A fast, light model." });
  expect(ADVANCED_GROUP_SENTENCE).toBe("Theme and optional features.");
  expect((["Path", "omp", "Models", "Project", "Folders", "Advanced", "Summary"] as const).filter(showsFolderNotice)).toEqual(["Path", "Summary"]);
});

test("the note about ignored files shows only with the setting on", () => {
  let state = open("settings");
  expect(ignoresInstructionFiles(schema, state.values)).toBe(false);
  state = setValue(state, "trama.ignoreInstructionFiles", true);
  expect(ignoresInstructionFiles(schema, state.values)).toBe(true);
  expect(ignoresInstructionFiles(schema, setValue(state, "trama.ignoreInstructionFiles", undefined).values)).toBe(false);
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

test("the keys of omp are always in the summary and the writes", () => {
  let state = open("settings");
  state = setValue(state, "trama.ompPath", "/opt/omp");
  expect(summaryRows(schema, state, {}, []).some((r) => r.title === "Omp Path")).toBe(true);
  expect(changedWrites(schema, state, {})).toEqual([{ key: "trama.ompPath", value: "/opt/omp" }]);
});

test("the writes are the changed keys in the order of the steps; a repeated confirmation writes only what still differs", () => {
  let state = open("settings");
  state = setValue(state, "trama.advisorScanner", false);
  state = setValue(state, "trama.skillsDir", ".claude/skills");
  state = setValue(state, "trama.scan", "gpt-5");
  expect(changedWrites(schema, state, {}).map((w) => w.key)).toEqual(["trama.scan", "trama.skillsDir", "trama.advisorScanner"]);
  const afterFailure = { "trama.scan": { user: "gpt-5" }, "trama.skillsDir": { user: ".claude/skills" } } satisfies Record<string, SettingsValues>;
  expect(changedWrites(schema, state, afterFailure)).toEqual([{ key: "trama.advisorScanner", value: false }]);
  // Ticking On is the default: nothing to write.
  expect(changedWrites(schema, setValue(open("settings"), "trama.advisorScanner", true), {})).toEqual([]);
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

test("a model role shows its model and its level in the summary, the model alone for Default, and the value as written when omp declares no such level", () => {
  const models = [{ value: "anthropic/claude-haiku-4-5", thinking: ["low", "high"] }];
  const execution = (value: string | undefined, current?: string) =>
    summaryRows(schema, open("settings", value === undefined ? {} : { "trama.execution": { user: value } }), current === undefined ? {} : { "trama.execution": { user: current } }, [], models).find((r) => r.title === "Execution")!;
  expect(execution("anthropic/claude-haiku-4-5:high").value).toBe("anthropic/claude-haiku-4-5 · high");
  expect(execution("anthropic/claude-haiku-4-5").value).toBe("anthropic/claude-haiku-4-5");
  expect(execution("anthropic/claude-haiku-4-5:medium").value).toBe("anthropic/claude-haiku-4-5:medium");
  expect(execution("anthropic/claude-haiku-4-5:high", "anthropic/claude-haiku-4-5:low")).toMatchObject({ changed: true, was: "anthropic/claude-haiku-4-5 · low" });
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

test("the omp step says what the check found", () => {
  expect(agentCheckLine(null)).toEqual({ tone: "checking", text: "Checking omp…" });
  expect(agentCheckLine({ ompPath: "", state: "updating", version: "18.13.0" })).toEqual({ tone: "checking", text: "Updating omp to 18.13.0…" });
  expect(agentCheckLine({ ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 12 })).toEqual({ tone: "ok", text: "omp 18.12.6 answered with 12 models." });
  expect(agentCheckLine({ ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 12, updateError: "omp update exited with code 1" })).toEqual({
    tone: "warning",
    text: "Could not update omp (omp update exited with code 1). omp 18.12.6 answered with 12 models.",
  });
  expect(agentCheckLine({ ompPath: "/x", state: "done", ok: false, missing: true, error: "omp not found at /x" })).toEqual({ tone: "warning", text: "omp not found at /x. Trama cannot work without omp." });
  // One full stop between the reason and the sentence, also when the reason ends with one.
  expect(agentCheckLine({ ompPath: "/x", state: "done", ok: false, missing: false, error: "omp did not answer in time." })).toEqual({ tone: "warning", text: "omp did not answer in time. Trama cannot work without omp." });
  expect(agentCheckLine({ ompPath: "/x", state: "done", ok: false, missing: false })).toEqual({ tone: "warning", text: "omp did not answer. Trama cannot work without omp." });
});

test("an omp older than the minimum shows the sentence in place of its version, and offers Install omp", () => {
  const old = { ompPath: "", state: "done", ok: true, missing: false, version: "18.12.5", models: 12, tooOld: true } as const;
  expect(agentCheckLine(old)).toEqual({ tone: "warning", text: "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5." });
  expect(ompMissing(old)).toBe(true);
  // A version that cannot be read is told as unknown.
  expect(agentCheckLine({ ompPath: "", state: "done", ok: true, missing: false, models: 1, tooOld: true })).toEqual({ tone: "warning", text: "Trama needs omp 18.12.6 or later; the installed omp is unknown." });
  // A recent omp, or one still being checked, keeps its line and no Install omp.
  expect(ompMissing({ ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 12 })).toBe(false);
  expect(ompMissing({ ompPath: "", state: "updating", version: "18.13.0" })).toBe(false);
  expect(ompMissing(null)).toBe(false);
});

const MODES: { mode: "first" | "settings" | "empty-model"; choice: "import" | "scratch" | null }[] = [
  { mode: "first", choice: "import" },
  { mode: "first", choice: "scratch" },
  { mode: "settings", choice: null },
  { mode: "empty-model", choice: "import" },
  { mode: "empty-model", choice: "scratch" },
];

test("developer.OPEN_SETUP_STEP leads from every step to every earlier step of the mode, keeping the choices, and never forward", () => {
  for (const { mode, choice } of MODES) {
    const steps = stepsFor(mode, choice);
    for (const [index, from] of steps.entries()) {
      let state: WizardState = { ...openWizard(mode, choice, {}, "/work/app"), step: from };
      state = setValue(setChoice(state, choice ?? "scratch"), "trama.scan", "gpt-5");
      state = { ...state, choice, excluded: ["docs"] };
      expect(previousSteps(state)).toEqual(steps.slice(0, index));
      for (const [target, step] of steps.entries()) {
        const opened = openStep(state, step);
        if (target < index) {
          expect(opened.step).toBe(step);
          expect(opened.choice).toBe(choice);
          expect(opened.excluded).toEqual(["docs"]);
          expect(opened.values["trama.scan"]).toBe("gpt-5");
        } else expect(opened).toBe(state);
      }
      // Path only in the first setup and Folders only with Import from Code in the modes that have it.
      expect(openStep(state, "Path").step).toBe(mode === "first" && index > 0 ? "Path" : from);
      expect(openStep(state, "Folders").step === "Folders").toBe(from === "Folders" || (steps.includes("Folders") && steps.indexOf("Folders") < index));
    }
  }
});

test("a step that the mode does not show is never opened", () => {
  const summary: WizardState = { ...open("settings"), step: "Summary" };
  expect(openStep(summary, "Path")).toBe(summary);
  expect(openStep(summary, "Folders")).toBe(summary);
  expect(openStep(summary, "Summary")).toBe(summary);
});

test("the position of the step on view: «Step <n> of <N> · <step>» and the part of the bar that is full", () => {
  const at = (step: WizardStep, mode: "first" | "settings" = "first") => stepPosition({ ...setChoice(open(mode), "import"), step });
  expect(at("Path")).toEqual({ n: 1, total: 7, name: "Path", percent: 14 });
  expect(at("Folders")).toEqual({ n: 5, total: 7, name: "Folders", percent: 71 });
  expect(at("Summary")).toEqual({ n: 7, total: 7, name: "Summary", percent: 100 });
  expect(at("omp", "settings")).toEqual({ n: 1, total: 5, name: "omp", percent: 20 });
});

test("a long value breaks after a slash, a hyphen, an underscore or a dot, and an empty text shows as empty", () => {
  expect(valueParts("src/core/long-name_x.ts")).toEqual(["src/", "core/", "long-", "name_", "x.", "ts"]);
  expect(valueParts("plain")).toEqual(["plain"]);
  const rows = summaryRows(schema, open("settings"), {}, []);
  expect(rows.find((r) => r.title === "Omp Path")).toMatchObject({ empty: true, value: "(empty)", isDefault: true });
  expect(rows.find((r) => r.title === "Skills Dir")?.empty).toBe(false);
  expect(rows.find((r) => r.title === "Theme")?.empty).toBe(false);
});

test("Next of the omp step waits for omp to answer with the path of the step and with at least one usable model", () => {
  const omp = openStep(openWizard("settings", null, { "trama.ompPath": { user: "/x/omp" } }, null), "omp");
  const BLOCK = "omp must answer before you go on.";
  const NO_MODELS = "omp has no models yet. Log in to a provider or set an API key.";
  expect(nextBlock(schema, omp, null)).toBe(BLOCK);
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "updating", version: "2" })).toBe(BLOCK);
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: false, missing: true, error: "omp not found at /x/omp" })).toBe(BLOCK);
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: false, missing: false, error: "omp exited with code 1" })).toBe(BLOCK);
  expect(nextBlock(schema, omp, { ompPath: "/other", state: "done", ok: true, missing: false, models: 3 })).toBe(BLOCK);
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, models: 3 })).toBeNull();
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, models: 3, providers: [] })).toBeNull();
  // Any provider counts, also one outside the list of logins.
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, models: 1, providers: ["some-other-provider"] })).toBeNull();
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, models: 3, updateError: "omp update exited with code 1" })).toBeNull();
  // omp answers with no usable model: only a login or an API key lets the developer go on.
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, models: 0, providers: [] })).toBe(NO_MODELS);
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, version: "18.12.6" })).toBe(NO_MODELS);
  expect(nextBlock(schema, omp, { ompPath: "/x/omp", state: "done", ok: true, missing: false, models: 0, updateError: "omp update exited with code 1" })).toBe(NO_MODELS);
});

test("the check says omp responds when it ended with an answer from an omp that is not too old, whatever its models or its update", () => {
  expect(ompAnswers(null)).toBe(false);
  expect(ompAnswers({ ompPath: "", state: "updating", version: "18.12.6" })).toBe(false);
  expect(ompAnswers({ ompPath: "", state: "done", ok: false, missing: true, error: "omp not found" })).toBe(false);
  expect(ompAnswers({ ompPath: "", state: "done", ok: true, missing: false, version: "18.12.5", models: 2, tooOld: true })).toBe(false);
  expect(ompAnswers({ ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 0 })).toBe(true);
  expect(ompAnswers({ ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 2, updateError: "x" })).toBe(true);
});

test("Solo mode is offered in the first setup and the Empty Model mode only; the first setup opens off, the Empty Model wizard follows the project", () => {
  expect(offersSolo("first")).toBe(true);
  expect(offersSolo("empty-model")).toBe(true);
  expect(offersSolo("settings")).toBe(false);
  expect(open("first").solo).toBe("off");
  expect(open("empty-model").solo).toBeNull();
  const project = { available: true, solo: "files" as const, tracked: [] };
  expect(chosenSolo(open("empty-model"), [], project)).toBe("files");
  expect(chosenSolo({ ...open("empty-model"), solo: "off" }, [], project)).toBe("off");
  expect(chosenSolo(open("empty-model"), [], null)).toBe("off");
  expect(chosenSolo(open("settings"), [], project)).toBe("off");
});

test("Solo mode is available where git is: the chosen folder in the first setup, the project in the Empty Model mode (until the host says otherwise)", () => {
  const folders = [{ root: "/work/app", inGit: true }, { root: "/work/lib", inGit: false }];
  const first = { ...open("first"), solo: "folders" as const };
  expect(soloAvailable(first, folders, null)).toBe(true);
  expect(chosenSolo(first, folders, null)).toBe("folders");
  expect(soloAvailable({ ...first, root: "/work/lib" }, folders, null)).toBe(false);
  expect(chosenSolo({ ...first, root: "/work/lib" }, folders, null)).toBe("off");
  expect(soloAvailable({ ...first, root: null }, folders, null)).toBe(false);
  expect(soloAvailable(open("empty-model"), [], null)).toBe(true);
  expect(soloAvailable(open("empty-model"), [], { available: false, solo: "off", tracked: [] })).toBe(false);
});

test("the Solo rows say On or Off and, when on, Exclude; they are changed only against a project's value, with the value they replace", () => {
  expect(soloRows("off", null).map((r) => [r.title, r.value, r.changed, r.was])).toEqual([["Solo Mode", "Off", false, null]]);
  expect(soloRows("folders", null).map((r) => [r.title, r.value, r.changed, r.was, r.isDefault])).toEqual([["Solo Mode", "On", false, null, false], ["Exclude", "Whole folders", false, null, true]]);
  expect(soloRows("files", "off").map((r) => [r.title, r.value, r.changed, r.was])).toEqual([["Solo Mode", "On", true, "Off"], ["Exclude", "Only Trama's files", true, null]]);
  expect(soloRows("files", "folders").map((r) => [r.title, r.changed, r.was])).toEqual([["Solo Mode", false, null], ["Exclude", true, "Whole folders"]]);
  expect(soloRows("off", "files").map((r) => [r.title, r.value, r.changed, r.was])).toEqual([["Solo Mode", "Off", true, "On"]]);
  expect(soloRows("folders", "folders").every((r) => !r.changed)).toBe(true);
});

test("the summary puts the Solo rows at the end of the Project step, in the first setup and the Empty Model mode, never in the settings", () => {
  const titles = (mode: "first" | "settings" | "empty-model") => summaryRows(schema, open(mode), {}, [{ name: "app", root: "/work/app", inGit: true }]).filter((r) => r.step === "Project").map((r) => r.title);
  expect(titles("first")).toEqual(["Skills Dir", "Solo Mode"]);
  expect(titles("empty-model")).toEqual(["Skills Dir", "Solo Mode"]);
  expect(titles("settings")).toEqual(["Skills Dir"]);
});
