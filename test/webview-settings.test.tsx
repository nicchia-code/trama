import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelSuggestion } from "../extension/src/host/model-lists";
import { type ManifestPackage, type SettingsValues, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost, ToWebview } from "../extension/src/protocol";
import { mountSettings, SettingsPage } from "../extension/src/webview/settings";
import { startTheme } from "../extension/src/webview/theme";

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

afterEach(() => {
  cleanup();
  document.body.className = "";
  document.documentElement.className = "";
});

const MODELS: ModelSuggestion[] = [{ value: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5" }, { value: "openai/gpt-5" }];

function setup(values: Record<string, SettingsValues> = {}, models: ModelSuggestion[] = [], listError: string | null = null) {
  const posted: ToHost[] = [];
  const utils = render(<SettingsPage schema={schema} values={values} generation={1} models={models} listError={listError} post={(message) => posted.push(message)} openLink={() => {}} />);
  return { posted, ...utils };
}

test("the settings are in four groups, omp first and Advanced last, each with its title", () => {
  setup();
  expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["omp", "Models", "Project", "Advanced"]);
  expect(screen.getByRole("combobox", { name: "Theme" })).not.toBeNull();
  expect(screen.getByRole("checkbox", { name: "Auto Exit" })).not.toBeNull();
});

test("a change of Theme changes the theme class of the panel, with auto following the editor", () => {
  document.body.className = "vscode-light";
  const theme = startTheme();
  const page = render(<></>);
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: () => {}, navigate: () => {}, openLink: () => {} }, theme);
  const html = document.documentElement;
  const send = (user: unknown) => act(() => view.receive({ type: "settings", schema, values: { "trama.theme": { user } } }));

  send(undefined);
  expect(html.classList.contains("dark")).toBe(false);
  send("dark");
  expect(html.classList.contains("dark")).toBe(true);
  send("light");
  document.body.className = "vscode-dark";
  expect(html.classList.contains("dark")).toBe(false);
  // A value outside the list is auto, which follows the editor again.
  send("sepia");
  expect(html.classList.contains("dark")).toBe(true);
  theme.dispose();
});

test("an enum saves the value the developer chose", () => {
  const { posted } = setup({ "trama.theme": { user: "auto" } });
  const select = screen.getByRole("combobox", { name: "Theme" });
  fireEvent.pointerDown(select, { button: 0, ctrlKey: false, pointerType: "mouse" });
  fireEvent.click(screen.getByRole("option", { name: "dark" }));
  expect(posted).toEqual([{ type: "setSetting", key: "trama.theme", value: "dark" }]);
  expect(screen.getByRole("combobox", { name: "Theme" }).textContent).toBe("dark");
});

test("the model Combobox filters while typing and confirms a chosen entry at once", () => {
  const { posted } = setup({}, MODELS);
  const field = screen.getByRole("combobox", { name: "Analysis" });
  fireEvent.change(field, { target: { value: "opus" } });
  const options = screen.getAllByRole("option");
  expect(options.map((option) => option.textContent)).toEqual(["anthropic/claude-opus-5-5· Claude Opus 5.5"]);
  expect(posted).toEqual([]);
  fireEvent.click(options[0] as HTMLElement);
  expect(posted).toEqual([{ type: "setSetting", key: "trama.analysis", value: "anthropic/claude-opus-5-5" }]);
  expect((field as HTMLInputElement).value).toBe("anthropic/claude-opus-5-5");
});

test("the model suggestion list is as wide as the field, filtering never changes it, and no entry is truncated: long ones wrap", () => {
  setup({}, MODELS);
  const field = screen.getByRole("combobox", { name: "Analysis" });
  fireEvent.change(field, { target: { value: "gpt" } });
  const content = document.querySelector("[data-slot=popover-content]") as HTMLElement;
  // The width is the field's, not the entries': no hidden copy of the list sizes it.
  expect(content.className).toContain("w-(--radix-popover-trigger-width)");
  expect(content.className).toContain("max-w-(--radix-popover-trigger-width)");
  expect(content.className).not.toContain("w-max");
  expect(content.querySelector("[aria-hidden=true]")).toBeNull();
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(content.querySelector(".truncate")).toBeNull();
  expect(screen.getAllByRole("option")[0]?.className).toContain("flex-wrap");
  fireEvent.change(field, { target: { value: "" } });
  expect(screen.getAllByRole("option")).toHaveLength(2);
  expect((document.querySelector("[data-slot=popover-content]") as HTMLElement).className).toBe(content.className);
});

