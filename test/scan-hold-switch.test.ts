import { describe, expect, test } from "bun:test";
import { noticeForScanHold, UNREADABLE_SCAN_HOLD } from "../src/core/scan-hold";
import { createScanHoldSwitch } from "../extension/src/webview/scan-hold-switch";

class SwitchNode {
  type = "";
  className = "";
  title = "";
  textContent = "";
  readonly attrs = new Map<string, string>();
  readonly children: SwitchNode[] = [];
  private readonly listeners = new Map<string, Array<() => void>>();

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  append(...nodes: SwitchNode[]): void {
    this.children.push(...nodes);
  }

  addEventListener(type: string, fn: () => void): void {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  click(): void {
    for (const fn of this.listeners.get("click") ?? []) fn();
  }
}

describe("the Hold scan switch control", () => {
  test("a click shows the other state at once and asks for it; a refused change brings the picture back, and the label counts the held Proposals", () => {
    const previous = (globalThis as { document?: { createElement(tag: string): SwitchNode } }).document;
    (globalThis as { document: { createElement(tag: string): SwitchNode } }).document = { createElement: () => new SwitchNode() };
    try {
      const asked: boolean[] = [];
      const control = createScanHoldSwitch((on) => asked.push(on));
      const button = control.element as unknown as SwitchNode;
      expect(button.attrs.get("role")).toBe("switch");
      expect(button.title).toBe("When on, approvals wait and one scan runs when you turn it off.");
      expect(button.children[1]?.attrs.get("aria-hidden")).toBe("true");
      expect([button.children[0]?.textContent, button.attrs.get("aria-label"), button.attrs.get("aria-checked")]).toEqual(["Hold scan", "Hold scan", "false"]);
      button.click();
      expect(asked).toEqual([true]);
      expect([button.children[0]?.textContent, button.attrs.get("aria-label"), button.attrs.get("aria-checked")]).toEqual(["Hold scan", "Hold scan", "true"]);
      control.set(false, 0);
      expect(button.attrs.get("aria-checked")).toBe("false");
      control.set(true, 2);
      expect([button.children[0]?.textContent, button.attrs.get("aria-label"), button.attrs.get("aria-checked")]).toEqual(["Hold scan · 2", "Hold scan, 2 held", "true"]);
      button.click();
      expect(asked).toEqual([true, false]);
      expect(button.attrs.get("aria-checked")).toBe("false");
      control.set(true, 0);
      expect(button.children[0]?.textContent).toBe("Hold scan");
    } finally {
      (globalThis as { document?: { createElement(tag: string): SwitchNode } }).document = previous;
    }
  });
});

test("an unreadable Hold scan file warns once per content until the panel opens again", () => {
  const first = noticeForScanHold({ kind: "unreadable", content: "maybe" }, null);
  expect(first.warning).toBe(UNREADABLE_SCAN_HOLD);
  expect(noticeForScanHold({ kind: "unreadable", content: "maybe" }, first.warned)).toEqual({ warning: null, warned: first.warned });
  expect(noticeForScanHold({ kind: "unreadable", content: "perhaps" }, first.warned).warning).toBe(UNREADABLE_SCAN_HOLD);
  expect(noticeForScanHold({ kind: "on" }, first.warned)).toEqual({ warning: null, warned: null });
});
