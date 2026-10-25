import type { SetupChoice, SetupMode, ToWebview } from "../../protocol";
import { ompTooOldText } from "../../../../src/core/omp-version";
import { groupKeys, MODEL_ROLE_KEYS, NTFY_SERVER_KEY, NTFY_TOPIC_KEY, SETTING_GROUPS, type SettingSchema, type SettingsValues, type SettingValue, settingValueError, storedValue } from "../../host/settings-schema";
import type { ModelSuggestion } from "../../host/model-lists";
import { type CertificatesState, ompAnsweredText, ompFailureText, roleLabel, SOLO_EXCLUDE_OPTIONS, type SoloState, SYSTEM_CERTIFICATES_KEY } from "../settings/logic";
import type { SoloKind } from "../../../../src/core/solo-mode";

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

/** The settings of the Settings tab that the wizard does not ask for: Auto Exit stays in the group `omp` of the tab, and the Notifications subgroup (ntfy server and topic) is set only in the Settings tab. */
const NOT_IN_WIZARD: readonly string[] = ["trama.autoExit", NTFY_SERVER_KEY, NTFY_TOPIC_KEY];

/** The keys of a group of the shared list `SETTING_GROUPS`, in order, without the ones the wizard leaves out. */
const wizardKeysOf = (title: string): string[] => {
  const group = SETTING_GROUPS.find((g) => g.title === title);
  return (group === undefined ? [] : groupKeys(group)).filter((key) => !NOT_IN_WIZARD.includes(key));
};

/** The keys each step asks for, in order: the groups `omp`, `Models`, `Project` and `Advanced` of `SETTING_GROUPS`. */
export const STEP_KEYS: Readonly<Partial<Record<WizardStep, readonly string[]>>> = {
  omp: wizardKeysOf("omp"),
  Models: wizardKeysOf("Models"),
  Project: wizardKeysOf("Project"),
  Advanced: wizardKeysOf("Advanced"),
};

/** The subgroups of the step Advanced, in order, each with its subtitle and its keys, as the schema of the `settings` message gives them. */
export function advancedSubgroups(schema: readonly SettingSchema[]): { title: string; keys: string[] }[] {
  const groups: { title: string; keys: string[] }[] = [];
  for (const setting of schema) {
    if (setting.subgroup === undefined || !(STEP_KEYS.Advanced ?? []).includes(setting.key)) continue;
    let group = groups.find((g) => g.title === setting.subgroup);
    if (group === undefined) groups.push((group = { title: setting.subgroup, keys: [] }));
    group.keys.push(setting.key);
  }
  return groups;
}

/** The title of the page: the first setup of a folder, or the guided setup of the settings and of an empty Model. */
export const wizardTitle = (mode: WizardMode): string => (mode === "first" ? "Set up Trama" : "Guided setup");

/** Only the first setup and the summary tell that Trama writes its files into the folder. */
export const showsFolderNotice = (step: WizardStep): boolean => step === "Path" || step === "Summary";

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
  /** The Solo mode the developer chose in the Project step (first setup and empty-Model modes only): `null` follows the project's current value, which is how an empty-Model wizard opens; the first setup opens with `off`. */
  solo: SoloKind | null;
}

/** The wizard as it opens: on its first step, with the user values of the settings and, for the first setup, no path. */
export function openWizard(mode: WizardMode, choice: WizardChoice | null, values: Readonly<Record<string, SettingsValues>>, root: string | null): WizardState {
  const initial: Record<string, SettingValue | undefined> = {};
  for (const step of ["omp", "Models", "Project", "Advanced"] as const) {
    for (const key of STEP_KEYS[step] ?? []) initial[key] = values[key]?.user as SettingValue | undefined;
  }
  const state: WizardState = { mode, choice, root, step: "omp", initial, values: initial, invalid: [], excluded: [], tree: {}, solo: mode === "first" ? "off" : null };
  return { ...state, step: stepsFor(mode, choice)[0] as WizardStep };
}

export const stepsOf = (state: WizardState): WizardStep[] => stepsFor(state.mode, state.choice);

/** The wizard value of `key` as the field shows it: the default when there is no value. */
export const wizardValue = (setting: SettingSchema, state: WizardState): unknown => state.values[setting.key] ?? setting.default;

/** Whether the Project step offers Solo mode: in the first setup and in the empty-Model mode, never in the Guided setup of the Settings tab. */
export const offersSolo = (mode: WizardMode): boolean => mode !== "settings";

/**
 * Whether Solo mode can be turned on where the wizard writes: the folder to initialize is inside a git repository (first setup), or the project's folder is (`project`, the host's last `soloMode`;
 * available until the host says otherwise). The Guided setup has no Solo mode.
 */