test("a free text in the model Combobox is confirmed with Enter or when the field is left, never swapped for a suggestion", () => {
  const { posted } = setup({}, MODELS);
  const field = screen.getByRole("combobox", { name: "Scan" });
  fireEvent.change(field, { target: { value: "  my-model " } });
  expect(screen.queryAllByRole("option")).toEqual([]);
  fireEvent.keyDown(field, { key: "Enter" });
  expect(posted).toEqual([{ type: "setSetting", key: "trama.scan", value: "my-model" }]);

  fireEvent.change(field, { target: { value: "gpt" } });
  expect(screen.getAllByRole("option")).toHaveLength(1);
  fireEvent.blur(field);
  expect(posted[1]).toEqual({ type: "setSetting", key: "trama.scan", value: "gpt" });
});

test("without suggestions a model field is a plain text field, and omp's reason shows under each of the three", () => {
  setup({}, [], "omp not found at the editor PATH");
  const field = screen.getByRole("combobox", { name: "Execution" });
  fireEvent.change(field, { target: { value: "x" } });
  expect(screen.queryAllByRole("option")).toEqual([]);
  expect(screen.getAllByText("omp not found at the editor PATH")).toHaveLength(3);
});

test("a whole number below the minimum shows its reason and is not saved; a valid one is", () => {
  const { posted } = setup();
  const field = screen.getByRole("spinbutton", { name: "Max Parallel Agents" });
  fireEvent.change(field, { target: { value: "0" } });
  fireEvent.keyDown(field, { key: "Enter" });
  expect(screen.getByText("Enter a whole number of at least 1.")).not.toBeNull();
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(posted).toEqual([]);

  fireEvent.change(field, { target: { value: "3" } });
  expect(screen.queryByText("Enter a whole number of at least 1.")).toBeNull();
  fireEvent.blur(field);
  expect(posted).toEqual([{ type: "setSetting", key: "trama.maxParallelAgents", value: 3 }]);
});

test("the language is a text field that can be edited, saved trimmed, with the workspace override under it", () => {
  const { posted } = setup({ "trama.language": { user: "Italian", workspace: "German" } });
  const field = screen.getByRole("textbox", { name: "Language" }) as HTMLInputElement;
  expect(field.disabled).toBe(false);
  expect(field.value).toBe("Italian");
  expect(screen.getByText(/The workspace setting overrides this:/).textContent).toBe("The workspace setting overrides this: German.");
  expect(screen.queryByText("Disabled for now: agents write in English.")).toBeNull();
  fireEvent.change(field, { target: { value: "  French " } });
  fireEvent.blur(field);
  expect(posted).toEqual([{ type: "setSetting", key: "trama.language", value: "French" }]);
});

test("a workspace value shows under its control", () => {
  setup({ "trama.skillsDir": { user: "", workspace: "custom/skills" } });
  expect(screen.getByText(/The workspace setting overrides this:/).textContent).toBe("The workspace setting overrides this: custom/skills.");
});

test("trama.theme is declared in the manifest as the only setting of the Appearance subgroup of Advanced", () => {
  const theme = manifest.contributes?.configuration?.properties?.["trama.theme"];
  expect(theme?.enum).toEqual(["auto", "light", "dark"]);
  expect(theme?.default).toBe("auto");
  expect(theme?.scope).toBe("application");
  expect(theme?.enumDescriptions).toHaveLength(3);
  expect(schema.filter((setting) => setting.subgroup === "Appearance").map((setting) => [setting.group, setting.key])).toEqual([["Advanced", "trama.theme"]]);
});

test("with a project the page title «Settings» has «Guided setup» on its row, with its tooltip in the name; without one there is none", () => {
  const opened: string[] = [];
  const page = render(<SettingsPage schema={schema} values={{}} generation={1} models={[]} listError={null} post={() => {}} openLink={() => {}} onGuidedSetup={() => opened.push("open")} />);
  const title = screen.getByRole("heading", { level: 1 });
  expect(title.textContent).toBe("Settings");
  const button = screen.getByRole("button", { name: "Guided setup. Review the main settings step by step" });
  expect(title.parentElement?.contains(button)).toBe(true);
  // On the same row from about 480 px, under the title and at the left below it.
  expect(title.parentElement?.className).toContain("min-[480px]:flex-row");
  expect(title.parentElement?.className).toContain("min-[480px]:justify-between");
  expect(title.parentElement?.className).toContain("items-start");
  fireEvent.click(button);
  expect(opened).toEqual(["open"]);
  page.unmount();
  setup();
  expect(screen.queryByRole("button", { name: /Guided setup/ })).toBeNull();
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Settings");
});

