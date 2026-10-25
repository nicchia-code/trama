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

function setup(options: { mode?: "first" | "settings" | "empty-model"; choice?: "import" | "scratch"; values?: Record<string, SettingsValues>; folders?: (typeof FOLDER)[]; now?: () => number } = {}) {
  const posted: ToHost[] = [];
  const closed: string[] = [];
  const controller = new WizardController({ post: (message) => posted.push(message), onClose: (reason, mode) => closed.push(`${reason}:${mode}`) }, options.now);
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
  fireEvent.click(screen.getByRole("checkbox", { name: "Advisor Scanner" }));
  expect(within(nav()).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Go back to omp", "Go back to Models", "Go back to Project"]);
  expect(nav().querySelector('[aria-current="step"]')?.textContent).toBe("4Advanced");
  // Back over several steps at once.
  fireEvent.click(within(nav()).getByRole("button", { name: "Go back to omp" }));
  expect(heading()).toBe("omp");
  expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
  expect(within(nav()).queryAllByRole("button")).toEqual([]);
  // The choices are kept, and the steps after are reached only with Next.
  advanceTo(controller, "Advanced");
  expect((screen.getByRole("checkbox", { name: "Advisor Scanner" }) as HTMLElement).getAttribute("aria-checked")).toBe("false");
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
  expect(posted).toContainEqual({ type: "agentCheckWanted", ompPath: "", systemCertificates: false });
  expect(screen.getByText("Checking omp…")).not.toBeNull();
});

test("an answer of the check for another omp path is ignored; Next waits for omp, and a failed update does not stop it", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  const next = () => screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  expect(heading()).toBe("omp");
  expect(posted).toContainEqual({ type: "agentCheckWanted", ompPath: "/x/omp", systemCertificates: false });
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

test("an omp older than the minimum keeps Next unavailable and says why with the sentence of the warning", () => {
  const { controller } = setup({ mode: "settings" });
  const next = () => screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "", state: "done", ok: true, missing: false, version: "18.12.5", models: 12, tooOld: true }));
  expect(next().disabled).toBe(true);
  const reason = next().getAttribute("aria-describedby");
  expect(reason).not.toBeNull();
  expect(document.getElementById(reason as string)?.textContent).toContain("Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.");
});

test("an answer for another path after the step's own answer checks the path on view again", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "/x/omp", state: "done", ok: false, missing: true, error: "omp not found at /x/omp" }));
  expect(posted.filter((m) => m.type === "agentCheckWanted")).toHaveLength(1);
  // The installer ended: the host checked the saved path, which is not the one on view.
  answered(controller, "");
  expect(posted.filter((m) => m.type === "agentCheckWanted")).toHaveLength(2);
  expect(posted.filter((m) => m.type === "agentCheckWanted").at(-1)).toEqual({ type: "agentCheckWanted", ompPath: "/x/omp", systemCertificates: false });
  expect(screen.getByText("Checking omp…")).not.toBeNull();
});

test("leaving the omp step and coming back checks omp again", () => {
  const { controller, posted } = setup({ mode: "settings" });
  answered(controller);
  press("Next");
  press("Back");
  expect(posted.filter((m) => m.type === "agentCheckWanted")).toHaveLength(2);
  expect(screen.getByText("Checking omp…")).not.toBeNull();
});

const providersList = () => screen.queryByRole("list", { name: "Providers" });
const checked = (controller: WizardController, ompPath: string, result: Record<string, unknown>) =>
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath, state: "done", missing: false, version: "18.12.6", ...result } as never));

