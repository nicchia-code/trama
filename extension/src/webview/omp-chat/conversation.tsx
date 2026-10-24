import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Circle, CircleCheck, Loader, Square, TriangleAlert } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ConversationItem, FormAnswerMessage, SendMode } from "../../omp-chat-protocol";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../lib/utils";
import { AgentMessage, ErrorMessage, Notice, Permission, Thought, ToolCall, UserMessage } from "./blocks";
import { Form } from "./form";
import { panelId, tabId } from "./tabs";
import type { ConversationView, UsageView } from "./state";
import { UsageBar } from "./usage";
import { announcement, planDone, type Transcript } from "./transcript";

/** What a conversation asks of the host. */
export interface ConversationActions {
  send(id: string, text: string): void;
  stop(id: string): void;
  setModel(id: string, model: string): void;
  answer(id: string, requestId: string, answer: FormAnswerMessage): void;
  choose(id: string, requestId: string, optionId: string): void;
  openLink(url: string): void;
  installOmp(): void;
  refreshUsage(): void;
  setSendMode(mode: SendMode): void;
}

/** How far from the bottom the messages may be scrolled and still follow new text. */
const STICK_PX = 24;
/** The message field grows to about ten lines and then scrolls. */
const MAX_FIELD_PX = 200;
/** The Steer|Queue choice, in the order the group shows it. */
const SEND_MODES: { mode: SendMode; label: string }[] = [
  { mode: "steer", label: "Steer" },
  { mode: "queue", label: "Queue" },
];