test("while the wizard is open it takes the place of the title, the button and the form", () => {
  render(<SettingsPage schema={schema} values={{}} generation={1} models={[]} listError={null} post={() => {}} openLink={() => {}} onGuidedSetup={() => {}} wizard={<p>The wizard</p>} />);
  expect(screen.getByText("The wizard")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Guided setup/ })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Settings" })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Theme" })).toBeNull();
});

test("omp Chat is an active checkbox, without a note", () => {
  const { posted } = setup({});
  const box = screen.getByRole("checkbox", { name: "omp Chat" });
  expect(box.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByText("Only with omp")).toBeNull();
  fireEvent.click(box);
  expect(posted).toEqual([{ type: "setSetting", key: "trama.ompChat", value: false }]);
});

function ompRow(omp: React.ComponentProps<typeof SettingsPage>["omp"]) {
  const posted: ToHost[] = [];
  render(<SettingsPage schema={schema} values={{}} generation={1} models={[]} listError={null} omp={omp} post={(message) => posted.push(message)} openLink={() => {}} />);
  const region = document.querySelector('[aria-live="polite"]') as HTMLElement;
  return { posted, region };
}

test("the omp group opens with its status in the bordered box of the wizard, before the settings, saying omp is being checked", () => {
  const { region } = ompRow({ state: "checking" });
  expect(region.textContent).toBe("Checking omp…");
  expect(region.className).toContain("border");
  expect(region.querySelector("svg.animate-spin")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Install omp/ })).toBeNull();
  const section = region.closest("section") as HTMLElement;
  expect(section.querySelector("h2")?.textContent).toBe("omp");
  expect(region.compareDocumentPosition(screen.getByRole("textbox", { name: "Omp Path" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // Under the sentence of the group.
  expect(section.querySelector("p")?.compareDocumentPosition(region)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

test("omp that answers shows its version and how many models, and no button", () => {
  const { region } = ompRow({ state: "done", missing: false, version: "14.2.1", models: 12 });
  expect(region.textContent).toBe("omp 14.2.1 answered with 12 models.");
  expect(region.querySelector("svg.lucide-circle-check")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Install omp/ })).toBeNull();
});

test("omp that does not answer shows the reason and that Trama cannot work, without the button; the tab never says it updates omp", () => {
  const { region } = ompRow({ state: "done", missing: false, error: "omp exited with code 1" });
  expect(region.textContent).toBe("omp exited with code 1. Trama cannot work without omp.");
  expect(region.className).toContain("border-amber-600/40");
  expect(region.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Install omp/ })).toBeNull();
  expect(document.body.textContent).not.toContain("Updating omp");
  expect(document.body.textContent).not.toContain("Could not update omp");
});

test("omp that is missing adds Install omp inside the box, which sends installOmp", () => {
  const { region, posted } = ompRow({ state: "done", missing: true, error: "omp not found at the editor PATH" });
  expect(region.textContent).toContain("omp not found at the editor PATH. Trama cannot work without omp.");
  fireEvent.click(within(region).getByRole("button", { name: /Install omp/ }));
  expect(posted).toEqual([{ type: "installOmp" }]);
});

test("omp older than the minimum shows the sentence in place of its version, with Install omp inside the box", () => {
  const { region, posted } = ompRow({ state: "done", missing: false, version: "18.12.5", models: 3, tooOld: true });
  expect(region.textContent).toContain("Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.");
  expect(region.textContent).not.toContain("answered with");
  fireEvent.click(within(region).getByRole("button", { name: /Install omp/ }));
  expect(posted).toEqual([{ type: "installOmp" }]);
});

test("the mounted tab takes the host's ompStatus, and asks again when it becomes visible", () => {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (m) => posted.push(m), navigate: () => {}, openLink: () => {} }, startTheme());
  act(() => view.receive({ type: "settings", schema, values: {} }));
  expect(screen.getByText("Checking omp…")).not.toBeNull();
  act(() => view.receiveOmpStatus({ type: "ompStatus", state: "done", missing: false, version: "1.0.0", models: 3 }));
  expect(screen.getByText("omp 1.0.0 answered with 3 models.")).not.toBeNull();
  view.show({});
  expect(posted).toContainEqual({ type: "modelSuggestionsWanted" });
  expect(posted).toContainEqual({ type: "ompStatusWanted" });
  // Without a project the tab does not look for instruction files.
  expect(posted.some((m) => m.type === "instructionFilesWanted")).toBe(false);
});

