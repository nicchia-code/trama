import type { LucideIcon } from "lucide-react";
import { createContext, type ReactElement, type ReactNode, useContext } from "react";
import { type CardNumbers } from "../../../../src/core/card-names";
import type { ProposalTag } from "../../../../src/core/snapshot";
import type { Column } from "../../protocol";
import { cn } from "../lib/utils";
import { viewOfRef } from "../requirements/logic";
import type { ViewContext } from "../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { type TagColour, tagColour, type TaskCard } from "./logic";

/** What every card of the Board needs from the page that holds it. */
export interface BoardEnv {
  context: ViewContext;
  /** The short numbers of the snapshot being drawn. */
  numbers: CardNumbers;
  /** Why a single Task's Run is disabled beyond its own waiting: a Run in progress or Drift resolution. Null when none holds. */
  runReason: string | null;
  /** Scrolls to a card, by its key, and focuses it. */
  showCard(key: string): void;
  /** Opens the model window of a Proposal that carries Tasks. */
  chooseModel(proposal: string): void;
  /** Opens the body window of a Proposal in Backlog. */
  openProposal(proposal: string): void;
  /** Opens the details window of a Task in Active. */
  openTask(task: string): void;
  /** Opens the details window of a Drift in Backlog. */
  openDrift(drift: string): void;
  /** Opens the whole image `name` of a Task in an editor tab. */
  openTaskImage(task: string, name: string): void;
  /** Opens the read-only details of the ghost with this key (`AnnouncedCard.key`). */
  openGhost(key: string): void;
}

export const BoardEnvContext = createContext<BoardEnv | null>(null);

export function useBoardEnv(): BoardEnv {
  const env = useContext(BoardEnvContext);
  if (env === null) throw new Error("A Board card is drawn outside the Board");
  return env;
}

