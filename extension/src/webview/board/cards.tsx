import { Ban, Check, ListChecks, Network, Play, Settings, WandSparkles, X } from "lucide-react";
import { Fragment, type ReactNode, useRef, useState } from "react";
import type { FocusRequest } from "../../protocol";
import { cardNameOf, ID_NAMES } from "../../../../src/core/card-names";
import { joinReasons } from "../../../../src/core/design";
import { IdTag, RecurringBadge, UnifiedBadge } from "../diagram/panel";
import { cn } from "../lib/utils";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { SplitButton } from "../split-button";
import { Progress } from "../ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { type AnnouncedCard, blockedReason, historyWhen, namesList, type Badge as BadgeData, type Card as BoardCard, type DriftBlocker, type DriftCard, type FixWait, type NotBlockingItem, type ProposalCard, type ResolvedRow, type TaskCard } from "./logic";
import { BoardButton, Head, RefChips, StatusDot, Tip, TipBadge, TaskProposalTag, useBoardEnv } from "./parts";

/**
 * What a click on a card leaves to its own parts: its buttons, badges, tags and links. A click anywhere else on the card
 * opens its details window.
 */
const OWN_CLICK = "button, a, [data-badge], [data-tag]";

/**
 * Whether a click on a card leaves the card alone: a click on its own parts, or in a popup or menu it opened. Those are
 * portals, outside the card's element, though React still passes their clicks up to the card.
 */
const leavesCardAlone = (event: React.MouseEvent<HTMLElement>): boolean =>
  !event.currentTarget.contains(event.target as Node) || (event.target instanceof Element && event.target.closest(OWN_CLICK) !== null);