test("the page is one centred column of at most 720 px, with no grid of columns and no index of the groups", () => {
  setup();
  const column = screen.getByRole("heading", { level: 1 }).parentElement?.parentElement as HTMLElement;
  expect(column.className).toContain("mx-auto w-full max-w-[720px] min-w-0 px-4");
  expect(column.parentElement?.className).toContain("overflow-x-clip");
  expect(document.querySelector('[class*="1100px"], [class*="grid-cols"]')).toBeNull();
  expect(screen.queryByRole("navigation")).toBeNull();
});

test("the groups are the wizard's, each with its title and its sentence under it, and Advanced has its four subgroups a level below", () => {
  setup();
  const sections = Array.from(document.querySelectorAll("main section, section")).filter((s) => s.querySelector(":scope > h2")) as HTMLElement[];
  expect(sections.map((s) => [s.querySelector(":scope > h2")?.textContent, s.querySelector(":scope > p")?.textContent])).toEqual([
    ["omp", "omp is required: Trama runs every agent with omp."],
    ["Models", "Choose the model for each kind of work."],
    ["Project", "Choose where Trama installs the agent skills."],
    ["Advanced", "Theme and optional features."],
  ]);
  const advanced = sections[3] as HTMLElement;
  expect(Array.from(advanced.querySelectorAll("h3")).map((h) => h.textContent)).toEqual(["Appearance", "Drifts", "Agents", "omp Chat"]);
  expect(Array.from(advanced.querySelectorAll("section")).map((s) => s.querySelectorAll("label").length)).toEqual([1, 3, 3, 3]);
  // Auto Exit and the language stay in omp, with the language enabled and no note; the group Features does not exist.
  const omp = sections[0] as HTMLElement;
  expect(within(omp).getByRole("checkbox", { name: "Auto Exit" })).not.toBeNull();
  const language = within(omp).getByRole("textbox", { name: "Language" });
  expect(language.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByText("Disabled for now: agents write in English.")).toBeNull();
  expect(language.getAttribute("aria-describedby")).toBe("st-trama-language-explain");
  expect(screen.queryByText("Features")).toBeNull();
});

test("the three model roles have their advice in bold between the title and the explanation, and the page has no «i»", () => {
  setup();
  const titleOf = (key: string) => document.querySelector(`label[for="st-trama-${key}"]`) as HTMLElement;
  const advice = (key: string) => (titleOf(key).closest(".grid.min-w-0.gap-1\\.5") as HTMLElement).querySelector("p.font-semibold") as HTMLElement;
  expect(advice("analysis").textContent).toBe("Your most capable model.");
  expect(advice("execution").textContent).toBe("A mid-range model.");
  expect(advice("scan").textContent).toBe("A fast, light model.");
  // The advice comes before the explanation.
  const analysis = advice("analysis");
  expect(analysis.compareDocumentPosition(document.getElementById("st-trama-analysis-explain") as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^About / })).toBeNull();
  expect(document.querySelector("svg.lucide-info")).toBeNull();
  // The other settings have no advice.
  expect(titleOf("theme").closest(".grid.min-w-0.gap-1\\.5")?.querySelector("p.font-semibold")).toBeNull();
});

