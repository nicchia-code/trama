import type { ModelSuggestion } from "../../host/model-lists";
import type { ProposalAgent } from "../../host/proposal-models";
import { Markdown } from "../markdown";
import { modelOptions } from "../settings/logic";
import { ComboboxInput } from "../ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { AGENT_NAMES, type ProposalCard } from "./logic";
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
