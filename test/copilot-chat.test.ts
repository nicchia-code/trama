import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { helpFor, runCopilotHook } from "../src/cli/main";
import { parseCopilotHook, type CopilotHook } from "../src/core/copilot-chat";
import { createQuestionServer } from "../src/core/question-channel";
import { QUESTION_TOOL_REFUSAL } from "../src/core/questions";
import { projectAt } from "../src/core/store";

let root: string;
let project: string;
let runtimeDir: string;
beforeEach(() => {
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-copilot-") : "/tmp/trama-copilot-");
  project = join(root, "project");
  runtimeDir = join(root, "rt");
  mkdirSync(join(project, ".trama", "model"), { recursive: true });
  writeFileSync(join(project, ".trama", "model", "system.md"), "# S\n");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const input = (hook_event_name: string, prompt?: string, cwd = project) => ({ hook_event_name, session_id: "session-1", cwd, ...(prompt === undefined ? {} : { prompt }) });

test("Copilot hooks identify only Trama prompts and keep later prompts in the same project conversation", () => {
  expect(parseCopilotHook(input("UserPromptSubmit", "Use the trama-design skill"))).toEqual({ hook: "UserPromptSubmit", conversation: "session-1", root: project, tramaPrompt: true });
  expect(parseCopilotHook(input("UserPromptSubmit", "/trama-scan"))?.tramaPrompt).toBe(true);
  expect(parseCopilotHook(input("UserPromptSubmit", "please use the trama-design skill"))?.tramaPrompt).toBe(true);
  expect(parseCopilotHook(input("UserPromptSubmit", "Use the trama-req-ui skill"))?.tramaPrompt).toBe(false);
  expect(parseCopilotHook(input("UserPromptSubmit", "Use the trama-designer skill"))?.tramaPrompt).toBe(false);
  expect(parseCopilotHook(input("Stop"))).toEqual({ hook: "Stop", conversation: "session-1", root: project });
  expect(parseCopilotHook(input("Stop", undefined, join(root, "missing")))).toBeNull();
  expect(parseCopilotHook({ ...input("UserPromptSubmit"), session_id: undefined })).toBeNull();
  expect(helpFor(["copilot-hook", "--help"])).toContain("Usage: trama copilot-hook");
});

test("trama copilot-hook forwards project hooks without leaking prompts and always answers with an object", async () => {
  const received: CopilotHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onCopilotHook: (hook) => { received.push(hook); } });
  try {
    expect(await runCopilotHook(JSON.stringify(input("UserPromptSubmit", "Use the trama-design skill. private text")), { runtimeDir })).toBe("{}");
    expect(await runCopilotHook(JSON.stringify(input("Stop")), { runtimeDir })).toBe("{}");
    expect(await runCopilotHook("\uFEFF" + JSON.stringify(input("Stop")), { runtimeDir })).toBe("{}");
    expect(received).toEqual([
      { hook: "UserPromptSubmit", conversation: "session-1", root: project, tramaPrompt: true },
      { hook: "Stop", conversation: "session-1", root: project },
      { hook: "Stop", conversation: "session-1", root: project },
    ]);
    expect(JSON.stringify(received)).not.toContain("private text");
  } finally {
    await server.dispose();
  }
  expect(await runCopilotHook("not json", { runtimeDir })).toBe("{}");
});

const questionTool = (conversation = "session-1", toolName = "vscode_askQuestions") => ({ hook_event_name: "PreToolUse", session_id: conversation, cwd: project, tool_name: toolName });

test("Copilot's question tool is read only for that tool", () => {
  expect(parseCopilotHook(questionTool())).toEqual({ hook: "PreToolUse", conversation: "session-1", root: project });
  expect(parseCopilotHook(questionTool("session-1", "run_in_terminal"))).toBeNull();
});

test("trama copilot-hook refuses Copilot's question tool only in a conversation an editor knows as Trama's", async () => {
  const asked: CopilotHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onCopilotHook: (h) => { asked.push(h); return h.conversation === "t"; } });
  try {
    expect(JSON.parse(await runCopilotHook(JSON.stringify(questionTool("t")), { runtimeDir }))).toEqual({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: QUESTION_TOOL_REFUSAL } });
    expect(await runCopilotHook(JSON.stringify(questionTool("other")), { runtimeDir })).toBe("{}");
  } finally {
    await server.dispose();
  }
  expect(asked).toEqual([
    { hook: "PreToolUse", conversation: "t", root: project },
    { hook: "PreToolUse", conversation: "other", root: project },
  ]);
});

test("the question tool's check asks every live window and refuses when a window that is not the first says the conversation is Trama's", async () => {
  const asked: string[] = [];
  const focused = await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "focused", focusedAt: 2000, handler: async () => ({ status: "unavailable" }) as never, onCopilotHook: (h) => { asked.push(`focused ${h.conversation}`); return false; } });
  const other = await createQuestionServer({ project: projectAt(project), runtimeDir, windowId: "other", focusedAt: 1000, handler: async () => ({ status: "unavailable" }) as never, onCopilotHook: (h) => { asked.push(`other ${h.conversation}`); return h.conversation === "t"; } });
  try {
    expect(JSON.parse(await runCopilotHook(JSON.stringify(questionTool("t")), { runtimeDir }))).toEqual({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: QUESTION_TOOL_REFUSAL } });
    expect(await runCopilotHook(JSON.stringify(questionTool("other")), { runtimeDir })).toBe("{}");
  } finally {
    await focused.dispose();
    await other.dispose();
  }
  expect(asked.sort()).toEqual(["focused other", "focused t", "other other", "other t"]);
});
