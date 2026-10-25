import { MessageCircleQuestion, Tag, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { ModelSuggestion } from "../../host/model-lists";
import { DriftCompare, RecurringBadge, UnifiedBadge, UnifiesList } from "../diagram/panel";
import { Markdown } from "../markdown";
import { composeRoleValue, DEFAULT_LEVEL, modelOptions, splitRoleValue, thinkingLevels, withModel } from "../settings/logic";
import { ThinkingLevelSelect } from "../settings/thinking-level";
import { TaskImages } from "../task-images";
import { ComboboxInput } from "../ui/combobox";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { joinReasons, RUN_IN_PROGRESS } from "../../../../src/core/design";
import { type AnnouncedCard, type DriftCard, type ProposalCard, runningFor, type TaskCard } from "./logic";
import { BoardButton, RefChips, Tip, TaskProposalTag, taskTagText, useBoardEnv } from "./parts";

/** Focus goes to Close when a read-only window opens, and back to the card's title when it closes (the default). */
const focusClose = (event: Event) => {
  event.preventDefault();
  (event.target as HTMLElement).querySelector<HTMLElement>('[data-slot="details-close"]')?.focus();
};

/**
 * The footer of a read-only window of a card: `Ask more`, then `Close`, both at the right; `lead`, when there is one (`Delete` of a Task in To do),
 * stands apart at the left. Ask more asks the host for a new chat about the card and leaves the window open; it is always enabled.
 */
function DetailsFooter({ kind, id, name, lead }: { kind: "task" | "proposal" | "drift"; id: string; name: string; lead?: ReactNode }) {
  const { context } = useBoardEnv();
  const noun = kind === "task" ? "Task" : kind === "proposal" ? "Proposal" : "Drift";
  const tooltip = `Ask an agent about this ${noun}`;
  return (
    <DialogFooter>
      {lead === undefined ? null : <div className="sm:mr-auto">{lead}</div>}
      <Tip text={tooltip}>
        <Button variant="outline" size="sm" aria-label={`Ask more about ${name}`} aria-description={tooltip} onClick={() => context.post({ type: "askMore", kind, id })}>
          <MessageCircleQuestion aria-hidden="true" focusable="false" />
          Ask more
        </Button>
      </Tip>
      <DialogClose asChild>
        <Button variant="outline" size="sm" data-slot="details-close">
          <X aria-hidden="true" focusable="false" />
          Close
        </Button>
      </DialogClose>
    </DialogFooter>
  );
}

/**
 * The read-only window of the body of a Backlog Proposal. It follows the Proposal: it shows the newest card, and it is
 * closed when there is none (the Proposal left Backlog). Its controls are Ask more and Close, in the footer.
 */
export function ProposalBodyDialog({ card, onClose }: { card: ProposalCard | undefined; onClose: () => void }) {
  const { context } = useBoardEnv();
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent className="sm:max-w-[640px]" aria-describedby={undefined} showCloseButton={false} onOpenAutoFocus={focusClose}>
          <DialogHeader>
            <DialogTitle className="text-[15px] leading-snug break-words">{`${card.name.text} ${card.title}`}</DialogTitle>
          </DialogHeader>
          {card.body.trim() === "" ? <p className="text-muted-foreground">This Proposal has no description.</p> : <Markdown source={card.body} openLink={context.openLink} />}
          <DetailsFooter kind="proposal" id={card.id} name={card.name.text} />
        </DialogContent>
      )}
    </Dialog>
  );
}

/** Why `Delete` is disabled on a Task in To do, every reason that holds in their order, or null: the agent that filed it is still finishing, a Run of this window is in progress, a Drift holds the Task. */
export function deleteBlocker(card: Pick<TaskCard, "finishing" | "heldByDrift">, running: boolean): string | null {
  return joinReasons([card.finishing, running ? RUN_IN_PROGRESS : null, card.heldByDrift ? "A Drift needs this Task" : null]);
}