test("a setting is read in its page mode: the explanation under the title, the control, the entry of the chosen enum value, and aria-describedby", () => {
  setup({ "trama.theme": { user: "dark" } });
  const theme = screen.getByRole("combobox", { name: "Theme" });
  const explain = document.getElementById("st-trama-theme-explain") as HTMLElement;
  expect(explain.textContent).toContain("Colours of the Trama panel.");
  const described = (theme.getAttribute("aria-describedby") ?? "").split(" ");
  expect(described).toContain("st-trama-theme-explain");
  const value = document.getElementById(described.find((id) => id.includes("-value-")) as string) as HTMLElement;
  expect(value.textContent).toBe("Always dark.");
  expect(((document.querySelector('label[for="st-trama-theme"]') as HTMLElement).compareDocumentPosition(explain) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
  expect(explain.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(theme.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("a Checkbox is left of its title on the same row, with the explanation under it, and clicking the title changes it", () => {
  const { posted } = setup();
  const box = screen.getByRole("checkbox", { name: "omp Chat" });
  const title = screen.getByText("omp Chat", { selector: "label" });
  expect(title.parentElement?.contains(box)).toBe(true);
  expect(box.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(box.getAttribute("aria-describedby")).toContain("st-trama-ompChat-explain");
  fireEvent.click(title);
  expect(posted).toEqual([{ type: "setSetting", key: "trama.ompChat", value: false }]);
  // The other settings keep the control under the explanation, in the width of the column.
  const field = screen.getByRole("textbox", { name: "Omp Path" });
  const explain = document.getElementById("st-trama-ompPath-explain") as HTMLElement;
  expect(explain.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("a message is under its control, and an absent one leaves no element behind", () => {
  setup({ "trama.skillsDir": { user: "", workspace: "custom/skills" } }, [], "omp not found at the editor PATH");
  const field = screen.getByRole("textbox", { name: "Skills Dir" });
  const cell = field.parentElement as HTMLElement;
  expect(cell.textContent).toContain("The workspace setting overrides this: custom/skills.");
  const message = within(cell).getByText(/The workspace setting overrides this:/);
  expect(field.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const scan = screen.getByRole("combobox", { name: "Scan" }).closest(".grid.min-w-0.gap-1\\.5") as HTMLElement;
  expect(scan.textContent).toContain("omp not found at the editor PATH");
  // Omp Path has the explanation and the control, and no message paragraph.
  const path = screen.getByRole("textbox", { name: "Omp Path" }).parentElement as HTMLElement;
  expect(Array.from(path.children).map((child) => child.tagName)).toEqual(["DIV", "INPUT"]);
  // A Checkbox without a message has nothing under its explanation.
  const chat = screen.getByRole("checkbox", { name: "omp Chat" }).closest(".grid.min-w-0.gap-1\\.5") as HTMLElement;
  expect((chat.lastElementChild as HTMLElement).children).toHaveLength(1);
});

const files = [
  { label: "AGENTS.md", path: "/work/app/AGENTS.md" },
  { label: "~/.claude/CLAUDE.md", path: "/home/me/.claude/CLAUDE.md" },
];

function filesPage(props: Partial<React.ComponentProps<typeof SettingsPage>>, values: Record<string, SettingsValues> = {}) {
  const posted: ToHost[] = [];
  render(<SettingsPage schema={schema} values={values} generation={1} models={[]} listError={null} post={(message) => posted.push(message)} openLink={() => {}} {...props} />);
  return posted;
}

test("in a project the omp group ends with the box of instruction files of the wizard, with a link «Open <path>» for each file", () => {
  const posted = filesPage({ onGuidedSetup: () => {}, instructionFiles: files });
  const box = screen.getByText(/Agent instruction files found\./).closest("div") as HTMLElement;
  expect(box.textContent).toContain("The agent loads them in every Trama job: remove them from the repository, or check that they do not conflict with Trama.");
  expect(box.className).toContain("border-amber-600/40");
  expect(box.compareDocumentPosition(screen.getByRole("textbox", { name: "Language" })) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  expect((box.closest("section") as HTMLElement).querySelector("h2")?.textContent).toBe("omp");
  expect(within(box).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Open AGENTS.md", "Open ~/.claude/CLAUDE.md"]);
  fireEvent.click(within(box).getByRole("button", { name: "Open AGENTS.md" }));
  expect(posted).toEqual([{ type: "openInstructionFile", path: "/work/app/AGENTS.md" }]);
});

test("the line «Trama's omp jobs ignore these files.» follows the saved trama.ignoreInstructionFiles", () => {
  const IGNORED = "Trama's omp jobs ignore these files.";
  const page = render(<SettingsPage schema={schema} values={{}} generation={1} models={[]} listError={null} post={() => {}} openLink={() => {}} instructionFiles={files} />);
  expect(screen.queryByText(IGNORED)).toBeNull();
  page.rerender(<SettingsPage schema={schema} values={{ "trama.ignoreInstructionFiles": { user: true } }} generation={2} models={[]} listError={null} post={() => {}} openLink={() => {}} instructionFiles={files} />);
  expect(screen.getByText(IGNORED)).not.toBeNull();
  page.rerender(<SettingsPage schema={schema} values={{ "trama.ignoreInstructionFiles": { user: false } }} generation={3} models={[]} listError={null} post={() => {}} openLink={() => {}} instructionFiles={files} />);
  expect(screen.queryByText(IGNORED)).toBeNull();
});

test("without files, while the search runs, the box is not there", () => {
  filesPage({ instructionFiles: null });
  expect(screen.queryByText(/Agent instruction files found\./)).toBeNull();
  cleanup();
  filesPage({ instructionFiles: [] });
  expect(screen.queryByText(/Agent instruction files found\./)).toBeNull();
});

test("the mounted tab, in a project, asks for the files without a root each time it becomes visible, and shows none while it searches; outside a project it never asks", () => {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (m) => posted.push(m), navigate: () => {}, openLink: () => {} }, startTheme());
  act(() => view.receive({ type: "settings", schema, values: {} }));
  const asked = () => posted.filter((m) => m.type === "instructionFilesWanted");

  act(() => view.projectPresent(false));
  act(() => view.show({}));
  expect(asked()).toEqual([]);
  act(() => view.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files }));
  expect(screen.queryByText(/Agent instruction files found\./)).toBeNull();

  act(() => view.projectPresent(true));
  expect(asked()).toEqual([{ type: "instructionFilesWanted" }]);
  act(() => view.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files }));
  expect(screen.getByRole("button", { name: "Open AGENTS.md" })).not.toBeNull();

  act(() => view.show({}));
  expect(asked()).toEqual([{ type: "instructionFilesWanted" }, { type: "instructionFilesWanted" }]);
  expect(screen.queryByRole("button", { name: "Open AGENTS.md" })).toBeNull();
  act(() => view.receiveInstructionFiles({ type: "instructionFiles", root: "/work/app", files: [] }));
  expect(screen.queryByText(/Agent instruction files found\./)).toBeNull();

  act(() => view.projectPresent(false));
  expect(screen.queryByRole("button", { name: /Guided setup/ })).toBeNull();
});

/** The mounted tab with the schema received; `status` sends an ompStatus. */
function mounted() {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (m) => posted.push(m), navigate: () => {}, openLink: () => {} }, startTheme());
  act(() => view.receive({ type: "settings", schema, values: {} }));
  const status = (message: Omit<Extract<ToWebview, { type: "ompStatus" }>, "type">) => act(() => view.receiveOmpStatus({ type: "ompStatus", ...message }));
  return { posted, view, status };
}
const providersList = () => screen.queryByRole("list", { name: "Providers" });

test("the Providers section is absent before the first outcome, while omp is checked and when omp does not answer", () => {
  const { status } = mounted();
  expect(providersList()).toBeNull();
  expect(screen.queryByRole("heading", { name: "Providers" })).toBeNull();
  status({ state: "checking" });
  expect(providersList()).toBeNull();
  status({ state: "done", missing: true, error: "omp not found at the editor PATH" });
  expect(providersList()).toBeNull();
  status({ state: "done", missing: false, version: "18.12.5", models: 3, providers: ["anthropic"], tooOld: true });
  expect(providersList()).toBeNull();
  status({ state: "done", missing: false, version: "18.12.6", models: 1, providers: ["anthropic"] });
  expect(providersList()).not.toBeNull();
  status({ state: "done", missing: false, error: "omp exited with code 1" });
  expect(providersList()).toBeNull();
});

test("with omp answering, the Providers section sits under the status box and before the settings, with the seven rows in order", () => {
  const { status } = mounted();
  status({ state: "done", missing: false, version: "18.12.6", models: 2, providers: [] });
  const section = screen.getByRole("heading", { level: 3, name: "Providers" }).closest("section") as HTMLElement;
  expect(section.parentElement?.querySelector("h2")?.textContent).toBe("omp");
  const box = document.querySelector('[aria-live="polite"]') as HTMLElement;
  expect(box.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(section.compareDocumentPosition(screen.getByRole("textbox", { name: "Omp Path" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(section).getByText("Log in to the model providers you use with omp.")).not.toBeNull();
  const rows = within(screen.getByRole("list", { name: "Providers" })).getAllByRole("listitem");
  expect(rows.map((row) => within(row).getByRole("button").textContent)).toEqual(Array(7).fill("Log in"));
  expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual(["ChatGPT", "Anthropic", "GitHub Copilot", "Google Gemini CLI", "Google Antigravity", "Cursor", "xAI Grok"]);
  expect(rows.map((row) => row.querySelectorAll("p")[1]?.textContent)).toEqual(["Plus/Pro (Codex)", "Claude Pro/Max", "Copilot subscription", "Cloud Code Assist", "Gemini, Claude, GPT-OSS", "Cursor subscription", "SuperGrok or X Premium+"]);
});

test("a provider omp lists models of is Connected with Log in again, the others Not connected with Log in", () => {
  const { status } = mounted();
  status({ state: "done", missing: false, version: "18.12.6", models: 2, providers: ["github-copilot", "xai-oauth", "some-other-provider"] });
  const rows = within(screen.getByRole("list", { name: "Providers" })).getAllByRole("listitem");
  const connected = rows.filter((row) => within(row).queryByText("Connected") !== null);
  expect(connected.map((row) => row.querySelector("p")?.textContent)).toEqual(["GitHub Copilot", "xAI Grok"]);
  for (const row of connected) {
    expect(row.querySelector("svg.lucide-circle-check")).not.toBeNull();
    expect(within(row).getByRole("button").textContent).toBe("Log in again");
  }
  expect(screen.getAllByText("Not connected")).toHaveLength(5);
  expect(screen.getByRole("button", { name: "Log in again to GitHub Copilot" })).not.toBeNull();
  expect(screen.getByRole("button", { name: "Log in to Cursor" })).not.toBeNull();
  // No other provider of omp has a row.
  expect(rows).toHaveLength(7);
});

test("without providers (the list of models failed while omp answers) the rows have no state and every button says Log in", () => {
  const { status } = mounted();
  status({ state: "done", missing: false, version: "18.12.6", models: 0 });
  const rows = within(screen.getByRole("list", { name: "Providers" })).getAllByRole("listitem");
  expect(rows).toHaveLength(7);
  expect(screen.queryByText("Connected")).toBeNull();
  expect(screen.queryByText("Not connected")).toBeNull();
  expect(rows.map((row) => within(row).getByRole("button").textContent)).toEqual(Array(7).fill("Log in"));
});

test("the rows keep their last states while omp is checked again, and take the new ones with the outcome", () => {
  const { status } = mounted();
  status({ state: "done", missing: false, version: "18.12.6", models: 2, providers: ["anthropic"] });
  expect(screen.getAllByText("Connected")).toHaveLength(1);
  status({ state: "checking" });
  expect(screen.getByText("Checking omp…")).not.toBeNull();
  expect(screen.getAllByText("Connected")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Log in again to Anthropic" })).not.toBeNull();
  status({ state: "done", missing: false, version: "18.12.6", models: 3, providers: ["anthropic", "cursor"] });
  expect(screen.getAllByText("Connected")).toHaveLength(2);
  status({ state: "checking" });
  status({ state: "done", missing: false, version: "18.12.6", models: 1, providers: [] });
  expect(screen.queryByText("Connected")).toBeNull();
});

test("the section waits for the first outcome after the tab is shown again", () => {
  const { status, view } = mounted();
  status({ state: "done", missing: false, version: "18.12.6", models: 2, providers: ["anthropic"] });
  expect(providersList()).not.toBeNull();
  view.show({});
  status({ state: "checking" });
  expect(providersList()).toBeNull();
  status({ state: "done", missing: false, version: "18.12.6", models: 2, providers: ["anthropic"] });
  expect(providersList()).not.toBeNull();
});

test("pressing a button sends ompLogin with the id of the provider and no ompPath", () => {
  const { status, posted } = mounted();
  status({ state: "done", missing: false, version: "18.12.6", models: 2, providers: ["anthropic"] });
  fireEvent.click(screen.getByRole("button", { name: "Log in again to Anthropic" }));
  fireEvent.click(screen.getByRole("button", { name: "Log in to ChatGPT" }));
  fireEvent.click(screen.getByRole("button", { name: "Log in to xAI Grok" }));
  expect(posted.filter((message) => message.type === "ompLogin")).toEqual([
    { type: "ompLogin", provider: "anthropic" },
    { type: "ompLogin", provider: "openai-codex" },
    { type: "ompLogin", provider: "xai-oauth" },
  ]);
});