export function soloAvailable(state: WizardState, folders: readonly { root: string; inGit?: boolean }[], project: SoloState | null): boolean {
  if (!offersSolo(state.mode)) return false;
  if (state.mode === "first") return folders.find((folder) => folder.root === state.root)?.inGit === true;
  return project?.available ?? true;
}

/** The Solo mode the wizard would write: the developer's choice, the project's current value when there is none, and `off` where git is missing. */
export function chosenSolo(state: WizardState, folders: readonly { root: string; inGit?: boolean }[], project: SoloState | null): SoloKind {
  if (!soloAvailable(state, folders, project)) return "off";
  return state.solo ?? project?.solo ?? "off";
}


/** How old the bundle may be before checking the box in the step exports it again: 24 hours. */
const BUNDLE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** The step's value of System Certificates: it counts at once, before the confirmation, for what the step itself starts (the check of omp, the installer and the login terminals). */
export function chosenSystemCertificates(schema: readonly SettingSchema[], state: WizardState): boolean {
  const setting = schema.find((s) => s.key === SYSTEM_CERTIFICATES_KEY);
  return setting !== undefined && wizardValue(setting, state) === true;
}

/** Whether the bundle is missing or was written more than 24 hours before `now`, by the host's last `systemCertificates` (null: none yet, so nothing is known to exist): checking the box then asks for an export. */
export function bundleNeedsExport(state: CertificatesState | null, now: number): boolean {
  if (state === null || state.exportedAt === undefined) return true;
  const written = Date.parse(state.exportedAt);
  return Number.isNaN(written) || now - written > BUNDLE_MAX_AGE_MS;
}