/** `Delete` of the details window of a Task in To do: it asks the host, which asks for confirmation; the window stays open until the Task is gone. */
function DeleteTaskButton({ card }: { card: TaskCard }) {
  const env = useBoardEnv();
  const reason = deleteBlocker(card, env.running);
  return (
    <BoardButton
      icon={Trash2}
      label="Delete"
      aria={`Delete ${card.name.text}`}
      disabled={reason !== null}
      tooltip={reason ?? "Delete this Task for good"}
      description={reason}
      onClick={() => env.deleteTask(card.id)}
    />
  );
}

/**
 * The details of a Task in Active or Done: its title with its short number, its Proposal's tag, its references as links,
 * its body (or that it has none) and its image previews. They are read-only but for `Delete` of a Task in To do. It follows the Task from Active to Done:
 * it closes when the Task is in neither (Clear or Delete removed it).
 */
export function TaskDetailsDialog({ card, onClose }: { card: TaskCard | undefined; onClose: () => void }) {
  const env = useBoardEnv();
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent
          className="sm:max-w-[640px]"
          aria-describedby={undefined}
          showCloseButton={false}
          onOpenAutoFocus={focusClose}
          onCloseAutoFocus={(event) => {
            // A deleted Task has no card to go back to: the focus goes to Run all.
            if (env.focusAfterDelete(card.id)) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-[15px] leading-snug break-words">{`${card.name.text} ${card.title}`}</DialogTitle>
          </DialogHeader>
          {card.refs.length > 0 ? <RefChips refs={card.refs} /> : null}
          {card.body.trim() === "" ? <p className="text-muted-foreground">This Task has no description.</p> : <Markdown source={card.body} openLink={env.context.openLink} />}
          <TaskImages images={card.images} open={(name) => env.openTaskImage(card.id, name)} />
          <TaskTagToggle card={card} />
          <DetailsFooter kind="task" id={card.id} name={card.name.text} lead={card.column === "todo" ? <DeleteTaskButton card={card} /> : undefined} />
        </DialogContent>
      )}
    </Dialog>
  );
}

/** The Task's tag, out of sight until the developer asks for it: a toggle under the details. Its row starts closed each time the details open, as the toggle is inside the dialog's content. */
function TaskTagToggle({ card }: { card: TaskCard }) {
  const [open, setOpen] = useState(false);
  if (taskTagText(card) === null) return null;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Tag />
        {open ? "Hide tags" : "Show tags"}
      </Button>
      {open ? (
        <div className="flex flex-wrap gap-1.5">
          <TaskProposalTag card={card} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The read-only details of a Drift in Backlog: its title with its badges, its references as links, its two sides, the
 * Tasks it leaves free and, for a unified Drift, the Drifts it unites. It follows the Drift: it closes when the Drift
 * leaves Backlog.
 */
export function DriftDetailsDialog({ card, onClose }: { card: DriftCard | undefined; onClose: () => void }) {
  const env = useBoardEnv();
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent className="sm:max-w-[640px]" aria-describedby={undefined} showCloseButton={false} onOpenAutoFocus={focusClose}>
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-[15px] leading-snug break-words">{`${card.name.text} ${card.title}`}</DialogTitle>
              {card.drift.unifies.length > 0 ? <UnifiedBadge count={card.drift.unifies.length} /> : null}
              {card.drift.previous.length > 0 ? <RecurringBadge previous={card.drift.previous} /> : null}
            </div>
          </DialogHeader>
          {card.refs.length > 0 ? <RefChips refs={card.refs} /> : null}
          <DriftCompare drift={card.drift} openLink={env.context.openLink} />
          {card.drift.unifies.length > 0 ? <UnifiesList unifies={card.drift.unifies} numbers={env.numbers} show={(drift) => env.context.navigate("diagram", { drift })} /> : null}
          <DetailsFooter kind="drift" id={card.id} name={card.name.text} />
        </DialogContent>
      )}
    </Dialog>
  );
}

/** How often the elapsed time of a ghost is refreshed while its details are open. */
const TICK_MS = 15_000;

