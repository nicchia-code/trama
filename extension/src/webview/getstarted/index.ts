import type { ToWebview } from "../../protocol";
import { renderInline } from "../markdown";
import type { View, ViewContext } from "../types";
import css from "./getstarted.css" with { type: "text" };

type SetupMessage = Extract<ToWebview, { type: "setup" }>;

/** The Get Started tab takes the host's setup messages directly: it is not driven by snapshots. */
export interface GetStartedView extends View {
  receive(message: SetupMessage): void;
}

const NOTICE = "Trama will create a `.trama` folder that describes this project. It holds no secrets and is meant to be committed. It also writes the agent skills and the Trama sub-agent definition into this project, which are meant to be committed too.";

const SVG = "http://www.w3.org/2000/svg";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The theme's warning mark, drawn here: the webview loads no icon font. */
function warningIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "gs-icon");
  const triangle = document.createElementNS(SVG, "path");
  triangle.setAttribute("d", "M8 1.5 15 14H1Z");
  triangle.setAttribute("fill", "var(--vscode-editorWarning-foreground, #cca700)");
  const mark = document.createElementNS(SVG, "path");
  mark.setAttribute("d", "M8 6v3.5M8 11.4v.2");
  mark.setAttribute("stroke", "var(--vscode-editor-background, #1e1e1e)");
  mark.setAttribute("stroke-width", "1.5");
  mark.setAttribute("stroke-linecap", "round");
  svg.append(triangle, mark);
  return svg;
}

/** The Get Started tab: shown only while the folder has no Trama project, so the developer can pick how to start. */
export const mountGetStarted = (root: HTMLElement, context: ViewContext): GetStartedView => {
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);

  const page = el("div", "gs");
  const notice = el("div", "gs-notice");
  notice.append(warningIcon(), renderInline(NOTICE, context.openLink));

  const actions = el("div", "gs-actions");
  const importButton = el("button", "gs-button", "Import from Code");
  importButton.type = "button";
  importButton.title = "Set up Trama and ask an agent to describe the existing code as Proposals";
  importButton.setAttribute("aria-label", `${importButton.textContent}. ${importButton.title}`);
  const scratchButton = el("button", "gs-button", "Start from Scratch");
  scratchButton.type = "button";
  scratchButton.title = "Set up Trama and describe the project you want to build";
  scratchButton.setAttribute("aria-label", `${scratchButton.textContent}. ${scratchButton.title}`);
  actions.append(importButton, scratchButton);

  const error = el("p", "gs-error");
  error.setAttribute("role", "alert");
  error.hidden = true;
  page.append(notice, actions, error);
  root.append(page);

  let busy = false;
  const buttons = [importButton, scratchButton];
  const setBusy = (value: boolean) => {
    busy = value;
    for (const button of buttons) button.disabled = value;
  };

  const choose = (choice: "import" | "scratch") => {
    if (busy) return;
    setBusy(true);
    error.hidden = true;
    context.post({ type: "initialize", choice });
  };
  importButton.addEventListener("click", () => choose("import"));
  scratchButton.addEventListener("click", () => choose("scratch"));

  return {
    update() {},
    show() {},
    receive(message) {
      setBusy(message.busy);
      error.hidden = message.error === null;
      error.textContent = message.error ?? "";
    },
  };
};
