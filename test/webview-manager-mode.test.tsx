import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost, WorkspaceFolderView } from "../extension/src/protocol";
import { mountSettings, SettingsPage } from "../extension/src/webview/settings";
import type { ManagerState, SoloState } from "../extension/src/webview/settings/logic";
import { startTheme } from "../extension/src/webview/theme";
import { Wizard } from "../extension/src/webview/wizard";
import { WizardController } from "../extension/src/webview/wizard/controller";
import type { WizardStep } from "../extension/src/webview/wizard/logic";

const manifest: ManifestPackage = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
const schema = settingsSchema(manifest);

// Radix uses browser APIs that happy-dom does not have.
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

afterEach(() => {
  cleanup();
  document.body.className = "";
  document.documentElement.className = "";
});

const DESCRIPTION = "Plan work for your team and publish it as GitHub issues. Only for this working copy.";
const NEEDS = "Needs a repository on GitHub (the origin remote).";
const ON_GITHUB: ManagerState = { available: false, recorded: false, repository: "acme/web", reason: null };
const NO_ORIGIN: ManagerState = { available: false, recorded: false, repository: null, reason: "No origin remote" };
const NOT_GITHUB: ManagerState = { available: false, recorded: true, repository: null, reason: "Origin is not on GitHub" };
const SOLO: SoloState = { available: true, solo: "off", tracked: [] };

const box = () => screen.getByRole("checkbox", { name: "Manager Mode" }) as HTMLButtonElement;
const describedBy = (element: HTMLElement) => (element.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "");

// ---- The Settings tab ----

function settingsPage(manager: ManagerState | null, solo: SoloState | null = SOLO) {
  const posted: ToHost[] = [];
  const props = { schema, values: {}, generation: 1, models: [], listError: null, post: (message: ToHost) => void posted.push(message), openLink: () => {} };
  const utils = render(<SettingsPage {...props} solo={solo} soloChanges={1} manager={manager} managerChanges={1} />);
  const again = (next: ManagerState, changes: number) => utils.rerender(<SettingsPage {...props} solo={solo} soloChanges={1} manager={next} managerChanges={changes} />);
  return { posted, again, ...utils };
}

test("without a project (no managerMode) the Project group has no Manager Mode row", () => {
  settingsPage(null, null);
  expect(screen.queryByRole("checkbox", { name: "Manager Mode" })).toBeNull();
  expect(screen.queryByText(DESCRIPTION)).toBeNull();
});