test("the omp step shows the Providers section under the status box only when omp answers, never before the first outcome", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  expect(providersList()).toBeNull();
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "/x/omp", state: "updating", version: "18.13.0" }));
  expect(providersList()).toBeNull();
  checked(controller, "/x/omp", { ok: false, missing: true, error: "omp not found at /x/omp" });
  expect(providersList()).toBeNull();
  checked(controller, "/x/omp", { ok: true, models: 2, providers: ["anthropic"] });
  const section = screen.getByRole("heading", { level: 3, name: "Providers" }).closest("section") as HTMLElement;
  const box = document.querySelector('[aria-live="polite"]') as HTMLElement;
  expect(box.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(section.compareDocumentPosition(screen.getByLabelText("Omp Path")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const rows = within(screen.getByRole("list", { name: "Providers" })).getAllByRole("listitem");
  expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual(["ChatGPT", "Anthropic", "GitHub Copilot", "Google Gemini CLI", "Google Antigravity", "Cursor", "xAI Grok"]);
  expect(within(rows[1] as HTMLElement).getByText("Connected")).not.toBeNull();
  expect(within(rows[1] as HTMLElement).getAllByRole("button").map((button) => button.textContent)).toEqual(["Log in again", "Log out"]);
  expect(within(rows[0] as HTMLElement).getByText("Not connected")).not.toBeNull();
  expect(within(rows[0] as HTMLElement).getByRole("button").textContent).toBe("Log in");
  checked(controller, "/x/omp", { ok: false, missing: false, error: "omp exited with code 1" });
  expect(providersList()).toBeNull();
});

test("the rows keep the last states while omp is checked again, also through an update, and without providers they have no state", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 2, providers: ["cursor"] });
  expect(screen.getAllByText("Connected")).toHaveLength(1);
  // A new check at the same path (as after a login), then one for another path: the rows stay until the outcome.
  act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "/x/omp", state: "updating", version: "18.13.0" }));
  expect(screen.getByText("Updating omp to 18.13.0…")).not.toBeNull();
  expect(screen.getAllByText("Connected")).toHaveLength(1);
  checked(controller, "/x/omp", { ok: true, models: 3, providers: ["cursor", "xai-oauth"] });
  expect(screen.getAllByText("Connected")).toHaveLength(2);
  act(() => controller.setValue(schema.find((s) => s.key === "trama.ompPath") as never, "/y/omp"));
  expect(screen.getByText("Checking omp…")).not.toBeNull();
  expect(screen.getAllByText("Connected")).toHaveLength(2);
  checked(controller, "/y/omp", { ok: true, models: 1 });
  expect(screen.queryByText("Connected")).toBeNull();
  expect(screen.queryByText("Not connected")).toBeNull();
  expect(screen.getAllByRole("button", { name: /^Log in to / })).toHaveLength(7);
});

test("the section waits for the first outcome again when the omp step is shown again", () => {
  const { controller } = setup({ mode: "settings" });
  checked(controller, "", { ok: true, models: 2, providers: ["anthropic"] });
  expect(providersList()).not.toBeNull();
  press("Next");
  press("Back");
  expect(screen.getByText("Checking omp…")).not.toBeNull();
  expect(providersList()).toBeNull();
  checked(controller, "", { ok: true, models: 2, providers: ["anthropic"] });
  expect(providersList()).not.toBeNull();
});

test("pressing Log in sends ompLogin with the omp path of the step, saved or not, and keeps the choices of the wizard", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 2, providers: ["anthropic"] });
  act(() => controller.setValue(schema.find((s) => s.key === "trama.ompPath") as never, "/typed/omp"));
  checked(controller, "/typed/omp", { ok: true, models: 2, providers: ["anthropic"] });
  press("Log in again to Anthropic");
  press("Log in to Cursor");
  expect(posted.filter((m) => m.type === "ompLogin")).toEqual([
    { type: "ompLogin", provider: "anthropic", ompPath: "/typed/omp", systemCertificates: false },
    { type: "ompLogin", provider: "cursor", ompPath: "/typed/omp", systemCertificates: false },
  ]);
  expect((screen.getByLabelText("Omp Path") as HTMLInputElement).value).toBe("/typed/omp");
});

test("pressing Log out sends ompLogout with the omp path of the step, saved or not, and ompLogoutState makes its row busy; the choices of the wizard stay", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 2, providers: ["anthropic"] });
  act(() => controller.setValue(schema.find((s) => s.key === "trama.ompPath") as never, "/typed/omp"));
  checked(controller, "/typed/omp", { ok: true, models: 2, providers: ["anthropic", "cursor"] });
  expect(screen.queryByRole("button", { name: "Log out of ChatGPT" })).toBeNull();
  press("Log out of Anthropic");
  expect(posted.filter((m) => m.type === "ompLogout")).toEqual([{ type: "ompLogout", provider: "anthropic", ompPath: "/typed/omp" }]);
  act(() => controller.receiveLogoutState({ type: "ompLogoutState", provider: "anthropic", running: true }));
  const rows = within(providersList() as HTMLElement).getAllByRole("listitem");
  expect(rows[1]?.getAttribute("aria-busy")).toBe("true");
  expect(within(rows[5] as HTMLElement).getByRole("button", { name: "Log out of Cursor" }).hasAttribute("disabled")).toBe(false);
  // The wizard's own check answers, then the host says the logout ended: the row is free, the provider gone, and Next follows the check as for any other.
  checked(controller, "/typed/omp", { ok: true, models: 1, providers: ["cursor"] });
  act(() => controller.receiveLogoutState({ type: "ompLogoutState", provider: "anthropic", running: false }));
  expect(rows[1]?.getAttribute("aria-busy")).toBeNull();
  expect(screen.queryByRole("button", { name: "Log out of Anthropic" })).toBeNull();
  expect((screen.getByLabelText("Omp Path") as HTMLInputElement).value).toBe("/typed/omp");
});

