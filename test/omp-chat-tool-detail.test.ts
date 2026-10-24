import { describe, expect, test } from "bun:test";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { addPermission, applyUpdate, type Block, emptyTranscript, type Transcript } from "../extension/src/webview/omp-chat/transcript";
import { cellHeader, inputDetail, isMultiline, titleDetail } from "../extension/src/webview/omp-chat/tool-detail";

const tool = (t: Transcript, at = 0) => t.blocks[at] as Extract<Block, { kind: "tool" }>;
const call = (t: Transcript, update: Extract<SessionNotification["update"], { sessionUpdate: "tool_call" }>) => applyUpdate(t, { sessionId: "s", update }, 1);
const change = (t: Transcript, update: Extract<SessionNotification["update"], { sessionUpdate: "tool_call_update" }>) => applyUpdate(t, { sessionId: "s", update }, 2);

describe("a shell call shows its command whole", () => {
  test("bash, shell and exec take the command of their arguments, with no `$ `", () => {
    for (const name of ["bash", "shell", "exec"]) {
      expect(inputDetail(name, "execute", { command: "ls -la" })).toEqual({ kind: "text", text: "ls -la" });
    }
  });

  test("a command is kept exactly as written, past the 4000 characters omp keeps in the title", () => {
    const command = `echo ${"a".repeat(4500)}\n  indented \t line\n`;
    expect(inputDetail("bash", "execute", { command, timeout: 3 })).toEqual({ kind: "text", text: command });
  });

  test("arguments without a command, of another shape or absent give nothing: the row then shows the title", () => {
    expect(inputDetail("bash", "execute", undefined)).toBeUndefined();
    expect(inputDetail("bash", "execute", null)).toBeUndefined();
    expect(inputDetail("bash", "execute", "ls")).toBeUndefined();
    expect(inputDetail("bash", "execute", ["ls"])).toBeUndefined();
    expect(inputDetail("bash", "execute", {})).toBeUndefined();
    expect(inputDetail("bash", "execute", { command: "" })).toBeUndefined();
    expect(inputDetail("bash", "execute", { command: 3 })).toBeUndefined();
    expect(inputDetail("bash", "execute", { cmd: "ls" })).toBeUndefined();
  });

  test("a tool that is not a shell never shows a command, whatever its arguments", () => {
    expect(inputDetail("grep", "search", { command: "ls", pattern: "x" })).toBeUndefined();
    expect(inputDetail("read", "read", { path: "a.ts" })).toBeUndefined();
    expect(inputDetail("task", "other", { command: "ls" })).toBeUndefined();
  });
});

describe("an eval call shows its cells in order", () => {
  test("a cell keeps its language, its title when it has one, and its code", () => {
    const detail = inputDetail("eval", "execute", {
      cells: [
        { language: "py", title: "Load settings", code: "import json" },
        { language: "js", code: "console.log(1)" },
      ],
    });
    expect(detail).toEqual({
      kind: "cells",
      cells: [
        { language: "py", title: "Load settings", code: "import json" },
        { language: "js", code: "console.log(1)" },
      ],
    });
  });

  test("the header is the language in square brackets and the title: `[py] Load settings`, or `[py]` without a title", () => {
    expect(cellHeader({ language: "py", title: "Load settings", code: "x" })).toBe("[py] Load settings");
    expect(cellHeader({ language: "py", code: "x" })).toBe("[py]");
  });

  test("a cell without a language shows `?` as omp's title does; a cell without code or that is not an object is left out", () => {
    expect(inputDetail("eval", "execute", { cells: [{ code: "1 + 1" }, { language: "py", code: "" }, "text", null, { language: "js", code: "2" }] })).toEqual({
      kind: "cells",
      cells: [
        { language: "?", code: "1 + 1" },
        { language: "js", code: "2" },
      ],
    });
  });

  test("a call that carries one cell as its arguments is that cell", () => {
    expect(inputDetail("eval", "execute", { language: "py", title: "One", code: "print(1)" })).toEqual({ kind: "cells", cells: [{ language: "py", title: "One", code: "print(1)" }] });
  });

  test("arguments without cells, or of another shape, give nothing", () => {
    expect(inputDetail("eval", "execute", undefined)).toBeUndefined();
    expect(inputDetail("eval", "execute", { cells: [] })).toBeUndefined();
    expect(inputDetail("eval", "execute", { cells: "print(1)" })).toBeUndefined();
    expect(inputDetail("eval", "execute", { cells: [{ language: "py" }] })).toBeUndefined();
    expect(inputDetail("eval", "execute", { command: "ls" })).toBeUndefined();
    expect(inputDetail("eval", "execute", 3)).toBeUndefined();
  });
});