/** The path of omp the wizard has chosen, trimmed; empty means omp from the editor's PATH. */
export function chosenOmpPath(schema: readonly SettingSchema[], state: WizardState): string {
  const setting = schema.find((s) => s.key === "trama.ompPath");
  const value = setting === undefined ? undefined : wizardValue(setting, state);
  return typeof value === "string" ? value.trim() : "";
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

/** The steps before the one on view, in order: the ones the step indicator and the «Edit» of the summary lead back to. */
export function previousSteps(state: WizardState): WizardStep[] {
  return stepsOf(state).slice(0, Math.max(0, stepsOf(state).indexOf(state.step)));
}

/** `developer.OPEN_SETUP_STEP`: goes back to an earlier step of the mode, keeping every choice. A step on view or ahead is reached only with Next, which checks every step. */
export function openStep(state: WizardState, step: WizardStep): WizardState {
  return previousSteps(state).includes(step) ? { ...state, step } : state;
}

/** Where the step on view is among the steps of the mode: «Step <n> of <N> · <step>» and the part of the progress bar that is full. */
export function stepPosition(state: WizardState): { n: number; total: number; name: WizardStep; percent: number } {
  const steps = stepsOf(state);
  const n = steps.indexOf(state.step) + 1;
  return { n, total: steps.length, name: state.step, percent: Math.round((n / steps.length) * 100) };
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

/** Why Next of the omp step is not available: omp is missing, does not answer, is being checked, or its answer is not for the path of the step. */
export const OMP_MUST_ANSWER = "omp must answer before you go on.";

/** Why Next of the omp step is not available when omp answers with no usable model: the developer logs in to a provider or sets an API key. */
export const OMP_HAS_NO_MODELS = "omp has no models yet. Log in to a provider or set an API key.";

/** Whether the check says omp responds: it ended with an answer, and that omp is not older than the minimum. A failed update does not matter. */
export function ompAnswers(check: AgentCheckResult | null): boolean {
  return check !== null && check.state === "done" && check.ok && check.tooOld !== true;
}

/** Why Next of the step is not available; null when it is. `check` is the answer of the host to the check of omp, null while there is none. */
export function nextBlock(schema: readonly SettingSchema[], state: WizardState, check: AgentCheckResult | null): string | null {
  switch (state.step) {
    case "omp": {
      // Only an answer that says omp responds, for the path of the step, from an omp that is not older than the minimum and has at least one usable model of any provider, lets Next go; a failed update does not stop it.
      if (check === null || check.state !== "done" || !check.ok || check.ompPath !== chosenOmpPath(schema, state)) return OMP_MUST_ANSWER;
      if (check.tooOld === true) return ompTooOldText(check.version);
      return (check.models ?? 0) > 0 ? null : OMP_HAS_NO_MODELS;
    }
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
  /** The subtitle of the subgroup of Advanced the row belongs to; null for any other row. */
  group: string | null;
  title: string;
  value: string;
  /** The value is the empty text: the summary shows «(empty)» in secondary text and the normal font. */
  empty: boolean;
  /** Texts and numbers show in the monospace font; enums, switches and the path in the normal one. */
  mono: boolean;
  isDefault: boolean;
  changed: boolean;
  /** The current value, for a changed row: «was <value>». */
  was: string | null;
}

/** A value cut where a line may break: after `/`, `-`, `_` and `.`, so a long path or name wraps there before it wraps anywhere. */
export function valueParts(value: string): string[] {
  return value.split(/(?<=[/\-_.])/);
}

/** Where the Path summary names the way and the folder. */
const PATH_NAMES: Record<WizardChoice, string> = { import: "Import from Code", scratch: "Start from Scratch" };

/** How a value is written in the summary: a model role as `<model> · <level>` (the model alone for Default), anything else as formatValue. */
function summaryText(setting: SettingSchema, value: unknown, models: readonly ModelSuggestion[]): string {
  if (!MODEL_ROLE_KEYS.includes(setting.key) || typeof value !== "string" || value.trim() === "") return formatValue(setting, value);
  return roleLabel(value.trim(), models);
}

const soloLabel = (kind: Exclude<SoloKind, "off">): string => SOLO_EXCLUDE_OPTIONS.find((option) => option.value === kind)?.label ?? kind;

/**
 * The Solo mode rows of the Project step: `Solo Mode` with On or Off and, when on, `Exclude` with the chosen value. `current` is the project's value (empty-Model mode; null in the first setup, which has no
 * project): a row that changes it is marked changed and shows the value it replaces; `Exclude` turned on from off has no value to replace.
 */
export function soloRows(chosen: SoloKind, current: SoloKind | null): SummaryRow[] {
  const base = { step: "Project", group: null, empty: false, mono: false, isDefault: false } as const;
  const switched = current !== null && (chosen === "off") !== (current === "off");
  const rows: SummaryRow[] = [{ ...base, title: "Solo Mode", value: chosen === "off" ? "Off" : "On", changed: switched, was: switched ? (current === "off" ? "Off" : "On") : null }];
  if (chosen !== "off") {
    const changed = current !== null && chosen !== current;
    rows.push({ ...base, title: "Exclude", value: soloLabel(chosen), isDefault: chosen === "folders", changed, was: changed && current !== "off" && current !== null ? soloLabel(current) : null });
  }
  return rows;
}

/** The rows of the summary, grouped by step in order, from the values and the current user values. */
export function summaryRows(schema: readonly SettingSchema[], state: WizardState, current: Readonly<Record<string, SettingsValues>>, folders: readonly { name: string; root: string; inGit?: boolean }[], models: readonly ModelSuggestion[] = [], project: SoloState | null = null): SummaryRow[] {
  const rows: SummaryRow[] = [];
  for (const step of stepsOf(state)) {
    if (step === "Path") {
      rows.push({ step, group: null, title: "Path", value: state.choice === null ? "" : PATH_NAMES[state.choice], empty: false, mono: false, isDefault: false, changed: false, was: null });
      const folder = folders.find((f) => f.root === state.root);
      if (folders.length > 1 && folder !== undefined) rows.push({ step, group: null, title: "Folder", value: folder.name, empty: false, mono: true, isDefault: false, changed: false, was: null });
    } else if (step === "Folders") {
      rows.push({ step, group: null, title: "Excluded folders", value: state.excluded.length === 0 ? "None" : state.excluded.join(", "), empty: false, mono: state.excluded.length > 0, isDefault: false, changed: false, was: null });
    } else if (step !== "Summary") {
      for (const key of STEP_KEYS[step] ?? []) {
        const setting = schema.find((s) => s.key === key);
        if (setting === undefined) continue;
        const wizard = state.values[key];
        const currentUser = current[key]?.user;
        const changed = isChanged(setting, wizard, currentUser);
        const effective = wizardValue(setting, state);
        const value = summaryText(setting, effective, models);
        rows.push({
          step,
          group: step === "Advanced" ? (setting.subgroup ?? null) : null,
          title: setting.title,
          value,
          empty: value === "(empty)",
          mono: setting.control === "text" || setting.control === "integer",
          isDefault: normalized(setting, wizard) === undefined,
          changed,
          was: changed ? summaryText(setting, currentUser ?? setting.default, models) : null,
        });
      }
      if (step === "Project" && offersSolo(state.mode)) rows.push(...soloRows(chosenSolo(state, folders, project), state.mode === "empty-model" ? (project?.solo ?? "off") : null));
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
  // An omp older than the minimum says so in place of its version.
  if (result.tooOld === true) return { tone: "warning", text: ompTooOldText(result.version) };
  if (!result.ok) return { tone: "warning", text: ompFailureText(result.error) };
  const answered = ompAnsweredText(result.version, result.models ?? 0);
  return result.updateError === undefined ? { tone: "ok", text: answered } : { tone: "warning", text: `Could not update omp (${result.updateError}). ${answered}` };
}

/** Whether `Install omp` shows: the host did not find the program (not a timeout or a failure code), or omp is older than the minimum and the current one is to be installed. */
export function ompMissing(result: AgentCheckResult | null): boolean {
  return result !== null && result.state === "done" && (result.tooOld === true || (!result.ok && result.missing));
}
