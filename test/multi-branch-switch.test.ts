import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { projectMultiBranch } from "../extension/src/host/multi-branch";
import {
  SWITCH_NEEDS_AGENT,
  SWITCH_SAVE_FAILED,
  UNREADABLE_SWITCH,
  multiBranchDir,
  multiBranchStatePath,
  noticeForSwitch,
  readMultiBranch,
  turnMultiBranch,
  writeMultiBranch,
} from "../src/core/multi-branch";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import { MULTI_BRANCH_LABEL, MULTI_BRANCH_TOOLTIP, createMultiBranchSwitch } from "../extension/src/webview/multi-branch-switch";

const roots: string[] = [];

function project() {
  const root = mkdtempSync(join(tmpdir(), "trama-switch-"));
  roots.push(root);
  mkdirSync(join(root, ".trama"));
  return projectAt(root);
}

afterEach(() => {
  for (const root of roots) {
    try {
      chmodSync(join(root, ".trama", "multi-branch"), 0o755);
    } catch {
      // The folder may not exist, or it was never made read-only.
    }
    rmSync(root, { recursive: true, force: true });
  }
  roots.length = 0;
});

describe("the multi-branch switch file", () => {
  test("a missing folder or file is off, with no warning", () => {
    const p = project();
    expect(readMultiBranch(p)).toEqual({ kind: "missing" });
    expect(noticeForSwitch(readMultiBranch(p), null)).toEqual({ warning: null, warned: null });
    mkdirSync(multiBranchDir(p));
    expect(readMultiBranch(p)).toEqual({ kind: "missing" });
    expect(projectMultiBranch(p)).toBe(false);
  });

  test("on and off allow at most one trailing line break", () => {
    const p = project();
    writeMultiBranch(p, "on");
    expect(readFileSync(multiBranchStatePath(p), "utf8")).toBe("on\n");
    expect(readMultiBranch(p).kind).toBe("on");
    expect(readFileSync(join(multiBranchDir(p), ".gitignore"), "utf8")).toBe("*\n");
    writeFileSync(multiBranchStatePath(p), "on");
    expect(readMultiBranch(p).kind).toBe("on");
    writeFileSync(multiBranchStatePath(p), "off\r\n");
    expect(readMultiBranch(p).kind).toBe("off");
    expect(projectMultiBranch(p)).toBe(false);
    writeFileSync(multiBranchStatePath(p), "on\n");
    expect(projectMultiBranch(p)).toBe(true);
  });

  test("any other text is off and warns once per content until the panel opens again", () => {
    const p = project();
    mkdirSync(multiBranchDir(p));
    writeFileSync(multiBranchStatePath(p), "on\n\n");
    const first = readMultiBranch(p);
    expect(first.kind).toBe("unreadable");
    const opened = noticeForSwitch(first, null);
    expect(opened.warning).toBe(UNREADABLE_SWITCH);
    expect(noticeForSwitch(first, opened.warned)).toEqual({ warning: null, warned: opened.warned });
    writeFileSync(multiBranchStatePath(p), "maybe");
    const changed = noticeForSwitch(readMultiBranch(p), opened.warned);
    expect(changed.warning).toBe(UNREADABLE_SWITCH);
    expect(changed.warned).not.toBe(opened.warned);
    expect(noticeForSwitch(readMultiBranch(p), null).warning).toBe(UNREADABLE_SWITCH);
    writeFileSync(multiBranchStatePath(p), "on\n");
    expect(noticeForSwitch(readMultiBranch(p), changed.warned)).toEqual({ warning: null, warned: null });
    writeFileSync(multiBranchStatePath(p), "maybe");
    expect(noticeForSwitch(readMultiBranch(p), null).warning).toBe(UNREADABLE_SWITCH);
    for (const text of ["ON", "on ", " off", "", "\n"]) {
      writeFileSync(multiBranchStatePath(p), text);
      expect(readMultiBranch(p).kind).toBe("unreadable");
    }
  });

  test("turning on writes on only when the worktree command has text, and creates the folder once", () => {
    const p = project();
    expect(turnMultiBranch(p, true, "   ")).toBe(SWITCH_NEEDS_AGENT);
    expect(readMultiBranch(p).kind).toBe("missing");
    expect(turnMultiBranch(p, true, "  echo {prompt}  ")).toBeNull();
    expect(readMultiBranch(p).kind).toBe("on");
    expect(readFileSync(join(multiBranchDir(p), ".gitignore"), "utf8")).toBe("*\n");
    writeFileSync(join(multiBranchDir(p), ".gitignore"), "*\n!keep\n");
    expect(turnMultiBranch(p, false, "")).toBeNull();
    expect(readMultiBranch(p).kind).toBe("off");
    expect(readFileSync(join(multiBranchDir(p), ".gitignore"), "utf8")).toBe("*\n!keep\n");
    expect(turnMultiBranch(p, true, "echo")).toBeNull();
    expect(readFileSync(join(multiBranchDir(p), ".gitignore"), "utf8")).toBe("*\n!keep\n");
  });

  test("a failed write leaves the switch as it was", () => {
    const p = project();
    writeFileSync(join(p.dir, "multi-branch"), "not-a-folder");
    expect(turnMultiBranch(p, false, "echo")).toBe(SWITCH_SAVE_FAILED);
    expect(readFileSync(join(p.dir, "multi-branch"), "utf8")).toBe("not-a-folder");
    expect(readMultiBranch(p).kind).toBe("missing");

    rmSync(join(p.dir, "multi-branch"));
    writeMultiBranch(p, "on");
    chmodSync(multiBranchDir(p), 0o555);
    expect(turnMultiBranch(p, false, "echo")).toBe(SWITCH_SAVE_FAILED);
    expect(readMultiBranch(p).kind).toBe("on");
  });

  test("a settings key is not read and is not removed", () => {
    const p = project();
    const settingsDir = join(p.root, ".vscode");
    mkdirSync(settingsDir);
    const settings = join(settingsDir, "settings.json");
    const text = '{\n  "trama.multiBranch": true\n}\n';
    writeFileSync(settings, text);
    expect(readMultiBranch(p).kind).toBe("missing");
    expect(projectMultiBranch(p)).toBe(false);
    expect(turnMultiBranch(p, true, "echo")).toBeNull();
    expect(readFileSync(settings, "utf8")).toBe(text);
    expect(projectMultiBranch(p)).toBe(true);
  });

  test("the extension does not declare trama.multiBranch", () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8")) as {
      contributes: { configuration: { properties: Record<string, unknown> } };
    };
    const properties = pkg.contributes.configuration.properties;
    expect(properties["trama.multiBranch"]).toBeUndefined();
    const agent = properties["trama.worktreeAgent"] as { markdownDescription?: string; scope?: string };
    expect(agent.scope).toBe("application");
    expect(agent.markdownDescription).toContain("only in your user settings");
    expect(agent.markdownDescription).toContain("Empty prevents turning the multi-branch switch on");
    expect(agent.markdownDescription).toContain("blocks accepting a Proposal while the switch is on");
  });

  test("the picture of the panel carries the switch, on only when the file reads as on", () => {
    const p = project();
    expect(buildSnapshot(p).multiBranch).toBe(false);
    writeMultiBranch(p, "on");
    expect(buildSnapshot(p).multiBranch).toBe(true);
    writeMultiBranch(p, "off");
    expect(buildSnapshot(p).multiBranch).toBe(false);
    writeFileSync(multiBranchStatePath(p), "nope");
    expect(buildSnapshot(p).multiBranch).toBe(false);
  });
});

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

