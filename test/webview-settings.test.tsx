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
  expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Appearance", "Agent", "Models", "Project", "Features"]);
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

test("the model suggestion list is sized by the whole list, so filtering never narrows it, and no entry is truncated", () => {
  setup({}, MODELS);
  const field = screen.getByRole("combobox", { name: "Analysis" });
  fireEvent.change(field, { target: { value: "gpt" } });
  const content = document.querySelector("[data-slot=popover-content]") as HTMLElement;
  const sizer = content.querySelector("[aria-hidden=true]") as HTMLElement;
  expect(sizer.textContent).toContain("anthropic/claude-opus-5-5");
  expect(sizer.textContent).toContain("Claude Opus 5.5");
  expect(sizer.textContent).toContain("openai/gpt-5");
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(content.querySelector(".truncate")).toBeNull();
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