const keySaved = (controller: WizardController, saved: boolean) => act(() => controller.receiveCursorApiKey({ type: "cursorApiKey", saved }));
const cursorRow = () => within(providersList() as HTMLElement).getAllByRole("listitem")[5] as HTMLElement;

test("the Cursor row of the omp step offers the API key as the Settings tab does, and only while omp answers", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  expect(screen.queryByRole("button", { name: /Cursor API key/ })).toBeNull();
  checked(controller, "/x/omp", { ok: false, missing: true, error: "omp not found at /x/omp" });
  expect(screen.queryByRole("button", { name: /Cursor API key/ })).toBeNull();
  checked(controller, "/x/omp", { ok: true, models: 1, providers: ["anthropic"] });
  expect(within(cursorRow()).getByText("Cursor subscription or API key")).not.toBeNull();
  expect(within(cursorRow()).getByRole("button", { name: "Set Cursor API key" }).textContent).toBe("Set API key");
  expect(within(cursorRow()).queryByRole("button", { name: "Remove Cursor API key" })).toBeNull();
  expect(within(cursorRow()).queryByText("API key saved")).toBeNull();
  keySaved(controller, true);
  expect(within(cursorRow()).getByRole("button", { name: "Change Cursor API key" }).textContent).toBe("Change API key");
  expect(within(cursorRow()).getByRole("button", { name: "Remove Cursor API key" })).not.toBeNull();
  expect(within(cursorRow()).getByText("API key saved")).not.toBeNull();
  // The next check leaves the row as it is, with the key.
  checked(controller, "/x/omp", { ok: true, models: 2, providers: ["anthropic", "cursor"] });
  expect(within(cursorRow()).getByText("Connected")).not.toBeNull();
  expect(within(cursorRow()).getByText("API key saved")).not.toBeNull();
});

test("Set, Change and Remove API key send the messages with the omp path of the step, saved or not, and keep the choices of the wizard", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 2, providers: ["anthropic"] });
  act(() => controller.setValue(schema.find((s) => s.key === "trama.ompPath") as never, "/typed/omp"));
  checked(controller, "/typed/omp", { ok: true, models: 2, providers: ["anthropic"] });
  press("Set Cursor API key");
  keySaved(controller, true);
  press("Change Cursor API key");
  press("Remove Cursor API key");
  expect(posted.filter((m) => m.type === "setCursorApiKey" || m.type === "removeCursorApiKey")).toEqual([
    { type: "setCursorApiKey", ompPath: "/typed/omp" },
    { type: "setCursorApiKey", ompPath: "/typed/omp" },
    { type: "removeCursorApiKey", ompPath: "/typed/omp" },
  ]);
  expect((screen.getByLabelText("Omp Path") as HTMLInputElement).value).toBe("/typed/omp");
  expect(controller.getSnapshot().state?.step).toBe("omp");
});

test("a key change that this wizard asked for is checked once, by the host: the wizard does not ask for the check again", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 1, providers: [] });
  const checks = () => posted.filter((m) => m.type === "agentCheckWanted").length;
  const before = checks();
  press("Set Cursor API key");
  keySaved(controller, true);
  expect(checks()).toBe(before);
  press("Remove Cursor API key");
  keySaved(controller, false);
  expect(checks()).toBe(before);
});

test("after Esc or a failed keychain the host answers with the state as it is: the wizard stops waiting, and a later change from another window is checked", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 1, providers: [] });
  const checks = () => posted.filter((m) => m.type === "agentCheckWanted").length;
  const before = checks();
  press("Set Cursor API key");
  keySaved(controller, false);
  expect(checks()).toBe(before);
  keySaved(controller, true);
  expect(checks()).toBe(before + 1);
});

