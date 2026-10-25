import { afterEach, beforeAll, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ManifestPackage, settingsSchema } from "../extension/src/host/settings-schema";
import type { ToHost } from "../extension/src/protocol";
import { mountSettings, SettingsPage } from "../extension/src/webview/settings";
import { type SoloState, trackedPreview } from "../extension/src/webview/settings/logic";
import { startTheme } from "../extension/src/webview/theme";

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

const ON: SoloState = { available: true, solo: "folders", tracked: [] };

function setup(solo: SoloState | null) {
  const posted: ToHost[] = [];
  const props = { schema, values: {}, generation: 1, models: [], listError: null, post: (message: ToHost) => void posted.push(message), openLink: () => {} };
  const utils = render(<SettingsPage {...props} solo={solo} soloChanges={1} />);
  const again = (next: SoloState, changes: number) => utils.rerender(<SettingsPage {...props} solo={next} soloChanges={changes} />);
  return { posted, again, ...utils };
}

const choose = (name: string) => {
  fireEvent.pointerDown(screen.getByRole("combobox", { name: "Exclude" }), { button: 0, ctrlKey: false, pointerType: "mouse" });
  fireEvent.click(screen.getByRole("option", { name }));
};

test("without a project (no soloMode) the Project group has no Solo Mode row", () => {
  setup(null);
  expect(screen.queryByRole("checkbox", { name: "Solo Mode" })).toBeNull();
  expect(screen.queryByText("Only this workspace.")).toBeNull();
});

