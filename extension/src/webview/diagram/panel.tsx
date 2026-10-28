import { Ban, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type CardName, type CardNumbers, ID_NAMES, cardNameOf } from "../../../../src/core/card-names";
import { joinReasons } from "../../../../src/core/design";
import { REQUIRED_STATUS, appliesUnder } from "../../../../src/core/required";
import type { DriftView, ProposalView } from "../../../../src/core/snapshot";
import type { RefinementView } from "../../protocol";
import { decisionBlockers, decisionLabel, differenceStateLabel, isRefining, MERGE_LABEL, PAUSED_TIP, QUEUED_REASON, type RefineStatus, driftReworkBlocker, finishingBlocker, recurringLabel, REFINEMENT_OFF, REFINING_REASON, refineStatus, resolvedRows, TO_REFINE_TIP, unifiedLabel } from "../board/logic";
import { type DriftComparison, differenceComparison, driftComparison } from "../drift-compare";
import { dismissBlocker } from "../dismiss";
import { InlineMarkdown, Markdown } from "../markdown";
import { previewable, TaskImages } from "../task-images";
import type { ViewContext } from "../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SplitButton } from "../split-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../lib/utils";
import { viewOfRef } from "../requirements/logic";
import type { Detail, DetailItem } from "./details";
import type { DiagramStore } from "./state";
import { currentDetail } from "./state";

const CHANGE_TEXT = { added: "added by the Proposal", removed: "removed by the Proposal", changed: "changed by the Proposal", same: "" } as const;

const CHANGE_COLOR = {
  added: "text-blue-600 dark:text-blue-400",
  changed: "text-blue-600 dark:text-blue-400",
  removed: "text-red-600 line-through dark:text-red-400",
  same: "",
} as const;

const HEADING = "mt-3.5 mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase";
const PROBLEM = "mt-2 font-semibold text-red-600 dark:text-red-400";
const PROBLEMS = "mt-0.5 list-disc pl-4 text-xs break-words text-red-600 dark:text-red-400";