test("the Project group shows Manager Mode after Solo Mode, with its description and the repository line in the monospace font", () => {
  settingsPage(ON_GITHUB);
  const group = screen.getByRole("region", { name: "Project" });
  const checkbox = within(group).getByRole("checkbox", { name: "Manager Mode" });
  const solo = within(group).getByRole("checkbox", { name: "Solo Mode" });
  expect(solo.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  expect((checkbox as HTMLButtonElement).disabled).toBe(false);
  const [explanation, repository] = describedBy(checkbox);
  expect(explanation).toBe(DESCRIPTION);
  expect(repository).toBe("Repository: acme/web · origin on GitHub");
  const mono = within(group).getByText("acme/web");
  expect(mono.className).toContain("font-mono");
  expect(within(group).queryByText(NEEDS)).toBeNull();
});

test("it shows the recorded value, checked, with the repository", () => {
  settingsPage({ available: true, recorded: true, repository: "acme/web", reason: null });
  expect(box().getAttribute("aria-checked")).toBe("true");
});

test("turning it on sends setManagerMode and waits for the host: the answer puts the real value back, so a failed write returns the row to the recorded value", () => {
  const { posted, again } = settingsPage(ON_GITHUB);
  fireEvent.click(box());
  expect(posted).toEqual([{ type: "setManagerMode", on: true }]);
  expect(box().getAttribute("aria-checked")).toBe("true");
  expect(box().disabled).toBe(true);
  // The write failed: the host tells the recorded value, still off.
  again(ON_GITHUB, 2);
  expect(box().getAttribute("aria-checked")).toBe("false");
  expect(box().disabled).toBe(false);
  fireEvent.click(box());
  again({ available: true, recorded: true, repository: "acme/web", reason: null }, 3);
  expect(box().getAttribute("aria-checked")).toBe("true");
  fireEvent.click(box());
  expect(posted.at(-1)).toEqual({ type: "setManagerMode", on: false });
});

test("without origin on GitHub the Checkbox is off and disabled, with the Info line under the description and the reason as the repository line", () => {
  for (const [state, reason] of [[NO_ORIGIN, "No origin remote"], [NOT_GITHUB, "Origin is not on GitHub"]] as const) {
    cleanup();
    const { posted } = settingsPage(state);
    const checkbox = box();
    expect(checkbox.disabled).toBe(true);
    // Also when Manager mode is recorded.
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    const needs = screen.getByText(NEEDS);
    expect(needs.closest("p")?.querySelector("svg")).not.toBeNull();
    const explanation = screen.getByText(DESCRIPTION);
    expect(explanation.compareDocumentPosition(needs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checkbox.getAttribute("aria-describedby")).toContain(needs.closest("p")?.id ?? null);
    expect(screen.getByText(reason)).not.toBeNull();
    expect(screen.queryByText(/Repository:/)).toBeNull();
    fireEvent.click(checkbox);
    expect(posted).toEqual([]);
  }
});

test("the Checkbox is reachable from the keyboard", () => {
  settingsPage(ON_GITHUB);
  expect(box().tabIndex).toBeGreaterThanOrEqual(0);
});

test("the mounted tab takes managerMode, shows the row, and drops it when the project goes away", () => {
  const page = render(<></>);
  const posted: ToHost[] = [];
  const theme = startTheme();
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (message) => void posted.push(message), navigate: () => {}, openLink: () => {} }, theme);
  act(() => view.receive({ type: "settings", schema, values: {} }));
  expect(screen.queryByRole("checkbox", { name: "Manager Mode" })).toBeNull();
  act(() => view.projectPresent(true));
  act(() => view.receiveManagerMode({ type: "managerMode", ...ON_GITHUB }));
  expect(box().getAttribute("aria-checked")).toBe("false");
  act(() => view.receiveManagerMode({ type: "managerMode", available: true, recorded: true, repository: "acme/web", reason: null }));
  expect(box().getAttribute("aria-checked")).toBe("true");
  act(() => view.projectPresent(false));
  expect(screen.queryByRole("checkbox", { name: "Manager Mode" })).toBeNull();
  theme.dispose();
});

test("Manager mode is no setting: the manifest and the schema of the settings have no Manager Mode key", () => {
  expect(JSON.stringify(manifest)).not.toMatch(/manager/i);
  expect(schema.some((setting) => /manager/i.test(setting.key) || /manager/i.test(setting.title))).toBe(false);
});

// ---- The wizard ----

const NOT_GIT = { repository: null, reason: "No origin remote" };
const GITHUB_FOLDER = { name: "app", root: "/work/app", hasFiles: true, inGit: true, origin: { repository: "acme/web", reason: null } };
const OTHER_FOLDER = { name: "lib", root: "/work/lib", hasFiles: false, inGit: true, origin: { repository: null, reason: "Origin is not on GitHub" } };
const PLAIN_FOLDER = { name: "docs", root: "/work/docs", hasFiles: false, inGit: false, origin: NOT_GIT };

function wizard(options: { mode?: "first" | "settings" | "empty-model"; choice?: "import" | "scratch"; folders?: WorkspaceFolderView[] } = {}) {
  const posted: ToHost[] = [];
  const controller = new WizardController({ post: (message) => posted.push(message), onClose: () => {} });
  const utils = render(<Wizard controller={controller} openLink={() => {}} notice={() => <p>The notice</p>} />);
  const mode = options.mode ?? "first";
  act(() => {
    controller.receiveSettings({ type: "settings", schema, values: {} });
    controller.receiveFolders(options.folders ?? [GITHUB_FOLDER]);
    controller.open(mode, options.choice ?? (mode === "settings" ? null : "scratch"), mode === "first" ? null : "/work/app");
  });
  return { posted, controller, ...utils };
}

const answered = (controller: WizardController) => act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 3 }));

function advanceTo(controller: WizardController, step: WizardStep) {
  for (let guard = 0; guard < 10 && controller.getSnapshot().state?.step !== step; guard++) {
    if (controller.getSnapshot().state?.step === "omp") answered(controller);
    act(() => controller.next());
  }
  expect(controller.getSnapshot().state?.step).toBe(step);
}