test("a key saved, changed or removed in another window updates the row and, on the omp step, asks for the check again with the path of the step, as if it were made here", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.ompPath": { user: "/x/omp" } } });
  checked(controller, "/x/omp", { ok: true, models: 1, providers: ["anthropic"] });
  act(() => controller.setValue(schema.find((s) => s.key === "trama.ompPath") as never, "/typed/omp"));
  checked(controller, "/typed/omp", { ok: true, models: 1, providers: ["anthropic"] });
  const wanted = () => posted.filter((m) => m.type === "agentCheckWanted");
  const before = wanted().length;
  keySaved(controller, true);
  expect(within(cursorRow()).getByText("API key saved")).not.toBeNull();
  expect(wanted().slice(before)).toEqual([{ type: "agentCheckWanted", ompPath: "/typed/omp", systemCertificates: false }]);
  // The key replaced, then removed: each change is checked, and the row follows.
  keySaved(controller, true);
  keySaved(controller, false);
  expect(wanted().slice(before)).toHaveLength(3);
  expect(within(cursorRow()).queryByText("API key saved")).toBeNull();
  // The wizard's choices stay as they were.
  expect((screen.getByLabelText("Omp Path") as HTMLInputElement).value).toBe("/typed/omp");
});

test("a key change in another window asks for no check when the wizard is not on the omp step", () => {
  const { controller, posted } = setup({ mode: "settings" });
  answered(controller);
  press("Next");
  expect(heading()).toBe("Models");
  const before = posted.filter((m) => m.type === "agentCheckWanted").length;
  keySaved(controller, true);
  expect(posted.filter((m) => m.type === "agentCheckWanted")).toHaveLength(before);
  expect(controller.getSnapshot().cursorKey.saved).toBe(true);
});

test("the key is no choice of the wizard: not in the summary, not in the confirmation, and Cancel neither removes nor sends anything about it", () => {
  const { controller, posted } = setup({ mode: "settings" });
  checked(controller, "", { ok: true, models: 1, providers: ["cursor"] });
  keySaved(controller, true);
  advanceTo(controller, "Summary");
  expect(screen.queryByText(/API key/)).toBeNull();
  press("Save settings");
  expect(posted.at(-1)).toEqual({ type: "confirmSetup", mode: "settings", values: [], excluded: [] });
  expect(JSON.stringify(posted)).not.toContain("saved");
  expect(posted.some((m) => m.type === "removeCursorApiKey")).toBe(false);
});

test("Cancel of the wizard leaves a saved key where it is", () => {
  const { controller, posted, closed } = setup({ mode: "settings" });
  checked(controller, "", { ok: true, models: 1, providers: [] });
  press("Set Cursor API key");
  keySaved(controller, true);
  press("Cancel");
  expect(closed).toEqual(["cancel:settings"]);
  expect(posted.filter((m) => m.type === "removeCursorApiKey" || m.type === "confirmSetup")).toEqual([]);
  expect(controller.getSnapshot().cursorKey.saved).toBe(true);
});

test("a Cursor key that gives omp one usable model is enough for Next to go to the Models step", () => {
  const { controller } = setup({ mode: "settings" });
  const next = () => screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  checked(controller, "", { ok: true, models: 0, providers: [] });
  expect(next().disabled).toBe(true);
  press("Set Cursor API key");
  keySaved(controller, true);
  // The host checks omp again with the key and omp lists a cursor model.
  checked(controller, "", { ok: true, models: 1, providers: ["cursor"] });
  expect(next().disabled).toBe(false);
  press("Next");
  expect(heading()).toBe("Models");
});

