import { useEffect, useState } from "react";
import type { ModelSuggestion } from "../../host/model-lists";
import type { ProposalAgent } from "../../host/proposal-models";
import { Markdown } from "../markdown";
import { modelOptions } from "../settings/logic";
import { ComboboxInput } from "../ui/combobox";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { AGENT_NAMES, type AnnouncedCard, type ProposalCard, runningFor } from "./logic";
import { useBoardEnv } from "./parts";

/**
 * The read-only window of the body of a Backlog Proposal. It follows the Proposal: it shows the newest card, and it is
 * closed when there is none (the Proposal left Backlog). Its only control is Close.
 */
export function ProposalBodyDialog({ card, onClose }: { card: ProposalCard | undefined; onClose: () => void }) {
  const { context } = useBoardEnv();
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent className="sm:max-w-[640px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-[15px] leading-snug break-words">{`${card.name.text} ${card.title}`}</DialogTitle>
          </DialogHeader>
          {card.body.trim() === "" ? <p className="text-muted-foreground">This Proposal has no description.</p> : <Markdown source={card.body} openLink={context.openLink} />}
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
export function ModelDialog({ card, agent, list, onClose }: { card: ProposalCard | undefined; agent: ProposalAgent; list: ModelList; onClose: () => void }) {
  const { context } = useBoardEnv();
  const other = card?.model != null && !card.model.applies ? card.model : null;
  return (
    <Dialog open={card !== undefined} onOpenChange={(open) => !open && onClose()}>
      {card === undefined ? null : (
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[15px] leading-snug break-words">{`Model for ${card.name.text} ${card.title}`}</DialogTitle>
            <DialogDescription id="board-model-hint">Used by the Runs of this Proposal's Tasks and by Resolve on a Drift filed from one of them. Scans always use trama.scan. Leave empty to use the Settings roles.</DialogDescription>
          </DialogHeader>
          {other === null ? null : (
            <p id="board-model-chosen" className="text-amber-700 dark:text-amber-400">
              {`Chosen for ${AGENT_NAMES[other.agent]}: the Settings roles apply. Confirm a model to use it with ${AGENT_NAMES[agent]}.`}
            </p>
          )}
          <label htmlFor="board-model-field" className="font-semibold">
            Model
          </label>
          <ComboboxInput
            id="board-model-field"
            aria-label="Model"
            aria-describedby={["board-model-hint", other === null ? null : "board-model-chosen", list.error === null ? null : "board-model-note"].filter((id) => id !== null).join(" ")}
            placeholder="Settings roles (trama.analysis, trama.execution)"
            options={modelOptions(list.models)}
            value={card.model?.name ?? ""}
            onCommit={(model) => context.post({ type: "setProposalModel", proposal: card.id, model })}
          />
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
