import type { PlanEntry, SessionNotification, ToolCallContent, ToolCallLocation, ToolKind } from "@agentclientprotocol/sdk";
import type { FirstMessage, FormAnswerMessage, FormView, PermissionView } from "../../omp-chat-protocol";

// What the conversation shows, built from the notifications of ACP as they arrive (`ui#omp-chat-conversation`). Everything here is pure: the components draw
// the blocks, and the tests feed notifications to `applyUpdate`.

export interface FilePlace {
  path: string;
  line?: number;
}

export type Block =
  | { kind: "user"; id: number; text: string; messageId?: string; label?: "Trama"; attachment?: { name: string; text: string } }
  /** `done` once something else followed it or the turn ended: only then is it announced. */
  | { kind: "agent"; id: number; messageId?: string; text: string; done: boolean }
  | { kind: "thought"; id: number; text: string; startedAt: number; endedAt?: number }
  | { kind: "tool"; id: number; toolCallId: string; title: string; name?: string; toolKind: ToolKind; status: "pending" | "in_progress" | "completed" | "failed"; output?: string; places: FilePlace[] }
  | { kind: "error"; id: number; message: string }
  | { kind: "notice"; id: number; text: string }
  | { kind: "form"; id: number; form: FormView; answer?: FormAnswerMessage }
  /** A permission request: the tool call as a compact row and omp's options in omp's order; `answer` is the chosen option id, `cancelled` after Stop or closing. */
  | { kind: "permission"; id: number; requestId: string; title: string; toolKind: ToolKind; name?: string; options: PermissionView["options"]; answer?: string; cancelled?: boolean };

export interface Transcript {
  blocks: Block[];
  /** The agent's todo plan; none when it has none. */
  plan: PlanEntry[] | undefined;
  next: number;
  /** The messages the developer sent from the view, which omp may echo back as `user_message_chunk`: dropped when they do. */
  echoes: string[];
  /** How much of the first echo has arrived. */
  echoed: string;
}

export const emptyTranscript = (): Transcript => ({ blocks: [], plan: undefined, next: 1, echoes: [], echoed: "" });

/** Longest output of a tool the conversation shows before it cuts it. */
export const MAX_OUTPUT_LINES = 200;
const MAX_OUTPUT_CHARS = 200_000;

/** The lines of an output to show and how many were cut. */
export function cutLines(output: string, max = MAX_OUTPUT_LINES): { shown: string; more: number } {
  const lines = output.split("\n");
  if (lines.length <= max) return { shown: output, more: 0 };
  return { shown: lines.slice(0, max).join("\n"), more: lines.length - max };
}

function push(t: Transcript, make: (id: number) => Block, now: number): Transcript {
  const blocks = closeOpen(t.blocks, now);
  return { ...t, blocks: [...blocks, make(t.next)], next: t.next + 1 };
}

/** What the last block was doing ends: a thought stops its clock and an agent message is complete. */
function closeOpen(blocks: Block[], now: number): Block[] {
  const last = blocks[blocks.length - 1];
  if (last === undefined) return blocks;
  if (last.kind === "thought" && last.endedAt === undefined) return [...blocks.slice(0, -1), { ...last, endedAt: now }];
  if (last.kind === "agent" && !last.done) return [...blocks.slice(0, -1), { ...last, done: true }];
  return blocks;
}

/** The agent's turn ended: nothing is open any more. */
export function settle(t: Transcript, now: number): Transcript {
  const blocks = closeOpen(t.blocks, now);
  return blocks === t.blocks ? t : { ...t, blocks };
}

/** A conversation's start: the line before it (a resumed one) and Trama's instruction as the first message, labelled `Trama`. */
export function start(t: Transcript, first: FirstMessage | undefined, notice: string | undefined, now: number): Transcript {
  let next = t;
  if (notice !== undefined) next = push(next, (id) => ({ kind: "notice", id, text: notice }), now);
  if (first !== undefined) {
    const attachment = first.attachment;
    next = push(next, (id) => ({ kind: "user", id, text: first.text, label: "Trama", ...(attachment === undefined ? {} : { attachment }) }), now);
    next = { ...next, echoes: [...next.echoes, first.text] };
  }
  return next;
}

/** A message the developer sent from the view. */
export function addUserMessage(t: Transcript, text: string, now: number): Transcript {
  const next = push(t, (id) => ({ kind: "user", id, text }), now);
  return { ...next, echoes: [...next.echoes, text] };
}

export function addError(t: Transcript, message: string, now: number): Transcript {
  return push(t, (id) => ({ kind: "error", id, message }), now);
}

