import type { Snapshot } from "../../../src/core/snapshot";
import type { NavigateOptions, ToHost, ToWebview, ViewName } from "../protocol";
import { mountBoard } from "./board";
import { mountDiagram } from "./diagram";
import { mountRequirements } from "./requirements";
import css from "./shell.css" with { type: "text" };
import type { View, ViewContext } from "./types";

declare function acquireVsCodeApi(): { postMessage(message: ToHost): void };

const vscode = acquireVsCodeApi();
const post = (message: ToHost) => vscode.postMessage(message);

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

const app = document.getElementById("app") as HTMLElement;
app.innerHTML = `
  <div class="shell-header">
    <button class="shell-tab" data-view="diagram" role="tab">Diagram</button>
    <button class="shell-tab" data-view="board" role="tab">Board<span class="shell-badge" data-badge hidden></span></button>
    <button class="shell-tab" data-view="requirements" role="tab">Requirements</button>
    <span class="shell-spacer"></span>
  </div>
  <div class="shell-error" data-error hidden><span data-error-text></span><button data-dismiss aria-label="Dismiss">×</button></div>
  <details class="shell-model-errors" data-model-errors hidden><summary data-model-errors-summary></summary><ul data-model-errors-list></ul></details>
  <div class="shell-views"></div>`;

const views = app.querySelector(".shell-views") as HTMLElement;
const roots: Record<ViewName, HTMLElement> = { diagram: document.createElement("div"), board: document.createElement("div"), requirements: document.createElement("div") };
for (const root of Object.values(roots)) {
  root.className = "shell-view";
  views.append(root);
}

let current: ViewName = "diagram";
let snapshot: Snapshot | null = null;

function navigate(view: ViewName, options: NavigateOptions = {}) {
  current = view;
  for (const [name, root] of Object.entries(roots)) root.hidden = name !== view;
  for (const tab of app.querySelectorAll<HTMLElement>(".shell-tab")) tab.setAttribute("aria-selected", String(tab.dataset["view"] === view));
  mounted[view].show(options);
}

const context: ViewContext = { post, navigate };
const mounted: Record<ViewName, View> = {
  diagram: mountDiagram(roots.diagram, context),
  board: mountBoard(roots.board, context),
  requirements: mountRequirements(roots.requirements, context),
};

const errorBox = app.querySelector("[data-error]") as HTMLElement;
const showError = (message: string | null) => {
  errorBox.hidden = message === null;
  (app.querySelector("[data-error-text]") as HTMLElement).textContent = message ?? "";
};
app.querySelector("[data-dismiss]")?.addEventListener("click", () => showError(null));

/** The Model can be invalid while every file still reads fine (a hand edit, a bad merge): say so, with a link to each problem. */
function showModelErrors(diagnostics: Snapshot["diagnostics"]) {
  const box = app.querySelector("[data-model-errors]") as HTMLDetailsElement;
  box.hidden = diagnostics.length === 0;
  (app.querySelector("[data-model-errors-summary]") as HTMLElement).textContent =
    `The Model or its Requirements have ${diagnostics.length} validation error${diagnostics.length === 1 ? "" : "s"}: the Diagram may be incomplete until they are fixed.`;
  const list = app.querySelector("[data-model-errors-list]") as HTMLElement;
  list.replaceChildren(
    ...diagnostics.map((d) => {
      const item = document.createElement("li");
      const link = document.createElement("button");
      link.type = "button";
      link.className = "shell-link";
      link.textContent = d.line > 0 ? `${d.file}:${d.line}` : d.file;
      link.title = `Open ${d.file}`;
      link.addEventListener("click", () => post({ type: "openModelFile", path: d.file }));
      item.append(link, document.createTextNode(` ${d.message}`));
      return item;
    }),
  );
}
for (const tab of app.querySelectorAll<HTMLElement>(".shell-tab")) tab.addEventListener("click", () => navigate(tab.dataset["view"] as ViewName));

window.addEventListener("message", (event: MessageEvent<ToWebview>) => {
  const message = event.data;
  if (message.type === "snapshot") {
    snapshot = message.snapshot;
    showError(null);
    mounted.diagram.update(snapshot);
    mounted.board.update(snapshot);
    mounted.requirements.update(snapshot);
    showModelErrors(snapshot.diagnostics);
    const decide = snapshot.proposals.length + snapshot.drifts.length;
    const badge = app.querySelector("[data-badge]") as HTMLElement;
    badge.hidden = decide === 0;
    badge.textContent = String(decide);
  } else if (message.type === "error") showError(message.message);
  else if (message.type === "navigate") navigate(message.view, { ref: message.ref, proposal: message.proposal });
});

navigate(current);
post({ type: "ready" });
