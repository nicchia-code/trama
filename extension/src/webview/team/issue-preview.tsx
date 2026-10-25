import { ArrowLeft, Bot, Calendar, ChevronLeft, ChevronRight, CircleDashed, Pencil, Split, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { cardNameOf } from "../../../../src/core/card-names";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { ToHost } from "../../protocol";
import { RefChips, Tip } from "../board/parts";
import { IdTag } from "../diagram/panel";
import { cn } from "../lib/utils";
import { Markdown } from "../markdown";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DecisionButtons, EpicChip } from "./decisions-tab";
import { useNow } from "./github";
import { decisionState, type FieldEditor, fieldEditors, fieldValueToSend, type GitHubMessage, type HandoffIssueData, type HandoffViewData, NARROW_PREVIEW, type SprintLoadNote, sprintLoadNote, stepIssue, warningParts } from "./logic";
import type { TeamMessage } from "./people-tab";
import { useNarrow } from "./use-narrow";

type Post = (message: ToHost) => void;

const NONE = "\u0000none";

/** The refusals of the host to the changes of this preview, by `<handoff>/<issue>/<key>`. */
export type FieldRejections = Readonly<Record<string, string>>;
export const rejectionKey = (handoff: string, issue: string, key: string): string => `${handoff}/${issue}/${key}`;

const Initials = ({ text }: { text: string }) => (
  <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-medium text-muted-foreground">
    {text}
  </span>
);

/** The line under a field: who proposed its value, and `Undo` after a change of the Manager's. */
function Source({ editor, onUndo }: { editor: FieldEditor; onUndo: () => void }) {
  return editor.changed ? (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Pencil aria-hidden="true" focusable="false" className="size-3" />
      <span>Changed by you ·</span>
      <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={onUndo}>
        Undo
      </Button>
    </p>
  ) : (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Bot aria-hidden="true" focusable="false" className="size-3" />
      Proposed by the agent
    </p>
  );
}