const managerTold = (controller: WizardController, state: Partial<ManagerState>) => act(() => controller.receiveManagerMode({ type: "managerMode", ...ON_GITHUB, ...state }));
const summaryCard = (step: string) => screen.getByRole("button", { name: `Edit ${step}` }).closest("[data-slot='card']") as HTMLElement;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

test("the Project step of the first setup shows a Repository box with the origin of the chosen folder, then the Manager Mode row last, in a box, off", () => {
  const { controller } = wizard({ folders: [GITHUB_FOLDER] });
  advanceTo(controller, "Project");
  const repository = screen.getByText("Repository");
  expect(repository.parentElement?.textContent).toBe("Repositoryacme/web · origin on GitHub");
  expect(screen.getByText("acme/web").className).toContain("font-mono");
  expect(box().getAttribute("aria-checked")).toBe("false");
  expect(box().disabled).toBe(false);
  expect(screen.getByText(DESCRIPTION)).not.toBeNull();
  // The row stands in its own bordered box, after the Solo row, and does not repeat the repository.
  expect(box().closest(".border")).not.toBeNull();
  expect(screen.queryByText(/Repository:/)).toBeNull();
  const solo = screen.getByRole("checkbox", { name: "Solo Mode" });
  expect(solo.compareDocumentPosition(repository) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(repository.compareDocumentPosition(box()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(box());
  expect(box().getAttribute("aria-checked")).toBe("true");
});

test("the first setup follows the folder chosen in Path: without origin on GitHub the row is off and disabled, with the reason, and a folder on GitHub enables it", () => {
  const { controller } = wizard({ folders: [OTHER_FOLDER, GITHUB_FOLDER, PLAIN_FOLDER] });
  act(() => controller.chooseFolder("/work/lib"));
  advanceTo(controller, "Project");
  expect(screen.getByText("Repository").parentElement?.textContent).toBe("RepositoryOrigin is not on GitHub");
  expect(box().disabled).toBe(true);
  expect(box().getAttribute("aria-checked")).toBe("false");
  const needs = screen.getByText(NEEDS);
  expect(needs.closest("p")?.querySelector("svg")).not.toBeNull();
  act(() => controller.chooseFolder("/work/docs"));
  expect(screen.getByText("Repository").parentElement?.textContent).toBe("RepositoryNo origin remote");
  act(() => controller.chooseFolder("/work/app"));
  expect(box().disabled).toBe(false);
  expect(screen.queryByText(NEEDS)).toBeNull();
});

test("the Guided setup starts from the project's recorded value and shows the project's repository; nothing is posted before the confirmation", () => {
  const { controller, posted } = wizard({ mode: "settings" });
  managerTold(controller, { available: true, recorded: true });
  answered(controller);
  advanceTo(controller, "Project");
  expect(screen.getByText("Repository").parentElement?.textContent).toBe("Repositoryacme/web · origin on GitHub");
  expect(box().getAttribute("aria-checked")).toBe("true");
  expect(screen.queryByRole("checkbox", { name: "Solo Mode" })).toBeNull();
  fireEvent.click(box());
  expect(box().getAttribute("aria-checked")).toBe("false");
  expect(posted.some((m) => m.type === "setManagerMode" || m.type === "confirmSetup")).toBe(false);
  // A message of the host later does not take the choice away.
  managerTold(controller, { available: true, recorded: true });
  expect(box().getAttribute("aria-checked")).toBe("false");
});

test("the Empty Model wizard shows the row too, and nothing before the host has told what origin says", () => {
  const { controller } = wizard({ mode: "empty-model", choice: "import" });
  answered(controller);
  advanceTo(controller, "Project");
  expect(screen.queryByRole("checkbox", { name: "Manager Mode" })).toBeNull();
  managerTold(controller, NO_ORIGIN);
  expect(box().disabled).toBe(true);
  expect(screen.getByText("Repository").parentElement?.textContent).toBe("RepositoryNo origin remote");
});

test("the summary says Manager Mode On or Off in the Project step, not changed in the first setup", () => {
  const { controller } = wizard({ folders: [GITHUB_FOLDER] });
  advanceTo(controller, "Project");
  advanceTo(controller, "Summary");
  let line = within(summaryCard("Project")).getByText("Manager Mode").closest("div");
  expect(line?.textContent).toContain("Off");
  act(() => controller.openStep("Project"));
  fireEvent.click(box());
  advanceTo(controller, "Summary");
  line = within(summaryCard("Project")).getByText("Manager Mode").closest("div");
  expect(line?.textContent).toContain("On");
  expect(summaryCard("Project").textContent).not.toContain("changed");
});

test("the summary of the Guided setup highlights Manager Mode when it changes the project's value, with the value it replaces", () => {
  const { controller } = wizard({ mode: "settings" });
  managerTold(controller, { available: true, recorded: true });
  answered(controller);
  advanceTo(controller, "Summary");
  let line = within(summaryCard("Project")).getByText("Manager Mode").closest("div");
  expect(line?.textContent).toContain("On");
  expect(summaryCard("Project").textContent).not.toContain("changed");
  act(() => controller.openStep("Project"));
  fireEvent.click(box());
  advanceTo(controller, "Summary");
  line = within(summaryCard("Project")).getByText("Manager Mode").closest("div");
  expect(line?.textContent).toContain("Off");
  expect(line?.textContent).toContain("was On");
  expect(summaryCard("Project").textContent).toContain("changed");
});

test("the confirmation carries manager: the first setup always, the other modes the value the wizard shows", () => {
  const first = wizard({ folders: [GITHUB_FOLDER] });
  advanceTo(first.controller, "Project");
  advanceTo(first.controller, "Summary");
  press("Set up Trama");
  expect(first.posted.at(-1)).toMatchObject({ type: "confirmSetup", mode: "first", manager: false });
  cleanup();
  const chosen = wizard({ folders: [GITHUB_FOLDER] });
  advanceTo(chosen.controller, "Project");
  fireEvent.click(box());
  advanceTo(chosen.controller, "Summary");
  press("Set up Trama");
  expect(chosen.posted.at(-1)).toMatchObject({ type: "confirmSetup", mode: "first", manager: true });
  cleanup();
  const guided = wizard({ mode: "settings" });
  managerTold(guided.controller, { available: true, recorded: true });
  answered(guided.controller);
  advanceTo(guided.controller, "Summary");
  press("Save settings");
  expect(guided.posted.at(-1)).toMatchObject({ type: "confirmSetup", mode: "settings", manager: true });
  cleanup();
  const empty = wizard({ mode: "empty-model", choice: "scratch" });
  managerTold(empty.controller, { available: false, recorded: false });
  answered(empty.controller);
  advanceTo(empty.controller, "Project");
  fireEvent.click(box());
  advanceTo(empty.controller, "Summary");
  press("Save and start");
  expect(empty.posted.at(-1)).toMatchObject({ type: "confirmSetup", mode: "empty-model", manager: true });
});

test("a first setup folder without origin on GitHub sends manager false whatever was chosen before", () => {
  const { controller, posted } = wizard({ folders: [GITHUB_FOLDER, OTHER_FOLDER] });
  advanceTo(controller, "Project");
  fireEvent.click(box());
  act(() => controller.chooseFolder("/work/lib"));
  advanceTo(controller, "Summary");
  expect(within(summaryCard("Project")).getByText("Manager Mode").closest("div")?.textContent).toContain("Off");
  press("Set up Trama");
  expect(posted.at(-1)).toMatchObject({ type: "confirmSetup", manager: false });
});

test("a Manager mode left on whose origin moved away is shown off, and the confirmation sends no manager: the recorded value stays", () => {
  const { controller, posted } = wizard({ mode: "settings" });
  managerTold(controller, { available: false, recorded: true, repository: null, reason: "Origin is not on GitHub" });
  answered(controller);
  advanceTo(controller, "Project");
  expect(box().getAttribute("aria-checked")).toBe("false");
  expect(box().disabled).toBe(true);
  advanceTo(controller, "Summary");
  expect(within(summaryCard("Project")).getByText("Manager Mode").closest("div")?.textContent).toContain("Off");
  expect(summaryCard("Project").textContent).not.toContain("changed");
  press("Save settings");
  expect(posted.at(-1)).not.toHaveProperty("manager");
});