/** A button with its tooltip: the tooltip is also its accessible description, and a disabled button shows it too. */
export function ActionButton({
  icon: Icon,
  label,
  tooltip,
  disabled = false,
  variant = "outline",
  onClick,
}: {
  icon?: typeof Check;
  label: string;
  tooltip: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "link";
  onClick: () => void;
}) {
  const button = (
    <Button variant={variant} size="sm" disabled={disabled} aria-disabled={disabled || undefined} aria-description={tooltip} onClick={onClick}>
      {Icon ? <Icon aria-hidden="true" focusable="false" /> : null}
      {label}
    </Button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{disabled ? <span className="inline-flex">{button}</span> : button}</TooltipTrigger>
      <TooltipContent className="whitespace-pre-line">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/** A card's short number while it is live, otherwise its permanent identity; the tooltip and the accessible name say which. */
export function IdTag({ name, className }: { name: CardName; className?: string }) {
  const what = name.isNumber ? ID_NAMES.number : ID_NAMES.identity;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span role="img" aria-label={`${what} ${name.text}`} className={cn("font-mono tracking-normal normal-case", className)}>
          {name.text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{what}</TooltipContent>
    </Tooltip>
  );
}

/** `label` then the card's number or identity tag, so it is named the way the Board names it. */
function Named({ label, name }: { label: string; name: CardName }) {
  return (
    <span>
      {label === "" ? "" : `${label} `}
      <IdTag name={name} />
    </span>
  );
}

/** The badge of a unified Drift: it only says how many Drifts it unifies, and opens nothing. */
export function UnifiedBadge({ count }: { count: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" aria-label={unifiedLabel(count)} data-badge>
          unified
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{unifiedLabel(count)}</TooltipContent>
    </Tooltip>
  );
}

/** The `Unifies` section of a unified Drift: one row per merged Drift, which leads to its details on the Diagram. */
export function UnifiesList({ unifies, numbers, show }: { unifies: readonly { id: string; title: string }[]; numbers: CardNumbers; show: (drift: string) => void }) {
  return (
    <section className="my-2 text-xs">
      <h4 className="mb-1 text-xs font-semibold">Unifies</h4>
      <ul aria-label="Drifts unified by this Drift" className="flex flex-col gap-0.5">
        {unifies.map((u) => (
          <li key={u.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" data-action={`unifies:${u.id}`} className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-sm py-px text-left outline-none hover:[&_.title]:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => show(u.id)}>
                  <IdTag name={cardNameOf(numbers, "drift", u.id)} />
                  <span className="title break-words">{u.title}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Show the Drift on the diagram</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The Drifts a recurring Drift follows when it follows several, each with identity, title and how it was decided. */
function FollowsList({ previous, numbers, show }: { previous: DriftView["previous"]; numbers: CardNumbers; show: (drift: string) => void }) {
  return (
    <section className="my-2 text-xs">
      <h4 className="mb-1 text-xs font-semibold">Follows</h4>
      <ul aria-label="Drifts followed by this Drift" className="flex flex-col gap-0.5">
        {previous.map((p) => (
          <li key={p.id}>
            <button type="button" data-action={`follows:${p.id}`} className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-sm py-px text-left outline-none hover:[&_.title]:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => show(p.id)}>
              <IdTag name={cardNameOf(numbers, "drift", p.id)} />
              <span className="title break-words">{p.title}</span>
              <span className="break-words text-muted-foreground">{decisionLabel(p.decision)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecurringBadge({ previous }: { previous: readonly { id: string; title: string }[] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" aria-label={recurringLabel(previous)} data-badge>
          recurring
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{recurringLabel(previous)}</TooltipContent>
    </Tooltip>
  );
}

/** The badge of a Drift from a merge: it only says the code may be right, and opens nothing. */
export function MergeBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" aria-label={MERGE_LABEL} data-badge>
          Merge
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{MERGE_LABEL}</TooltipContent>
    </Tooltip>
  );
}

function Lines({ lines, className }: { lines: string[]; className: string }) {
  return (
    <ul className={className}>
      {lines.map((line, at) => (
        <li key={at}>{line}</li>
      ))}
    </ul>
  );
}

export function DriftCompare({ drift, openLink }: { drift: DriftView; openLink: (url: string) => void }) {
  return <Sides comparison={driftComparison(drift)} openLink={openLink} />;
}

/** The two columns of what happens and what should happen, stacked when the panel is narrow. */
function Sides({ comparison: c, openLink }: { comparison: DriftComparison; openLink: (url: string) => void }) {
  const column = (heading: string, source: string | null, text: string) => (
    <section className="min-w-0">
      <h4 className="mb-1 text-xs font-semibold">
        {heading}
        {source !== null ? <span className="ml-1 font-normal text-muted-foreground">{source}</span> : null}
      </h4>
      <Markdown source={text} openLink={openLink} />
    </section>
  );
  return (
    <div className="my-2 grid grid-cols-1 gap-3 text-xs">
      {column("What happens", null, c.happens)}
      {column("What should happen", c.shouldSource, c.should)}
    </div>
  );
}

/**
 * The blocks of a unified Drift with differences, one per difference in order, in place of the two sides. The header of a block is a button that
 * opens and closes it; a difference still open starts expanded and a decided one collapsed. `request` asks for one block to open and take the focus
 * (a row of a resolution led here). The fix options show only where `fixOptions` is set (the Diagram); `showTask` leads to the fix Task of a decision.
 */
export function DifferenceBlocks({
  drift,
  numbers,
  openLink,
  fixOptions,
  request,
  showTask,
}: {
  drift: DriftView;
  numbers: CardNumbers;
  openLink: (url: string) => void;
  fixOptions: boolean;
  request: { difference: string; n: number } | null;
  showTask: (task: string) => void;
}) {
  const base = useId();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(drift.differences.filter((d) => d.open).map((d) => d.drift)));
  const headers = useRef(new Map<string, HTMLButtonElement>());
  const toggle = (difference: string) => setExpanded((now) => (now.has(difference) ? new Set([...now].filter((x) => x !== difference)) : new Set([...now, difference])));
  /** Opens the block and puts the focus on its header. */
  const reveal = (difference: string) => {
    setExpanded((now) => (now.has(difference) ? now : new Set([...now, difference])));
    const header = headers.current.get(difference);
    header?.scrollIntoView?.({ block: "nearest" });
    header?.focus();
  };
  useEffect(() => {
    if (request !== null) reveal(request.difference);
  }, [request?.n]);
  return (
    <section aria-label="Differences of this Drift" className="my-2 flex flex-col gap-2 text-xs">
      {drift.differences.map((d) => {
        const isOpen = expanded.has(d.drift);
        const headerId = `${base}-header-${d.drift}`;
        const bodyId = `${base}-body-${d.drift}`;
        const linked = d.linked.flatMap((name) => drift.differences.find((x) => x.drift === name) ?? []);
        const chosen = d.option === null ? undefined : d.options[d.option - 1];
        return (
          <div key={d.drift} data-difference={d.drift} className="rounded-md border">
            <div className="flex flex-col gap-1 p-2">
              <button
                type="button"
                id={headerId}
                ref={(node) => {
                  if (node) headers.current.set(d.drift, node);
                  else headers.current.delete(d.drift);
                }}
                aria-expanded={isOpen}
                aria-controls={bodyId}
                className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => toggle(d.drift)}
              >
                {isOpen ? <ChevronUp aria-hidden="true" focusable="false" className="size-3.5 self-center" /> : <ChevronDown aria-hidden="true" focusable="false" className="size-3.5 self-center" />}
                <span className="font-semibold break-words">{d.title}</span>
                <IdTag name={cardNameOf(numbers, "drift", d.drift)} />
                <span data-state={d.open ? "open" : d.decision} className="text-muted-foreground">
                  {differenceStateLabel(d)}
                </span>
              </button>
              {linked.length > 0 ? (
                <p className="pl-5 text-muted-foreground">
                  Linked to{" "}
                  {linked.map((other, at) => (
                    <Fragment key={other.drift}>
                      {at > 0 ? ", " : ""}
                      <button type="button" data-action={`linked:${other.drift}`} className="rounded-sm text-left text-foreground underline outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => reveal(other.drift)}>
                        {other.title}
                      </button>
                    </Fragment>
                  ))}
                </p>
              ) : null}
            </div>
            {isOpen ? (
              <div id={bodyId} role="region" aria-labelledby={headerId} className="border-t px-2 pb-2">
                {d.open ? (
                  <>
                    <Sides comparison={differenceComparison(d)} openLink={openLink} />
                    {d.where !== null && d.where.trim() !== "" ? (
                      <section className="my-2">
                        <h4 className="mb-1 text-xs font-semibold">Where in the code</h4>
                        <Markdown source={d.where} openLink={openLink} />
                      </section>
                    ) : null}
                    {fixOptions && d.options.length > 0 ? (
                      <section className="my-2">
                        <h4 className="mb-1 text-xs font-semibold">Fix options</h4>
                        <ol className="flex list-decimal flex-col gap-1.5 pl-4">
                          {d.options.map((option, at) => (
                            <li key={at} className="break-words">
                              <span className="font-semibold">{option.title}</span>
                              {at === 0 ? <span className="text-muted-foreground"> (recommended)</span> : null}
                              {option.text.trim() !== "" ? <Markdown source={option.text} openLink={openLink} /> : null}
                            </li>
                          ))}
                        </ol>
                      </section>
                    ) : null}
                  </>
                ) : (
                  <div className="my-2 flex flex-col gap-1.5">
                    <p>
                      <span className="font-semibold">Decision</span> {differenceStateLabel(d)}
                    </p>
                    {chosen !== undefined ? (
                      <p>
                        <span className="font-semibold">Chosen option</span> {d.option}. {chosen.title}
                      </p>
                    ) : null}
                    {d.note !== null && d.note.trim() !== "" ? (
                      <section>
                        <h4 className="mb-1 text-xs font-semibold">Note</h4>
                        <Markdown source={d.note} openLink={openLink} />
                      </section>
                    ) : null}
                    {d.task !== null ? (
                      <p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" data-action={`fix-task:${d.task}`} className="rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => showTask(d.task!)}>
                              Fix Task <IdTag name={cardNameOf(numbers, "task", d.task)} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Show the Task on the Board</TooltipContent>
                        </Tooltip>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function Item({ item, jump, openLink }: { item: DetailItem; jump: (ref: string) => void; openLink: (url: string) => void }) {
  const color = CHANGE_COLOR[item.change];
  const head = item.card && !item.card.inNote ? <Named label={item.card.label} name={item.card.name} /> : item.text;
  const { ref } = item;
  return (
    <li className="mb-2 break-words">
      {ref ? (
        <Button variant="link" className={cn("h-auto p-0 text-left font-semibold whitespace-normal", color)} onClick={() => jump(ref)}>
          {head}
        </Button>
      ) : (
        <span className={cn("font-semibold", color)}>{head}</span>
      )}
      {item.change !== "same" ? (
        <Badge variant="outline" className={cn("ml-1.5 px-1.5 py-0 text-[10px]", color.replace(" line-through", ""))}>
          {item.change}
        </Badge>
      ) : null}
      {item.card?.inNote ? (
        <div className="text-xs text-muted-foreground">
          <Named label={item.card.label} name={item.card.name} />
        </div>
      ) : item.note ? (
        <div className="text-xs text-muted-foreground">{item.block ? <Markdown source={item.note} openLink={openLink} /> : <InlineMarkdown source={item.note} openLink={openLink} />}</div>
      ) : null}
    </li>
  );
}

function ProposalTasks({ proposal, jump, openLink, openImage }: { proposal: ProposalView; jump: (ref: string) => void; openLink: (url: string) => void; openImage: (task: string, name: string) => void }) {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (at: number) => setOpen((now) => (now.has(at) ? new Set([...now].filter((x) => x !== at)) : new Set([...now, at])));
  const refLink = (ref: string) => (
    <Button key={ref} variant="link" className="h-auto p-0 font-semibold" onClick={() => jump(ref)}>
      {ref}
    </Button>
  );
  return (
    <section>
      <div className={HEADING}>Tasks</div>
      <ul>
        {proposal.tasks.map((t, at) => (
          <li key={at} className="mb-2 break-words">
            <span className="font-semibold">{t.title}</span>
            {t.technical ? (
              <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] text-blue-600 dark:text-blue-400">
                Technical
              </Badge>
            ) : null}{" "}
            {t.refs.map((ref) => (
              <Fragment key={ref}> {refLink(ref)}</Fragment>
            ))}
            {t.body.trim() !== "" || previewable(t.images).length > 0 ? (
              <>
                <div className="mt-1">
                  <Button variant="ghost" size="sm" aria-expanded={open.has(at)} onClick={() => toggle(at)}>
                    {open.has(at) ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                    {open.has(at) ? "Hide details" : "Show details"}
                  </Button>
                </div>
                {open.has(at) ? (
                  <>
                    {t.body.trim() !== "" ? <Markdown source={t.body} openLink={openLink} /> : null}
                    <TaskImages images={t.images} open={(name) => openImage(t.id, name)} />
                  </>
                ) : null}
              </>
            ) : null}
          </li>
        ))}
        {proposal.removals.map((r) => (
          <li key={r.ref} className="mb-2">
            Remove code of {refLink(r.ref)}
            <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] text-blue-600 dark:text-blue-400">
              on approval
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResolvesBlock({ proposal, numbers, showDrift }: { proposal: ProposalView; numbers: CardNumbers; showDrift: (drift: string, difference?: string) => void }) {
  return (
    <>
      <div className={HEADING}>Resolves Drifts</div>
      <ul aria-label={`Drifts resolved by ${proposal.title}`} className="flex flex-col gap-0.5 text-xs">
        {resolvedRows(proposal, numbers).map((row) => (
          <li key={`${row.drift}:${row.difference ?? ""}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" data-action={`resolves:${row.drift}`} className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 py-px text-left hover:[&_.title]:underline" onClick={() => (row.difference === null ? showDrift(row.drift) : showDrift(row.drift, row.difference))}>
                  <IdTag name={row.name} />
                  <span className="title break-words">{row.title}</span>
                  {row.unifies.length > 0 ? <UnifiedBadge count={row.unifies.length} /> : null}
                  {row.previous.length > 0 ? <RecurringBadge previous={row.previous} /> : null}
                  {row.merge ? <MergeBadge /> : null}
                  <span className="break-words text-muted-foreground">{row.decision}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{row.difference === null ? "Show the Drift on the diagram" : "Show the difference on the diagram"}</TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Heading of the changed-files block: the Stale wording when refining is off, else what the refining status means. */
function refineHeading(refine: RefineStatus | null): string {
  if (refine === null) return "Stale: the Model changed since the Proposal was written";
  if (isRefining(refine)) return REFINING_REASON;
  if (refine === "queued") return QUEUED_REASON;
  if (refine === "stopped") return "Refining stopped before the hand-over. Approve resumes it.";
  if (refine === "paused") return PAUSED_TIP;
  return "To refine: the Model changed since the Proposal was written. Approve refines it first.";
}

function ProposalBlock({
  proposal: p,
  numbers,
  finishing,
  resolveReason,
  refinement,
  actions,
}: {
  proposal: ProposalView;
  numbers: CardNumbers;
  finishing: string | null;
  /** Why Resolve is disabled, for a resolution Proposal (its Reject arrow then waits on it), or null. */
  resolveReason: string | null;
  refinement: RefinementView;
  actions: { jump(ref: string): void; showDrift(drift: string): void; approve(id: string): void; reject(id: string): void; rework(id: string): void; openLink(url: string): void; openTaskImage(task: string, name: string): void };
}) {
  const open = p.requires.filter((r) => appliesUnder(r.status));
  const unusable = p.requires.filter((r) => !appliesUnder(r.status));
  const refine = refineStatus(p, refinement);
  const { approve: blocker, reject: rejectReason } = decisionBlockers(p, refine, numbers, refinement, finishing);
  return (
    <section className="mt-4.5 rounded-md border border-dashed border-blue-600 p-3 dark:border-blue-400">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
        Proposal <IdTag name={cardNameOf(numbers, "proposal", p.id)} />
      </div>
      <h3 className="mt-0.5 mb-1.5 text-[13px] font-semibold">{p.title}</h3>
      {p.body ? <Markdown source={p.body} openLink={actions.openLink} /> : null}
      {open.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          Drawn on top of{" "}
          {open.map((r, at) => (
            <Fragment key={r.id}>
              {at > 0 ? ", " : ""}
              <Named label="Proposal" name={cardNameOf(numbers, "proposal", r.id)} />
            </Fragment>
          ))}
          , not yet approved: what they add is shown as if approved.
        </div>
      ) : null}
      {unusable.length > 0 ? (
        <>
          <div className={PROBLEM}>Requires Proposals that cannot be approved</div>
          <ul className={PROBLEMS}>
            {unusable.map((r) => (
              <li key={r.id}>
                <Named label="Proposal" name={cardNameOf(numbers, "proposal", r.id)} />
                {`${r.title ? ` "${r.title}"` : ""} ${REQUIRED_STATUS[r.status]}`}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {p.stale.length > 0 ? (
        <>
          <div className={PROBLEM}>{refineHeading(refine)}</div>
          <Lines lines={p.stale} className={PROBLEMS} />
        </>
      ) : null}
      {p.unbased.length > 0 ? (
        <>
          <div className={PROBLEM}>Touches files it has no base for</div>
          <Lines lines={p.unbased} className={PROBLEMS} />
        </>
      ) : null}
      {p.errors.length > 0 ? (
        <>
          <div className={PROBLEM}>The Model with this Proposal applied is invalid</div>
          <Lines lines={p.errors.map((d) => (d.line > 0 ? `${d.file}:${d.line}: ${d.message}` : `${d.file}: ${d.message}`))} className={PROBLEMS} />
        </>
      ) : null}
      {p.unfixable.length > 0 ? (
        <>
          <div className={PROBLEM}>Resolve Drifts must rewrite this resolution</div>
          <Lines lines={p.unfixable} className={PROBLEMS} />
        </>
      ) : null}
      {p.changes.length > 0 ? (
        <>
          <div className={HEADING}>Changes</div>
          <ul>
            {p.changes.map((c) => (
              <li key={c.path} className={cn("mb-1.5", CHANGE_COLOR[c.change === "modified" ? "changed" : c.change].replace(" line-through", ""))}>
                <strong>{`${c.path} (${c.change})`}</strong>
                {c.details.length > 0 ? <Lines lines={c.details} className="my-1 font-mono text-xs break-words" /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {p.resolves.length > 0 ? <ResolvesBlock proposal={p} numbers={numbers} showDrift={actions.showDrift} /> : null}
      {p.tasks.length + p.removals.length > 0 ? <ProposalTasks proposal={p} jump={actions.jump} openLink={actions.openLink} openImage={actions.openTaskImage} /> : null}
      <div className="my-2.5 flex flex-wrap gap-1.5">
        <ActionButton icon={Check} variant="default" label="Approve" disabled={blocker !== null} tooltip={blocker ?? (refine === "to-refine" ? TO_REFINE_TIP : "Apply this Proposal to the Model")} onClick={() => actions.approve(p.id)} />
        <SplitButton
          icon={X}
          label="Reject"
          tooltip="Reject this Proposal"
          disabled={rejectReason !== null}
          reason={rejectReason}
          arrowDisabled={joinReasons([rejectReason, resolveReason]) !== null}
          arrowReason={joinReasons([rejectReason, resolveReason])}
          arrowName={`More ways to reject ${cardNameOf(numbers, "proposal", p.id).text}`}
          items={[{ label: "Rework with feedback…", description: "Reject it and have the agent redo it with your feedback", onSelect: () => actions.rework(p.id) }]}
          onClick={() => actions.reject(p.id)}
        />
      </div>
    </section>
  );
}

/** The detail of the selection, or of the level, with what the developer can do from it. Nothing here edits the Model. */
export function DetailsPanel({
  detail,
  dismissReason,
  proposalWait,
  proposalResolveReason,
  driftReworkReason,
  refinement = REFINEMENT_OFF,
  differenceRequest = null,
  actions,
}: {
  detail: Detail;
  /** Why «Dismiss Drift» is disabled for the Drift in the detail, or null. */
  dismissReason: string | null;
  /** Why Approve and Reject are disabled for the Proposal in the detail, or null. */
  proposalWait: string | null;
  /** Why Resolve is disabled, for the resolution Proposal in the detail (its Reject arrow waits on it), or null. */
  proposalResolveReason: string | null;
  /** The Proposal refinement; off by default. */
  refinement?: RefinementView;
  /** A block of the differences of the Drift in the detail to open and focus (a row of a resolution led here), or null. */
  differenceRequest?: { difference: string; n: number } | null;
  /** Why the arrow of «Dismiss Drift» is disabled for the Drift in the detail, or null. */
  driftReworkReason: string | null;
  actions: {
    jump(ref: string): void;
    openFile(path: string): void;
    drill(level: NonNullable<Detail["drill"]>): void;
    toggle(state: string): void;
    approve(id: string): void;
    reject(id: string): void;
    rework(id: string): void;
    reworkDrift(id: string): void;
    openLink(url: string): void;
    openTaskImage(task: string, name: string): void;
    showDrift(id: string, difference?: string): void;
    showTask(task: string): void;
    dismiss(id: string): void;
  };
}) {
  const { drift, drill, toggle, file } = detail;
  const driftName = drift ? cardNameOf(detail.numbers, "drift", drift.id) : null;
  const previous = drift?.previous;
  const buttons: ReactNode[] = [];
  if (drill) buttons.push(<ActionButton key="drill" label="Drill in" tooltip="Show this part at the next zoom level" onClick={() => actions.drill(drill)} />);
  if (toggle) buttons.push(<ActionButton key="toggle" label={toggle.expanded ? "Collapse" : "Expand"} tooltip="Draw the sub-States inside this State" onClick={() => actions.toggle(toggle.state)} />);
  if (file) buttons.push(<ActionButton key="file" label="Open file" tooltip={file} onClick={() => actions.openFile(file)} />);
  return (
    <>
      <header>
        <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {driftName === null ? (
            detail.kind
          ) : (
            <>
              Drift <IdTag name={driftName} />
            </>
          )}
        </div>
        <h2 className="mt-0.5 mb-1.5 text-[15px] font-semibold break-words">{detail.title}</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {drift && drift.unifies.length > 0 ? <UnifiedBadge count={drift.unifies.length} /> : null}
          {previous && previous.length > 0 ? <RecurringBadge previous={previous} /> : null}
          {drift?.merge ? <MergeBadge /> : null}
          {drift?.unifiedInto != null ? (
            <Badge variant="outline" data-state="unified">
              Unified
            </Badge>
          ) : null}
          {detail.change !== "same" ? (
            <Badge variant="outline" className={CHANGE_COLOR[detail.change].replace(" line-through", "")}>
              {CHANGE_TEXT[detail.change]}
            </Badge>
          ) : null}
        </div>
      </header>
      {drift ? (
        <>
          {drift.differences.length > 0 ? (
            <DifferenceBlocks drift={drift} numbers={detail.numbers} openLink={actions.openLink} fixOptions request={differenceRequest} showTask={actions.showTask} />
          ) : (
            <DriftCompare drift={drift} openLink={actions.openLink} />
          )}
          {drift.unifies.length > 0 ? <UnifiesList unifies={drift.unifies} numbers={detail.numbers} show={actions.showDrift} /> : null}
          {drift.previous.length > 1 ? <FollowsList previous={drift.previous} numbers={detail.numbers} show={actions.showDrift} /> : null}
          {drift.unifiedInto != null ? (
            <p className="my-2 text-xs">
              <button type="button" data-action={`unified-into:${drift.unifiedInto.id}`} className="rounded-sm text-left outline-none hover:[&_.title]:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => actions.showDrift(drift.unifiedInto!.id)}>
                Unified into <IdTag name={cardNameOf(detail.numbers, "drift", drift.unifiedInto.id)} /> <span className="title">– {drift.unifiedInto.title}</span>
              </button>
            </p>
          ) : (
          <div className="my-2.5 flex flex-wrap gap-1.5">
            <SplitButton
              icon={Ban}
              label="Dismiss Drift"
              tooltip="Close this Drift without changes"
              disabled={dismissReason !== null}
              reason={dismissReason}
              arrowDisabled={driftReworkReason !== null}
              arrowReason={driftReworkReason}
              arrowName={`More ways to handle ${driftName?.text ?? drift.id}`}
              items={[{ label: "Rework with feedback…", description: "Have the agent resolve this Drift following your feedback", onSelect: () => actions.reworkDrift(drift.id) }]}
              onClick={() => actions.dismiss(drift.id)}
            />
          </div>
          )}
        </>
      ) : null}
      {detail.description ? (
        <div className="my-1.5">
          <Markdown source={detail.description} openLink={actions.openLink} />
        </div>
      ) : null}
      {detail.changes.length > 0 ? (
        <>
          <div className={HEADING}>What changes</div>
          <Lines lines={detail.changes} className="my-1 font-mono text-xs break-words" />
        </>
      ) : null}
      {buttons.length > 0 ? <div className="my-2.5 flex flex-wrap gap-1.5">{buttons}</div> : null}
      {detail.sections.map((s, at) =>
        s.items.length === 0 ? null : (
          <Fragment key={at}>
            <div className={HEADING}>{s.heading}</div>
            <ul>
              {s.items.map((item, i) => (
                <Item key={i} item={item} jump={actions.jump} openLink={actions.openLink} />
              ))}
            </ul>
          </Fragment>
        ),
      )}
      {detail.proposal ? <ProposalBlock proposal={detail.proposal} numbers={detail.numbers} finishing={proposalWait} resolveReason={proposalResolveReason} refinement={refinement} actions={actions} /> : null}
    </>
  );
}

/** The details of what the Diagram has selected, wired to the store and to the editor host. */
export function DiagramDetails({ store, context }: { store: DiagramStore; context: ViewContext }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const detail = useMemo(() => currentDetail(state), [state]);
  const { snapshot } = state;
  if (!detail) return null;
  return (
    <DetailsPanel
      detail={detail}
      dismissReason={detail.drift && snapshot ? dismissBlocker(detail.drift.id, snapshot.resolutionDrifts, state.resolveBlocker, snapshot.finishingDrifts) : null}
      proposalWait={detail.proposal && snapshot ? finishingBlocker(detail.proposal.id, snapshot.finishingProposals) : null}
      proposalResolveReason={detail.proposal?.kind === "resolution" ? state.resolveBlocker : null}
      refinement={state.refinement}
      differenceRequest={state.differenceRequest !== null && state.differenceRequest.drift === detail.drift?.id ? state.differenceRequest : null}
      driftReworkReason={
        detail.drift && snapshot
          ? driftReworkBlocker(dismissBlocker(detail.drift.id, snapshot.resolutionDrifts, state.resolveBlocker, snapshot.finishingDrifts), state.resolveBlocker)
          : null
      }
      actions={{
        jump: (ref) => (viewOfRef(ref) === "requirements" ? context.navigate("requirements", { ref }) : store.navigateRef(ref)),
        openFile: (path) => context.post({ type: "openModelFile", path }),
        drill: (level) => store.setLevel(level),
        toggle: (name) => store.toggleState(name),
        approve: (id) => context.post({ type: "approveProposal", id }),
        reject: (id) => context.post({ type: "rejectProposal", id }),
        rework: (id) => context.post({ type: "reworkProposal", proposal: id }),
        reworkDrift: (id) => context.post({ type: "reworkDrift", drift: id }),
        openLink: context.openLink,
        openTaskImage: (task, name) => context.post({ type: "openTaskImage", task, name }),
        showDrift: (id, difference) => store.navigateDrift(id, difference),
        showTask: (task) => context.navigate("board", { task }),
        dismiss: (id) => context.post({ type: "dismissDrift", id }),
      }}
    />
  );
}
