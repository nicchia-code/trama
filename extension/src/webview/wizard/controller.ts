import type { ModelSuggestion } from "../../host/model-lists";
import type { SettingSchema, SettingsValues, SettingValue } from "../../host/settings-schema";
import { storedValue } from "../../host/settings-schema";
import type { FolderEntry, InstructionFileView, ToHost, ToWebview, WorkspaceFolderView } from "../../protocol";
import { type ProvidersView, providersView } from "../../omp-login";
import {
  type AgentCheckResult,
  changedWrites,
  chosenOmpPath,
  exclusions,
  nextBlock,
  nextStep,
  ompAnswers,
  openStep,
  openWizard,
  previousStep,
  setChoice,
  setInvalid,
  setRoot,
  setValue,
  skipAdvanced,
  toggleExcluded,
  type WizardChoice,
  type WizardMode,
  type WizardState,
} from "./logic";

/** What the wizard shows at one moment: React reads it as a whole, so each change makes a new one. */
export interface WizardSnapshot {
  /** The wizard's choices; null while it is closed. */
  state: WizardState | null;
  schema: readonly SettingSchema[];
  /** The user and workspace values the settings have now, which the summary compares with. */
  current: Readonly<Record<string, SettingsValues>>;
  folders: readonly WorkspaceFolderView[];
  /** The model names suggested for the omp chosen now; null until they arrive. */
  models: { list: ModelSuggestion[]; error: string | null } | null;
  /** The instruction files found the last time the omp step was shown; null while the search runs or before it started. */
  instructionFiles: readonly InstructionFileView[] | null;
  /** The check of the omp chosen now; null while it is being checked. */
  check: AgentCheckResult | null;
  /** The Providers section of the omp step: null while it is not shown (no outcome yet, or omp does not answer), else the providers omp lists models of (absent: unknown); it keeps its rows while omp is checked again. */
  providers: ProvidersView;
  /** The confirmation is under way: no button can be pressed. */
  busy: boolean;
  /** Why the last confirmation failed. */
  error: string | null;
  /** Counts the changes of the values, so a field gives way to the value the wizard holds. */
  generation: number;
}

export interface WizardCallbacks {
  post(message: ToHost): void;
  /** The wizard of the Settings tab closed: `cancel` by Cancel, `done` after a confirmation that succeeded. */
  onClose?(reason: "cancel" | "done", mode: WizardMode): void;
}

type Pending = { mode: WizardMode; choice: WizardChoice | null; root: string | null };

/**
 * The wizard of one view: holds the choices outside React, so changing tab does not lose them, and asks the host for the agent check,
 * the model names and the folders when a step needs them. Get Started and the Settings tab each have one.
 */
export class WizardController {
  private state: WizardState | null = null;
  private pending: Pending | null = null;
  private schema: readonly SettingSchema[] = [];
  private current: Readonly<Record<string, SettingsValues>> = {};
  private folders: readonly WorkspaceFolderView[] = [];
  private foldersKnown = false;
  private models: WizardSnapshot["models"] = null;
  private check: AgentCheckResult | null = null;
  private providers: ProvidersView = null;
  private instructionFiles: readonly InstructionFileView[] | null = null;
  /** The folder the last instruction-files search was asked for (null: the project's folder), while the omp step is on view. */
  private instructionRoot: string | null | undefined = undefined;
  private busy = false;
  private error: string | null = null;
  private generation = 0;
  /** What was last asked of the host, so a step asks again only when the question changed. */
  private checkKey: string | null = null;
  private modelsKey: string | null = null;
  private readonly requestedFolders = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private snapshot: WizardSnapshot;

  constructor(private readonly callbacks: WizardCallbacks) {
    this.snapshot = this.build();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): WizardSnapshot => this.snapshot;

  isOpen(): boolean {
    return this.state !== null;
  }

  mode(): WizardMode | null {
    return this.state?.mode ?? null;
  }

  private build(): WizardSnapshot {
    return { state: this.state, schema: this.schema, current: this.current, folders: this.folders, models: this.models, check: this.check, providers: this.providers, instructionFiles: this.instructionFiles, busy: this.busy, error: this.error, generation: this.generation };
  }

  private emit(): void {
    this.snapshot = this.build();
    for (const listener of this.listeners) listener();
  }

  private update(state: WizardState): void {
    this.state = state;
    this.ask();
    this.emit();
  }

  // ---- Opening and closing ----