/** One field of the column: a `Select` or an input by what the field is, saved when chosen or when the input loses focus; a refusal stays under it. */
function FieldRow({ editor, error, estimateOver, note, send }: { editor: FieldEditor; error: string | undefined; estimateOver: boolean; note: SprintLoadNote | null; send: (key: string, value: string | number | null) => void }) {
  const id = `field-${editor.key.replace(/\W+/g, "-")}`;
  const invalid = error !== undefined;
  const sendText = (text: string) => {
    if (text.trim() === editor.value.trim()) return;
    send(editor.key, fieldValueToSend(editor, text));
  };
  const select = (
    <Select value={editor.value === "" ? NONE : editor.value} onValueChange={(value) => send(editor.key, value === NONE ? null : value)}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-error` : undefined} className={cn("w-full", invalid && "border-destructive")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {editor.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {editor.kind === "person" && option.person !== undefined ? <Initials text={option.person.initials} /> : null}
            {editor.kind === "sprint" ? <Calendar aria-hidden="true" focusable="false" className="size-4" /> : null}
            <span className={cn(editor.kind === "person" && "font-mono")}>{option.label}</span>
          </SelectItem>
        ))}
        {editor.kind === "select" ? null : (
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">{editor.kind === "person" ? "Nobody" : "No sprint"}</span>
          </SelectItem>
        )}
        {editor.kind === "select" ? (
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">No value</span>
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
  const input =
    editor.kind === "estimate" || editor.kind === "number" || editor.kind === "text" ? (
      <div className="flex items-center gap-2">
        <Input
          key={editor.value}
          id={id}
          type={editor.kind === "text" ? "text" : "number"}
          step={editor.kind === "estimate" ? 0.5 : "any"}
          defaultValue={editor.value}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={cn(editor.kind === "estimate" ? "w-24" : "w-full", invalid && "border-destructive", estimateOver && !invalid && "border-amber-600 dark:border-amber-400")}
          onBlur={(event) => sendText(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendText(event.currentTarget.value);
          }}
        />
        {editor.kind === "estimate" ? <span className="text-sm text-muted-foreground">d</span> : null}
      </div>
    ) : null;
  return (
    <div className="flex flex-col gap-1 border-b pb-3 last:border-b-0">
      <label htmlFor={id} className="text-xs font-medium">
        {editor.label}
      </label>
      {input ?? select}
      {note === null ? null : <p className={cn("text-xs", note.over ? "text-destructive" : "text-muted-foreground")}>{note.text}</p>}
      {error === undefined ? null : (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Source editor={editor} onUndo={() => send(editor.key, fieldValueToSend(editor, editor.agent))} />
    </div>
  );
}

function WarningBox({ warning, onSplit, splitReason }: { warning: string; onSplit: () => void; splitReason: string | null }) {
  const { strong, hint, split } = warningParts(warning);
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-md border border-amber-600 bg-amber-600/10 px-3 py-2 text-sm dark:border-amber-400 dark:bg-amber-400/15">
      <p className="flex items-start gap-2">
        <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <span>
          <strong className="font-semibold">{strong}</strong> {hint}
        </span>
      </p>
      {split ? (
        <Tip text={splitReason}>
          <span className="inline-flex">
            <Button type="button" variant="outline" size="sm" disabled={splitReason !== null} onClick={onSplit}>
              <Split aria-hidden="true" focusable="false" />
              Split
            </Button>
          </span>
        </Tip>
      ) : null}
    </div>
  );
}

/** The preview of one issue of an open handoff (`ui#proposal/Open`): the bar, the issue as it will look on GitHub and the fields the Manager may change before approving. */
export function IssuePreview({
  handoff,
  issue,
  index,
  snapshot,
  team,
  github,
  rejections,
  post,
  onBack,
  onStep,
  onFieldSent,
}: {
  handoff: HandoffViewData;
  issue: HandoffIssueData;
  index: number;
  snapshot: Snapshot;
  team: TeamMessage | null;
  github: GitHubMessage | null;
  rejections: FieldRejections;
  post: Post;
  onBack: () => void;
  onStep: (index: number) => void;
  /** A change was sent: the page forgets the refusal it showed for that field. */
  onFieldSent: (key: string) => void;
}) {
  const now = useNow();
  const { ref, narrow } = useNarrow(NARROW_PREVIEW);
  const name = cardNameOf(snapshot.numbers, "proposal", handoff.id);
  const decision = decisionState(handoff, snapshot.finishingProposals);
  const count = handoff.issues.length;
  const editors = fieldEditors(issue, team?.members ?? [], github?.project ?? null, now);
  const editorValue = (key: string): string => editors.find((editor) => editor.key === key)?.value ?? "";
  const sprintNote = sprintLoadNote({ assignee: editorValue("assignee"), sprint: editorValue("sprint"), estimate: editorValue("estimate") }, team?.members ?? [], github?.project?.iterations ?? [], github?.loads ?? []);
  const repository = github?.repository ?? null;
  const splitReason = decision.reject;
  const step = (delta: 1 | -1) => onStep(stepIssue(index, count, delta));
  const [refsOpen, setRefsOpen] = useState(false);

  // Alt+↑ and Alt+↓ move between the issues anywhere in the preview; Esc goes back to the cards unless an open menu used it.
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        onBack();
        return;
      }
      if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        step(event.key === "ArrowDown" ? 1 : -1);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  });

  const send = (key: string, value: string | number | null) => {
    onFieldSent(key);
    post({ type: "setIssueField", handoff: handoff.id, issue: issue.id, key, value });
  };
  const hasPrevious = index > 0;
  const hasNext = index < count - 1;
  return (
    <div ref={ref} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="sm" autoFocus onClick={onBack}>
            <ArrowLeft aria-hidden="true" focusable="false" />
            Decisions
          </Button>
          <IdTag name={name} className="text-xs text-muted-foreground" />
          <span className="truncate text-sm font-semibold">{handoff.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tip text="Previous issue · Alt+↑">
              <Button type="button" variant="outline" size="icon" className="size-7" aria-label="Previous issue · Alt+↑" disabled={!hasPrevious} onClick={() => step(-1)}>
                <ChevronLeft aria-hidden="true" focusable="false" />
              </Button>
            </Tip>
            <span aria-live="polite">{`${index + 1} of ${count}`}</span>
            <Tip text="Next issue · Alt+↓">
              <Button type="button" variant="outline" size="icon" className="size-7" aria-label="Next issue · Alt+↓" disabled={!hasNext} onClick={() => step(1)}>
                <ChevronRight aria-hidden="true" focusable="false" />
              </Button>
            </Tip>
          </span>
          <DecisionButtons handoff={handoff} name={name.text} decision={decision} post={post} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5">
            <CircleDashed aria-hidden="true" focusable="false" className="size-3" />
            Not published
          </span>
          {repository === null ? null : <span className="font-mono">{`New issue in ${repository}`}</span>}
        </div>
        <h3 className="text-xl font-semibold break-words">{issue.title}</h3>
        {handoff.label === null ? null : (
          <div className="flex flex-wrap gap-1.5">
            <EpicChip label={handoff.label} />
          </div>
        )}
        {issue.warnings.map((warning) => (
          <WarningBox key={warning} warning={warning} splitReason={splitReason} onSplit={() => post({ type: "splitIssue", handoff: handoff.id, issue: issue.id })} />
        ))}

        <div className={cn("flex gap-4", narrow ? "flex-col" : "flex-row items-start")}>
          <div className={cn("min-w-0 rounded-md border", narrow ? "w-full" : "w-2/3")}>
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs">
              <Bot aria-hidden="true" focusable="false" className="size-4" />
              <strong className="font-semibold">Trama agent</strong>
              <span className="text-muted-foreground">{`drafted from handoff ${name.text} · preview of the GitHub issue body`}</span>
            </div>
            <div className="px-4 py-3">
              <Markdown source={issue.body} openLink={(url) => post({ type: "openLink", url })} />
              <div className="mt-3 rounded-md border">
                <button type="button" aria-expanded={refsOpen} className="flex w-full items-center gap-1 rounded-md px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setRefsOpen(!refsOpen)}>
                  <ChevronRight aria-hidden="true" focusable="false" className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", refsOpen && "rotate-90")} />
                  Trama references
                  <span className="ml-auto text-xs text-muted-foreground">{`${issue.refs.length} ${issue.refs.length === 1 ? "item" : "items"}`}</span>
                </button>
                {refsOpen ? (
                  <div className="border-t px-3 py-2">
                    <RefChips refs={issue.refs} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className={cn("flex min-w-0 flex-col gap-3", narrow ? "w-full" : "w-1/3")}>
            {editors.map((editor) => (
              <FieldRow key={`${issue.id}/${editor.key}`} editor={editor} error={rejections[rejectionKey(handoff.id, issue.id, editor.key)]} estimateOver={editor.kind === "estimate" && Number(editor.value) > 3} note={editor.kind === "sprint" ? sprintNote : null} send={send} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
