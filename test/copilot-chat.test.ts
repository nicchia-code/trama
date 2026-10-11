import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { helpFor, runCopilotHook } from "../src/cli/main";
import { parseCopilotHook, type CopilotHook } from "../src/core/copilot-chat";
import { createQuestionServer } from "../src/core/question-channel";
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
  expect(parseCopilotHook(input("UserPromptSubmit", "please use the trama-design skill"))?.tramaPrompt).toBe(false);
  expect(parseCopilotHook(input("Stop"))).toEqual({ hook: "Stop", conversation: "session-1", root: project });
  expect(parseCopilotHook(input("Stop", undefined, join(root, "missing")))).toBeNull();
  expect(parseCopilotHook({ ...input("UserPromptSubmit"), session_id: undefined })).toBeNull();
  expect(helpFor(["copilot-hook", "--help"])).toContain("Usage: trama copilot-hook");
});

test("trama copilot-hook forwards project hooks without leaking prompts and always answers with an object", async () => {
  const received: CopilotHook[] = [];
  const server = await createQuestionServer({ project: projectAt(project), runtimeDir, handler: async () => ({ status: "unavailable" }) as never, onCopilotHook: (hook) => received.push(hook) });
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