/** The shell of a card of the Board: its key, so a link can find it, and its accessible name. */
function Shell({ card, kind, label, className, children, onClick }: { card: { key: string }; kind: string; label: string; className?: string; children: ReactNode; onClick?: (event: React.MouseEvent<HTMLElement>) => void }) {
  return (
    <Card
      role="article"
      aria-label={label}
      data-key={card.key}
      data-kind={kind}
      tabIndex={-1}
      onClick={onClick}
      className={cn("shrink-0 gap-1.5 rounded-md border-l-4 px-2.5 py-2.5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      {children}
    </Card>
  );
}

const Actions = ({ children }: { children: ReactNode }) => <div className="mt-0.5 flex flex-wrap gap-1.5">{children}</div>;

/** The generic badge of a card: a tooltip, and for "requires <Proposal>" the Proposal's number or identity. */
function CardBadge({ badge }: { badge: BadgeData }) {
  const { numbers } = useBoardEnv();
  if (badge.card === undefined) return <TipBadge tone={badge.tone} tooltip={badge.tooltip}>{badge.label}</TipBadge>;
  const name = cardNameOf(numbers, badge.card.kind, badge.card.id);
  const distinction = `${name.isNumber ? ID_NAMES.number : ID_NAMES.identity} ${name.text}`;
  return (
    <TipBadge tone={badge.tone} tooltip={`${badge.tooltip} (${distinction})`}>
      requires <IdTag name={name} />
    </TipBadge>
  );
}

const BLOCK_BADGE = "inline-flex items-center gap-1 rounded-md border border-red-600 bg-red-600/10 px-1.5 text-[11px] leading-4 outline-none hover:bg-red-600/20 focus-visible:ring-2 focus-visible:ring-ring dark:border-red-400 dark:bg-red-400/15 dark:hover:bg-red-400/25";
const BLOCK_ROW = "flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-sm py-0.5 text-left text-xs outline-none hover:[&_.title]:underline focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A badge of a blocked Task that is a button: it opens a popup next to it, titled `title`, whose rows (`children`, given a
 * `follow` that closes the popup and scrolls to a card) lead to the cards that block the Task. Esc, a click outside or
 * pressing the badge again close it and give the focus back to the badge; following a row leaves the focus on its card.
 */
function BlockPopup({ tooltip, title, badge, children }: { tooltip: string; title: string; badge: ReactNode; children: (follow: (key: string) => void) => ReactNode }) {
  const env = useBoardEnv();
  const [open, setOpen] = useState(false);
  const followed = useRef(false);
  const follow = (key: string) => {
    followed.current = true;
    setOpen(false);
    env.showCard(key);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip text={tooltip}>
        <PopoverTrigger asChild>
          <button type="button" data-badge="" aria-label={tooltip} className={BLOCK_BADGE}>
            {badge}
          </button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        align="start"
        aria-label={title}
        className="flex flex-col gap-1 p-2"
        onCloseAutoFocus={(event) => {
          if (!followed.current) return;
          followed.current = false;
          event.preventDefault();
        }}
      >
        <div className="text-[11px] font-semibold text-muted-foreground">{title}</div>
        {children(follow)}
      </PopoverContent>
    </Popover>
  );
}

/** `blocked`: the open Drifts that block a Task, in creation order; each row goes to its red card in Backlog, or to its row in the yellow card. */
function BlockedBadge({ drifts }: { drifts: DriftBlocker[] }) {
  if (drifts.length === 0) return null;
  const tooltip = `Blocked by Drift ${namesList(drifts.map((d) => d.name.text))}`;
  return (
    <BlockPopup tooltip={tooltip} title="Blocked by" badge="blocked">
      {(follow) =>
        drifts.map((d) => (
          <button key={d.id} type="button" className={BLOCK_ROW} onClick={() => follow(d.key)}>
            <IdTag name={d.name} className="text-[11px] font-semibold text-muted-foreground" />
            <span className="title break-words">{d.title}</span>
          </button>
        ))
      }
    </BlockPopup>
  );
}

/** `waiting T4`: a Task waits for the fix Task T4; the popup leads to T4 in Active and says which decided Drift it fixes. */
function WaitingBadge({ fix }: { fix: FixWait }) {
  return (
    <BlockPopup tooltip={`Waiting for Task ${fix.name.text}`} title="Waiting for" badge={<>waiting <IdTag name={fix.name} /></>}>
      {(follow) => (
        <>
          <button type="button" className={BLOCK_ROW} onClick={() => follow(fix.key)}>
            <StatusDot task={fix} />
            <IdTag name={fix.name} className="text-[11px] font-semibold text-muted-foreground" />
            <span className="title break-words">{fix.title}</span>
          </button>
          <p className="text-xs text-muted-foreground">
            From Drift <IdTag name={fix.drift.name} /> {fix.drift.title}
          </p>
        </>
      )}
    </BlockPopup>
  );
}

/** "Resolving": an agent is working on this Drift now; the card stays in Blocked until the resolution is delivered. */
function ResolvingBadge() {
  return (
    <TipBadge tone="info" tooltip="An agent is resolving this Drift" label="An agent is resolving this Drift">
      Resolving
    </TipBadge>
  );
}

/** "Unifying": the Unify Drifts agent gathered this Drift and works on it now; the card stays in Backlog until the unified Drift is registered. */
function UnifyingBadge() {
  return (
    <TipBadge tone="info" tooltip="An agent is unifying this Drift" label="An agent is unifying this Drift">
      Unifying
    </TipBadge>
  );
}

/** The model controls of a Proposal that carries Tasks, at the end of its head row: the chosen model as a badge, then the gear. The gear is never disabled. */
function ModelControls({ card }: { card: ProposalCard }) {
  const env = useBoardEnv();
  const chosen = card.model;
  const choose = `Choose the model for ${card.name.text}`;
  const gear = (
    <Tip text={choose}>
      <Button variant="ghost" size="icon" className="size-6" aria-label={choose} onClick={() => env.chooseModel(card.id)}>
        <Settings aria-hidden="true" focusable="false" />
      </Button>
    </Tip>
  );
  const model =
    chosen === null ? null : (
      <TipBadge tone="info" tooltip={`Model for this Proposal's work: ${chosen.name}`} label={`Model for this Proposal's work: ${chosen.name}`} className="max-w-full break-words whitespace-normal">
        {chosen.name}
      </TipBadge>
    );
  return (
    <span className="ml-auto flex items-center gap-1">
      {model}
      {gear}
    </span>
  );
}

/** The line `Not blocking: T3, T5` under a Drift's Tasks: each one has its reason as tooltip and accessible name, and opens nothing. */
export function NotBlocking({ items }: { items: NotBlockingItem[] }) {
  if (items.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Not blocking:{" "}
      {items.map((item, at) => {
        const text = `Not blocked by this Drift: ${item.reason}`;
        return (
          <Fragment key={at}>
            {at > 0 ? ", " : ""}
            <Tip text={text}>
              <span role="img" aria-label={text} className="font-mono">
                {item.name.text}
              </span>
            </Tip>
          </Fragment>
        );
      })}
    </p>
  );
}

/** The `Resolves Drifts` block of a resolution Proposal: one row per Drift that leads to it on the Diagram, each with the Tasks it blocks. */
function ResolvesList({ card }: { card: ProposalCard }) {
  const env = useBoardEnv();
  return (
    <>
      <div className="text-[11px] font-semibold text-muted-foreground">Resolves Drifts</div>
      <ul aria-label={`Drifts resolved by ${card.title}`} className="flex flex-col gap-1.5 text-xs">
        {card.resolves.map((row: ResolvedRow) => (
          <li key={row.drift} data-key={`drift:${row.drift}`} tabIndex={-1} className="flex flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Tip text="Show the Drift on the diagram">
              <button
                type="button"
                aria-description="Show the Drift on the diagram"
                className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-sm py-px text-left outline-none hover:[&_.title]:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => env.context.navigate("diagram", { drift: row.drift })}
              >
                <IdTag name={row.name} className="text-[11px] font-semibold text-muted-foreground" />
                <span className="title break-words">{row.title}</span>
                {row.unifies.length > 0 ? <UnifiedBadge count={row.unifies.length} /> : null}
                {row.previous.length > 0 ? <RecurringBadge previous={row.previous} /> : null}
                <span className="break-words text-muted-foreground">{row.decision}</span>
              </button>
            </Tip>
            <NotBlocking items={row.notBlocking} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** `View on diagram` or `View requirements`: opens that tab with the focus of a Proposal in Backlog or of a Task in Active. */
function ViewButton({ kind, focus, verb, name }: { kind: "diagram" | "requirements"; focus: FocusRequest; verb: "changes" | "touches"; name: string }) {
  const env = useBoardEnv();
  const text = `Show what ${name} ${verb} ${kind === "diagram" ? "on the diagram" : "in Requirements"}`;
  return kind === "diagram" ? (
    <BoardButton icon={Network} label="View on diagram" aria={text} tooltip={text} onClick={() => env.context.navigate("diagram", { focus })} />
  ) : (
    <BoardButton icon={ListChecks} label="View requirements" aria={text} tooltip={text} onClick={() => env.context.navigate("requirements", { focus })} />
  );
}

function ProposalCardView({ card }: { card: ProposalCard }) {
  const env = useBoardEnv();
  return (
    <Shell
      card={card}
      kind={card.resolution ? "resolution" : "proposal"}
      label={`${card.heading}: ${card.title}`}
      className={cn("cursor-pointer", card.resolution ? "border-l-amber-500 dark:border-l-amber-400" : "border-l-blue-600 dark:border-l-blue-400")}
      // A click on the card, outside its buttons, badges and links, opens its body too.
      onClick={(event) => {
        if (leavesCardAlone(event)) return;
        env.openProposal(card.id);
      }}
    >
      <Head kind={card.resolution ? "Resolution Proposal" : "Proposal"}>
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        {card.badges.map((b, at) => (
          <CardBadge key={at} badge={b} />
        ))}
        {card.choosable ? <ModelControls card={card} /> : null}
      </Head>
      <h3 className="font-semibold break-words">
        <button type="button" className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => env.openProposal(card.id)}>
          {card.title}
        </button>
      </h3>
      {card.creates !== null ? (
        <Tip text={card.creates}>
          <p aria-label={card.creates} className="text-muted-foreground">
            {card.creates}
          </p>
        </Tip>
      ) : null}
      {card.changes.files.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-xs">
          {card.changes.files.map((file) => (
            <li key={file.path} className="flex justify-between gap-2">
              <span className="break-words">{file.path}</span>
              <span className="whitespace-nowrap text-muted-foreground tabular-nums">{file.text}</span>
            </li>
          ))}
          {card.changes.more > 0 ? <li className="text-muted-foreground">{`and ${card.changes.more} more ${card.changes.more === 1 ? "file" : "files"}`}</li> : null}
        </ul>
      ) : null}
      {card.resolves.length > 0 ? <ResolvesList card={card} /> : null}
      <Actions>
        {card.views.diagram ? <ViewButton kind="diagram" focus={{ kind: "proposal", id: card.id }} verb="changes" name={card.name.text} /> : null}
        {card.views.requirements ? <ViewButton kind="requirements" focus={{ kind: "proposal", id: card.id }} verb="changes" name={card.name.text} /> : null}
        <BoardButton icon={Check} label="Approve" aria={`Approve ${card.heading}`} variant="default" disabled={card.blocker !== null} tooltip={card.blocker} onClick={() => env.context.post({ type: "approveProposal", id: card.id })} />
        <SplitButton
          icon={X}
          label="Reject"
          aria={`Reject ${card.heading}`}
          tooltip="Reject this Proposal"
          disabled={card.rejectBlocker !== null}
          reason={card.rejectBlocker}
          arrowDisabled={card.reworkBlocker !== null}
          arrowReason={card.reworkBlocker}
          arrowName={`More ways to reject ${card.name.text}`}
          items={[{ label: "Rework with feedback…", tooltip: "Reject it and have the agent redo it with your feedback", onSelect: () => env.context.post({ type: "reworkProposal", proposal: card.id }) }]}
          onClick={() => env.context.post({ type: "rejectProposal", id: card.id })}
        />
      </Actions>
    </Shell>
  );
}

function DriftCardView({ card }: { card: DriftCard }) {
  const env = useBoardEnv();
  return (
    <Shell
      card={card}
      kind="drift"
      label={`${card.heading}: ${card.title}`}
      className="cursor-pointer border-l-red-600 dark:border-l-red-400"
      // A click on the card, outside its buttons and badges, opens its details window too.
      onClick={(event) => {
        if (leavesCardAlone(event)) return;
        env.openDrift(card.id);
      }}
    >
      <Head kind="Drift">
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        {card.drift.unifies.length > 0 ? <UnifiedBadge count={card.drift.unifies.length} /> : null}
        {card.drift.previous.length > 0 ? <RecurringBadge previous={card.drift.previous} /> : null}
        {card.resolving ? <ResolvingBadge /> : null}
        {card.unifying ? <UnifyingBadge /> : null}
      </Head>
      <h3 className="font-semibold break-words">
        <button type="button" className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => env.openDrift(card.id)}>
          {card.title}
        </button>
      </h3>
      <Actions>
        <BoardButton
          icon={WandSparkles}
          label="Resolve"
          aria={`Resolve ${card.heading}`}
          disabled={card.resolveBlocker !== null}
          tooltip={card.resolveBlocker ?? "Ask an agent to resolve this Drift"}
          description={card.resolveBlocker}
          onClick={() => env.context.post({ type: "launch", action: { kind: "resolve-drifts", drift: card.id } })}
        />
        <SplitButton
          icon={Ban}
          label="Dismiss Drift"
          tooltip="Close this Drift without changes"
          disabled={card.dismissBlocker !== null}
          reason={card.dismissBlocker}
          arrowDisabled={card.reworkBlocker !== null}
          arrowReason={card.reworkBlocker}
          arrowName={`More ways to handle ${card.name.text}`}
          items={[{ label: "Rework with feedback…", tooltip: "Have the agent resolve this Drift following your feedback", onSelect: () => env.context.post({ type: "reworkDrift", drift: card.id }) }]}
          onClick={() => env.context.post({ type: "dismissDrift", id: card.id })}
        />
      </Actions>
    </Shell>
  );
}

function TaskCardView({ card }: { card: TaskCard }) {
  const env = useBoardEnv();
  const runnable = card.column !== "done" && !card.agent;
  const runReason = joinReasons([card.finishing, env.runReason, blockedReason(card.blockedByDrifts, card.waitingFor)]);
  return (
    <Shell
      card={card}
      kind="task"
      label={`Task ${card.name.text}: ${card.title}`}
      className={cn("cursor-pointer border-l-border", card.agent && "board-working")}
      // A click on the card, outside its buttons, badges, tags and links, opens its details window too.
      onClick={(event) => {
        if (leavesCardAlone(event)) return;
        env.openTask(card.id);
      }}
    >
      <Head>
        <StatusDot task={card} />
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        <TaskProposalTag card={card} />
        {card.technical && card.refs.length === 0 ? (
          <TipBadge tone="info" tooltip="Technical Task">
            technical
          </TipBadge>
        ) : null}
        <BlockedBadge drifts={card.blockedByDrifts} />
        {card.waitingFor.map((fix) => (
          <WaitingBadge key={fix.id} fix={fix} />
        ))}
        {card.progress !== null ? <span className="text-[11px] font-medium text-cyan-700 tabular-nums dark:text-cyan-400">{card.progress}%</span> : null}
      </Head>
      <h3 className="font-semibold break-words">
        <button type="button" className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => env.openTask(card.id)}>
          {card.title}
        </button>
      </h3>
      {card.refs.length > 0 ? <RefChips refs={card.refs} /> : null}
      {card.drift !== null ? (
        <p className="text-xs text-muted-foreground">
          from Drift <IdTag name={cardNameOf(env.numbers, "drift", card.drift)} />
        </p>
      ) : null}
      <Actions>
        {card.views.diagram ? <ViewButton kind="diagram" focus={{ kind: "task", id: card.id }} verb="touches" name={card.name.text} /> : null}
        {card.views.requirements ? <ViewButton kind="requirements" focus={{ kind: "task", id: card.id }} verb="touches" name={card.name.text} /> : null}
        {runnable ? (
          <BoardButton icon={Play} label="Run" aria={`Run task ${card.name.text}`} variant="default" disabled={runReason !== null} tooltip={runReason} onClick={() => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } })} />
        ) : null}
      </Actions>
      {card.progress !== null ? (
        <Progress
          value={card.progress}
          aria-label="Agent progress"
          aria-valuetext={`${card.progress}%`}
          className="-mx-2.5 -mb-2.5 mt-1 w-[calc(100%+1.25rem)] rounded-b-md bg-cyan-500/20"
          indicatorClassName="bg-cyan-500"
        />
      ) : null}
    </Shell>
  );
}

