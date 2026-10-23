// The pure decisions of the ACP client of omp Chat (`extension/src/host/omp-chat/client.ts`): what answers a permission request, why a start failed, which
// models a session offers and how an attachment goes into a prompt.
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import { exitReason, RESUME_TIMEOUT_MS } from "./omp-chat-conversation";

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

/** Whether `initialize`'s answer declares steering (`_meta.steering.supported`). */
export const steeringSupported = (initialized: unknown): boolean => record(record(record(initialized)?.["_meta"])?.["steering"])?.["supported"] === true;

/** How omp reopens a saved session: `session/load` when it declares `loadSession`, else `session/resume` when it declares it; undefined when it declares neither. */
export function reopenMethod(initialized: unknown): "load" | "resume" | undefined {
  const capabilities = record(record(initialized)?.["agentCapabilities"]);
  if (capabilities?.["loadSession"] === true) return "load";
  return record(capabilities?.["sessionCapabilities"])?.["resume"] !== undefined ? "resume" : undefined;
}
