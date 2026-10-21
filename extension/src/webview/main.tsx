import { type ReactNode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import tailwind from "tailwind:css";
import type { Snapshot } from "../../../src/core/snapshot";
import type { NavigateOptions, ToHost, ToWebview, ViewName } from "../protocol";
import { boardDecisionCount, buildBoard } from "./board/logic";
import { mountBoard } from "./board";
import { mountDiagram } from "./diagram";
import { mountGetStarted } from "./getstarted";
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

const store = createShellStore({ view: "diagram", hasProject: null, decisions: 0, error: null, diagnostics: [], views: {}, questions: null });
/** Where a view draws its tab: the one React root renders what the views hand to the shell store. */
const slotOf = (view: ViewName) => (node: ReactNode) => store.set({ views: { ...store.get().views, [view]: node } });
let snapshot: Snapshot | null = null;

function navigate(view: ViewName, options: NavigateOptions = {}) {
  store.set({ view });
  mounted[view].show(options);
}

/**
 * Without a project the tabs are Get Started and Settings; with one, every tab except Get Started. The panel moves to
 * Get Started when the project is missing and to the Diagram when it appears.
 */
function setProject(present: boolean) {
  if (present === store.get().hasProject) return;
  store.set({ hasProject: present });
  getStarted.projectPresent(present);
  settings.projectPresent(present);
  navigate(present ? "diagram" : "getstarted");
}

const context: ViewContext = { post, navigate, openLink: (url) => post({ type: "openLink", url }) };
const settings = mountSettings(slotOf("settings"), context, theme);
const getStarted = mountGetStarted(slotOf("getstarted"), context);
const board = mountBoard(slotOf("board"), context);
const mounted: Record<ViewName, View> = {
  getstarted: getStarted,
  diagram: mountDiagram(slotOf("diagram"), context),
  board,
  requirements: mountRequirements(slotOf("requirements"), context),
  specs: mountSpecs(slotOf("specs"), context),
  settings,
};

const questions = mountQuestions((node) => store.set({ questions: node }), post, context.openLink);

/** The question overlay above the tabs; the tabs fill what is left of the panel. */
function App() {
  const state = useSyncExternalStore(store.subscribe, store.get);
  return (
    <>
      {state.questions}
      <div className="min-h-0 flex-1">
        <Shell store={store} navigate={(view) => navigate(view, {})} openModelFile={(path) => post({ type: "openModelFile", path })} />
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
    mounted.diagram.update(snapshot, message.asking, message.resolve, message.scans);
    board.update(snapshot, message.asking, message.resolve, message.scans, message.models);
    mounted.requirements.update(snapshot);
    mounted.specs.update(snapshot);
    store.set({ error: null, diagnostics: snapshot.diagnostics, decisions: boardDecisionCount(buildBoard(snapshot)) });
  } else if (message.type === "withdrawn") {
    board.withdrawn?.(message.announcements);
  } else if (message.type === "finalReviewMissing") {
    board.finalReviewMissing?.(message.reason);
  } else if (message.type === "stoppedFollowing") {
    board.stoppedFollowing?.(message.subject, message.reason);
  } else if (message.type === "error") {
    store.set({ error: message.message });
  } else if (message.type === "navigate") navigate(message.view, { ref: message.ref, proposal: message.proposal });
  else if (message.type === "questions") questions.update(message.round);
  else if (message.type === "settings") {
    settings.receive(message);
    getStarted.receiveSettings(message);
  } else if (message.type === "modelSuggestions") {
    // An answer for an agent the wizard asked about is the wizard's alone; the Settings tab and the Board take the ones for the saved agent.
    if (message.agent !== undefined) {
      settings.receiveWizardModels(message);
      getStarted.receiveModels(message);
    } else {
      settings.receiveModels(message);
      board.receiveModels(message);
    }
  } else if (message.type === "workspaceFolders") getStarted.receiveFolders(message);
  else if (message.type === "guidedSetup") settings.openGuidedSetup(message);
  else if (message.type === "guidedSetupResult") settings.receiveResult(message);
  else if (message.type === "agentCheck") {
    settings.receiveAgentCheck(message);
    getStarted.receiveAgentCheck(message);
  } else if (message.type === "folderChildren") {
    settings.receiveFolderChildren(message);
    getStarted.receiveFolderChildren(message);
  }
});

navigate("diagram");
post({ type: "ready" });