function Plan({ plan }: { plan: NonNullable<Transcript["plan"]> }) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label="Plan" className="shrink-0 border-t px-3 py-1.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-1.5 rounded-sm text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span>Plan</span>
        <span className="text-muted-foreground">{`${planDone(plan)}/${plan.length}`}</span>
      </button>
      {open ? (
        <ul className="mt-1 flex max-h-40 flex-col gap-1 overflow-auto">
          {plan.map((entry, at) => (
            <li key={at} data-status={entry.status} className={cn("flex items-start gap-1.5", entry.status === "completed" && "text-muted-foreground line-through")}>
              {entry.status === "completed" ? (
                <CircleCheck className="mt-0.5 size-3.5 shrink-0" />
              ) : entry.status === "in_progress" ? (
                <Loader className="mt-0.5 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
              ) : (
                <Circle className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span>{entry.content}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** General's process state under its messages (`generalStatus`): what it is doing, what went wrong and whether the agent remembers the messages above. */
function GeneralStatusRows({ status, onInstall }: { status: NonNullable<ConversationView["status"]>; onInstall: () => void }) {
  const { error } = status;
  const text = error === undefined ? "" : error.kind === "missing" ? "omp is not installed. Trama runs every agent with omp." : `omp ${error.kind === "start" ? "could not start" : "stopped"}: ${error.reason ?? "unknown reason"}.`;
  return (
    <>
      {status.phase === "starting" ? <p className="text-xs text-muted-foreground">Starting omp…</p> : null}
      {error === undefined ? null : (
        <div role="alert" className="flex flex-col items-start gap-1.5 rounded-md border p-2 text-sm">
          <p className="flex items-start gap-1.5 text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>{text}</span>
          </p>
          {error.kind === "missing" ? <Button type="button" size="sm" onClick={onInstall}>Install omp</Button> : <p className="text-xs text-muted-foreground">Your next message starts omp again.</p>}
        </div>
      )}
      {status.newSession === true ? <p className="text-xs text-muted-foreground">New session: the agent does not remember the messages above.</p> : null}
    </>
  );
}

function Composer({ item, view, actions, sendMode }: { item: ConversationItem; view: ConversationView; actions: ConversationActions; sendMode: SendMode }) {
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const running = item.state === "running";
  useLayoutEffect(() => {
    const element = field.current;
    if (element === null) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_FIELD_PX)}px`;
  }, [text]);
  useEffect(() => {
    if (view.focusToken > 0) field.current?.focus();
  }, [view.focusToken]);
  const restored = useRef(view.returned?.token ?? 0);
  useEffect(() => {
    if (view.returned === undefined || view.returned.token === restored.current) return;
    restored.current = view.returned.token;
    setText(view.returned.text);
  }, [view.returned]);
  const send = () => {
    const message = text.trim();
    if (message === "" || item.starting === true) return;
    actions.send(item.id, message);
    setText("");
  };
  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t p-2">
      <div className="flex items-end gap-1.5">
        <Textarea
          ref={field}
          rows={1}
          value={text}
          placeholder={item.placeholder ?? "Message omp…"}
          aria-label="Message omp"
          className="max-h-[200px] min-h-9 resize-none overflow-y-auto"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            send();
          }}
        />
        {item.state !== "idle" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Stop the agent" onClick={() => actions.stop(item.id)}>
                <Square />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop the agent</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" size="icon" aria-label="Send" disabled={item.starting === true || text.trim() === ""} onClick={send}>
              <ArrowUp />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send</TooltipContent>
        </Tooltip>
        <div role="radiogroup" aria-label="When the agent is working" className="flex shrink-0 items-center rounded-md border p-0.5">
          {SEND_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={sendMode === mode}
              onClick={() => {
                if (sendMode !== mode) actions.setSendMode(mode);
              }}
              className={cn("rounded-sm px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring", sendMode === mode ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {item.starting === true ? <p className="text-xs text-muted-foreground">Starting omp…</p> : null}
      <Combobox
        aria-label="Model"
        className="h-7 w-48 text-xs"
        options={view.models.map((model) => ({ value: model.id, label: model.name }))}
        value={view.currentModel ?? item.model ?? ""}
        placeholder="Model"
        searchPlaceholder="Search models…"
        emptyText="No model."
        disabled={view.models.length === 0}
        onValueChange={(model) => {
          if (model !== "" && model !== (view.currentModel ?? item.model)) actions.setModel(item.id, model);
        }}
      />
    </div>
  );
}

/**
 * The conversation of a tab, under the tabs: the messages from top to bottom, the plan above the message field, the field always at the bottom. New text takes
 * the view down with it unless the developer scrolled up; then `Jump to latest` brings it back.
 */
export function Conversation({ item, view, selected, actions, sendMode, usage }: { item: ConversationItem; view: ConversationView; selected: boolean; actions: ConversationActions; sendMode: SendMode; usage: UsageView }) {
  const list = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(true);
  const stuckRef = useRef(true);
  const running = item.state === "running";
  const { transcript } = view;
  useLayoutEffect(() => {
    const element = list.current;
    if (element !== null && stuckRef.current && selected) element.scrollTop = element.scrollHeight;
  }, [transcript, selected]);
  const jump = () => {
    const element = list.current;
    if (element === null) return;
    element.scrollTop = element.scrollHeight;
    stuckRef.current = true;
    setStuck(true);
  };
  return (
    <div role="tabpanel" id={panelId(item.id)} aria-labelledby={tabId(item.id)} hidden={!selected} className={cn("min-h-0 flex-1 flex-col", selected && "flex")}>
      {item.general === true ? <UsageBar usage={usage} model={view.currentModel} active={selected} onRefresh={actions.refreshUsage} /> : null}
      <div className="relative min-h-0 flex-1">
      <div
        ref={list}
        className="absolute inset-0 flex flex-col gap-3 overflow-y-auto p-3"
        onScroll={(event) => {
          const element = event.currentTarget;
          const near = element.scrollHeight - element.scrollTop - element.clientHeight <= STICK_PX;
          stuckRef.current = near;
          setStuck(near);
        }}
      >
        {transcript.blocks.map((block) => {
          switch (block.kind) {
            case "user":
              return <UserMessage key={block.id} block={block} />;
            case "agent":
              return <AgentMessage key={block.id} block={block} openLink={actions.openLink} />;
            case "thought":
              return <Thought key={block.id} block={block} running={running} />;
            case "tool":
              return <ToolCall key={block.id} block={block} />;
            case "error":
              return <ErrorMessage key={block.id} message={block.message} />;
            case "notice":
              return <Notice key={block.id} text={block.text} />;
            case "form":
              return <Form key={block.id} form={block.form} answer={block.answer} onAnswer={(answer) => actions.answer(item.id, block.form.requestId, answer)} />;
            case "permission":
              return <Permission key={block.id} block={block} onChoose={(optionId) => actions.choose(item.id, block.requestId, optionId)} />;
          }
        })}
        {item.general === true && transcript.blocks.length === 0 ? <p className="m-auto text-center text-muted-foreground">Chat with omp in this folder. Trama&apos;s jobs open in their own tabs.</p> : null}
        {item.general === true && view.status !== undefined ? <GeneralStatusRows status={view.status} onInstall={actions.installOmp} /> : null}
        <div aria-live="polite" className="sr-only">
          {announcement(transcript, running)}
        </div>
      </div>
      {stuck ? null : (
        <Button type="button" variant="secondary" size="sm" className="absolute right-3 bottom-3 shadow-md" onClick={jump}>
          <ArrowDown />
          Jump to latest
        </Button>
      )}
      </div>
      {transcript.plan === undefined ? null : <Plan plan={transcript.plan} />}
      <Composer item={item} view={view} actions={actions} sendMode={sendMode} />
    </div>
  );
}
