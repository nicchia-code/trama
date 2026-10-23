import { useRef, useState } from "react";
import { cardNameOf } from "../../../../src/core/card-names";
import type { HistoryTaskView, HistoryView } from "../../../../src/core/snapshot";
import { IdTag } from "../diagram/panel";
import { InlineMarkdown, Markdown } from "../markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { historyWhen } from "./logic";
import { ProposalTagChip, RefChips, StatusDot, Tip, TipBadge, useViewEnv } from "./parts";

/** One Task in the details: its status dot, ID and Proposal tag, then its title, end date and references. */
function TaskLine({ task, onNavigate }: { task: HistoryTaskView; onNavigate: () => void }) {
  const { numbers, context } = useViewEnv();
  const name = cardNameOf(numbers, "task", task.id);
  if (task.cleared && task.title !== null) {
    return (
      <li className="flex flex-col gap-0.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <StatusDot task={{ column: "done", agent: false }} />
          <IdTag name={name} className="text-[11px] font-semibold text-muted-foreground" />
          <span className="min-w-0 break-words">{task.title}</span>
          {task.proposalTag !== null ? <ProposalTagChip tag={task.proposalTag} /> : null}
          <TipBadge tone="info" tooltip="Deleted from the Done column with Clear">
            cleared
          </TipBadge>
        </div>
        {task.finished !== null ? (
          <time dateTime={task.finished} className="text-muted-foreground">
            {new Date(task.finished).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </time>
        ) : null}
        {task.refs.length > 0 ? (
          <RefChips
            refs={task.refs}
            navigate={(view, options) => {
              onNavigate();
              context.navigate(view, options);
            }}
          />
        ) : null}
      </li>
    );
  }
  if (!task.exists || task.column === null || task.title === null) {
    return (
      <li className="flex flex-col gap-0.5 text-xs">
        <IdTag name={name} className="text-[11px] font-semibold text-muted-foreground" />
        <span className="text-muted-foreground">no longer exists</span>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-0.5 text-xs">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <StatusDot task={{ column: task.column, agent: false }} />
        <IdTag name={name} className="text-[11px] font-semibold text-muted-foreground" />
        <span className="min-w-0 break-words">{task.title}</span>
        {task.proposalTag !== null ? <ProposalTagChip tag={task.proposalTag} /> : null}
      </div>
      {task.finished !== null ? (
        <time dateTime={task.finished} className="text-muted-foreground">
          {new Date(task.finished).toLocaleDateString(undefined, { dateStyle: "medium" })}
        </time>
      ) : null}
      {task.refs.length > 0 ? (
        // A link to the Diagram or to Requirements leaves the Board: the dialog closes first.
        <RefChips
          refs={task.refs}
          navigate={(view, options) => {
            onNavigate();
            context.navigate(view, options);
          }}
        />
      ) : null}
    </li>
  );
}

/**
 * One History entry: the whole card opens the details of the entry in a modal dialog. The title is the button that is reached
 * by keyboard (Enter or Space); closing the dialog puts the focus back on it.
 */
export function HistoryEntryView({ entry, now = new Date() }: { entry: HistoryView; now?: Date }) {
  const { context } = useViewEnv();
  const [open, setOpen] = useState(false);
  const titleButton = useRef<HTMLButtonElement>(null);
  const when = historyWhen(entry.updated, now);
  const label = `Show the Tasks of ${entry.title}`;
  // Creation order; a Task with no creation date goes last.
  const ordered = [...entry.tasks].sort((a, b) => (a.created ?? "9999").localeCompare(b.created ?? "9999") || a.id.localeCompare(b.id));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <article
        className="flex cursor-pointer flex-col gap-1 rounded-md border bg-card p-2.5 text-card-foreground shadow-xs"
        // A click inside the dialog bubbles here through the portal: only a click on the card itself opens it.
        onClick={(event) => {
          if (event.currentTarget.contains(event.target as Node)) setOpen(true);
        }}
      >
        <h4 className="min-w-0 text-[13px] font-semibold break-words">
          <Tip text={label}>
            <DialogTrigger asChild>
              <button ref={titleButton} type="button" className="cursor-pointer text-left font-semibold break-words">
                {entry.title}
              </button>
            </DialogTrigger>
          </Tip>
        </h4>
        <time dateTime={entry.updated} title={when.title} className="text-[11px] text-muted-foreground">
          {when.text}
        </time>
        {entry.summary === "" ? null : (
          <div className="text-xs">
            <InlineMarkdown source={entry.summary} openLink={context.openLink} />
          </div>
        )}
      </article>
      <DialogContent
        className="sm:max-w-[640px]"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          titleButton.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-[15px] leading-snug break-words">{entry.title}</DialogTitle>
          <time dateTime={entry.updated} className="text-xs text-muted-foreground">
            {when.title}
          </time>
        </DialogHeader>
        {entry.body.trim() !== "" ? <Markdown source={entry.body} openLink={context.openLink} /> : null}
        <h3 className="text-[11px] font-semibold text-muted-foreground">Tasks</h3>
        <ul className="flex flex-col gap-2">
          {ordered.map((task) => (
            <TaskLine key={task.id} task={task} onNavigate={() => setOpen(false)} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
