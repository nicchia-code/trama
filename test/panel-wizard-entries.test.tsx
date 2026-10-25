import type { ReactNode } from "react";
import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost, ViewName } from "../extension/src/protocol";
import { mountGetStarted } from "../extension/src/webview/getstarted";
import { mountSettings } from "../extension/src/webview/settings";
import { createShellStore, Shell } from "../extension/src/webview/shell";
import { startTheme } from "../extension/src/webview/theme";
import type { ViewContext } from "../extension/src/webview/types";

// The entries of the setup wizard in the panel (`panel`): Get Started, the Settings tab and the Diagram's empty-Model buttons.

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const schema = settingsSchema(manifest);
const FOLDER = { name: "app", root: "/work/app", hasFiles: true, inGit: false };

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

// Every view stays mounted and only the current one shows, so the queries look at the view on show.
const onView = () => within(document.querySelector("[data-view-name]:not([hidden])") as HTMLElement);
const heading = () => onView().getByRole("heading", { level: 2 }).textContent;
const press = (name: string | RegExp) => fireEvent.click(onView().getByRole("button", { name }));
const steps = () => within(onView().getByRole("navigation", { name: "Setup steps" })).getAllByRole("listitem").map((item) => (item.textContent ?? "").replace(/^\d+/, ""));

/** The panel of the webview in miniature: Get Started and Settings in the shell, each with its own wizard, and the navigation the views ask for. */
const OMP_OK = { type: "agentCheck", ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 3 } as const;

function panel(hasProject: boolean) {
  const posted: ToHost[] = [];
  const store = createShellStore({ view: hasProject ? "board" : "getstarted", hasProject, error: null, diagnostics: [], views: {} as never, questions: null });
  const slotOf = (view: ViewName) => (node: ReactNode) => store.set({ views: { ...store.get().views, [view]: node } });
  const navigate = (view: ViewName) => store.set({ view });
  const context: ViewContext = { post: (message) => posted.push(message), navigate, openLink: () => {} };
  const settings = mountSettings(slotOf("settings"), context, startTheme());
  const getStarted = mountGetStarted(slotOf("getstarted"), context);
  render(<Shell store={store} openModelFile={() => {}} />);
  act(() => {
    settings.projectPresent(hasProject);
    getStarted.projectPresent(hasProject);
    settings.receive({ type: "settings", schema, values: {} });
    getStarted.receiveSettings({ type: "settings", schema, values: {} });
    getStarted.receiveFolders({ type: "workspaceFolders", folders: [FOLDER] });
  });
  /** The side menu or a command choosing a view. */
  const tab = (name: string) => act(() => store.set({ view: ({ "Get Started": "getstarted", Settings: "settings", Requirements: "requirements" } as Record<string, ViewName>)[name] as ViewName }));
  return { posted, store, settings, getStarted, tab };
}