test("Next of the omp step stays disabled with omp answering with no model, saying to log in or set an API key, and opens when a login brings a model", () => {
  const { controller } = setup({ mode: "settings" });
  const next = () => screen.getByRole("button", { name: "Next" }) as HTMLButtonElement;
  checked(controller, "", { ok: true, models: 0, providers: [] });
  expect(next().disabled).toBe(true);
  expect(providersList()).not.toBeNull();
  expect(controller.getSnapshot().state?.step).toBe("omp");
  expect(screen.getByText("omp has no models yet. Log in to a provider or set an API key.")).not.toBeNull();
  checked(controller, "", { ok: true, models: 1, providers: ["anthropic"] });
  expect(next().disabled).toBe(false);
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
  fireEvent.click(screen.getByRole("checkbox", { name: "Advisor Scanner" }));
  press("Skip");
  expect(heading()).toBe("Summary");
  expect(screen.getByText("Check your choices, then confirm.")).not.toBeNull();
  expect(screen.queryByText("changed")).toBeNull();
  press("Back");
  expect(heading()).toBe("Advanced");
  expect((screen.getByRole("checkbox", { name: "Advisor Scanner" }) as HTMLElement).getAttribute("aria-checked")).toBe("true");
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
  fireEvent.click(screen.getByRole("checkbox", { name: "Advisor Scanner" }));
  press("Next");
  expect(heading()).toBe("Summary");
  const cards = Array.from(document.querySelectorAll("[data-slot='card']")) as HTMLElement[];
  expect(cards.map((card) => card.querySelector("h3")?.textContent)).toEqual(["omp", "Models", "Project", "Advanced"]);
  const card = (step: string) => cards.find((c) => c.querySelector("h3")?.textContent === step) as HTMLElement;
  // Advanced shows its four subgroups with their subtitles.
  expect(Array.from(card("Advanced").querySelectorAll("h4")).map((h) => h.textContent)).toEqual(["Appearance", "Drifts", "Agents", "omp Chat"]);
  const row = (step: string, title: string) => within(card(step)).getByText(title).closest("div") as HTMLElement;
  expect(row("Advanced", "Advisor Scanner").textContent).toContain("Off");
  expect(row("Advanced", "Advisor Scanner").textContent).toContain("changed");
  expect(row("Advanced", "Advisor Scanner").textContent).toContain("was On");
  expect(row("Advanced", "Advisor Scanner").className).toContain("bg-primary/10");
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
  fireEvent.click(screen.getByRole("checkbox", { name: "Advisor Scanner" }));
  press("Next");
  press("Save settings");
  expect(posted.at(-1)).toEqual({ type: "confirmSetup", mode: "settings", values: [{ key: "trama.advisorScanner", value: false }], excluded: [] });
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

test("the Get Started wizard takes the key state of the host too: its omp step shows the saved key and checks omp again for a change from another window", () => {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountGetStarted((node) => page.rerender(<>{node}</>), { post: (message) => posted.push(message), navigate: () => {}, openLink: () => {} });
  act(() => {
    view.projectPresent(false);
    view.receiveSettings({ type: "settings", schema, values: {} });
    view.receiveFolders({ type: "workspaceFolders", folders: [FOLDER] });
    view.receiveCursorApiKey({ type: "cursorApiKey", saved: true });
  });
  fireEvent.click(screen.getByRole("radio", { name: /Import from Code/ }));
  press("Next");
  expect(heading()).toBe("omp");
  act(() => view.receiveAgentCheck({ type: "agentCheck", ompPath: "", state: "done", ok: true, missing: false, version: "18.12.6", models: 1, providers: [] }));
  expect(within(cursorRow()).getByText("API key saved")).not.toBeNull();
  const before = posted.filter((m) => m.type === "agentCheckWanted").length;
  act(() => view.receiveCursorApiKey({ type: "cursorApiKey", saved: false }));
  expect(posted.filter((m) => m.type === "agentCheckWanted").slice(before)).toEqual([{ type: "agentCheckWanted", ompPath: "", systemCertificates: false }]);
  expect(within(cursorRow()).queryByText("API key saved")).toBeNull();
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
  expect(groups.map((group) => group.querySelectorAll("label").length)).toEqual([1, 2, 3, 3]);
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

test("the omp step asks the language as an editable text field, with the explanation of the Settings tab, and never Auto Exit; the value is kept for the summary", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.language": { user: "Italian" } } });
  expect(screen.queryByRole("checkbox", { name: "Auto Exit" })).toBeNull();
  expect(Array.from(document.querySelectorAll("label[for^='st-']")).map((label) => label.textContent)).toEqual(["Omp Path", "Terminal Location", "Ignore Instruction Files", "Language", "System Certificates"]);
  const field = screen.getByRole("textbox", { name: "Language" }) as HTMLInputElement;
  expect(field.disabled).toBe(false);
  expect(field.value).toBe("Italian");
  expect(screen.queryByText("Disabled for now: agents write in English.")).toBeNull();
  expect(document.getElementById("st-trama-language-explain")?.textContent).toContain("The language the agent writes tasks, drifts, proposals, questions and replies in");
  fireEvent.change(field, { target: { value: " Deutsch " } });
  fireEvent.blur(field);
  expect(controller.getSnapshot().state?.values["trama.language"]).toBe("Deutsch");
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


// ---- System Certificates in the omp step ----

const WHEN = "2026-10-25T10:30:00.000Z";
const NOW = Date.parse(WHEN);
const label = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
const box = () => screen.getByRole("checkbox", { name: "System Certificates" });
const certificates = (state: { exporting: boolean; count?: number; exportedAt?: string; error?: string }) => ({ type: "systemCertificates" as const, ...state });
const checksWanted = (posted: ToHost[]) => posted.filter((m) => m.type === "agentCheckWanted");
const exportsAsked = (posted: ToHost[]) => posted.filter((m) => m.type === "systemCertificatesExport");

test("System Certificates is the last setting of the omp step, off by default, and its line and Refresh show only with the box checked in the step", () => {
  const { controller } = setup({ mode: "settings" });
  expect(box().getAttribute("aria-checked")).toBe("false");
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 3, exportedAt: WHEN })));
  expect(screen.queryByRole("button", { name: "Refresh system certificates" })).toBeNull();
  fireEvent.click(box());
  expect(screen.getByRole("button", { name: "Refresh system certificates" })).not.toBeNull();
  expect(screen.getByText(`3 certificates, exported ${label(WHEN)}.`)).not.toBeNull();
  fireEvent.click(box());
  expect(screen.queryByRole("button", { name: "Refresh system certificates" })).toBeNull();
});

test("the four states of the bundle read in the step as in the Settings tab", () => {
  const { controller } = setup({ mode: "settings", values: { "trama.systemCertificates": { user: true } } });
  const cases: [Parameters<typeof certificates>[0], string][] = [
    [{ exporting: true }, "Exporting system certificates…"],
    [{ exporting: false, count: 12, exportedAt: WHEN }, `12 certificates, exported ${label(WHEN)}.`],
    [{ exporting: false, count: 12, exportedAt: WHEN, error: "security exited with code 44" }, `Could not export the system certificates (security exited with code 44). Using the ones exported ${label(WHEN)}.`],
    [{ exporting: false, error: "no certificate bundle found" }, "Could not export the system certificates (no certificate bundle found). omp gets no certificates from Trama."],
  ];
  for (const [state, text] of cases) {
    act(() => controller.receiveSystemCertificates(certificates(state)));
    expect(screen.getByText(text).closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
  }
});

test("checking the box with no bundle asks the host for an export, and the step checks omp again with the bundle when the export ends, successful or not", () => {
  const { controller, posted } = setup({ mode: "settings", now: () => NOW });
  const before = checksWanted(posted).length;
  fireEvent.click(box());
  expect(exportsAsked(posted)).toHaveLength(1);
  // Nothing is checked while the export runs.
  expect(checksWanted(posted)).toHaveLength(before);
  act(() => controller.receiveSystemCertificates(certificates({ exporting: true })));
  expect(checksWanted(posted)).toHaveLength(before);
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: new Date(NOW).toISOString() })));
  expect(checksWanted(posted).slice(before)).toEqual([{ type: "agentCheckWanted", ompPath: "", systemCertificates: true }]);
  // A failed export ends the same way.
  act(() => controller.receiveSystemCertificates(certificates({ exporting: true, count: 4, exportedAt: WHEN })));
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: WHEN, error: "no certificate authority found" })));
  expect(checksWanted(posted).slice(before)).toHaveLength(2);
  expect(checksWanted(posted).at(-1)).toEqual({ type: "agentCheckWanted", ompPath: "", systemCertificates: true });
  expect(exportsAsked(posted)).toHaveLength(1);
});

