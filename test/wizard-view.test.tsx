import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, type SettingsValues, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost } from "../extension/src/protocol";
import { mountGetStarted } from "../extension/src/webview/getstarted";
import { Wizard } from "../extension/src/webview/wizard";
import { WizardController } from "../extension/src/webview/wizard/controller";
import type { WizardStep } from "../extension/src/webview/wizard/logic";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const schema = settingsSchema(manifest);

// Radix and cmdk use browser APIs that happy-dom does not have.
beforeAll(() => {
  const proto = globalThis.Element.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
  (globalThis as unknown as Record<string, unknown>).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

const FOLDER = { name: "app", root: "/work/app", hasFiles: true };

function setup(options: { mode?: "first" | "settings" | "empty-model"; choice?: "import" | "scratch"; values?: Record<string, SettingsValues>; folders?: (typeof FOLDER)[] } = {}) {
  const posted: ToHost[] = [];
  const closed: string[] = [];
  const controller = new WizardController({ post: (message) => posted.push(message), onClose: (reason, mode) => closed.push(`${reason}:${mode}`) });
  const utils = render(<Wizard controller={controller} openLink={() => {}} notice={<p>The notice</p>} />);
  const mode = options.mode ?? "first";
  act(() => {
    controller.receiveSettings({ type: "settings", schema, values: options.values ?? {} });
    controller.receiveFolders(options.folders ?? [FOLDER]);
    controller.open(mode, options.choice ?? null, mode === "first" ? null : "/work/app");
  });
  return { posted, closed, controller, ...utils };
}

/** The answer of the host that says omp responds for `ompPath`. */
const answered = (controller: WizardController, ompPath = "") => act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath, state: "done", ok: true, missing: false, version: "18.12.6", models: 3 }));

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const heading = () => screen.getByRole("heading", { level: 2 }).textContent;
const nav = () => screen.getByRole("navigation", { name: "Setup steps" });
/** The names of the steps in the indicator, without the number in the circle. */
const stepNames = () => within(nav()).getAllByRole("listitem").map((item) => (item.textContent ?? "").replace(/^\d+/, ""));

/** Goes forward with Next as the developer does: omp answers, the folders are read. The step of the mode before `step` must be able to go on. */
function advanceTo(controller: WizardController, step: WizardStep) {
  for (let guard = 0; guard < 10 && controller.getSnapshot().state?.step !== step; guard++) {
    const current = controller.getSnapshot().state?.step;
    if (current === "omp") answered(controller);
    if (current === "Folders") act(() => controller.receiveFolderChildren({ type: "folderChildren", root: "/work/app", path: "", entries: [{ name: "src", kind: "folder", hasChildren: true }] }));
    act(() => controller.next());
  }
  expect(controller.getSnapshot().state?.step).toBe(step);
}