/**
 * A Task in the Done column: its status dot, number or identity, Proposal tag and finish time on top, its title (the button that is reached by keyboard), the
 * `unchanged` and `kept` badges, and its reference chips. It has no buttons and no animated border; a click on the card outside its chips and badges opens the same
 * details as a Task in Active.
 */
function DoneCardView({ card, now }: { card: TaskCard; now: Date }) {
  const env = useBoardEnv();
  const when = card.finished === null ? null : historyWhen(card.finished, now);
  const kept = card.keptBy.length === 0 ? null : `Kept while Drift ${card.keptBy.map((d) => d.text).join(", ")} is open`;
  return (
    <Shell
      card={card}
      kind="task"
      label={`Task ${card.name.text}: ${card.title}`}
      className="cursor-pointer border-l-border"
      onClick={(event) => {
        if (leavesCardAlone(event)) return;
        env.openTask(card.id);
      }}
    >
      <Head>
        <StatusDot task={card} />
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        <TaskProposalTag card={card} />
        {when === null ? null : (
          <time dateTime={when.time} title={when.title} className="ml-auto text-[11px] text-muted-foreground">
            {when.text}
          </time>
        )}
      </Head>
      <h3 className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold break-words">
        <button type="button" className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => env.openTask(card.id)}>
          {card.title}
        </button>
        {card.unchanged === null ? null : (
          <TipBadge tone="info" tooltip="Closed without changes" label="Closed without changes">
            unchanged
          </TipBadge>
        )}
        {kept === null ? null : (
          <TipBadge tone="warning" tooltip={kept} label={kept}>
            kept
          </TipBadge>
        )}
      </h3>
      {card.refs.length > 0 ? <RefChips refs={card.refs} /> : null}
    </Shell>
  );
}