test("in a project the Project group shows Solo Mode right after Skills Directory, with the explanation and the note, off and without Exclude", () => {
  setup({ available: true, solo: "off", tracked: [] });
  const group = screen.getByRole("region", { name: "Project" });
  const checkbox = within(group).getByRole("checkbox", { name: "Solo Mode" });
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  const skills = within(group).getByRole("textbox");
  expect(skills.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const described = (checkbox.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);
  expect(described[0]).toContain("Use Trama alone in a repository where the others do not: Trama's files stay in this working copy, kept out of git by .git/info/exclude. They are versioned nowhere else.");
  expect(described[1]).toBe("Only this workspace.");
  expect(within(group).queryByRole("combobox", { name: "Exclude" })).toBeNull();
  expect(within(group).queryByText("Solo mode needs a git repository.")).toBeNull();
});

test("turning it on sends setSoloMode folders, disables the controls and waits for the host's answer; the answer puts the real value back", () => {
  const { posted, again } = setup({ available: true, solo: "off", tracked: [] });
  const checkbox = screen.getByRole("checkbox", { name: "Solo Mode" });
  fireEvent.click(checkbox);
  expect(posted).toEqual([{ type: "setSoloMode", solo: "folders" }]);
  expect(screen.getByRole("checkbox", { name: "Solo Mode" }).getAttribute("aria-checked")).toBe("true");
  expect((screen.getByRole("checkbox", { name: "Solo Mode" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("combobox", { name: "Exclude" }) as HTMLButtonElement).disabled).toBe(true);
  // The write failed: the host tells the project's value, which is still off.
  again({ available: true, solo: "off", tracked: [] }, 2);
  expect(screen.getByRole("checkbox", { name: "Solo Mode" }).getAttribute("aria-checked")).toBe("false");
  expect((screen.getByRole("checkbox", { name: "Solo Mode" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.queryByRole("combobox", { name: "Exclude" })).toBeNull();
});

test("with Solo mode on the Exclude field shows Whole folders by default and the description of the chosen value; choosing the other sends files", () => {
  const { posted, again } = setup(ON);
  const select = screen.getByRole("combobox", { name: "Exclude" });
  expect(select.textContent).toBe("Whole folders");
  const description = () => (screen.getByRole("combobox", { name: "Exclude" }).getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent)[0];
  expect(description()).toBe("Keeps out of git .trama/, the agent skills folder and .omp/.");
  choose("Only Trama's files");
  expect(posted).toEqual([{ type: "setSoloMode", solo: "files" }]);
  again({ available: true, solo: "files", tracked: [] }, 2);
  expect(screen.getByRole("combobox", { name: "Exclude" }).textContent).toBe("Only Trama's files");
  expect(description()).toBe("Keeps out of git .trama/, the trama-* skills and the files Trama writes in .omp/, for folders the team also uses.");
  // Back to off from the checkbox.
  fireEvent.click(screen.getByRole("checkbox", { name: "Solo Mode" }));
  expect(posted.at(-1)).toEqual({ type: "setSoloMode", solo: "off" });
});

test("the files git still tracks are listed one per line, at most 10, then «and <N> more»; none shown when none is tracked or Solo mode is off", () => {
  const tracked = Array.from({ length: 13 }, (_, i) => `.trama/file-${i + 1}.md`);
  const { again } = setup({ available: true, solo: "folders", tracked });
  const warning = screen.getByText("These Trama files are tracked by git, so their changes are still committed:");
  const box = warning.parentElement as HTMLElement;
  const items = within(box).getAllByRole("listitem").map((item) => item.textContent);
  expect(items).toEqual(tracked.slice(0, 10));
  expect(within(box).getByText("and 3 more")).not.toBeNull();
  expect(screen.getByRole("combobox", { name: "Exclude" }).getAttribute("aria-describedby")).toContain(box.parentElement?.id ?? "none");

  again({ available: true, solo: "folders", tracked: [".trama/a.md"] }, 2);
  expect(screen.queryByText(/and \d+ more/)).toBeNull();
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([".trama/a.md"]);
  again({ available: true, solo: "folders", tracked: [] }, 3);
  expect(screen.queryByText("These Trama files are tracked by git, so their changes are still committed:")).toBeNull();
  again({ available: true, solo: "off", tracked: [] }, 4);
  expect(screen.queryByRole("listitem")).toBeNull();
});

test("trackedPreview cuts the list at ten", () => {
  expect(trackedPreview(["a"])).toEqual({ shown: ["a"], more: 0 });
  expect(trackedPreview(Array.from({ length: 10 }, (_, i) => String(i))).more).toBe(0);
  expect(trackedPreview(Array.from({ length: 11 }, (_, i) => String(i)))).toEqual({ shown: Array.from({ length: 10 }, (_, i) => String(i)), more: 1 });
});

test("outside a git repository the Checkbox is off and disabled, with the reason under the note and in its description", () => {
  setup({ available: false, solo: "off", tracked: [] });
  const checkbox = screen.getByRole("checkbox", { name: "Solo Mode" }) as HTMLButtonElement;
  expect(checkbox.disabled).toBe(true);
  expect(checkbox.getAttribute("aria-checked")).toBe("false");
  const reason = screen.getByText("Solo mode needs a git repository.");
  expect(checkbox.getAttribute("aria-describedby")).toContain(reason.id);
  const note = screen.getByText("Only this workspace.");
  expect(note.compareDocumentPosition(reason) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Exclude" })).toBeNull();
});

test("the checkbox and the Select are reachable from the keyboard: the Space key on the Checkbox changes it", () => {
  const { posted } = setup({ available: true, solo: "off", tracked: [] });
  const checkbox = screen.getByRole("checkbox", { name: "Solo Mode" });
  expect(checkbox.tabIndex).toBeGreaterThanOrEqual(0);
  fireEvent.click(checkbox);
  expect(posted).toHaveLength(1);
});

test("Solo mode is no setting: the mounted tab takes soloMode, shows the row, and drops it when the project goes away", () => {
  const page = render(<></>);
  const posted: ToHost[] = [];
  const theme = startTheme();
  const view = mountSettings((node) => page.rerender(<>{node}</>), { post: (message) => void posted.push(message), navigate: () => {}, openLink: () => {} }, theme);
  act(() => view.receive({ type: "settings", schema, values: {} }));
  expect(screen.queryByRole("checkbox", { name: "Solo Mode" })).toBeNull();
  act(() => view.projectPresent(true));
  act(() => view.receiveSoloMode({ type: "soloMode", available: true, solo: "files", tracked: [] }));
  expect(screen.getByRole("combobox", { name: "Exclude" }).textContent).toBe("Only Trama's files");
  act(() => view.projectPresent(false));
  expect(screen.queryByRole("checkbox", { name: "Solo Mode" })).toBeNull();
  theme.dispose();
});

test("the manifest and the schema of the settings have no Solo Mode key", () => {
  expect(JSON.stringify(manifest)).not.toMatch(/solo/i);
  expect(schema.some((setting) => /solo/i.test(setting.key) || /solo/i.test(setting.title))).toBe(false);
});