export function addForm(t: Transcript, form: FormView, now: number): Transcript {
  return push(t, (id) => ({ kind: "form", id, form }), now);
}

/** The developer answered the form (or skipped it): it stays, read-only, with what was given. */
export function answerForm(t: Transcript, requestId: string, answer: FormAnswerMessage): Transcript {
  return { ...t, blocks: t.blocks.map((block) => (block.kind === "form" && block.form.requestId === requestId ? { ...block, answer } : block)) };
}

/** A permission request of omp: the tool call it concerns shows with the title omp gives it (or the one of the call already in the conversation). */
export function addPermission(t: Transcript, request: PermissionView, now: number): Transcript {
  const known = t.blocks.find((block): block is Extract<Block, { kind: "tool" }> => block.kind === "tool" && block.toolCallId === request.toolCall.toolCallId);
  const title = request.toolCall.title ?? known?.title ?? "Tool call";
  const toolKind: ToolKind = request.toolCall.kind ?? known?.toolKind ?? "other";
  return push(t, (id) => ({ kind: "permission", id, requestId: request.requestId, title, toolKind, ...(known?.name === undefined ? {} : { name: known.name }), options: request.options }), now);
}

/** The developer chose an option: the request stays, read-only, with it. */
export function answerPermission(t: Transcript, requestId: string, optionId: string): Transcript {
  return { ...t, blocks: t.blocks.map((block) => (block.kind === "permission" && block.requestId === requestId && block.answer === undefined && !block.cancelled ? { ...block, answer: optionId } : block)) };
}

/** Stop or the closing answered the request `cancelled`. */
export function cancelPermission(t: Transcript, requestId: string): Transcript {
  return { ...t, blocks: t.blocks.map((block) => (block.kind === "permission" && block.requestId === requestId && block.answer === undefined ? { ...block, cancelled: true } : block)) };
}

