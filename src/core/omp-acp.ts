// The pure decisions of the ACP client of omp Chat (`extension/src/host/omp-chat/client.ts`): what answers a permission request, why a start failed, which
// models a session offers and how an attachment goes into a prompt.
import { basename } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { pathToFileURL } from "node:url";
import { exitReason, RESUME_TIMEOUT_MS } from "./omp-chat-conversation";

/** How much of omp's error output the host keeps: the last lines, and at most this many bytes of them. */
export const STDERR_MAX_LINES = 40;
export const STDERR_MAX_BYTES = 4096;

/** The last lines omp wrote on its error output: at most 40 lines and 4 KB, kept in memory, so the reason of an end or a failed start can show them. */
export class StderrTail {
  private readonly decoder = new StringDecoder("utf8");
  private text = "";

  /** Adds what omp just wrote. */
  push(chunk: Uint8Array | string): void {
    this.text += typeof chunk === "string" ? chunk : this.decoder.write(Buffer.from(chunk));
    // Much more than the tail can ever need is never kept: a process that writes without end does not grow the memory.
    if (this.text.length > STDERR_MAX_BYTES * 4) this.text = this.text.slice(-STDERR_MAX_BYTES * 4);
  }

  /** The kept lines, joined by newlines, the oldest ones cut first; empty when omp wrote nothing. */
  lines(): string {
    let lines = this.text.replace(/\r\n?/g, "\n").split("\n");
    while (lines.length > 0 && (lines.at(-1) ?? "").trim() === "") lines.pop();
    lines = lines.slice(-STDERR_MAX_LINES);
    while (lines.length > 1 && Buffer.byteLength(lines.join("\n")) > STDERR_MAX_BYTES) lines.shift();
    let kept = lines.join("\n");
    // A single line longer than the limit keeps its end.
    while (Buffer.byteLength(kept) > STDERR_MAX_BYTES) kept = kept.slice(Math.max(1, Math.floor(kept.length / 8)));
    return kept;
  }
}

/** An option of `session/request_permission`. */
export interface PermissionOption {
  optionId: string;
  kind: string;
}

/** The answer to a permission request: never a refusal. The first `allow_always` option, else the first `allow_once`; with neither, the request is left cancelled. */
export function permissionOutcome(options: readonly PermissionOption[]): { outcome: "selected"; optionId: string } | { outcome: "cancelled" } {
  const option = options.find((item) => item.kind === "allow_always") ?? options.find((item) => item.kind === "allow_once");
  return option === undefined ? { outcome: "cancelled" } : { outcome: "selected", optionId: option.optionId };
}

/** What went wrong before the first message was delivered. */
export type StartProblem =
  | { kind: "spawn"; code?: string; message: string }
  | { kind: "exit"; code: number | null; signal: string | null }
  | { kind: "timeout" }
  | { kind: "refused"; message: string };

/** The reason of a failed start, as the Board notice and the terminal fallback say it. `ompPath` is `trama.ompPath`; empty means `omp` from the editor's PATH. */
export function startFailureReason(problem: StartProblem, ompPath: string): string {
  switch (problem.kind) {
    case "spawn":
      return problem.code === "ENOENT" ? `omp not found at ${ompPath === "" ? "the editor PATH" : ompPath}` : problem.message;
    case "exit":
      return problem.code !== null ? `omp exited with code ${problem.code}` : (exitReason(problem.code, problem.signal) ?? "omp exited");
    case "timeout":
      return `omp did not answer within ${RESUME_TIMEOUT_MS / 1000} s`;
    case "refused":
      return problem.message;
  }
}

/** A model the session offers. */
export interface ModelChoices {
  /** The id of the session option that holds the model (what `session/set_config_option` takes). */
  configId: string;
  available: { id: string; name: string }[];
  current?: string;
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

/** The models a session declares in its configuration options (the select of category `model`), groups flattened; undefined when it declares none. */
export function modelChoices(configOptions: unknown): ModelChoices | undefined {
  if (!Array.isArray(configOptions)) return undefined;
  for (const raw of configOptions) {
    const option = record(raw);
    if (option === undefined || option["category"] !== "model" || typeof option["id"] !== "string" || !Array.isArray(option["options"])) continue;
    const available: { id: string; name: string }[] = [];
    const add = (item: unknown): void => {
      const entry = record(item);
      if (entry === undefined) return;
      if (Array.isArray(entry["options"])) return void entry["options"].forEach(add);
      if (typeof entry["value"] === "string") available.push({ id: entry["value"], name: typeof entry["name"] === "string" ? entry["name"] : entry["value"] });
    };
    option["options"].forEach(add);
    return { configId: option["id"], available, ...(typeof option["currentValue"] === "string" ? { current: option["currentValue"] } : {}) };
  }
  return undefined;
}

/** The content blocks of a prompt: the text and, when the instruction carries a file, a `resource_link` on it (before the text, where the terminal puts `@<file>`). */
export function promptBlocks(text: string, attachment?: string): ({ type: "text"; text: string } | { type: "resource_link"; name: string; uri: string })[] {
  return [...(attachment === undefined ? [] : [{ type: "resource_link" as const, name: basename(attachment), uri: pathToFileURL(attachment).href }]), { type: "text", text }];
}

/** What omp answers to `_session/steering`: `injected` (the message is in the running turn), `promptRequired` (no turn takes it: it goes as a prompt), or why it failed. */
export type SteeringAnswer = "injected" | "promptRequired" | { failed: string };

/** Reads omp's answer to `_session/steering`; an answer that is neither outcome is a failure, not a guess. */
export function steeringAnswer(answer: unknown): SteeringAnswer {
  const outcome = record(answer)?.["outcome"];
  if (outcome === "injected" || outcome === "promptRequired") return outcome;
  return { failed: "omp did not take the message" };
}

/**
 * What omp 18.12.6 declares and the client relies on, with no fallback for an older omp: steering (`_meta.steering.supported`), `session/close`
 * (`agentCapabilities.sessionCapabilities.close`) and, to reopen a saved session, `session/load` (`agentCapabilities.loadSession`). The reason of the first one
 * `initialize` does not declare, or undefined when it declares everything: the start fails with it.
 */
export function missingDeclaration(initialized: unknown, reopening: boolean): string | undefined {
  const capabilities = record(record(initialized)?.["agentCapabilities"]);
  if (record(record(record(initialized)?.["_meta"])?.["steering"])?.["supported"] !== true) return "omp does not declare steering (_session/steering)";
  if (record(capabilities?.["sessionCapabilities"])?.["close"] === undefined) return "omp does not declare session/close";
  if (reopening && capabilities?.["loadSession"] !== true) return "omp does not declare session/load";
  return undefined;
}