  /** Opens the wizard in `mode` as soon as it has what it needs: the settings and, for the first setup, the folders. Opening again while it is open changes nothing in its modes. */
  open(mode: WizardMode, choice: WizardChoice | null = null, root: string | null = null): void {
    this.pending = { mode, choice, root };
    this.tryOpen();
  }

  /** Opens an Empty Model wizard from the start, also while the wizard of the settings is open; with an Empty Model wizard already open on the same path nothing changes, and on the other path it starts over with the path asked for. */
  openEmptyModel(choice: WizardChoice, root: string): void {
    if (this.state?.mode === "empty-model" && this.state.choice === choice) return;
    this.close();
    this.open("empty-model", choice, root);
  }

  private tryOpen(): void {
    const pending = this.pending;
    if (pending === null || this.schema.length === 0 || (pending.mode === "first" && !this.foldersKnown)) return;
    const root = pending.mode === "first" ? (this.folders[0]?.root ?? null) : pending.root;
    this.pending = null;
    this.resetAsked();
    this.models = null;
    this.instructionFiles = null;
    this.check = null;
    this.busy = false;
    this.error = null;
    this.update(openWizard(pending.mode, pending.choice, this.current, root));
  }

  /** Forgets every choice; nothing was saved. */
  close(): void {
    this.pending = null;
    this.state = null;
    this.busy = false;
    this.error = null;
    this.models = null;
    this.instructionFiles = null;
    this.check = null;
    this.resetAsked();
    this.emit();
  }

  private resetAsked(): void {
    this.checkKey = null;
    this.modelsKey = null;
    this.instructionRoot = undefined;
    this.requestedFolders.clear();
  }

  // ---- What the host sends ----

  receiveSettings(message: Extract<ToWebview, { type: "settings" }>): void {
    this.schema = message.schema;
    this.current = message.values;
    this.generation++;
    this.tryOpen();
    this.emit();
  }

  receiveFolders(folders: readonly WorkspaceFolderView[]): void {
    this.folders = folders;
    this.foldersKnown = true;
    const state = this.state;
    if (state !== null && state.mode === "first") {
      const root = folders.some((f) => f.root === state.root) ? state.root : (folders[0]?.root ?? null);
      if (root !== state.root) this.resetAsked();
      this.update(setRoot(state, root));
      return;
    }
    this.tryOpen();
    this.emit();
  }

  receiveModels(message: Extract<ToWebview, { type: "modelSuggestions" }>): void {
    const state = this.state;
    if (state === null || message.ompPath === undefined) return;
    if (message.ompPath !== chosenOmpPath(this.schema, state)) return;
    this.models = { list: message.models, error: message.error ?? null };
    this.emit();
  }

  receiveAgentCheck(message: Extract<ToWebview, { type: "agentCheck" }>): void {
    const state = this.state;
    if (state === null || message.ompPath !== chosenOmpPath(this.schema, state)) return;
    const { type: _type, ...result } = message;
    this.check = result;
    this.providers = providersView(this.providers, result.state === "updating" ? "pending" : { answers: ompAnswers(result), providers: result.providers });
    this.emit();
  }

  receiveInstructionFiles(message: Extract<ToWebview, { type: "instructionFiles" }>): void {
    const state = this.state;
    if (state === null || state.step !== "omp" || this.instructionRoot === undefined || (this.instructionRoot !== null && message.root !== this.instructionRoot)) return;
    this.instructionFiles = message.files;
    this.emit();
  }

  /** The warning's link: the host opens the file when it is in its last answer. */
  openInstructionFile(path: string): void {
    this.callbacks.post({ type: "openInstructionFile", path });
  }

  /** `Install omp`: the host opens a terminal with omp's official installer. */
  installOmp(): void {
    this.callbacks.post({ type: "installOmp" });
  }

  /** `Log in` of a provider: the host opens a terminal that runs `omp login <provider>` with the omp of the step, saved or not, and checks it again when the command ends. */
  login(provider: string): void {
    const state = this.state;
    if (state === null) return;
    this.callbacks.post({ type: "ompLogin", provider, ompPath: chosenOmpPath(this.schema, state) });
  }

  receiveFolderChildren(message: Extract<ToWebview, { type: "folderChildren" }>): void {
    const state = this.state;
    if (state === null || state.root !== message.root) return;
    this.update({ ...state, tree: { ...state.tree, [message.path]: message.entries as FolderEntry[] } });
  }

  /** The first setup's confirmation is running, or it ended with `error`. */
  receiveSetup(message: Extract<ToWebview, { type: "setup" }>): void {
    this.busy = message.busy;
    this.error = message.error;
    this.emit();
  }

