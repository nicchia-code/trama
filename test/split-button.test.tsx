import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Ban } from "lucide-react";
import { SplitButton, type SplitItem } from "../extension/src/webview/split-button";
import { TooltipProvider } from "../extension/src/webview/ui/tooltip";

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

afterEach(cleanup);

function split(items: SplitItem[], over: Partial<Parameters<typeof SplitButton>[0]> = {}) {
  const calls: string[] = [];
  render(
    <TooltipProvider>
      <SplitButton icon={Ban} label="Dismiss Drift" tooltip="Close this Drift without changes" arrowName="More ways to handle D1" items={items} onClick={() => calls.push("main")} {...over} />
    </TooltipProvider>,
  );
  return calls;
}

describe("SplitButton menu items", () => {
  test("an enabled item has no icon, no title and no tooltip, and its description is only its accessible description", async () => {
    const calls = split([{ label: "Rework with feedback…", description: "Have the agent resolve this Drift following your feedback", onSelect: () => calls.push("rework") }]);
    fireEvent.keyDown(screen.getByRole("button", { name: "More ways to handle D1" }), { key: "Enter" });
    const item = await screen.findByRole("menuitem", { name: "Rework with feedback…" });
    expect([item.getAttribute("aria-description"), item.hasAttribute("title"), item.querySelector("svg"), item.getAttribute("aria-disabled")]).toEqual(["Have the agent resolve this Drift following your feedback", false, null, null]);
    item.focus();
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(item);
    expect(calls).toEqual(["rework"]);
  });

  test("an enabled item without a description has no accessible description", async () => {
    split([{ label: "Unify Drifts", onSelect: () => {} }]);
    fireEvent.keyDown(screen.getByRole("button", { name: "More ways to handle D1" }), { key: "Enter" });
    const item = await screen.findByRole("menuitem", { name: "Unify Drifts" });
    expect([item.hasAttribute("aria-description"), item.hasAttribute("title")]).toEqual([false, false]);
  });

  test("a disabled item stays in the menu with its reasons under the label, one per line, as its accessible description; it sends nothing and keeps the menu open", async () => {
    const calls = split([{ label: "Unify Drifts", description: "Merge every open Drift into one Drift to resolve", disabled: true, reason: "Drifts are being resolved\nA run is in progress", onSelect: () => calls.push("unify") }]);
    fireEvent.keyDown(screen.getByRole("button", { name: "More ways to handle D1" }), { key: "Enter" });
    const item = await screen.findByRole("menuitem", { name: "Unify Drifts" });
    expect([item.getAttribute("aria-disabled"), item.getAttribute("aria-description"), item.hasAttribute("title")]).toEqual(["true", "Drifts are being resolved. A run is in progress", false]);
    expect(Array.from(item.querySelectorAll("span")).slice(1).map((line) => line.textContent)).toEqual(["Drifts are being resolved", "A run is in progress"]);
    item.focus();
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(item);
    expect(calls).toEqual([]);
    expect(screen.getByRole("menuitem", { name: "Unify Drifts" })).not.toBeNull();
  });

  test("the main button and the arrow keep their tooltips, and the arrow keeps its accessible name", async () => {
    split([{ label: "Rework with feedback…", onSelect: () => {} }]);
    const arrow = screen.getByRole("button", { name: "More ways to handle D1" });
    arrow.focus();
    await waitFor(() => expect(screen.getByRole("tooltip").textContent).toBe("More ways to handle D1"));
    expect(screen.getByRole("button", { name: "Dismiss Drift" }).getAttribute("aria-description")).toBe("Close this Drift without changes");
  });
});