test("the first setup opens on Path with the page title, the notice under the sentence, the step indicator and no Back", () => {
  setup();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Set up Trama");
  expect(heading()).toBe("Path");
  const sentence = screen.getByText("Choose how Trama starts in this folder.");
  const notice = screen.getByText("The notice");
  expect(sentence.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(notice.compareDocumentPosition(screen.getByRole("radiogroup")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(nav()).getByRole("list").tagName).toBe("OL");
  expect(stepNames()).toEqual(["Path", "omp", "Models", "Project", "Advanced", "Summary"]);
  expect(nav().querySelector('[aria-current="step"]')?.textContent).toBe("1Path");
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
});

test("the settings and Empty Model modes are titled Guided setup and have Cancel before Back", () => {
  const { controller } = setup({ mode: "settings" });
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Guided setup");
  expect(stepNames()).toEqual(["omp", "Models", "Project", "Advanced", "Summary"]);
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  answered(controller);
  press("Next");
  const names = within(screen.getByRole("button", { name: "Cancel" }).parentElement as HTMLElement).getAllByRole("button").map((button) => button.textContent);
  expect(names.slice(0, 2)).toEqual(["Cancel", "Back"]);
  cleanup();
  setup({ mode: "empty-model", choice: "scratch" });
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Guided setup");
});

test("the notice of Get Started shows only on Path and Summary, before the content", () => {
  const { controller } = setup();
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  expect(screen.getByText("The notice")).not.toBeNull();
  for (const step of ["omp", "Models", "Project", "Advanced"] as const) {
    advanceTo(controller, step);
    expect(screen.queryByText("The notice")).toBeNull();
  }
  advanceTo(controller, "Summary");
  const notice = screen.getByText("The notice");
  expect(screen.getByText("Check your choices, then confirm.").compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(notice.compareDocumentPosition(screen.getByRole("button", { name: "Edit Path" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("Next on Path needs a way chosen and says why; Import from Code adds the Folders step", () => {
  setup();
  const next = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  expect(next.disabled).toBe(true);
  expect(next.getAttribute("aria-describedby")).not.toBeNull();
  expect(document.getElementById(next.getAttribute("aria-describedby") as string)?.textContent).toBe("Choose how to start");
  expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual(["false", "false"]);
  fireEvent.click(screen.getByRole("radio", { name: /Import from Code/ }));
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  expect(stepNames()).toContain("Folders");
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  expect(stepNames()).not.toContain("Folders");
});

test("the ways are cards with their icon, sentence and radio circle: empty until chosen, filled with the primary colour after", () => {
  setup();
  const [importWay, scratchWay] = screen.getAllByRole("radio") as HTMLElement[];
  expect(importWay?.textContent).toContain("For a project that already has its code: an agent describes it as Proposals.");
  expect(scratchWay?.textContent).toContain("For an application still to be built: you describe it, an agent designs it.");
  const circle = (way: HTMLElement | undefined) => way?.querySelector(":scope > span[aria-hidden='true']") as HTMLElement;
  expect(circle(importWay).className).not.toContain("bg-primary ");
  fireEvent.click(importWay as HTMLElement);
  expect(circle(importWay).className).toContain("bg-primary");
  expect(circle(scratchWay).className).not.toContain("border-primary");
  // Hovering changes the border only: no hover rule for the background.
  expect(importWay?.className).toContain("hover:border-");
  expect(importWay?.className).not.toContain("hover:bg-");
  expect(importWay?.className).toContain("aria-checked:border-primary");
  expect(importWay?.className).toContain("aria-checked:bg-primary/5");
  // Side by side from about 560 px, one under the other below.
  expect(screen.getByRole("radiogroup").className).toContain("grid-cols-1");
  expect(screen.getByRole("radiogroup").className).toContain("min-[560px]:grid-cols-2");
});

test("the step indicator leads back to any earlier step with its tooltip and name, keeps every choice, and cannot lead forward", () => {
  const { controller } = setup({ mode: "settings" });
  // On omp nothing is a button: the current and the next steps are not stops of the Tab.
  expect(within(nav()).queryAllByRole("button")).toEqual([]);
  advanceTo(controller, "Advanced");
  fireEvent.click(screen.getByRole("checkbox", { name: "Drift Blocker" }));
  expect(within(nav()).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Go back to omp", "Go back to Models", "Go back to Project"]);
  expect(nav().querySelector('[aria-current="step"]')?.textContent).toBe("4Advanced");
  // Back over several steps at once.
  fireEvent.click(within(nav()).getByRole("button", { name: "Go back to omp" }));
  expect(heading()).toBe("omp");
  expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
  expect(within(nav()).queryAllByRole("button")).toEqual([]);
  // The choices are kept, and the steps after are reached only with Next.
  advanceTo(controller, "Advanced");
  expect((screen.getByRole("checkbox", { name: "Drift Blocker" }) as HTMLElement).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(within(nav()).getByRole("button", { name: "Go back to Models" }));
  expect(heading()).toBe("Models");
  act(() => controller.openStep("Summary"));
  expect(heading()).toBe("Models");
});

test("the step indicator of the first setup leads back to Path, and of Import from Code to Folders", () => {
  const { controller } = setup();
  fireEvent.click(screen.getByRole("radio", { name: /Import from Code/ }));
  advanceTo(controller, "Summary");
  expect(within(nav()).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Go back to Path", "Go back to omp", "Go back to Models", "Go back to Project", "Go back to Folders", "Go back to Advanced"]);
  fireEvent.click(within(nav()).getByRole("button", { name: "Go back to Path" }));
  expect(heading()).toBe("Path");
  expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual(["true", "false"]);
});

test("in a narrow panel the indicator is «Step <n> of <N> · <step>» with a progress bar, and Back leads back", () => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  try {
    const { controller } = setup({ mode: "settings" });
    expect(within(nav()).queryByRole("list")).toBeNull();
    expect(nav().textContent).toContain("Step 1 of 5 · omp");
    expect(within(nav()).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("20");
    advanceTo(controller, "Project");
    expect(nav().textContent).toContain("Step 3 of 5 · Project");
    expect(within(nav()).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("60");
    expect(within(nav()).queryAllByRole("button")).toEqual([]);
    press("Back");
    expect(heading()).toBe("Models");
  } finally {
    window.matchMedia = original;
  }
});

test("the buttons are in a bar fixed at the bottom with the opaque background and a thin top border, aligned to the column", () => {
  setup({ mode: "settings" });
  const bar = screen.getByRole("button", { name: "Next" }).closest(".sticky") as HTMLElement;
  expect(bar.className).toContain("bottom-0");
  expect(bar.className).toContain("bg-background");
  expect(bar.className).toContain("border-t");
  const column = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
  expect(column.className).toContain("max-w-[720px]");
  expect(bar.firstElementChild?.className).toContain("max-w-[720px]");
  // The page never scrolls sideways.
  expect(bar.parentElement?.className).toContain("overflow-x-clip");
});

test("the arrows move the choice of the way as in a radio group", () => {
  setup();
  const first = screen.getAllByRole("radio")[0] as HTMLElement;
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowRight" });
  expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual(["false", "true"]);
});

test("Start from Scratch on a folder with files shows the warning in the step; Import from Code does not; an empty folder never", () => {
  const { controller } = setup();
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  expect(screen.getByText(/This folder already contains files\. Start from Scratch ignores them/)).not.toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: /Import from Code/ }));
  expect(screen.queryByText(/already contains files/)).toBeNull();
  act(() => controller.receiveFolders([{ ...FOLDER, hasFiles: false }]));
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  expect(screen.queryByText(/already contains files/)).toBeNull();
});

test("with several folders Path offers a select with the name of each, the first chosen", () => {
  setup({ folders: [FOLDER, { name: "lib", root: "/work/lib", hasFiles: false }] });
  const select = screen.getByRole("combobox", { name: "Folder to initialize as a Trama project" });
  expect(select.textContent).toBe("app");
});

test("the omp step moves the focus to its title, checks omp and shows the answer without blocking", () => {
  const { posted } = setup();
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  press("Next");
  expect(heading()).toBe("omp");
  expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
  expect(posted).toContainEqual({ type: "agentCheckWanted", ompPath: "" });
  expect(screen.getByText("Checking omp…")).not.toBeNull();
});

test("an answer of the check for another omp path is ignored; Next waits for omp, and a failed update does not stop it", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  const next = () => screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  expect(heading()).toBe("omp");
  expect(posted).toContainEqual({ type: "agentCheckWanted", ompPath: "/x/omp" });
  expect(next().disabled).toBe(true);
  expect(next().getAttribute("aria-describedby")).not.toBeNull();
  answered(controller, "");
  expect(screen.getByText("Checking omp…")).not.toBeNull();
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "/x/omp", state: "updating", version: "18.13.0" }));
  expect(screen.getByText("Updating omp to 18.13.0…")).not.toBeNull();
  expect(next().disabled).toBe(true);
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "/x/omp", state: "done", ok: false, missing: true, error: "omp not found at /x/omp" }));
  expect(screen.getByText("omp not found at /x/omp. Trama cannot work without omp.")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Install omp" })).not.toBeNull();
  expect(next().disabled).toBe(true);
  expect(screen.getByLabelText("Omp Path")).not.toBeNull();
  expect(screen.getByLabelText("Terminal Location")).not.toBeNull();
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "/x/omp", state: "done", ok: true, missing: false, version: "18.12.6", models: 12, updateError: "omp update exited with code 1" }));
  expect(screen.getByText("Could not update omp (omp update exited with code 1). omp 18.12.6 answered with 12 models.")).not.toBeNull();
  expect(next().disabled).toBe(false);
  answered(controller, "/x/omp");
  expect(screen.getByText("omp 18.12.6 answered with 3 models.")).not.toBeNull();
});

test("leaving the omp step and coming back checks omp again", () => {
  const { controller, posted } = setup({ mode: "settings" });
  answered(controller);
  press("Next");
  press("Back");
  expect(posted.filter((m) => m.type === "agentCheckWanted")).toHaveLength(2);
  expect(screen.getByText("Checking omp…")).not.toBeNull();
});

test("the Models step suggests the models of the omp path chosen in the wizard before it is saved, and blocks Next with an invalid number of sub-agents", () => {
  const { controller, posted } = setup({ mode: "settings" });
  answered(controller);
  press("Next");
  expect(heading()).toBe("Models");
  expect(posted).toContainEqual({ type: "modelSuggestionsWanted", ompPath: "" });
  // An answer for the saved path (without `ompPath`) is not the wizard's; the one for the path of the step is.
  act(() => controller.receiveModels({ type: "modelSuggestions", models: [{ value: "x" }] }));
  expect(controller.getSnapshot().models).toBeNull();
  act(() => controller.receiveModels({ type: "modelSuggestions", ompPath: "", models: [{ value: "openai/gpt-5" }] }));
  expect(controller.getSnapshot().models?.list).toEqual([{ value: "openai/gpt-5" }]);

  const input = screen.getByLabelText("Max Parallel Agents") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "0" } });
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(input, { target: { value: "3" } });
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
});