/** The text of the content blocks of a tool call, and nothing for a diff (the conversation shows no diff) or a terminal. */
function outputOf(content: readonly ToolCallContent[] | null | undefined, rawOutput: unknown): string | undefined {
  const texts: string[] = [];
  for (const item of content ?? []) if (item.type === "content" && item.content.type === "text") texts.push(item.content.text);
  if (texts.length > 0) return texts.join("\n").slice(0, MAX_OUTPUT_CHARS);
  if (typeof rawOutput === "string") return rawOutput.length > 0 ? rawOutput.slice(0, MAX_OUTPUT_CHARS) : undefined;
  if (rawOutput !== undefined && rawOutput !== null) {
    try {
      return JSON.stringify(rawOutput, null, 2)?.slice(0, MAX_OUTPUT_CHARS);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** The files a tool call touches: its locations and the paths of its diffs. */
function placesOf(locations: readonly ToolCallLocation[] | null | undefined, content: readonly ToolCallContent[] | null | undefined): FilePlace[] {
  const places: FilePlace[] = [];
  const add = (path: string, line?: number | null) => {
    if (path.length === 0 || places.some((place) => place.path === path)) return;
    places.push({ path, ...(typeof line === "number" ? { line } : {}) });
  };
  for (const location of locations ?? []) add(location.path, location.line);
  for (const item of content ?? []) if (item.type === "diff") add(item.path);
  return places;
}

const STATUSES = ["pending", "in_progress", "completed", "failed"] as const;
const isStatus = (value: unknown): value is (typeof STATUSES)[number] => STATUSES.includes(value as never);

/** Applies one `session/update` notification. Updates the conversation does not show (modes, commands, usage…) change nothing. */
export function applyUpdate(t: Transcript, notification: SessionNotification, now: number): Transcript {
  const update = notification.update;
  switch (update.sessionUpdate) {
    case "user_message_chunk": {
      const text = update.content.type === "text" ? update.content.text : "";
      if (text.length === 0) return t;
      const messageId = update.messageId ?? undefined;
      // An echo of what the view already shows is dropped, chunk by chunk.
      let base = t;
      const expected = t.echoes[0];
      if (expected !== undefined) {
        const seen = t.echoed + text;
        if (seen === expected) return { ...t, echoes: t.echoes.slice(1), echoed: "" };
        if (expected.startsWith(seen)) return { ...t, echoed: seen };
        base = { ...t, echoes: [], echoed: "" };
      }
      const last = base.blocks[base.blocks.length - 1];
      if (last?.kind === "user" && last.label === undefined && last.attachment === undefined && messageId !== undefined && messageId === last.messageId) {
        return { ...base, blocks: [...base.blocks.slice(0, -1), { ...last, text: last.text + text }] };
      }
      return push(base, (id) => ({ kind: "user", id, text, ...(messageId === undefined ? {} : { messageId }) }), now);
    }
    case "agent_message_chunk": {
      if (update.content.type !== "text") return t;
      const text = update.content.text;
      const last = t.blocks[t.blocks.length - 1];
      const messageId = update.messageId ?? undefined;
      if (last?.kind === "agent" && !last.done && (messageId === undefined || last.messageId === undefined || messageId === last.messageId)) {
        return { ...t, blocks: [...t.blocks.slice(0, -1), { ...last, text: last.text + text }] };
      }
      return push(t, (id) => ({ kind: "agent", id, text, done: false, ...(messageId === undefined ? {} : { messageId }) }), now);
    }
    case "agent_thought_chunk": {
      if (update.content.type !== "text") return t;
      const last = t.blocks[t.blocks.length - 1];
      if (last?.kind === "thought" && last.endedAt === undefined) return { ...t, blocks: [...t.blocks.slice(0, -1), { ...last, text: last.text + update.content.text }] };
      const text = update.content.text;
      return push(t, (id) => ({ kind: "thought", id, text, startedAt: now }), now);
    }
    case "tool_call": {
      const known = t.blocks.findIndex((block) => block.kind === "tool" && block.toolCallId === update.toolCallId);
      const block = (id: number): Block => {
        const output = outputOf(update.content, update.rawOutput);
        return {
          kind: "tool",
          id,
          toolCallId: update.toolCallId,
          title: update.title,
          toolKind: update.kind ?? "other",
          status: isStatus(update.status) ? update.status : "pending",
          places: placesOf(update.locations, update.content),
          ...(output === undefined ? {} : { output }),
          ...(typeof update.name === "string" && update.name !== "" ? { name: update.name } : {}),
        };
      };
      if (known === -1) return push(t, block, now);
      return { ...t, blocks: t.blocks.map((each, at) => (at === known ? block(each.id) : each)) };
    }
    case "tool_call_update": {
      const known = t.blocks.findIndex((block) => block.kind === "tool" && block.toolCallId === update.toolCallId);
      if (known === -1) {
        const output = outputOf(update.content, update.rawOutput);
        return push(
          t,
          (id) => ({
            kind: "tool",
            id,
            toolCallId: update.toolCallId,
            title: update.title ?? "Tool call",
            toolKind: update.kind ?? "other",
            status: isStatus(update.status) ? update.status : "in_progress",
            places: placesOf(update.locations, update.content),
            ...(output === undefined ? {} : { output }),
            ...(typeof update.name === "string" && update.name !== "" ? { name: update.name } : {}),
          }),
          now,
        );
      }
      return {
        ...t,
        blocks: t.blocks.map((block, at) => {
          if (at !== known || block.kind !== "tool") return block;
          const output = outputOf(update.content, update.rawOutput) ?? block.output;
          const places = placesOf(update.locations, update.content);
          return {
            ...block,
            ...(typeof update.title === "string" ? { title: update.title } : {}),
            ...(update.kind === undefined || update.kind === null ? {} : { toolKind: update.kind }),
            ...(isStatus(update.status) ? { status: update.status } : {}),
            ...(output === undefined ? {} : { output }),
            ...(typeof update.name === "string" && update.name !== "" ? { name: update.name } : {}),
            places: places.length > 0 ? places : block.places,
          };
        }),
      };
    }
    case "plan":
      return { ...t, plan: update.entries.length > 0 ? update.entries : undefined };
    case "plan_update":
      return update.plan.type === "items" ? { ...t, plan: update.plan.entries.length > 0 ? update.plan.entries : undefined } : t;
    case "plan_removed":
      return { ...t, plan: undefined };
    case "notice": {
      const text = update.description === undefined || update.description === null || update.description === "" ? update.title : `${update.title}: ${update.description}`;
      if (update.severity === "error") return addError(t, text, now);
      return push(t, (id) => ({ kind: "notice", id, text }), now);
    }
    default:
      return t;
  }
}

/** The agent message to announce: the last complete one, when `idle` (the turn ended) or when something followed it. */
export function announcement(t: Transcript, running: boolean): string {
  for (let at = t.blocks.length - 1; at >= 0; at--) {
    const block = t.blocks[at];
    if (block?.kind === "agent" && (block.done || !running || at < t.blocks.length - 1)) return block.text;
  }
  return "";
}

/** How many plan entries are done. */
export const planDone = (plan: readonly PlanEntry[]): number => plan.filter((entry) => entry.status === "completed").length;
