import type { SetupChoice, SetupMode, ToWebview } from "../../protocol";
import { type SettingSchema, type SettingsValues, type SettingValue, settingValueError, storedValue } from "../../host/settings-schema";

/** Which wizard is open: the first setup of a folder without a project (Get Started), the settings of a project, or a project with an empty Model that carries on with a path. */
export type WizardMode = SetupMode;
/** How Trama starts in the folder. */
export type WizardChoice = SetupChoice;
export type WizardStep = "Path" | "omp" | "Models" | "Project" | "Folders" | "Advanced" | "Summary";

/** The steps a mode and a path show, in order (`rules#setup-wizard`). Folders only with Import from Code, and never in the mode of the settings. */
export function stepsFor(mode: WizardMode, choice: WizardChoice | null): WizardStep[] {
  const steps: WizardStep[] = mode === "first" ? ["Path"] : [];
  steps.push("omp", "Models", "Project");
  if (mode !== "settings" && choice === "import") steps.push("Folders");
  steps.push("Advanced", "Summary");
  return steps;
}

export const IGNORE_INSTRUCTION_FILES_KEY = "trama.ignoreInstructionFiles";

/** The keys each step asks for, in order. */
export const STEP_KEYS: Readonly<Partial<Record<WizardStep, readonly string[]>>> = {
  omp: ["trama.ompPath", "trama.terminalLocation", IGNORE_INSTRUCTION_FILES_KEY],
  Models: ["trama.analysis", "trama.scan", "trama.execution", "trama.maxParallelAgents"],
  Project: ["trama.skillsDir"],
  Advanced: ["trama.theme", "trama.driftBlocker", "trama.advisorScanner", "trama.parallelExecution", "trama.asyncDriftResolver", "trama.subagentsContextSharing", "trama.autoUpdateStaleProposals", "trama.ompChat", "trama.ompChatApproval", "trama.ompChatIntentTracing"],
};

export const STEP_SENTENCES: Readonly<Record<WizardStep, string>> = {
  Path: "Choose how Trama starts in this folder.",
  omp: "omp is required: Trama runs every agent with omp.",
  Models: "Choose the model for each kind of work. Analysis works best with your most capable model, Execution with a mid-range one, Scan with a fast, light one.",
  Project: "Choose where Trama installs the agent skills.",
  Folders: "Uncheck the folders the agent should not import.",
  Advanced: "Theme and optional features. You can skip this step.",
  Summary: "Check your choices, then confirm.",
};

/** One entry of a folder, as the host lists it. */
export interface TreeEntry {
  name: string;
  kind: "folder" | "file";
  hasChildren: boolean;
}

/** The folders read so far: `""` is the first level of the folder to initialize, any other key the path of an open folder. */
export type Tree = Readonly<Record<string, readonly TreeEntry[]>>;

/** The user value of each key of the wizard, as the Settings tab holds it: absent when the developer has none (the default applies). */
export type WizardValues = Readonly<Record<string, SettingValue | undefined>>;

export interface WizardState {
  mode: WizardMode;
  choice: WizardChoice | null;
  /** The folder to initialize (or the project's folder); null until the host tells the folders. */
  root: string | null;
  step: WizardStep;
  /** The values the wizard started with: Skip on Advanced brings its keys back to them. The «changed» marks compare with the current user values instead. */
  initial: WizardValues;
  values: WizardValues;
  /** Keys whose field holds a value that cannot be saved. */
  invalid: readonly string[];
  /** Paths excluded from the import, relative to `root`, with `/`; none contains another. */
  excluded: readonly string[];
  tree: Tree;
}

/** The wizard as it opens: on its first step, with the user values of the settings and, for the first setup, no path. */
export function openWizard(mode: WizardMode, choice: WizardChoice | null, values: Readonly<Record<string, SettingsValues>>, root: string | null): WizardState {
  const initial: Record<string, SettingValue | undefined> = {};
  for (const step of ["omp", "Models", "Project", "Advanced"] as const) {
    for (const key of STEP_KEYS[step] ?? []) initial[key] = values[key]?.user as SettingValue | undefined;
  }
  const state: WizardState = { mode, choice, root, step: "omp", initial, values: initial, invalid: [], excluded: [], tree: {} };
  return { ...state, step: stepsFor(mode, choice)[0] as WizardStep };
}

