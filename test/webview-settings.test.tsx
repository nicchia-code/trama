import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ModelSuggestion } from "../extension/src/host/model-lists";
import { type ManifestPackage, type SettingsValues, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost } from "../extension/src/protocol";
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

test("the settings are in five groups, Appearance first, each with its title", () => {
  setup();
  expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Appearance", "omp", "Models", "Project", "Features"]);
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

test("Esc closes the bubble of the «i» and leaves the focus on it", () => {
  setup();
  const info = screen.getByRole("button", { name: "About Theme" });
  act(() => info.focus());
  const bubble = screen.getByRole("tooltip");
  expect(info.getAttribute("aria-expanded")).toBe("true");
  expect(within(bubble).getByText("auto", { selector: "code" })).not.toBeNull();
  expect(bubble.textContent).toContain("(current)");

  act(() => {
    fireEvent.keyDown(document.activeElement ?? info, { key: "Escape" });
  });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(info.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(info);
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

test("a workspace value shows under its control", () => {
  setup({ "trama.skillsDir": { user: "", workspace: "custom/skills" } });
  expect(screen.getByText(/The workspace setting overrides this:/).textContent).toBe("The workspace setting overrides this: custom/skills.");
});

test("trama.theme is declared in the manifest as the only setting of Appearance", () => {
  const theme = manifest.contributes?.configuration?.properties?.["trama.theme"];
  expect(theme?.enum).toEqual(["auto", "light", "dark"]);
  expect(theme?.default).toBe("auto");
  expect(theme?.scope).toBe("application");
  expect(theme?.enumDescriptions).toHaveLength(3);
  expect(schema.filter((setting) => setting.group === "Appearance").map((setting) => setting.key)).toEqual(["trama.theme"]);
});

test("with a project the Settings tab has «Guided setup» at the top right, with its tooltip in the name; without one there is none", () => {
  const opened: string[] = [];
  const page = render(<SettingsPage schema={schema} values={{}} generation={1} models={[]} listError={null} post={() => {}} openLink={() => {}} onGuidedSetup={() => opened.push("open")} />);
  const button = screen.getByRole("button", { name: "Guided setup. Review the main settings step by step" });
  fireEvent.click(button);
  expect(opened).toEqual(["open"]);
  page.unmount();
  setup();
  expect(screen.queryByRole("button", { name: /Guided setup/ })).toBeNull();
});

test("while the wizard is open it takes the place of the button and of the form", () => {
  render(<SettingsPage schema={schema} values={{}} generation={1} models={[]} listError={null} post={() => {}} openLink={() => {}} onGuidedSetup={() => {}} wizard={<p>The wizard</p>} />);
  expect(screen.getByText("The wizard")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Guided setup/ })).toBeNull();
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

test("the omp group opens with its status line, before the settings, saying omp is being checked", () => {
  const { region } = ompRow({ state: "checking" });
  expect(region.textContent).toBe("Checking omp…");
  expect(region.querySelector("svg.animate-spin")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Install omp/ })).toBeNull();
  const section = region.closest("section") as HTMLElement;
  expect(section.querySelector("h2")?.textContent).toBe("omp");
  expect(region.compareDocumentPosition(screen.getByRole("textbox", { name: "Omp Path" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("omp that answers shows its version and no button", () => {
  const { region } = ompRow({ state: "done", missing: false, version: "14.2.1" });
  expect(region.textContent).toBe("omp 14.2.1");
  expect(region.querySelector("svg.lucide-circle-check")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Install omp/ })).toBeNull();
});

test("omp that does not answer shows the reason and that Trama cannot work, without the button", () => {
  const { region } = ompRow({ state: "done", missing: false, error: "omp exited with code 1" });
  expect(region.textContent).toBe("omp exited with code 1. Trama cannot work without omp.");
  expect(region.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
  expect(screen.queryByRole("button", { name: /Install omp/ })).toBeNull();
});

test("omp that is missing adds Install omp, which sends installOmp", () => {
  const { region, posted } = ompRow({ state: "done", missing: true, error: "omp not found at the editor PATH" });
  expect(region.textContent).toContain("omp not found at the editor PATH. Trama cannot work without omp.");
  fireEvent.click(within(region).getByRole("button", { name: /Install omp/ }));
  expect(posted).toEqual([{ type: "installOmp" }]);
});

test("the mounted tab takes the host's ompStatus, and asks again when it becomes visible", () => {
  const posted: ToHost[] = [];
  const page = render(<></>);
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (m) => posted.push(m), navigate: () => {}, openLink: () => {} }, startTheme());
  act(() => view.receive({ type: "settings", schema, values: {} }));
  expect(screen.getByText("Checking omp…")).not.toBeNull();
  act(() => view.receiveOmpStatus({ type: "ompStatus", state: "done", missing: false, version: "1.0.0" }));
  expect(screen.getByText("omp 1.0.0")).not.toBeNull();
  view.show({});
  expect(posted).toContainEqual({ type: "modelSuggestionsWanted" });
  expect(posted).toContainEqual({ type: "ompStatusWanted" });
});

test("a Checkbox is left of its title on the same row, and clicking the title changes it", () => {
  const { posted } = setup();
  const box = screen.getByRole("checkbox", { name: "omp Chat" });
  const title = screen.getByText("omp Chat", { selector: "label" });
  expect(title.parentElement?.contains(box)).toBe(true);
  expect(box.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(title);
  expect(posted).toEqual([{ type: "setSetting", key: "trama.ompChat", value: false }]);
  // The other settings keep the control under the title, in the second row of their column.
  const field = screen.getByRole("textbox", { name: "Omp Path" });
  expect(field.closest(".row-start-2")).not.toBeNull();
  expect(field.closest(".row-start-1")).toBeNull();
});

test("a message is under its control, in its column, and an absent one leaves no element behind", () => {
  setup({ "trama.skillsDir": { user: "", workspace: "custom/skills" } }, [], "omp not found at the editor PATH");
  const field = screen.getByRole("textbox", { name: "Skills Dir" });
  const cell = field.parentElement as HTMLElement;
  expect(cell.className).toContain("row-start-2");
  expect(cell.textContent).toContain("The workspace setting overrides this: custom/skills.");
  const scan = screen.getByRole("combobox", { name: "Scan" }).closest(".row-start-2") as HTMLElement;
  expect(scan.textContent).toContain("omp not found at the editor PATH");
  const path = screen.getByRole("textbox", { name: "Omp Path" }).closest(".row-start-2") as HTMLElement;
  expect(path.querySelectorAll("p")).toHaveLength(0);
  // The field has no rows beyond the title and the control.
  expect(path.parentElement?.className).toContain("row-span-2");
  // A Checkbox without a message has no second row at all.
  expect(screen.getByRole("checkbox", { name: "omp Chat" }).closest(".row-start-2")).toBeNull();
});

test("the tooltip of the «i» never shows with the bubble, and never once the pointer has gone", async () => {
  setup();
  const info = screen.getByRole("button", { name: "About Theme" });
  const tip = () => document.querySelector('[data-slot="tooltip-content"]');
  const bubble = () => document.getElementById("st-trama-theme-tip");
  expect(tip()).toBeNull();

  // The pointer opens the bubble, and the tooltip stays away while it is open.
  fireEvent.pointerEnter(info);
  expect(bubble()).not.toBeNull();
  expect(tip()).toBeNull();

  // A press gives the «i» the focus too; once the pointer has gone the bubble closes after its pause and no tooltip shows in its place.
  act(() => info.focus());
  fireEvent.pointerLeave(info);
  expect(tip()).toBeNull();
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  expect(bubble()).toBeNull();
  expect(tip()).toBeNull();
});