describe("a call whose tool omp does not name is read by its type", () => {
  test("a call of type execute is a shell with a command and an eval with cells; any other type shows its title", () => {
    expect(inputDetail(undefined, "execute", { command: "ls" })).toEqual({ kind: "text", text: "ls" });
    expect(inputDetail(undefined, "execute", { cells: [{ language: "py", code: "1" }] })).toEqual({ kind: "cells", cells: [{ language: "py", code: "1" }] });
    expect(inputDetail(undefined, "search", { command: "ls" })).toBeUndefined();
    expect(inputDetail(undefined, "execute", { path: "a" })).toBeUndefined();
  });
});

test("what a call shows opened has more than one line when it has a line break or is made of cells", () => {
  expect(isMultiline(titleDetail("one line"))).toBe(false);
  expect(isMultiline(titleDetail("two\nlines"))).toBe(true);
  expect(isMultiline(titleDetail("two\r\nlines"))).toBe(true);
  expect(isMultiline({ kind: "cells", cells: [{ language: "py", code: "1" }] })).toBe(true);
});

describe("the block of a call keeps what its row shows opened", () => {
  test("a call without arguments keeps its whole title, and the title that follows it", () => {
    let t = call(emptyTranscript(), { sessionUpdate: "tool_call", toolCallId: "t", title: "Read a.ts", kind: "read", status: "pending" });
    expect(tool(t).detail).toEqual({ kind: "text", text: "Read a.ts" });
    t = change(t, { sessionUpdate: "tool_call_update", toolCallId: "t", title: "Read b.ts" });
    expect(tool(t).detail).toEqual({ kind: "text", text: "Read b.ts" });
  });

  test("a shell call keeps its command from the arguments of tool_call, and an update with no arguments keeps it", () => {
    let t = call(emptyTranscript(), { sessionUpdate: "tool_call", toolCallId: "t", title: "Run the tests", kind: "execute", status: "in_progress", name: "bash", rawInput: { command: "bun test" } });
    expect(tool(t).detail).toEqual({ kind: "text", text: "bun test" });
    t = change(t, { sessionUpdate: "tool_call_update", toolCallId: "t", title: "Run all the tests", status: "completed", rawOutput: "3 passed" });
    expect(tool(t).detail).toEqual({ kind: "text", text: "bun test" });
    expect(JSON.stringify(tool(t))).not.toContain("3 passed");
  });

  test("an update that carries arguments replaces it, and arguments of another shape bring the title back", () => {
    let t = call(emptyTranscript(), { sessionUpdate: "tool_call", toolCallId: "t", title: "Run", kind: "execute", status: "pending", name: "bash" });
    expect(tool(t).detail).toEqual({ kind: "text", text: "Run" });
    t = change(t, { sessionUpdate: "tool_call_update", toolCallId: "t", rawInput: { command: "make" } });
    expect(tool(t).detail).toEqual({ kind: "text", text: "make" });
    t = change(t, { sessionUpdate: "tool_call_update", toolCallId: "t", rawInput: { cmd: "make" } });
    expect(tool(t).detail).toEqual({ kind: "text", text: "Run" });
  });

  test("a call first seen in an update takes its detail from the arguments too", () => {
    const t = change(emptyTranscript(), { sessionUpdate: "tool_call_update", toolCallId: "u", name: "eval", rawInput: { cells: [{ language: "py", code: "1" }] } });
    expect(tool(t).detail).toEqual({ kind: "cells", cells: [{ language: "py", code: "1" }] });
  });

  test("a permission request takes the detail from the call omp attaches, or from the call already in the conversation", () => {
    const options = [{ optionId: "yes", name: "Allow", kind: "allow_once" as const }];
    const own = addPermission(emptyTranscript(), { requestId: "p", toolCall: { toolCallId: "t", title: "$ rm -rf x", kind: "execute", name: "bash", rawInput: { command: "rm -rf x\nrm -rf y" } }, options }, 1);
    expect((own.blocks[0] as Extract<Block, { kind: "permission" }>).detail).toEqual({ kind: "text", text: "rm -rf x\nrm -rf y" });
    const known = call(emptyTranscript(), { sessionUpdate: "tool_call", toolCallId: "t", title: "$ ls", kind: "execute", status: "pending", name: "bash", rawInput: { command: "ls -la" } });
    const without = addPermission(known, { requestId: "p", toolCall: { toolCallId: "t" }, options }, 2);
    expect((without.blocks[1] as Extract<Block, { kind: "permission" }>).detail).toEqual({ kind: "text", text: "ls -la" });
    const bare = addPermission(emptyTranscript(), { requestId: "p", toolCall: { toolCallId: "z", title: "Edit a.ts" }, options }, 1);
    expect((bare.blocks[0] as Extract<Block, { kind: "permission" }>).detail).toEqual({ kind: "text", text: "Edit a.ts" });
  });
});