export const stepsOf = (state: WizardState): WizardStep[] => stepsFor(state.mode, state.choice);

/** The wizard value of `key` as the field shows it: the default when there is no value. */
export const wizardValue = (setting: SettingSchema, state: WizardState): unknown => state.values[setting.key] ?? setting.default;


/** The path of omp the wizard has chosen, trimmed; empty means omp from the editor's PATH. */
export function chosenOmpPath(schema: readonly SettingSchema[], state: WizardState): string {
  const setting = schema.find((s) => s.key === "trama.ompPath");
  const value = setting === undefined ? undefined : wizardValue(setting, state);
  return typeof value === "string" ? value.trim() : "";
}

/** Whether the omp step says that omp jobs ignore the instruction files: `trama.ignoreInstructionFiles` is on in the wizard's values. */
export function ignoresInstructionFiles(schema: readonly SettingSchema[], state: WizardState): boolean {
  const setting = schema.find((s) => s.key === IGNORE_INSTRUCTION_FILES_KEY);
  return setting !== undefined && wizardValue(setting, state) === true;
}

export function setChoice(state: WizardState, choice: WizardChoice): WizardState {
  return { ...state, choice };
}

/** A new folder to initialize forgets the exclusions and the folders read. */
export function setRoot(state: WizardState, root: string | null): WizardState {
  return root === state.root ? state : { ...state, root, excluded: [], tree: {} };
}

export function setValue(state: WizardState, key: string, value: SettingValue | undefined): WizardState {
  return { ...state, values: { ...state.values, [key]: value } };
}

export function setInvalid(state: WizardState, key: string, invalid: boolean): WizardState {
  if (state.invalid.includes(key) === invalid) return state;
  return { ...state, invalid: invalid ? [...state.invalid, key] : state.invalid.filter((k) => k !== key) };
}

export function openStep(state: WizardState, step: WizardStep): WizardState {
  return stepsOf(state).includes(step) ? { ...state, step } : state;
}

export function nextStep(state: WizardState): WizardState {
  const steps = stepsOf(state);
  const next = steps[steps.indexOf(state.step) + 1];
  return next === undefined ? state : { ...state, step: next };
}

/** Whether Back exists: not on the first step of the mode. */
export const hasPrevious = (state: WizardState): boolean => stepsOf(state).indexOf(state.step) > 0;

export function previousStep(state: WizardState): WizardState {
  const steps = stepsOf(state);
  const index = steps.indexOf(state.step);
  const previous = steps[index - 1];
  return previous === undefined ? state : { ...state, step: previous };
}

/** Skip on Advanced: the step's keys go back to the values the wizard started with, then Summary. */
export function skipAdvanced(state: WizardState): WizardState {
  const values: Record<string, SettingValue | undefined> = { ...state.values };
  for (const key of STEP_KEYS.Advanced ?? []) values[key] = state.initial[key];
  return nextStep({ ...state, values });
}

// ---- Folder tree ----

export const childPath = (parent: string, name: string): string => (parent === "" ? name : `${parent}/${name}`);

const parentOf = (path: string): string => path.slice(0, Math.max(0, path.lastIndexOf("/")));

export type CheckState = "checked" | "unchecked" | "indeterminate";

/** The box of an entry: unchecked when it or a folder above it is excluded, indeterminate when something inside it is. */
export function checkState(excluded: readonly string[], path: string): CheckState {
  if (excluded.some((e) => path === e || path.startsWith(`${e}/`))) return "unchecked";
  if (excluded.some((e) => e.startsWith(`${path}/`))) return "indeterminate";
  return "checked";
}

/** The exclusions as the instruction carries them: no path inside another excluded one, sorted alphabetically. */
export function exclusions(excluded: readonly string[]): string[] {
  return [...new Set(excluded)].filter((e) => !excluded.some((other) => other !== e && e.startsWith(`${other}/`))).sort();
}

/**
 * The exclusions after the developer pressed the box of `path`. A checked box excludes the entry (and, when that leaves a
 * folder with nothing inside, the folder instead); an indeterminate one includes everything inside; an unchecked one puts the entry
 * back, and, when a folder above it was excluded, puts that folder back without the other entries on the way down.
 */
