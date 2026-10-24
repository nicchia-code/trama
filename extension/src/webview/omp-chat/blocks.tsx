import { Bot, Check, ChevronDown, ChevronRight, Clock, FilePen, FileText, Loader, Paperclip, Search, SquareTerminal, Wrench, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Markdown } from "../markdown";
import { Button } from "../ui/button";
import type { Block } from "./transcript";
import { type ToolLogo, toolLabel } from "./tool-logo";

/** Seconds since `since`, ticking while `active`. */
function useElapsed(since: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return Math.max(0, Math.round((now - since) / 1000));
}

/** A line that opens and closes. */
function Disclosure({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-1.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        {summary}
      </button>
      {open ? children : null}
    </div>
  );
}

export function UserMessage({ block }: { block: Extract<Block, { kind: "user" }> }) {
  const attachment = block.attachment;
  return (
    <div className="flex flex-col items-end gap-1" data-message="user">
      <div className="max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-secondary-foreground">
        {block.label === undefined ? null : <p className="mb-1 text-xs font-medium text-muted-foreground">{block.label}</p>}
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{block.text}</p>
        {attachment === undefined ? null : (
          <Disclosure className="mt-2 text-xs" summary={
            <>
              <Paperclip className="size-3.5 shrink-0" />
              <span className="truncate">{attachment.name}</span>
            </>
          }>
            <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-background p-2 whitespace-pre-wrap">{attachment.text}</pre>
          </Disclosure>
        )}
      </div>
      {block.delivery === "queued" ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" />
          Queued
        </p>
      ) : null}
      {block.delivery === "failed" ? <p className="text-xs text-destructive">{`Not delivered: ${block.reason ?? "unknown reason"}.`}</p> : null}
    </div>
  );
}

export function AgentMessage({ block, openLink }: { block: Extract<Block, { kind: "agent" }>; openLink: (url: string) => void }) {
  return (
    <div data-message="agent">
      <Markdown source={block.text} openLink={openLink} />
    </div>
  );
}

export function Thought({ block, running }: { block: Extract<Block, { kind: "thought" }>; running: boolean }) {
  const active = block.endedAt === undefined && running;
  const seconds = useElapsed(block.startedAt, active);
  return (
    <Disclosure className="text-muted-foreground" summary={<span>{active ? `Thinking · ${seconds} s` : "Thinking"}</span>}>
      <p className="mt-1 pl-5 whitespace-pre-wrap [overflow-wrap:anywhere]">{block.text}</p>
    </Disclosure>
  );
}

const TOOL_ICONS = { read: FileText, search: Search, execute: SquareTerminal, edit: FilePen, delete: FilePen, move: FilePen, fetch: Search, think: Wrench, switch_mode: Wrench, other: Wrench } as const;

/** omp runs a sub-agent through its `task` tool. */
const SUBAGENT_TOOL = /^(task|subagent)$/i;

function ToolIcon({ block, logo }: { block: Pick<Extract<Block, { kind: "tool" }>, "name" | "toolKind">; logo?: ToolLogo }) {
  if (logo !== undefined) return <svg role="img" aria-label={logo.name} viewBox="0 0 24 24" fill="currentColor" className="size-3.5 shrink-0"><path d={logo.path} /></svg>;
  const Icon = block.name !== undefined && SUBAGENT_TOOL.test(block.name) ? Bot : TOOL_ICONS[block.toolKind];
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
}

function ToolStatus({ status }: { status: Extract<Block, { kind: "tool" }>["status"] }) {
  if (status === "completed") return <Check aria-label="Done" className="size-3.5 shrink-0" />;
  if (status === "failed") return <X aria-label="Failed" className="size-3.5 shrink-0 text-destructive" />;
  return <Loader aria-label="Running" className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />;
}

/** A call to a tool: one compact read-only row. A failed call shows the first line of omp's error under it, and an edit the files it touched as plain text. */
export function ToolCall({ block }: { block: Extract<Block, { kind: "tool" }> }) {
  const edits = block.toolKind === "edit" || block.toolKind === "delete" || block.toolKind === "move";
  const label = toolLabel(block.title, block.places[0]?.path);
  return (
    <div className="text-sm" data-tool={block.toolCallId}>
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <ToolIcon block={block} logo={label.logo} />
          <span className="truncate select-text">{label.title}</span>
        </div>
        <ToolStatus status={block.status} />
      </div>
      {edits ? block.places.map((place) => <p key={place.path} className="pl-5 font-mono text-xs break-all text-muted-foreground select-text">{place.path}</p>) : null}
      {block.status === "failed" && block.error !== undefined ? <p className="truncate pl-5 text-xs text-destructive select-text">{block.error}</p> : null}
    </div>
  );
}

/** A permission request of omp: a box with the colour of warnings, the tool call as its compact row and a button per option, in omp's order. After the choice it stays, read-only. */
export function Permission({ block, onChoose }: { block: Extract<Block, { kind: "permission" }>; onChoose: (optionId: string) => void }) {
  const chosen = block.options.find((option) => option.optionId === block.answer);
  const label = toolLabel(block.title, block.places[0]?.path);
  return (
    <section aria-label="omp asks permission" data-permission={block.requestId} className="flex flex-col gap-2 rounded-lg border-2 border-amber-500 p-3">
      <p className="font-medium">omp asks permission</p>
      <div className="flex items-center gap-1.5 text-sm">
        <ToolIcon block={block} logo={label.logo} />
        <span className="truncate">{label.title}</span>
      </div>
      {block.cancelled ? (
        <p className="text-muted-foreground">Cancelled</p>
      ) : chosen !== undefined ? (
        <p className="text-muted-foreground">{chosen.name}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {block.options.map((option) => (
            <Button key={option.optionId} type="button" size="sm" variant={option.kind.startsWith("reject") ? "outline" : "default"} onClick={() => onChoose(option.optionId)}>
              {option.name}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/15 px-2.5 py-1.5 whitespace-pre-wrap [overflow-wrap:anywhere]">
      {message}
    </div>
  );
}

export function Notice({ text }: { text: string }) {
  return <p className="text-muted-foreground">{text}</p>;
}