test("a bundle of the last 24 hours is not exported again when the box is checked: omp is checked again at once; an older one is exported", () => {
  const fresh = setup({ mode: "settings", now: () => NOW + 23 * 3600_000 });
  act(() => fresh.controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: WHEN })));
  const before = checksWanted(fresh.posted).length;
  fireEvent.click(box());
  expect(exportsAsked(fresh.posted)).toEqual([]);
  expect(checksWanted(fresh.posted).slice(before)).toEqual([{ type: "agentCheckWanted", ompPath: "", systemCertificates: true }]);
  cleanup();
  const old = setup({ mode: "settings", now: () => NOW + 25 * 3600_000 });
  act(() => old.controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: WHEN })));
  fireEvent.click(box());
  expect(exportsAsked(old.posted)).toHaveLength(1);
});

test("unchecking the box checks omp again at once, without the bundle and without asking for an export", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.systemCertificates": { user: true } } });
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: WHEN })));
  const before = checksWanted(posted).length;
  fireEvent.click(box());
  expect(checksWanted(posted).slice(before)).toEqual([{ type: "agentCheckWanted", ompPath: "", systemCertificates: false }]);
  expect(exportsAsked(posted)).toEqual([]);
  // An export that ends with the box unchecked does not check anything.
  act(() => controller.receiveSystemCertificates(certificates({ exporting: true, count: 4, exportedAt: WHEN })));
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: WHEN })));
  expect(checksWanted(posted)).toHaveLength(before + 1);
});