export function toggleExcluded(excluded: readonly string[], tree: Tree, path: string): string[] {
  const state = checkState(excluded, path);
  if (state === "indeterminate") return exclusions(excluded.filter((e) => !e.startsWith(`${path}/`)));
  if (state === "checked") {
    let result = new Set(excluded.filter((e) => !e.startsWith(`${path}/`)));
    result.add(path);
    // A folder whose entries are all excluded is excluded itself.
    for (let current = path; current.includes("/"); ) {
      const parent = parentOf(current);
      const siblings = tree[parent];
      if (siblings === undefined || !siblings.every((entry) => result.has(childPath(parent, entry.name)))) break;
      result = new Set([...result].filter((e) => !e.startsWith(`${parent}/`)));
      result.add(parent);
      current = parent;
    }
    return exclusions([...result]);
  }
  if (excluded.includes(path)) return exclusions(excluded.filter((e) => e !== path));
  const above = excluded.find((e) => path.startsWith(`${e}/`));
  if (above === undefined) return exclusions(excluded);
  const result = new Set(excluded.filter((e) => e !== above));
  const names = path.slice(above.length + 1).split("/");
  let current = above;
  for (const name of names) {
    for (const entry of tree[current] ?? []) if (entry.name !== name) result.add(childPath(current, entry.name));
    current = childPath(current, name);
  }
  return exclusions([...result]);
}

/** Whether the first level has at least one entry still included, and so the import has something to describe. */
export function hasIncluded(excluded: readonly string[], tree: Tree): boolean {
  return (tree[""] ?? []).some((entry) => checkState(excluded, entry.name) !== "unchecked");
}

