import { type ReactNode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import tailwind from "tailwind:css";
import type { Snapshot } from "../../../src/core/snapshot";
import type { NavigateOptions, ToHost, ToWebview, ViewName } from "../protocol";
import { mountBoard } from "./board";
import { mountDiagram } from "./diagram";
import { mountGetStarted } from "./getstarted";
import { mountHistory } from "./history";
import { mountQuestions } from "./questions";
import { mountRequirements } from "./requirements";
import { mountSettings } from "./settings";
import { mountSpecs } from "./specs";
import { createShellStore, Shell } from "./shell";
import { startTheme } from "./theme";
import type { View, ViewContext } from "./types";

declare function acquireVsCodeApi(): { postMessage(message: ToHost): void };

const vscode = acquireVsCodeApi();
const post = (message: ToHost) => vscode.postMessage(message);

// The Tailwind sheet with the shadcn/ui theme.
const style = document.createElement("style");
style.textContent = tailwind;
document.head.append(style);

/** `auto` until Settings sends `trama.theme`: the panel follows the classes of the editor's `body`. */
const theme = startTheme();

const app = document.getElementById("app") as HTMLElement;
app.className = "flex flex-col";

const store = createShellStore({ view: "board", hasProject: null, error: null, diagnostics: [], views: {}, questions: null });
/** Where a view draws itself: the one React root renders what the views hand to the shell store. */
const slotOf = (view: ViewName) => (node: ReactNode) => store.set({ views: { ...store.get().views, [view]: node } });
let snapshot: Snapshot | null = null;

/** Without a project only Get Started and Settings exist; with one, every view but Get Started. Before the host says, any view goes (the panel starts on the Board). */
const exists = (view: ViewName): boolean => {
  const { hasProject } = store.get();
  return hasProject === null || (hasProject ? view !== "getstarted" : view === "getstarted" || view === "settings");
};

function navigate(view: ViewName, options: NavigateOptions = {}) {
  if (!exists(view)) return;
  const previous = store.get().view;
  if (previous !== view) mounted[previous].hide?.();
  store.set({ view });
  post({ type: "viewChanged", view });
  mounted[view].show(options);
}

/** The panel moves to Get Started when the project is missing and to the Board when it appears. */
function setProject(present: boolean) {
  if (present === store.get().hasProject) return;
  store.set({ hasProject: present });
  getStarted.projectPresent(present);
  settings.projectPresent(present);
  navigate(present ? "board" : "getstarted");
}

const context: ViewContext = { post, navigate, openLink: (url) => post({ type: "openLink", url }) };
const settings = mountSettings(slotOf("settings"), context, theme);
const getStarted = mountGetStarted(slotOf("getstarted"), context);
const board = mountBoard(slotOf("board"), context);
const diagram = mountDiagram(slotOf("diagram"), context);
const requirements = mountRequirements(slotOf("requirements"), context);
const specs = mountSpecs(slotOf("specs"), context);
const history = mountHistory(slotOf("history"), context);
const mounted: Record<ViewName, Pick<View, "show" | "hide">> = { getstarted: getStarted, diagram, board, requirements, specs, history, settings };

const questions = mountQuestions((node) => store.set({ questions: node }), post, context.openLink);

/** The question overlay above the panel; the panel fills what is left. */
function App() {
  const state = useSyncExternalStore(store.subscribe, store.get);
  return (
    <>
      {state.questions}
      <div className="min-h-0 flex-1">
        <Shell store={store} openModelFile={(path) => post({ type: "openModelFile", path })} />
      </div>
    </>
  );
}

createRoot(app).render(<App />);

window.addEventListener("message", (event: MessageEvent<ToWebview>) => {
  const message = event.data;
  if (message.type === "project") setProject(message.present);
  else if (message.type === "setup") getStarted.receive(message);
  else if (message.type === "snapshot") {
    snapshot = message.snapshot;
    diagram.update(snapshot, message.asking, message.resolve, message.refinement);
    board.update(snapshot, message.asking, message.resolve, message.models, message.unify, message.refinement, message.runEstimate);
    requirements.update(snapshot);
    specs.update(snapshot);
    history.update(snapshot);
    store.set({ error: null, diagnostics: snapshot.diagnostics });
  } else if (message.type === "withdrawn") {
    board.withdrawn?.(message.announcements);
  } else if (message.type === "stoppedFollowing") {
    board.stoppedFollowing?.(message.subject, message.reason, message.details);
  } else if (message.type === "notice") {
    board.notice?.(message.text);
  } else if (message.type === "clearDoneEnded") {
    board.clearDoneEnded();
  } else if (message.type === "error") {
    store.set({ error: message.message });
  } else if (message.type === "navigate") navigate(message.view, { ref: message.ref, proposal: message.proposal, ghost: message.ghost });
  else if (message.type === "questions") questions.update(message.round);
  else if (message.type === "settings") {
    settings.receive(message);
    getStarted.receiveSettings(message);
  } else if (message.type === "modelSuggestions") {
    // An answer for an omp path the wizard asked about is the wizard's alone; the Settings tab and the Board take the ones for the saved path.
    if (message.ompPath !== undefined) {
      settings.receiveWizardModels(message);
      getStarted.receiveModels(message);
    } else {
      settings.receiveModels(message);
      board.receiveModels(message);
    }
  } else if (message.type === "workspaceFolders") getStarted.receiveFolders(message);
  else if (message.type === "guidedSetup") settings.openGuidedSetup(message);
  else if (message.type === "guidedSetupResult") settings.receiveResult(message);
  else if (message.type === "ompStatus") settings.receiveOmpStatus(message);
  else if (message.type === "agentCheck") {
    settings.receiveAgentCheck(message);
    getStarted.receiveAgentCheck(message);
  } else if (message.type === "instructionFiles") {
    settings.receiveInstructionFiles(message);
    getStarted.receiveInstructionFiles(message);
  } else if (message.type === "folderChildren") {
    settings.receiveFolderChildren(message);
    getStarted.receiveFolderChildren(message);
  }
});

navigate("board");
post({ type: "ready" });