test("in a folder without a project Get Started is the wizard of the first setup with the notice under the sentence of Path and Summary only", () => {
  panel(false);
  expect(screen.queryByRole("tab")).toBeNull();
  expect(document.querySelector("[data-view-name]:not([hidden])")?.getAttribute("data-view-name")).toBe("getstarted");
  expect(onView().getByRole("heading", { level: 1 }).textContent).toBe("Set up Trama");
  expect(onView().getByText(/Trama will create a/)).not.toBeNull();
  expect(heading()).toBe("Path");
  // The notice sits under the sentence of the step, before its content.
  const notice = onView().getByText(/Trama will create a/);
  expect(onView().getByText("Choose how Trama starts in this folder.").compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(notice.compareDocumentPosition(onView().getByRole("radiogroup")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(onView().getByRole("radio", { name: /Start from Scratch/ }));
  press("Next");
  expect(heading()).toBe("omp");
  expect(onView().queryByText(/Trama will create a/)).toBeNull();
});

test("going to Settings and back to Get Started keeps the choices of the wizard", () => {
  const { tab, store } = panel(false);
  fireEvent.click(onView().getByRole("radio", { name: /Import from Code/ }));
  press("Next");
  expect(heading()).toBe("omp");
  tab("Settings");
  expect(store.get().view).toBe("settings");
  // Without a project the Settings tab has the form only: no Guided setup.
  expect(onView().queryByRole("button", { name: /Guided setup/ })).toBeNull();
  tab("Get Started");
  expect(store.get().view).toBe("getstarted");
  expect(heading()).toBe("omp");
  expect(steps()).toContain("Folders");
  press("Back");
  expect((onView().getByRole("radio", { name: /Import from Code/ }) as HTMLInputElement).getAttribute("aria-checked")).toBe("true");
});

test("Guided setup opens the wizard of the settings in place of the form; Cancel and a successful confirmation bring the form back", () => {
  const { settings, store } = panel(true);
  act(() => store.set({ view: "settings" }));
  press(/Guided setup/);
  expect(steps()).toEqual(["omp", "Models", "Project", "Advanced", "Summary"]);
  expect(onView().queryByRole("combobox", { name: "Theme" })).toBeNull();
  press("Cancel");
  expect(onView().getByRole("combobox", { name: "Theme" })).not.toBeNull();
  expect(store.get().view).toBe("settings");

  press(/Guided setup/);
  act(() => settings.openGuidedSetup({ type: "guidedSetup", mode: "settings" }));
  expect(heading()).toBe("omp");
  // The host's answer to the confirmation of the mode Settings closes the wizard on the form.
  act(() => settings.receiveResult({ type: "guidedSetupResult", ok: true, error: null }));
  expect(onView().getByRole("combobox", { name: "Theme" })).not.toBeNull();
  expect(store.get().view).toBe("settings");
});

test("the wizard of the settings keeps its choices while another view is shown", () => {
  const { store, tab, settings } = panel(true);
  act(() => store.set({ view: "settings" }));
  press(/Guided setup/);
  act(() => settings.receiveAgentCheck(OMP_OK));
  press("Next");
  expect(heading()).toBe("Models");
  tab("Requirements");
  expect(store.get().view).toBe("requirements");
  act(() => store.set({ view: "settings" }));
  expect(heading()).toBe("Models");
});

test("the Empty Model wizard opens in the Settings tab with the path chosen and no Path step; Cancel and a successful confirmation go back to the Board", () => {
  const { settings, store, posted } = panel(true);
  const navigated: string[] = [];
  store.subscribe(() => navigated.push(store.get().view));
  act(() => {
    store.set({ view: "settings" });
    settings.openGuidedSetup({ type: "guidedSetup", mode: "empty-model", choice: "import", root: "/work/app" });
  });
  expect(steps()).toEqual(["omp", "Models", "Project", "Folders", "Advanced", "Summary"]);
  // Nothing is initialized or launched by opening it.
  expect(posted.some((message) => message.type === "confirmSetup" || message.type === "launch")).toBe(false);
  press("Cancel");
  expect(store.get().view).toBe("board");
  expect(onView().queryByRole("navigation", { name: "Setup steps" })).toBeNull();

  act(() => {
    store.set({ view: "settings" });
    settings.openGuidedSetup({ type: "guidedSetup", mode: "empty-model", choice: "scratch", root: "/work/app" });
  });
  expect(steps()).toEqual(["omp", "Models", "Project", "Advanced", "Summary"]);
  act(() => settings.receiveResult({ type: "guidedSetupResult", ok: true, error: null }));
  expect(store.get().view).toBe("board");
});

test("a failed confirmation of the Empty Model wizard shows the reason in the summary and stays in the Settings tab", () => {
  const { settings, store } = panel(true);
  act(() => {
    store.set({ view: "settings" });
    settings.openGuidedSetup({ type: "guidedSetup", mode: "empty-model", choice: "scratch", root: "/work/app" });
  });
  act(() => settings.receiveAgentCheck(OMP_OK));
  act(() => {
    press("Next");
    press("Next");
    press("Next");
  });
  press("Skip");
  press("Save and start");
  act(() => settings.receiveResult({ type: "guidedSetupResult", ok: false, error: "Could not save Theme: disk full." }));
  expect(onView().getByRole("alert").textContent).toBe("Could not save Theme: disk full.");
  expect(store.get().view).toBe("settings");
});

test("opening the Empty Model wizard again keeps it on the same path and starts over on the other; it replaces the wizard of the settings", () => {
  const { settings, store } = panel(true);
  const open = (choice: "import" | "scratch") => act(() => settings.openGuidedSetup({ type: "guidedSetup", mode: "empty-model", choice, root: "/work/app" }));
  act(() => store.set({ view: "settings" }));
  press(/Guided setup/);
  open("import");
  expect(steps()).toContain("Folders");
  act(() => settings.receiveAgentCheck(OMP_OK));
  press("Next");
  expect(heading()).toBe("Models");
  open("import");
  expect(heading()).toBe("Models");
  open("scratch");
  expect(heading()).toBe("omp");
  expect(steps()).not.toContain("Folders");
});

test("when the folder stops being a project the wizard of the Settings tab is forgotten and Get Started is the wizard again", () => {
  const { settings, getStarted, store } = panel(true);
  act(() => store.set({ view: "settings" }));
  press(/Guided setup/);
  expect(heading()).toBe("omp");
  act(() => {
    store.set({ hasProject: false, view: "getstarted" });
    settings.projectPresent(false);
    getStarted.projectPresent(false);
  });
  expect(onView().getByText(/Trama will create a/)).not.toBeNull();
  expect(heading()).toBe("Path");
  act(() => store.set({ view: "settings" }));
  expect(onView().getByRole("combobox", { name: "Theme" })).not.toBeNull();
});