/** A tooltip around one element; with no text the element stays as it is. */
export function Tip({ text, children }: { text: string | null | undefined; children: ReactElement }) {
  if (!text) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="whitespace-pre-line">{text}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A `Button` with an icon to the left of its text. `tooltip` shows on hover and focus, disabled or not, and is also the
 * accessible description; `aria` is the accessible name when the visible text is not enough.
 */
export function BoardButton({
  icon: Icon,
  label,
  aria,
  tooltip,
  description = tooltip,
  disabled = false,
  variant = "outline",
  full = false,
  className,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  aria?: string;
  tooltip?: string | null;
  description?: string | null;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  full?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const button = (
    <Button variant={variant} size="sm" disabled={disabled} aria-label={aria} aria-description={description || undefined} className={cn(full && "w-full", className)} onClick={onClick}>
      {Icon ? <Icon aria-hidden="true" focusable="false" /> : null}
      {label}
    </Button>
  );
  // A disabled button takes no pointer events: its tooltip hangs on the span around it.
  return <Tip text={tooltip}>{disabled ? <span className={cn("inline-flex", full && "w-full")}>{button}</span> : button}</Tip>;
}

const TONE = {
  info: "border-blue-600 bg-blue-600/10 dark:border-blue-400 dark:bg-blue-400/15",
  warning: "border-amber-600 bg-amber-600/10 dark:border-amber-400 dark:bg-amber-400/15",
  error: "border-red-600 bg-red-600/10 dark:border-red-400 dark:bg-red-400/15",
} as const;

export type Tone = keyof typeof TONE;

/** A `Badge` with a tooltip. `label` is its accessible name when it must say more than its text. */
export function TipBadge({ tone, tooltip, label, className, children }: { tone: Tone; tooltip: string; label?: string; className?: string; children: ReactNode }) {
  return (
    <Tip text={tooltip}>
      <Badge variant="outline" data-badge="" role={label === undefined ? undefined : "img"} aria-label={label} aria-description={label === undefined ? tooltip : undefined} className={cn("px-1.5 py-0 text-[11px]", TONE[tone], className)}>
        {children}
      </Badge>
    </Tip>
  );
}

const DOT: Record<Column, string> = {
  todo: "border-muted-foreground bg-transparent",
  doing: "border-amber-500 bg-amber-500",
  done: "border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500",
};

/** The name of a Task's column, as the status dot says it. */
const TASK_STATE: Record<Column, string> = { todo: "To do", doing: "In progress", done: "Done" };

/** A dot for a Task: its column's colour, static. The label is its column's, or "Agent working" while the agent has taken it. */
export function StatusDot({ task }: { task: { column: Column; agent: boolean } }) {
  const name = task.agent ? "Agent working" : TASK_STATE[task.column];
  return (
    <Tip text={name}>
      <span role="img" aria-label={name} className={cn("inline-block size-2.5 shrink-0 rounded-full border", DOT[task.column])} />
    </Tip>
  );
}

const TAG: Record<TagColour, string> = {
  blue: "border-blue-600 bg-blue-600/15 dark:border-blue-400 dark:bg-blue-400/15",
  green: "border-green-600 bg-green-600/15 dark:border-green-400 dark:bg-green-400/15",
  amber: "border-amber-600 bg-amber-600/15 dark:border-amber-400 dark:bg-amber-400/15",
  fuchsia: "border-fuchsia-600 bg-fuchsia-600/15 dark:border-fuchsia-400 dark:bg-fuchsia-400/15",
  cyan: "border-cyan-600 bg-cyan-600/15 dark:border-cyan-400 dark:bg-cyan-400/15",
  red: "border-red-600 bg-red-600/15 dark:border-red-400 dark:bg-red-400/15",
};

/** A tag with its text in a colour taken from that text. Not a button; it does nothing. */
function TagChip({ text, tooltip }: { text: string; tooltip: string }) {
  return (
    <Tip text={tooltip}>
      <span role="img" data-tag="" aria-label={tooltip} className={cn("max-w-full min-w-0 truncate rounded-sm border px-1.5 text-[11px] leading-[18px]", TAG[tagColour(text)])}>
        {text}
      </span>
    </Tip>
  );
}

/** A Proposal's tag: its label or shortened title, with the tooltip `From Proposal <identity>: <title>`. */
export function ProposalTagChip({ tag }: { tag: ProposalTag }) {
  return <TagChip text={tag.text} tooltip={`From Proposal ${tag.proposal}: ${tag.title}`} />;
}

/** The Proposal a Task comes from, as a tag; null when the Task has none. A Proposal that is gone is named by its number or identity. */
export function TaskProposalTag({ card }: { card: TaskCard }) {
  if (card.proposal === null) return null;
  if (card.proposalTag !== null) return <ProposalTagChip tag={card.proposalTag} />;
  return <TagChip text={`Proposal ${card.proposalName?.text ?? card.proposal}`} tooltip={`From Proposal ${card.proposal}`} />;
}

/** Links to the Diagram, to Requirements or to Specs, one chip per reference, each opening that tab with the focus of the reference. `navigate` replaces the page's own navigation. */
export function RefChips({ refs, navigate }: { refs: string[]; navigate?: ViewContext["navigate"] }) {
  const { context } = useBoardEnv();
  const go = navigate ?? context.navigate;
  return (
    <div className="flex flex-wrap gap-1">
      {refs.map((ref) => {
        const view = viewOfRef(ref);
        const text = view === "requirements" ? `Show ${ref} in Requirements` : view === "specs" ? `Show ${ref} in Specs` : `Show ${ref} on the diagram`;
        return (
          <Tip key={ref} text={text}>
            <Button variant="outline" size="sm" aria-description={text} className="h-auto max-w-full rounded-full px-1.5 py-0 text-[11px] font-normal text-primary" onClick={() => go(view, { focus: { kind: "ref", ref } })}>
              <span className="truncate">{ref}</span>
            </Button>
          </Tip>
        );
      })}
    </div>
  );
}

/** The top row of a card: its kind in words (none for a Task), then what follows. */
export function Head({ kind, children }: { kind?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {kind === undefined ? null : <span className="text-[11px] font-semibold text-muted-foreground">{kind}</span>}
      {children}
    </div>
  );
}
