import { afterEach, beforeAll, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import type { ToHost } from "../extension/src/protocol";

// happy-dom has no 2d canvas, which cytoscape needs: the drawing is replaced by one that draws nothing. The buttons are what is under test.
mock.module("../extension/src/webview/diagram/canvas", () => ({
  createCanvas: () => ({ render: async () => {}, select() {}, zoomBy() {}, fit() {}, resize() {}, restyle() {}, destroy() {} }),
}));
// A static import is hoisted above `mock.module`, so the view would load the real canvas; it must load after the mock is registered.
const { mountDiagram } = await import("../extension/src/webview/diagram");

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

test("with the empty Model the Diagram's two buttons, with their tooltips, ask the host for the guided setup with that path", () => {
  const dir = mkdtempSync(join(tmpdir(), "trama-diagram-empty-"));
  try {
    mkdirSync(join(dir, ".trama", "model"), { recursive: true });
    writeFileSync(join(dir, ".trama", "model", "system.md"), "# App\n\nAn app.\n");
    const snapshot = buildSnapshot(projectAt(dir));
    const posted: ToHost[] = [];
    const navigated: string[] = [];
    const page = render(<></>);
    const view = mountDiagram((node) => page.rerender(<>{node}</>), { post: (message) => posted.push(message), navigate: (name) => navigated.push(name), openLink: () => {} });
    act(() => view.update(snapshot));
    expect(screen.getByText(/The Model is empty\./)).not.toBeNull();
    const imported = screen.getByRole("button", { name: "Import from Code" });
    const scratch = screen.getByRole("button", { name: "Start from Scratch" });
    expect(imported.getAttribute("aria-description")).toBe("Open the guided setup to describe the existing code as Proposals");
    expect(scratch.getAttribute("aria-description")).toBe("Open the guided setup to describe the project you want to build");
    // The tooltip shows when the button takes the keyboard focus.
    act(() => imported.focus());
    expect(screen.getAllByText("Open the guided setup to describe the existing code as Proposals").length).toBeGreaterThan(0);
    fireEvent.click(imported);
    fireEvent.click(scratch);
    expect(posted).toEqual([{ type: "openGuidedSetup", choice: "import" }, { type: "openGuidedSetup", choice: "scratch" }]);
    fireEvent.click(screen.getByRole("button", { name: "Open the Board" }));
    expect(navigated).toEqual(["board"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the Diagram toolbar has no Scan button, whatever the count of Tasks finished since the last scan", () => {
  const dir = mkdtempSync(join(tmpdir(), "trama-diagram-noscan-"));
  try {
    mkdirSync(join(dir, ".trama", "model"), { recursive: true });
    writeFileSync(join(dir, ".trama", "model", "system.md"), "# App\n\nAn app.\n");
    const snapshot = { ...buildSnapshot(projectAt(dir)), tasksSinceScan: 3 };
    const posted: ToHost[] = [];
    const page = render(<></>);
    const view = mountDiagram((node) => page.rerender(<>{node}</>), { post: (message) => posted.push(message), navigate: () => {}, openLink: () => {} });
    act(() => view.update(snapshot));
    expect(screen.getByRole("button", { name: "Fit to view" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /^Scan/ })).toBeNull();
    expect(screen.queryByText(/Scan/)).toBeNull();
    expect(posted).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