export function CardView({ card, now = new Date() }: { card: BoardCard; now?: Date }) {
  if (card.kind === "proposal") return <ProposalCardView card={card} />;
  if (card.kind === "drift") return <DriftCardView card={card} />;
  return card.column === "done" ? <DoneCardView card={card} now={now} /> : <TaskCardView card={card} />;
}

/**
 * The ghost of a card the agent is about to create: a skeleton with the card's kind, its title, what the agent is doing
 * about it and its latest note. It cannot be moved and has no buttons or links inside it: the whole ghost is one button
 * that opens its read-only details. Its accessible name says the kind, the title and the phase, then `Show details`.
 */
export function GhostCard({ card }: { card: AnnouncedCard }) {
  const env = useBoardEnv();
  return (
    <button
      type="button"
      aria-label={`${card.label}. Show details`}
      data-key={card.key}
      data-kind="ghost"
      draggable={false}
      onClick={() => env.openGhost(card.key)}
      className="flex shrink-0 cursor-pointer flex-col gap-1.5 rounded-md border border-dashed bg-card px-2.5 py-2.5 text-left text-card-foreground opacity-70 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-[11px] font-semibold text-muted-foreground">{card.kindLabel}</span>
      <span className="font-semibold break-words">{card.title}</span>
      <span className="flex flex-col gap-1.5">
        <span className="block h-2 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <span className="block h-2 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </span>
      {card.phase === "" ? null : <span className="text-xs text-muted-foreground italic">{card.phase}</span>}
      {card.note === null ? null : (
        <Tip text={card.note}>
          <span className="block w-full animate-pulse truncate text-xs text-muted-foreground motion-reduce:animate-none">{card.note}</span>
        </Tip>
      )}
    </button>
  );
}