describe("the Multi-branch switch control", () => {
  test("a click asks for the other state at once, and the shown state waits for the picture", () => {
    const previous = (globalThis as { document?: { createElement(tag: string): SwitchNode } }).document;
    (globalThis as { document: { createElement(tag: string): SwitchNode } }).document = {
      createElement: () => new SwitchNode(),
    };
    try {
      const asked: boolean[] = [];
      const control = createMultiBranchSwitch((on) => asked.push(on));
      const button = control.element as unknown as SwitchNode;
      expect(button.attrs.get("role")).toBe("switch");
      expect(button.attrs.get("aria-checked")).toBe("false");
      expect(button.title).toBe(MULTI_BRANCH_TOOLTIP);
      expect(button.children[0]?.textContent).toBe(MULTI_BRANCH_LABEL);
      expect(button.children[1]?.attrs.get("aria-hidden")).toBe("true");
      button.click();
      expect(asked).toEqual([true]);
      expect(button.attrs.get("aria-checked")).toBe("false");
      control.setOn(true);
      expect(button.attrs.get("aria-checked")).toBe("true");
      button.click();
      expect(asked).toEqual([true, false]);
    } finally {
      (globalThis as { document?: { createElement(tag: string): SwitchNode } }).document = previous;
    }
  });
});
