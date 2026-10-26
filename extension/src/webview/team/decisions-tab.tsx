import { Check, Inbox, MessageSquare, Plus, TriangleAlert, X } from "lucide-react";
import type { MouseEvent } from "react";
import { cardNameOf } from "../../../../src/core/card-names";
import type { Snapshot } from "../../../../src/core/snapshot";
import type { ReplanView, ToHost } from "../../protocol";
import { TAG, BoardButton } from "../board/parts";
import { tagColour, type TagColour } from "../board/logic";
import { IdTag } from "../diagram/panel";
import { cn } from "../lib/utils";
import { SplitButton } from "../split-button";
import { Button } from "../ui/button";
import { useNow } from "./github";
import { ReplanControl } from "./replan";
import {
  createsLine,
  DECISIONS_EMPTY_TEXT,
  DECISIONS_EMPTY_TITLE,
  DECISIONS_HEADING,
  DECISIONS_HINT,
  type DecisionState,
  decisionState,
  type HandoffViewData,
  warningsText,
} from "./logic";

export const DOT: Record<TagColour, string> = {
  blue: "bg-blue-600 dark:bg-blue-400",
  green: "bg-green-600 dark:bg-green-400",
  amber: "bg-amber-600 dark:bg-amber-400",
  violet: "bg-violet-600 dark:bg-violet-400",
  cyan: "bg-cyan-600 dark:bg-cyan-400",
  red: "bg-red-600 dark:bg-red-400",
};

/** The epic of a handoff: `epic: <label>` in a chip with a dot of the colour the label hashes to (`tech#panel`), the same colour the issues carry on GitHub. */
export function EpicChip({ label }: { label: string }) {
  const colour = tagColour(label);
  return (
    <span className={cn("inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2 text-xs leading-5", TAG[colour])}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", DOT[colour])} />
      <span className="truncate">{`epic: ${label}`}</span>
    </span>
  );
}

/** `Approve` and the split `Reject` with `Rework with feedback…`, on a card and in the preview's bar (`ui#proposal/Open`). */
export function DecisionButtons({ handoff, name, decision, post }: { handoff: HandoffViewData; name: string; decision: DecisionState; post: (message: ToHost) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <BoardButton icon={Check} label="Approve" aria={`Approve ${name} ${handoff.title}`} variant="default" disabled={decision.approve !== null} tooltip={decision.approve ?? "Approve this handoff and publish its issues on GitHub"} onClick={() => post({ type: "approveProposal", id: handoff.id })} />
      <SplitButton
        icon={X}
        label="Reject"
        aria={`Reject ${name} ${handoff.title}`}
        tooltip="Reject this handoff"
        disabled={decision.reject !== null}
        reason={decision.reject}
        arrowName={`More ways to reject ${name}`}
        items={[
          { label: "Rework with feedback…", icon: MessageSquare, hint: "The agent revises this handoff from your notes", description: "The agent revises this handoff from your notes", onSelect: () => post({ type: "reworkProposal", proposal: handoff.id }) },
          { label: "Reject", icon: X, onSelect: () => post({ type: "rejectProposal", id: handoff.id }) },
        ]}
        onClick={() => post({ type: "rejectProposal", id: handoff.id })}
      />
    </div>
  );
}

function HandoffCard({ handoff, snapshot, now, post, onPreview }: { handoff: HandoffViewData; snapshot: Snapshot; now: number; post: (message: ToHost) => void; onPreview: (handoff: string) => void }) {
  const name = cardNameOf(snapshot.numbers, "proposal", handoff.id);
  const decision = decisionState(handoff, snapshot.finishingProposals);
  const open = (event: MouseEvent) => {
    // A click on a button of the card does what that button does, not the card's.
    if ((event.target as HTMLElement).closest("button, a, [role='menuitem']") !== null) return;
    onPreview(handoff.id);
  };
  return (
    <li data-handoff={handoff.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border bg-card p-3 text-card-foreground shadow-sm focus-within:ring-2 focus-within:ring-ring" onClick={open}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <IdTag name={name} className="text-xs text-muted-foreground" />
          <h3 className="text-sm font-medium break-words">
            <button type="button" id={`handoff-${handoff.id}`} className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onPreview(handoff.id)}>
              {handoff.title}
            </button>
          </h3>
          {handoff.label === null ? null : <EpicChip label={handoff.label} />}
        </div>
        <p className="text-xs text-muted-foreground">{createsLine(handoff, now)}</p>
        {handoff.warnings > 0 ? (
          <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert aria-hidden="true" focusable="false" className="size-3.5" />
            {warningsText(handoff.warnings)}
          </p>
        ) : null}
        {handoff.block === null ? null : <p className="text-xs text-muted-foreground">{handoff.block.reason}</p>}
      </div>
      <DecisionButtons handoff={handoff} name={name.text} decision={decision} post={post} />
    </li>
  );
}

/** The Decisions tab (`ui#proposal/Open`): the open handoffs, one card each, and the empty state. */
export function DecisionsTab({ snapshot, replan = null, post, onPreview, onShowIssues }: { snapshot: Snapshot | null; replan?: ReplanView | null; post: (message: ToHost) => void; onPreview: (handoff: string) => void; onShowIssues: () => void }) {
  const now = useNow();
  const handoffs = snapshot?.handoffs ?? [];
  const newHandoff = (
    <Button type="button" onClick={() => post({ type: "writeHandoffRequest" })}>
      <Plus aria-hidden="true" focusable="false" />
      New handoff
    </Button>
  );
  if (snapshot !== null && handoffs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-3 py-10 text-center">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="size-6" />
        </span>
        <h3 className="text-sm font-semibold">{DECISIONS_EMPTY_TITLE}</h3>
        <p className="max-w-md text-xs text-muted-foreground">{DECISIONS_EMPTY_TEXT}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {newHandoff}
          <Button type="button" variant="outline" onClick={onShowIssues}>
            View published issues
          </Button>
        </div>
      </div>
    );
  }
  return (
    <section aria-labelledby="decisions-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 id="decisions-heading" className="text-sm font-semibold">
          {DECISIONS_HEADING}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{DECISIONS_HINT}</span>
          {replan === null ? null : <ReplanControl replan={replan} post={post} />}
          {newHandoff}
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {snapshot === null ? null : handoffs.map((handoff) => <HandoffCard key={handoff.id} handoff={handoff} snapshot={snapshot} now={now} post={post} onPreview={onPreview} />)}
      </ul>
    </section>
  );
}