  /** The confirmation of the wizard of another mode ended: it closes, or stays on the summary with the reason. */
  receiveResult(message: Extract<ToWebview, { type: "guidedSetupResult" }>): void {
    const mode = this.state?.mode;
    this.busy = false;
    this.error = message.ok ? null : message.error;
    if (message.ok && mode !== undefined) {
      this.close();
      this.callbacks.onClose?.("done", mode);
      return;
    }
    this.emit();
  }

  // ---- What the developer does ----

  private act(change: (state: WizardState) => WizardState): void {
    if (this.state === null || this.busy) return;
    this.update(change(this.state));
  }

  next(): void {
    this.act((state) => (nextBlock(this.schema, state, this.check) === null ? nextStep(state) : state));
  }

  back(): void {
    this.act(previousStep);
  }

  skip(): void {
    this.act(skipAdvanced);
  }

  cancel(): void {
    const mode = this.state?.mode;
    if (this.busy || mode === undefined || mode === "first") return;
    this.close();
    this.callbacks.onClose?.("cancel", mode);
  }

  openStep(step: WizardState["step"]): void {
    this.act((state) => openStep(state, step));
  }

  chooseWay(choice: WizardChoice): void {
    this.act((state) => setChoice(state, choice));
  }

  chooseFolder(root: string): void {
    if (this.state?.root !== root) this.requestedFolders.clear();
    this.act((state) => setRoot(state, root));
  }

  /** A field of a step changed: the value is kept as the Settings tab would keep it, with nothing for the default and for an empty text. */
  setValue(setting: SettingSchema, value: SettingValue): void {
    this.generation++;
    this.act((state) => setValue(state, setting.key, storedValue(setting, value)));
  }

  setInvalid(key: string, invalid: boolean): void {
    if (this.state === null) return;
    const next = setInvalid(this.state, key, invalid);
    if (next === this.state) return;
    this.state = next;
    this.emit();
  }

  toggle(path: string): void {
    this.act((state) => ({ ...state, excluded: toggleExcluded(state.excluded, state.tree, path) }));
  }

  /** The tree opens a folder: the host reads it once. */
  openFolder(path: string): void {
    const state = this.state;
    if (state === null || state.root === null || state.tree[path] !== undefined || this.requestedFolders.has(path)) return;
    this.requestedFolders.add(path);
    this.callbacks.post({ type: "folderChildrenWanted", root: state.root, path });
  }

  /** Confirms the summary: only the keys that changed go to the host, in the order of the steps, with the excluded paths. */
  confirm(): void {
    const state = this.state;
    if (state === null || this.busy) return;
    this.busy = true;
    this.error = null;
    this.emit();
    this.callbacks.post({
      type: "confirmSetup",
      mode: state.mode,
      ...(state.mode === "settings" || state.choice === null ? {} : { choice: state.choice }),
      ...(state.mode === "first" && state.root !== null ? { root: state.root } : {}),
      values: changedWrites(this.schema, state, this.current),
      excluded: state.choice === "import" && state.mode !== "settings" ? exclusions(state.excluded) : [],
    });
  }

  // ---- Asking the host ----

  /** What the step on view needs from the host, asked once for each question. */
  private ask(): void {
    const state = this.state;
    if (state === null) return;
    const ompPath = chosenOmpPath(this.schema, state);
    // The check is made again each time the omp step is shown and each time its path changes.
    if (state.step !== "omp") this.checkKey = null;
    if (state.step === "omp" && this.checkKey !== ompPath) {
      // The section of providers waits for the first outcome after the step is shown; a later check, of the same or another path, keeps the rows until its outcome arrives.
      if (this.checkKey === null) this.providers = null;
      this.checkKey = ompPath;
      this.check = null;
      this.callbacks.post({ type: "agentCheckWanted", ompPath });
    }
    if (state.step === "Models" && this.modelsKey !== ompPath) {
      this.modelsKey = ompPath;
      this.models = null;
      this.callbacks.post({ type: "modelSuggestionsWanted", ompPath });
    }
    if (state.step !== "omp") this.instructionRoot = undefined;
    else if (this.instructionRoot === undefined) {
      this.instructionRoot = state.mode === "first" ? state.root : null;
      this.instructionFiles = null;
      this.callbacks.post({ type: "instructionFilesWanted", ...(this.instructionRoot === null ? {} : { root: this.instructionRoot }) });
    }
    if (state.step === "Folders") this.openFolder("");
  }
}