test("Skip on Advanced goes back to the values of the start and shows the summary; Back keeps the choices", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.theme": { user: "dark" } } });
  advanceTo(controller, "Advanced");
  expect(heading()).toBe("Advanced");
  fireEvent.click(screen.getByRole("checkbox", { name: "Drift Blocker" }));
  press("Skip");
  expect(heading()).toBe("Summary");
  expect(screen.getByText("Check your choices, then confirm.")).not.toBeNull();
  expect(screen.queryByText("changed")).toBeNull();
  press("Back");
  expect(heading()).toBe("Advanced");
  expect((screen.getByRole("checkbox", { name: "Drift Blocker" }) as HTMLElement).getAttribute("aria-checked")).toBe("false");
});

test("Skip is not primary and sits left of Next on Advanced, and only there", () => {
  const { controller } = setup({ mode: "settings" });
  expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
  advanceTo(controller, "Advanced");
  const skip = screen.getByRole("button", { name: "Skip" });
  expect(skip.className).not.toContain("bg-primary");
  expect(skip.compareDocumentPosition(screen.getByRole("button", { name: "Next" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("the summary has a card for each step with its Edit, the rows with the changed ones marked, and Edit goes back to its step", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.scan": { user: "gpt-5" } } });
  advanceTo(controller, "Advanced");
  fireEvent.click(screen.getByRole("checkbox", { name: "Drift Blocker" }));
  press("Next");
  expect(heading()).toBe("Summary");
  const cards = Array.from(document.querySelectorAll("[data-slot='card']")) as HTMLElement[];
  expect(cards.map((card) => card.querySelector("h3")?.textContent)).toEqual(["omp", "Models", "Project", "Advanced"]);
  const card = (step: string) => cards.find((c) => c.querySelector("h3")?.textContent === step) as HTMLElement;
  // Advanced shows its four subgroups with their subtitles.
  expect(Array.from(card("Advanced").querySelectorAll("h4")).map((h) => h.textContent)).toEqual(["Appearance", "Drifts", "Agents", "omp Chat"]);
  const row = (step: string, title: string) => within(card(step)).getByText(title).closest("div") as HTMLElement;
  expect(row("Advanced", "Drift Blocker").textContent).toContain("On");
  expect(row("Advanced", "Drift Blocker").textContent).toContain("changed");
  expect(row("Advanced", "Drift Blocker").textContent).toContain("was Off");
  expect(row("Advanced", "Drift Blocker").className).toContain("bg-primary/10");
  expect(row("Models", "Scan").textContent).toContain("gpt-5");
  expect(row("Models", "Scan").textContent).not.toContain("changed");
  expect(row("Models", "Scan").querySelector(".font-mono")?.textContent).toBe("gpt-5");
  expect(row("Advanced", "Theme").textContent).toContain("(default)");
  expect(row("omp", "Omp Path").textContent).toContain("(empty)");
  expect(row("omp", "Omp Path").querySelector(".font-mono")).toBeNull();
  // Edit: a secondary button with the name «Edit <step>» that goes back to the step.
  const edit = screen.getByRole("button", { name: "Edit Models" });
  expect(edit.textContent).toBe("Edit");
  expect(edit.className).not.toContain("bg-primary");
  fireEvent.click(edit);
  expect(heading()).toBe("Models");
});

test("the confirmation sends only the changed keys, disables every button while it runs and, when it fails, shows the reason and keeps its text", () => {
  const { controller, posted } = setup({ mode: "settings" });
  advanceTo(controller, "Advanced");
  fireEvent.click(screen.getByRole("checkbox", { name: "Drift Blocker" }));
  press("Next");
  press("Save settings");
  expect(posted.at(-1)).toEqual({ type: "confirmSetup", mode: "settings", values: [{ key: "trama.driftBlocker", value: true }], excluded: [] });
  // Every button of the wizard, the ones of the indicator and the «Edit» too, and the confirmation turns.
  const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
  expect(buttons.length).toBeGreaterThan(8);
  for (const button of buttons) expect(button.disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Save settings" }).querySelector("svg.animate-spin")).not.toBeNull();
  act(() => controller.receiveResult({ type: "guidedSetupResult", ok: false, error: "Could not save Theme: boom." }));
  const alert = screen.getByRole("alert");
  expect(alert.textContent).toBe("Could not save Theme: boom.");
  // The reason is in the bar of buttons, above the buttons, with its icon.
  expect(alert.closest(".sticky")).not.toBeNull();
  expect(alert.querySelector("svg")).not.toBeNull();
  expect(alert.compareDocumentPosition(screen.getByRole("button", { name: "Save settings" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect((screen.getByRole("button", { name: "Save settings" }) as HTMLButtonElement).disabled).toBe(false);
});

test("a successful confirmation closes the wizard of the settings; Cancel forgets everything and sends nothing", () => {
  const first = setup({ mode: "settings" });
  press("Cancel");
  expect(first.closed).toEqual(["cancel:settings"]);
  expect(first.controller.isOpen()).toBe(false);
  expect(first.posted.some((message) => message.type === "confirmSetup")).toBe(false);
  cleanup();

  const second = setup({ mode: "empty-model", choice: "scratch" });
  advanceTo(second.controller, "Summary");
  press("Save and start");
  act(() => second.controller.receiveResult({ type: "guidedSetupResult", ok: true, error: null }));
  expect(second.closed).toEqual(["done:empty-model"]);
  expect(second.controller.isOpen()).toBe(false);
});

test("the first setup confirms with the folder, the path and the excluded folders; a refusal of the overwrite shows nothing and keeps the summary", () => {
  const { controller, posted } = setup({ choice: undefined });
  fireEvent.click(screen.getByRole("radio", { name: /Import from Code/ }));
  press("Next");
  answered(controller);
  press("Next");
  press("Next");
  press("Next");
  expect(heading()).toBe("Folders");
  expect(posted).toContainEqual({ type: "folderChildrenWanted", root: "/work/app", path: "" });
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  act(() =>
    controller.receiveFolderChildren({
      type: "folderChildren",
      root: "/work/app",
      path: "",
      entries: [{ name: "docs", kind: "folder", hasChildren: true }, { name: "src", kind: "folder", hasChildren: true }],
    }),
  );
  expect(screen.getByText("Everything is included")).not.toBeNull();
  const tree = screen.getByRole("tree");
  expect(within(tree).getAllByRole("treeitem").map((item) => item.getAttribute("aria-label"))).toEqual(["docs", "src"]);
  // Space turns the box of the entry in focus.
  fireEvent.keyDown(tree, { key: "ArrowDown" });
  fireEvent.keyDown(tree, { key: " " });
  expect(screen.getByText("1 excluded")).not.toBeNull();
  expect(within(tree).getByRole("treeitem", { name: "src" }).getAttribute("aria-checked")).toBe("false");
  expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  // The right arrow opens a folder, which the host reads once.
  fireEvent.keyDown(tree, { key: "ArrowUp" });
  fireEvent.keyDown(tree, { key: "ArrowRight" });
  expect(posted).toContainEqual({ type: "folderChildrenWanted", root: "/work/app", path: "docs" });
  expect(within(tree).getByRole("treeitem", { name: "docs" }).getAttribute("aria-expanded")).toBe("true");

  press("Next");
  expect(heading()).toBe("Advanced");
  press("Next");
  const foldersCard = screen.getByRole("button", { name: "Edit Folders" }).closest("[data-slot='card']") as HTMLElement;
  expect(foldersCard.textContent).toContain("Excluded folders");
  expect(foldersCard.textContent).toContain("src");
  expect(foldersCard.querySelector(".font-mono")?.textContent).toBe("src");
  press("Set up Trama");
  expect(posted.at(-1)).toEqual({ type: "confirmSetup", mode: "first", choice: "import", root: "/work/app", values: [], excluded: ["src"] });
  act(() => controller.receiveSetup({ type: "setup", busy: false, error: null }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(heading()).toBe("Summary");
  expect((screen.getByRole("button", { name: "Set up Trama" }) as HTMLButtonElement).disabled).toBe(false);
});

test("a value changed from outside while the wizard is open does not change what the wizard holds", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.scan": { user: "gpt-5" } } });
  act(() => controller.receiveSettings({ type: "settings", schema, values: { "trama.scan": { user: "other" } } }));
  advanceTo(controller, "Models");
  expect((screen.getByLabelText("Scan") as HTMLInputElement).value).toBe("gpt-5");
});

test("a new folder to initialize forgets the folders chosen to leave out", () => {
  const { controller } = setup({ folders: [FOLDER, { name: "lib", root: "/work/lib", hasFiles: false }] });
  act(() => controller.chooseWay("import"));
  act(() => controller.chooseFolder("/work/app"));
  act(() => controller.openStep("Path"));
  act(() => controller.toggle("docs"));
  expect(controller.getSnapshot().state?.excluded).toEqual(["docs"]);
  act(() => controller.chooseFolder("/work/lib"));
  expect(controller.getSnapshot().state?.excluded).toEqual([]);
  expect(controller.getSnapshot().state?.root).toBe("/work/lib");
});

test("Get Started mounts the wizard in the first-setup mode only without a project, and forgets it when the project exists", () => {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountGetStarted((node) => page.rerender(<>{node}</>), { post: (message) => posted.push(message), navigate: () => {}, openLink: () => {} });
  act(() => {
    view.projectPresent(false);
    view.receiveSettings({ type: "settings", schema, values: {} });
    view.receiveFolders({ type: "workspaceFolders", folders: [FOLDER] });
  });
  expect(screen.getByText(/Trama will create a/)).not.toBeNull();
  expect(heading()).toBe("Path");
  act(() => view.projectPresent(true));
  expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  act(() => view.projectPresent(false));
  expect(heading()).toBe("Path");
});

const FILES = [
  { label: "AGENTS.md", path: "/work/app/AGENTS.md" },
  { label: "~/.claude/CLAUDE.md", path: "/home/me/.claude/CLAUDE.md" },
];
const wanted = (posted: ToHost[]) => posted.filter((m) => m.type === "instructionFilesWanted");

test("the Models step has a plain sentence and, under the title of each role, the advice in bold before the explanation", () => {
  const { controller } = setup({ mode: "settings" });
  advanceTo(controller, "Models");
  expect(screen.getByText("Choose the model for each kind of work.")).not.toBeNull();
  for (const [title, advice] of [["Analysis", "Your most capable model."], ["Execution", "A mid-range model."], ["Scan", "A fast, light model."]] as const) {
    const label = screen.getByText(title, { selector: "label[for^='st-']" });
    const lead = screen.getByText(advice);
    expect(lead.className).toContain("font-semibold");
    expect(label.compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const input = screen.getByRole("combobox", { name: title });
    const explain = document.getElementById((input.getAttribute("aria-describedby") ?? "").split(" ")[0] as string) as HTMLElement;
    expect(explain.id).toContain("-explain");
    expect(lead.compareDocumentPosition(explain) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(explain.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
});

test("each setting shows its title, its explanation in the page, the control and then its messages, with no «i» and no bubble, and the explanation describes the control", () => {
  const { controller } = setup({ mode: "settings" });
  advanceTo(controller, "Models");
  expect(screen.queryByRole("button", { name: /^About / })).toBeNull();
  const input = screen.getByLabelText("Max Parallel Agents") as HTMLInputElement;
  const label = screen.getByText("Max Parallel Agents", { selector: "label[for^='st-']" });
  const explain = document.getElementById(`${input.id}-explain`) as HTMLElement;
  expect(explain.hidden).toBe(false);
  expect(explain.textContent?.length).toBeGreaterThan(10);
  expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(explain.id);
  expect(label.compareDocumentPosition(explain) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(explain.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // No message: nothing after the control.
  expect(input.nextElementSibling).toBeNull();
  fireEvent.change(input, { target: { value: "0" } });
  fireEvent.blur(input);
  const message = document.getElementById(`${input.id}-error`) as HTMLElement;
  expect(message).not.toBeNull();
  expect(input.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // The settings are one under the other, in the width of the column, with the same space between them.
  expect((input.closest("div.grid.gap-5") as HTMLElement).children.length).toBe(4);
});

test("an enum shows under its Select the entry of the chosen value, and it changes with the value; a checkbox is left of its title and the title changes it", () => {
  const { controller } = setup({ mode: "settings" });
  const terminal = screen.getByRole("combobox", { name: "Terminal Location" });
  const described = () => (terminal.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "");
  expect(described()).toContain("The terminal area.");
  expect(screen.queryByText("A terminal tab in the active editor group.")).toBeNull();
  act(() => controller.setValue(schema.find((s) => s.key === "trama.terminalLocation")!, "editor"));
  expect(described()).toContain("A terminal tab in the active editor group.");
  expect(screen.queryByText("The terminal area.")).toBeNull();

  const ignore = screen.getByRole("checkbox", { name: "Ignore Instruction Files" });
  const title = screen.getByText("Ignore Instruction Files", { selector: "label[for^='st-']" });
  expect(ignore.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(ignore.parentElement?.parentElement).toBe(title.parentElement);
  expect(ignore.getAttribute("aria-checked")).toBe("false");
  fireEvent.click(title);
  expect(screen.getByRole("checkbox", { name: "Ignore Instruction Files" }).getAttribute("aria-checked")).toBe("true");
});

test("Advanced has its four subgroups with their subtitles, in order, each with its settings", () => {
  const { controller } = setup({ mode: "settings" });
  advanceTo(controller, "Advanced");
  const groups = Array.from(document.querySelectorAll("section[aria-label]")) as HTMLElement[];
  expect(groups.map((group) => group.querySelector("h3")?.textContent)).toEqual(["Appearance", "Drifts", "Agents", "omp Chat"]);
  expect(groups.map((group) => group.querySelectorAll("label").length)).toEqual([1, 3, 3, 3]);
});

test("the omp step shows the state of the check in a bordered live region at the top, before the settings, with Install omp inside it when omp is missing", () => {
  const { controller } = setup({ mode: "settings" });
  const region = screen.getByText("Checking omp…").closest("[aria-live]") as HTMLElement;
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.className).toContain("border");
  expect(region.querySelector("svg.animate-spin.motion-reduce\\:animate-none")).not.toBeNull();
  expect(screen.getByText("omp is required: Trama runs every agent with omp.").compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(region.compareDocumentPosition(screen.getByLabelText("Omp Path")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  answered(controller);
  expect(region.textContent).toBe("omp 18.12.6 answered with 3 models.");
  expect(region.className).not.toContain("amber");
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "", state: "done", ok: false, missing: true, error: "omp not found at omp." }));
  expect(region.textContent).toContain("omp not found at omp. Trama cannot work without omp.");
  expect(region.className).toContain("amber");
  expect(within(region).getByRole("button", { name: "Install omp" })).not.toBeNull();
});

test("the folders step is a tree with a box, an icon and a name that is cut with an ellipsis and whole in its tooltip, and it scrolls inside the step", () => {
  const { controller } = setup({ mode: "empty-model", choice: "import" });
  advanceTo(controller, "Folders");
  const tree = screen.getByRole("tree");
  expect(tree.className).toContain("overflow-y-auto");
  expect(tree.className).toContain("max-h-");
  act(() => controller.receiveFolderChildren({ type: "folderChildren", root: "/work/app", path: "", entries: [{ name: "a-very-long-folder-name-that-does-not-fit", kind: "folder", hasChildren: true }, { name: "README.md", kind: "file", hasChildren: false }] }));
  const [folder, file] = within(tree).getAllByRole("treeitem");
  expect(folder?.querySelector("svg.lucide-folder")).not.toBeNull();
  expect(file?.querySelector("svg.lucide-file")).not.toBeNull();
  expect(folder?.querySelector(".truncate")?.textContent).toBe("a-very-long-folder-name-that-does-not-fit");
  expect(folder?.className).toContain("pl-[calc(var(--depth)_*_10px_+_4px)]");
  expect(folder?.className).toContain("min-[480px]:pl-[calc(var(--depth)_*_16px_+_4px)]");
  // The folder opens with its chevron and the icon turns to the open folder.
  fireEvent.keyDown(tree, { key: "ArrowRight" });
  expect(within(tree).getAllByRole("treeitem")[0]?.querySelector("svg.lucide-folder-open")).not.toBeNull();
  // Everything excluded: Next says why.
  fireEvent.keyDown(tree, { key: " " });
  fireEvent.keyDown(tree, { key: "ArrowDown" });
  fireEvent.keyDown(tree, { key: " " });
  const next = screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  expect(next.disabled).toBe(true);
  expect(document.getElementById(next.getAttribute("aria-describedby") as string)?.textContent).toBe("Include at least one folder or file");
});

test("the omp step searches the instruction files of the project folder, shows no box before the answer or without files", () => {
  const { controller, posted } = setup({ mode: "settings" });
  expect(wanted(posted)).toEqual([{ type: "instructionFilesWanted" }]);
  expect(screen.queryByText(/Agent instruction files found/)).toBeNull();
  act(() => controller.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files: [] }));
  expect(screen.queryByText(/Agent instruction files found/)).toBeNull();
  act(() => controller.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files: FILES }));
  expect(screen.getByText("Agent instruction files found. The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.")).not.toBeNull();
  expect(screen.getAllByRole("button", { name: /^Open / }).map((item) => item.textContent)).toEqual(["AGENTS.md", "~/.claude/CLAUDE.md"]);
  expect(screen.queryByText("Trama's omp jobs ignore these files.")).toBeNull();
});

test("following a file asks the host to open it; labels are text, never markup", () => {
  const { controller, posted } = setup({ mode: "settings" });
  act(() => controller.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files: [{ label: "<b>x</b>.md", path: "/work/app/x.md" }] }));
  expect(document.querySelector("li b")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open <b>x</b>.md" }));
  expect(posted).toContainEqual({ type: "openInstructionFile", path: "/work/app/x.md" });
});

test("the note about ignored files follows the wizard's setting at once, without a new search", () => {
  const { controller, posted } = setup({ mode: "settings" });
  act(() => controller.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files: FILES }));
  expect(screen.queryByText("Trama's omp jobs ignore these files.")).toBeNull();
  const ignore = schema.find((s) => s.key === "trama.ignoreInstructionFiles");
  expect(ignore).toBeDefined();
  act(() => controller.setValue(ignore!, true));
  expect(screen.getByText("Trama's omp jobs ignore these files.")).not.toBeNull();
  act(() => controller.setValue(ignore!, false));
  expect(screen.queryByText("Trama's omp jobs ignore these files.")).toBeNull();
  act(() => controller.setValue(ignore!, true));
  expect(screen.getByText("Trama's omp jobs ignore these files.")).not.toBeNull();
  expect(wanted(posted)).toHaveLength(1);
});

test("the search is asked again each time the omp step is shown; in the first setup it is for the folder chosen in Path and an answer for another folder is ignored", () => {
  const { controller, posted } = setup();
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  press("Next");
  expect(heading()).toBe("omp");
  expect(wanted(posted)).toEqual([{ type: "instructionFilesWanted", root: "/work/app" }]);
  act(() => controller.receiveInstructionFiles({ type: "instructionFiles", root: "/work/other", files: FILES }));
  expect(screen.queryByText(/Agent instruction files found/)).toBeNull();
  act(() => controller.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files: FILES }));
  expect(screen.getByText(/Agent instruction files found/)).not.toBeNull();
  answered(controller);
  press("Next");
  press("Back");
  expect(heading()).toBe("omp");
  expect(wanted(posted)).toHaveLength(2);
  expect(screen.queryByText(/Agent instruction files found/)).toBeNull();
});
