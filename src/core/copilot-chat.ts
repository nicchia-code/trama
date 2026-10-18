import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { modelDir, projectAt } from "./store";

export interface CopilotHook {
  hook: "UserPromptSubmit" | "Stop" | "PreToolUse";
  conversation: string;
  root: string;
  tramaPrompt?: boolean;
}

const SKILL_PROMPT = /trama-(design|scan|implement|import|resolve-drifts|setup)(?![\p{L}\p{N}-])/u;
const text = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;

/** Reads a Copilot hook and its project, or null when it does not name a Trama project. */
export function parseCopilotHook(input: unknown): CopilotHook | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const hook = raw["hook_event_name"];
  const conversation = text(raw["session_id"]);
  const cwd = text(raw["cwd"]);
  if ((hook !== "UserPromptSubmit" && hook !== "Stop" && hook !== "PreToolUse") || !conversation || !cwd) return null;
  // Only Copilot's question tool is of interest: any other tool is passed on without looking for a project.
  if (hook === "PreToolUse" && raw["tool_name"] !== "vscode_askQuestions") return null;
  const root = resolve(cwd);
  if (!existsSync(join(modelDir(projectAt(root)), "system.md"))) return null;
  const event: CopilotHook = { hook, conversation, root };
  if (hook === "UserPromptSubmit") event.tramaPrompt = SKILL_PROMPT.test(text(raw["prompt"]) ?? "");
  return event;
}