test("Refresh in the step asks the host for an export, disabled while one runs; when it ends the step checks omp again and the wizard's choices stay", () => {
  const { controller, posted } = setup({ mode: "settings", values: { "trama.systemCertificates": { user: true }, "trama.ompPath": { user: "/typed/omp" } } });
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: WHEN })));
  const before = checksWanted(posted).length;
  fireEvent.click(screen.getByRole("button", { name: "Refresh system certificates" }));
  expect(exportsAsked(posted)).toHaveLength(1);
  act(() => controller.receiveSystemCertificates(certificates({ exporting: true, count: 4, exportedAt: WHEN })));
  const refresh = screen.getByRole("button", { name: "Refresh system certificates" }) as HTMLButtonElement;
  expect(refresh.disabled).toBe(true);
  controller.refreshCertificates();
  expect(exportsAsked(posted)).toHaveLength(1);
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 5, exportedAt: WHEN })));
  expect(checksWanted(posted).slice(before)).toEqual([{ type: "agentCheckWanted", ompPath: "/typed/omp", systemCertificates: true }]);
  expect((screen.getByLabelText("Omp Path") as HTMLInputElement).value).toBe("/typed/omp");
  expect(box().getAttribute("aria-checked")).toBe("true");
});

test("the step's value reaches the check, the installer and the login terminals, and the saved setting is not touched", () => {
  const { controller, posted } = setup({ mode: "settings", now: () => NOW });
  const missing = () => act(() => controller.receiveAgentCheck({ type: "agentCheck", ompPath: "", state: "done", ok: false, missing: true, error: "omp not found at the editor PATH" }));
  act(() => controller.receiveSystemCertificates(certificates({ exporting: false, count: 4, exportedAt: new Date(NOW).toISOString() })));
  missing();
  press("Install omp");
  expect(posted.filter((m) => m.type === "installOmp")).toEqual([{ type: "installOmp", systemCertificates: false }]);
  fireEvent.click(box());
  missing();
  press("Install omp");
  expect(posted.filter((m) => m.type === "installOmp").at(-1)).toEqual({ type: "installOmp", systemCertificates: true });
  answered(controller);
  press("Log in to Anthropic");
  expect(posted.filter((m) => m.type === "ompLogin").at(-1)).toEqual({ type: "ompLogin", provider: "anthropic", ompPath: "", systemCertificates: true });
  fireEvent.click(box());
  answered(controller);
  press("Log in to Anthropic");
  expect(posted.filter((m) => m.type === "ompLogin").at(-1)).toEqual({ type: "ompLogin", provider: "anthropic", ompPath: "", systemCertificates: false });
  expect(posted.some((m) => m.type === "setSetting" || m.type === "confirmSetup")).toBe(false);
});

test("the value is saved with the other choices at the confirmation and shows in the summary; cancelling saves nothing", () => {
  const { controller, posted, closed } = setup({ mode: "settings" });
  fireEvent.click(box());
  advanceTo(controller, "Summary");
  const row = screen.getByText("System Certificates").closest("li, tr, div") as HTMLElement;
  expect(row.textContent).toContain("On");
  press("Save settings");
  const confirm = posted.find((m) => m.type === "confirmSetup");
  expect(confirm).toMatchObject({ type: "confirmSetup", mode: "settings", values: [{ key: "trama.systemCertificates", value: true }] });
  expect(closed).toEqual([]);
});

test("cancelling the wizard leaves the saved value as it was and sends no confirmation", () => {
  const { controller, posted, closed } = setup({ mode: "settings" });
  fireEvent.click(box());
  press("Cancel");
  expect(closed).toEqual(["cancel:settings"]);
  expect(posted.some((m) => m.type === "confirmSetup" || m.type === "setSetting")).toBe(false);
  expect(controller.isOpen()).toBe(false);
});