/** `Running for <duration>`, kept current while it is on screen. */
function RunningFor({ announced }: { announced: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return <p className="text-xs text-muted-foreground">{`Running for ${runningFor(announced, now)}`}</p>;
}

/**
 * The read-only details of a ghost: its kind and title, how long it has been running, what the ghost means by kind and
 * phase, and the agent's notes (the latest in evidence, the earlier ones under it). It follows the ghost: the newest card
 * is shown, and it is closed when there is none (the ghost went away). Closing it puts the focus back on the ghost.
 */
export function GhostDetailsDialog({ card, onClose, restoreFocus }: { card: AnnouncedCard | undefined; onClose: () => void; restoreFocus: (key: string) => void }) {
  const [latest, ...earlier] = card?.notes ?? [];
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent
          className="sm:max-w-[560px]"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus(card.key);
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{card.kindLabel}</Badge>
              <DialogTitle className="text-[15px] leading-snug break-words">{card.title}</DialogTitle>
            </div>
            <RunningFor announced={card.announced} />
          </DialogHeader>
          <p>{card.explanation}</p>
          <section className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-semibold text-muted-foreground">Agent notes</h3>
            {latest === undefined ? (
              <p className="text-muted-foreground">No notes from the agent yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                <li className="flex gap-2 break-words">
                  <time dateTime={latest.at} className="shrink-0 text-muted-foreground tabular-nums">
                    {latest.time}
                  </time>
                  <span className="font-semibold">{latest.text}</span>
                </li>
                {earlier.map((note) => (
                  <li key={note.at + note.text} className="flex gap-2 text-xs break-words text-muted-foreground">
                    <time dateTime={note.at} className="shrink-0 tabular-nums">
                      {note.time}
                    </time>
                    <span>{note.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </DialogContent>
      )}
    </Dialog>
  );
}

/** The model names the agent offers for the field, and why it gives none. */
export interface ModelList {
  models: ModelSuggestion[];
  error: string | null;
}

/**
 * The window that chooses the model of one Proposal. It has the model field of the Settings roles: a name typed out or one
 * the agent offers; a confirmed name saves at once and the window stays open until it is closed, and an empty one goes back
 * to the Settings roles. It follows the Proposal like the body window.
 */
export function ModelDialog({ card, list, onClose }: { card: ProposalCard | undefined; list: ModelList; onClose: () => void }) {
  const { context } = useBoardEnv();
  const saved = card?.model?.name ?? "";
  const role = splitRoleValue(saved, list.models);
  const levels = thinkingLevels(list.models, role.model);
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[15px] leading-snug break-words">{`Model for ${card.name.text} ${card.title}`}</DialogTitle>
            <DialogDescription id="board-model-hint">Used by the Runs of this Proposal's Tasks and by Resolve on a Drift filed from one of them. Scans always use trama.scan. Leave empty to use the Settings roles.</DialogDescription>
          </DialogHeader>
          <label htmlFor="board-model-field" className="font-semibold">
            Model
          </label>
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0 flex-1">
              <ComboboxInput
                id="board-model-field"
                aria-label="Model"
                aria-describedby={["board-model-hint", list.error === null ? null : "board-model-note"].filter((id) => id !== null).join(" ")}
                placeholder="Settings roles (trama.analysis, trama.execution)"
                options={modelOptions(list.models)}
                value={role.model}
                onCommit={(model) => context.post({ type: "setProposalModel", proposal: card.id, model: withModel(saved, model, list.models) })}
              />
            </div>
            {levels.length > 0 && (
              <ThinkingLevelSelect
                label="Model thinking level"
                levels={levels}
                value={role.level ?? DEFAULT_LEVEL}
                onChange={(level) => context.post({ type: "setProposalModel", proposal: card.id, model: composeRoleValue(role.model, level === DEFAULT_LEVEL ? undefined : level) })}
              />
            )}
          </div>
          {list.error === null ? null : (
            <p id="board-model-note" className="text-sm text-muted-foreground">
              {list.error}
            </p>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
