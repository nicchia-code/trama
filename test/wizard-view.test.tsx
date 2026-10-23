import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, type SettingsValues, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost } from "../extension/src/protocol";
import { mountGetStarted } from "../extension/src/webview/getstarted";
import { Wizard } from "../extension/src/webview/wizard";
import { WizardController } from "../extension/src/webview/wizard/controller";

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

test("the first setup opens on Path with the notice on top, the step indicator and no Back", () => {
  setup();
  expect(screen.getByText("The notice")).not.toBeNull();
  expect(heading()).toBe("Path");
  expect(screen.getByText("Choose how Trama starts in this folder.")).not.toBeNull();
  const steps = screen.getByRole("list", { name: "Steps" });
  expect(within(steps).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Path", "omp", "Models", "Project", "Advanced", "Summary"]);
  expect(steps.querySelector('[aria-current="step"]')?.textContent).toBe("Path");
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
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
  expect(within(screen.getByRole("list", { name: "Steps" })).getAllByRole("listitem").map((item) => item.textContent)).toContain("Folders");
  fireEvent.click(screen.getByRole("radio", { name: /Start from Scratch/ }));
  expect(within(screen.getByRole("list", { name: "Steps" })).getAllByRole("listitem").map((item) => item.textContent)).not.toContain("Folders");
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
  act(() => controller.openStep("Advanced"));
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

test("the summary shows every value with the changed ones marked, and each row goes back to its step", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.scan": { user: "gpt-5" } } });
  act(() => controller.openStep("Advanced"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Drift Blocker" }));
  press("Next");
  expect(heading()).toBe("Summary");
  const row = screen.getByRole("button", { name: "Edit Drift Blocker" });
  expect(row.textContent).toContain("On");
  expect(row.textContent).toContain("changed");
  expect(row.textContent).toContain("was Off");
  expect(screen.getByRole("button", { name: "Edit Scan" }).textContent).toContain("gpt-5");
  expect(screen.getByRole("button", { name: "Edit Scan" }).textContent).not.toContain("changed");
  expect(screen.getByRole("button", { name: "Edit Theme" }).textContent).toContain("(default)");
  fireEvent.click(screen.getByRole("button", { name: "Edit Scan" }));
  expect(heading()).toBe("Models");
});

test("the confirmation sends only the changed keys, disables every button while it runs and, when it fails, shows the reason and keeps its text", () => {
  const { controller, posted } = setup({ mode: "settings" });
  act(() => controller.openStep("Advanced"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Drift Blocker" }));
  press("Next");
  press("Save settings");
  expect(posted.at(-1)).toEqual({ type: "confirmSetup", mode: "settings", values: [{ key: "trama.driftBlocker", value: true }], excluded: [] });
  for (const button of screen.getAllByRole("button") as HTMLButtonElement[]) expect(button.disabled).toBe(true);
  act(() => controller.receiveResult({ type: "guidedSetupResult", ok: false, error: "Could not save Theme: boom." }));
  expect(screen.getByRole("alert").textContent).toBe("Could not save Theme: boom.");
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
  act(() => second.controller.openStep("Summary"));
  press("Save and start");
  act(() => second.controller.receiveResult({ type: "guidedSetupResult", ok: true, error: null }));
  expect(second.closed).toEqual(["done:empty-model"]);
  expect(second.controller.isOpen()).toBe(false);
});

test("the first setup confirms with the folder, the path and the excluded folders; a refusal of the overwrite shows nothing and keeps the summary", () => {
  const { controller, posted } = setup({ choice: undefined });
  fireEvent.click(screen.getByRole("radio", { name: /Import from Code/ }));
  press("Next");
  act(() => controller.openStep("Folders"));
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
  expect(screen.getByRole("button", { name: "Edit Excluded folders" }).textContent).toContain("src");
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
  act(() => controller.openStep("Models"));
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

test("the Models step shows the advice in words", () => {
  const { controller } = setup({ mode: "settings" });
  answered(controller);
  press("Next");
  expect(heading()).toBe("Models");
  expect(screen.getByText("Choose the model for each kind of work. Analysis works best with your most capable model, Execution with a mid-range one, Scan with a fast, light one.")).not.toBeNull();
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
