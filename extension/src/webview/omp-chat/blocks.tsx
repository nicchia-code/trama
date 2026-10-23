import { Bot, Check, ChevronDown, ChevronRight, FilePen, FileText, Loader, Paperclip, Search, SquareTerminal, Wrench, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Markdown } from "../markdown";
import { Button } from "../ui/button";
import { cn } from "../lib/utils";
import { type Block, cutLines } from "./transcript";

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

function ToolIcon({ block }: { block: Extract<Block, { kind: "tool" }> }) {
  const Icon = block.name !== undefined && SUBAGENT_TOOL.test(block.name) ? Bot : TOOL_ICONS[block.toolKind];
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
}

function ToolStatus({ status }: { status: Extract<Block, { kind: "tool" }>["status"] }) {
  if (status === "completed") return <Check aria-label="Done" className="size-3.5 shrink-0" />;
  if (status === "failed") return <X aria-label="Failed" className="size-3.5 shrink-0 text-destructive" />;
  return <Loader aria-label="Running" className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />;
}

/** A call to a tool: one compact row, the result a click away. An edit shows only the file it touched, which opens in the editor. */
export function ToolCall({ block, openFile }: { block: Extract<Block, { kind: "tool" }>; openFile: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const edits = block.toolKind === "edit" || block.toolKind === "delete" || block.toolKind === "move";
  const output = block.output === undefined ? undefined : cutLines(block.output);
  return (
    <div className="text-sm" data-tool={block.toolCallId}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-expanded={output === undefined ? undefined : open}
          disabled={output === undefined}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ToolIcon block={block} />
          <span className="truncate">{block.title}</span>
        </button>
        <ToolStatus status={block.status} />
      </div>
      {edits
        ? block.places.map((place) => (
            <Button key={place.path} variant="link" size="sm" className="h-auto justify-start p-0 pl-5 font-mono text-xs" title={`Open ${place.path}`} onClick={() => openFile(place.path)}>
              {place.path}
            </Button>
          ))
        : null}
      {open && output !== undefined ? (
        <pre className={cn("mt-1 ml-5 max-h-72 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap [overflow-wrap:anywhere]", block.status === "failed" && "text-destructive")}>
          {output.shown}
          {output.more > 0 ? `\n… ${output.more} more lines` : ""}
        </pre>
      ) : null}
    </div>
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