/** The entries shown, in the order of the tree, with their depth: only what the open folders reveal. */
export function visibleRows(tree: Tree, open: ReadonlySet<string>): { path: string; depth: number; entry: TreeEntry }[] {
  const rows: { path: string; depth: number; entry: TreeEntry }[] = [];
  const walk = (parent: string, depth: number) => {
    for (const entry of tree[parent] ?? []) {
      const path = childPath(parent, entry.name);
      rows.push({ path, depth, entry });
      if (entry.kind === "folder" && open.has(path)) walk(path, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}

// ---- Validity ----

/** Why Next of the step is not available; null when it is. `check` is the answer of the host to the check of omp, null while there is none. */
export function nextBlock(schema: readonly SettingSchema[], state: WizardState, check: AgentCheckResult | null): string | null {
  switch (state.step) {
    case "omp":
      // Only an answer that says omp responds, for the path of the step, lets Next go; a failed update does not stop it.
      return check !== null && check.state === "done" && check.ok && check.ompPath === chosenOmpPath(schema, state) ? null : "omp must answer before you go on.";
    case "Path":
      return state.choice === null ? "Choose how to start" : state.root === null ? "No folder to initialize" : null;
    case "Models": {
      if (state.invalid.length === 0) return null;
      const setting = schema.find((s) => s.key === state.invalid[0]);
      return setting === undefined ? "Fix the values first" : `${setting.title}: ${settingValueError(setting, NaN) ?? "enter a valid value"}`;
    }
    case "Folders":
      if (state.tree[""] === undefined) return "Reading the folders";
      return hasIncluded(state.excluded, state.tree) ? null : "Include at least one folder or file";
    default:
      return null;
  }
}

// ---- Summary ----

/** What a value is compared as: a text without surrounding spaces, an empty text and the default as no value (`storedValue`). */
const normalized = (setting: SettingSchema, value: unknown): SettingValue | undefined =>
  value === undefined ? undefined : storedValue(setting, value as SettingValue);

/** Whether the wizard's value differs from the user's value now, compared as the Settings tab compares. */
export function isChanged(setting: SettingSchema, wizard: SettingValue | undefined, current: unknown): boolean {
  return normalized(setting, wizard) !== normalized(setting, current);
}

/** How a value is written in the summary: «On»/«Off», a number or the text as it is; an empty text is «(empty)». */
export function formatValue(setting: SettingSchema, value: unknown): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (value === undefined || value === "") return "(empty)";
  return String(value);
}

export interface SummaryRow {
  step: WizardStep;
  title: string;
  value: string;
  /** Texts and numbers show in the monospace font; enums, switches and the path in the normal one. */
  mono: boolean;
  isDefault: boolean;
  changed: boolean;
  /** The current value, for a changed row: «was <value>». */
  was: string | null;
}

/** Where the Path summary names the way and the folder. */
const PATH_NAMES: Record<WizardChoice, string> = { import: "Import from Code", scratch: "Start from Scratch" };

/** The rows of the summary, grouped by step in order, from the values and the current user values. */
export function summaryRows(schema: readonly SettingSchema[], state: WizardState, current: Readonly<Record<string, SettingsValues>>, folders: readonly { name: string; root: string }[]): SummaryRow[] {
  const rows: SummaryRow[] = [];
  for (const step of stepsOf(state)) {
    if (step === "Path") {
      rows.push({ step, title: "Path", value: state.choice === null ? "" : PATH_NAMES[state.choice], mono: false, isDefault: false, changed: false, was: null });
      const folder = folders.find((f) => f.root === state.root);
      if (folders.length > 1 && folder !== undefined) rows.push({ step, title: "Folder", value: folder.name, mono: true, isDefault: false, changed: false, was: null });
    } else if (step === "Folders") {
      rows.push({ step, title: "Excluded folders", value: state.excluded.length === 0 ? "None" : state.excluded.join(", "), mono: state.excluded.length > 0, isDefault: false, changed: false, was: null });
    } else if (step !== "Summary") {
      for (const key of STEP_KEYS[step] ?? []) {
        const setting = schema.find((s) => s.key === key);
        if (setting === undefined) continue;
        const wizard = state.values[key];
        const currentUser = current[key]?.user;
        const changed = isChanged(setting, wizard, currentUser);
        const effective = wizardValue(setting, state);
        rows.push({
          step,
          title: setting.title,
          value: formatValue(setting, effective),
          mono: setting.control === "text" || setting.control === "integer",
          isDefault: normalized(setting, wizard) === undefined,
          changed,
          was: changed ? formatValue(setting, currentUser ?? setting.default) : null,
        });
      }
    }
  }
  return rows;
}

/** The writes of the confirmation, in the order of the steps: only the shown keys whose value changed. */
export function changedWrites(schema: readonly SettingSchema[], state: WizardState, current: Readonly<Record<string, SettingsValues>>): { key: string; value: SettingValue }[] {
  const writes: { key: string; value: SettingValue }[] = [];
  for (const step of stepsOf(state)) {
    for (const key of STEP_KEYS[step] ?? []) {
      const setting = schema.find((s) => s.key === key);
      if (setting === undefined || !isChanged(setting, state.values[key], current[key]?.user)) continue;
      // An absent value (the default) is written as the default: the host removes the user value for it.
      writes.push({ key, value: (state.values[key] ?? setting.default) as SettingValue });
    }
  }
  return writes;
}

/** The label of the button that confirms the summary. */
export function confirmLabel(state: WizardState): string {
  if (state.mode === "first") return "Set up Trama";
  if (state.mode === "settings") return "Save settings";
  return state.choice === "import" ? "Save and import" : "Save and start";
}

/** The answer of the host to the check of omp: `updating` while omp is updated, `done` with the outcome. */
type AgentCheckMessage = Extract<ToWebview, { type: "agentCheck" }>;
export type AgentCheckResult = AgentCheckMessage extends infer M ? (M extends unknown ? Omit<M, "type"> : never) : never;

/** The line under the controls of the omp step. `result` is the answer for the omp path of now, or null while it is being checked. */
export function agentCheckLine(result: AgentCheckResult | null): { tone: "checking" | "ok" | "warning"; text: string } {
  if (result === null) return { tone: "checking", text: "Checking omp…" };
  if (result.state === "updating") return { tone: "checking", text: `Updating omp to ${result.version}…` };
  if (!result.ok) return { tone: "warning", text: `${result.error ?? "omp did not answer"}. Trama cannot work without omp.` };
  const answered = `omp${result.version === undefined ? "" : ` ${result.version}`} answered with ${result.models ?? 0} models.`;
  return result.updateError === undefined ? { tone: "ok", text: answered } : { tone: "warning", text: `Could not update omp (${result.updateError}). ${answered}` };
}

/** Whether the host found omp missing (the program was not found, not a timeout or a failure code): the only case where `Install omp` shows. */
export function ompMissing(result: AgentCheckResult | null): boolean {
  return result !== null && result.state === "done" && !result.ok && result.missing;
}
