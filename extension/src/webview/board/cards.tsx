import { Ban, Check, ChevronDown, ChevronUp, FileInput, Link, ListChecks, Network, Play, Settings, WandSparkles, X } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import type { FocusRequest } from "../../protocol";
import { cardNameOf, ID_NAMES } from "../../../../src/core/card-names";
import { joinReasons } from "../../../../src/core/design";
import { CriticalBadge, DriftCompare, IdTag, RecurringBadge } from "../diagram/panel";
import { cn } from "../lib/utils";
import { Markdown } from "../markdown";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { AGENT_NAMES, type AnnouncedCard, type BlockBadge, type Badge as BadgeData, type Card as BoardCard, type DriftCard, type NotBlockingItem, type ProposalCard, type ResolvedRow, type TaskCard, type WaitingCard } from "./logic";
import { BoardButton, Head, RefChips, StatusDot, Tip, TipBadge, TaskProposalTag, useBoardEnv } from "./parts";

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

/** "blocked D2" / "waiting T4": a link to the Drift on the Diagram or to a card of the Board. It disables nothing. */
function BlockedBadge({ badge }: { badge: BlockBadge }) {
  const env = useBoardEnv();
  const target = badge.target;
  const prefix = badge.label.startsWith("blocked ") ? "blocked " : "waiting ";
  const id = target.kind === "diagram" ? target.drift : target.key.slice("task:".length);
  const name = cardNameOf(env.numbers, target.kind === "diagram" ? "drift" : "task", id);
  const text = `${badge.tooltip} (${name.isNumber ? ID_NAMES.number : ID_NAMES.identity} ${name.text})`;
  return (
    <Tip text={text}>
      <button
        type="button"
        data-badge=""
        aria-label={text}
        className="inline-flex items-center gap-1 rounded-md border border-red-600 bg-red-600/10 px-1.5 text-[11px] leading-4 outline-none hover:bg-red-600/20 focus-visible:ring-2 focus-visible:ring-ring dark:border-red-400 dark:bg-red-400/15 dark:hover:bg-red-400/25"
        onClick={() => (target.kind === "diagram" ? env.context.navigate("diagram", { drift: target.drift }) : env.showCard(target.key))}
      >
        {prefix}
        <IdTag name={name} />
      </button>
    </Tip>
  );
}

/** "autopilot failed": the autopilot failed on or excluded this case. The reason is in the tooltip; the badge moves no focus. */
function FailedBadge({ reason }: { reason: string | null }) {
  if (reason === null) return null;
  return (
    <TipBadge tone="error" tooltip={`Autopilot failed: ${reason}`} label={`Autopilot failed: ${reason}`}>
      autopilot failed
    </TipBadge>
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
    chosen === null ? null : chosen.applies ? (
      <TipBadge tone="info" tooltip={`Model for this Proposal's work: ${chosen.name}`} label={`Model for this Proposal's work: ${chosen.name}`} className="max-w-full break-words whitespace-normal">
        {chosen.name}
      </TipBadge>
    ) : (
      <TipBadge
        tone="info"
        tooltip={`Chosen for ${AGENT_NAMES[chosen.agent]}: the Settings roles apply`}
        label={`Chosen for ${AGENT_NAMES[chosen.agent]}: the Settings roles apply`}
        className="max-w-full border-muted-foreground bg-transparent break-words whitespace-normal text-muted-foreground line-through dark:border-muted-foreground dark:bg-transparent"
      >
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

/** The other open Drifts that also block a Task, as a link icon whose tooltip and name list their short numbers; null when none. */
function AlsoBlocked({ card, containing }: { card: TaskCard; containing: string | null }) {
  const { numbers } = useBoardEnv();
  const others = card.blockedBy.flatMap((b) => (b.kind === "drift" && b.drift !== containing ? [cardNameOf(numbers, "drift", b.drift).text] : []));
  if (others.length === 0) return null;
  const text = `Also blocked by ${others.join(", ")}`;
  return (
    <Tip text={text}>
      <span role="img" aria-label={text} className="inline-flex text-red-600 dark:text-red-400">
        <Link size={16} aria-hidden="true" focusable="false" />
      </span>
    </Tip>
  );
}

/**
 * A Task inside a Drift, a resolution Proposal or a waiting card: its status dot, its ID and its Proposal tag, then its
 * title. No toggle, body, buttons or blocked badges. `containing` is the Drift the row sits under, if any; it is left out
 * of the link that says which other open Drifts also block it.
 */
function TaskRow({ card, containing }: { card: TaskCard; containing: string | null }) {
  return (
    <div data-key={card.key} tabIndex={-1} className="flex flex-col gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Head>
        <StatusDot task={card} />
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        <TaskProposalTag card={card} />
        <AlsoBlocked card={card} containing={containing} />
      </Head>
      <span className="break-words">{card.title}</span>
    </div>
  );
}

/** The line `Not blocking: T3, T5` under a Drift's Tasks: each one has its reason as tooltip and accessible name, and opens nothing. */
function NotBlocking({ items }: { items: NotBlockingItem[] }) {
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
          <li key={row.drift} className="flex flex-col gap-1">
            <Tip text="Show the Drift on the diagram">
              <button
                type="button"
                aria-description="Show the Drift on the diagram"
                className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-sm py-px text-left outline-none hover:[&_.title]:underline focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => env.context.navigate("diagram", { drift: row.drift })}
              >
                <IdTag name={row.name} className="text-[11px] font-semibold text-muted-foreground" />
                <span className="title break-words">{row.title}</span>
                {row.critical ? <CriticalBadge /> : null}
                {row.previous !== null ? <RecurringBadge previous={row.previous} /> : null}
                <span className="break-words text-muted-foreground">{row.decision}</span>
              </button>
            </Tip>
            <FailedBadge reason={row.autopilotFailed} />
            {row.blocked.length > 0 ? (
              <div className="ml-4 flex flex-col gap-1.5">
                {row.blocked.map((t) => (
                  <TaskRow key={t.key} card={t} containing={row.drift} />
                ))}
              </div>
            ) : null}
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
        if (event.target instanceof Element && event.target.closest("button, a, [data-badge]") !== null) return;
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
        <BoardButton icon={X} label="Reject" aria={`Reject ${card.heading}`} disabled={card.rejectBlocker !== null} tooltip={card.rejectBlocker} onClick={() => env.context.post({ type: "rejectProposal", id: card.id })} />
      </Actions>
    </Shell>
  );
}

function DriftCardView({ card }: { card: DriftCard }) {
  const env = useBoardEnv();
  const previous = card.drift.previous;
  // A disabled Resolve shows its reason first, then the mode; the reason is also its accessible description.
  const resolveTip = card.resolveBlocker === null ? `Ask an agent to resolve this Drift\n${card.resolveNote}` : `${card.resolveBlocker}\n${card.resolveNote}`;
  return (
    <Shell card={card} kind="drift" label={`${card.heading}: ${card.title}`} className="border-l-red-600 dark:border-l-red-400">
      <Head kind="Drift">
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        {card.drift.critical ? <CriticalBadge /> : null}
        {previous !== null ? <RecurringBadge previous={previous} /> : null}
        {card.resolving ? <ResolvingBadge /> : null}
        <FailedBadge reason={card.autopilotFailed} />
      </Head>
      <h3 className="font-semibold break-words">{card.title}</h3>
      {card.refs.length > 0 ? <RefChips refs={card.refs} /> : null}
      <DriftCompare drift={card.drift} openLink={env.context.openLink} />
      {card.blocked.map((t) => (
        <TaskRow key={t.key} card={t} containing={card.id} />
      ))}
      <NotBlocking items={card.notBlocking} />
      <Actions>
        <BoardButton
          icon={WandSparkles}
          label="Resolve"
          aria={`Resolve ${card.heading}`}
          disabled={card.resolveBlocker !== null}
          tooltip={resolveTip}
          description={card.resolveBlocker ?? resolveTip}
          onClick={() => env.context.post({ type: "launch", action: { kind: "resolve-drifts", drift: card.id } })}
        />
        <BoardButton
          icon={Ban}
          label="Dismiss Drift"
          disabled={card.dismissBlocker !== null}
          tooltip={card.dismissBlocker ?? "Close this Drift without changes"}
          onClick={() => env.context.post({ type: "dismissDrift", id: card.id })}
        />
      </Actions>
    </Shell>
  );
}

function TaskCardView({ card }: { card: TaskCard }) {
  const env = useBoardEnv();
  const key = `${card.key}:details`;
  const open = env.isExpanded(key);
  const detailsId = `board-details-${card.id}`;
  const runnable = card.column !== "done" && !card.agent;
  const runReason = joinReasons([card.finishing, env.runReason]);
  const toggle = `${open ? "Hide" : "Show"} details`;
  return (
    <Shell card={card} kind="task" label={`Task ${card.name.text}: ${card.title}`} className={cn("border-l-border", card.agent && "board-working")}>
      <Head>
        <StatusDot task={card} />
        <IdTag name={card.name} className="text-[11px] font-semibold text-muted-foreground" />
        <TaskProposalTag card={card} />
        {card.technical && card.refs.length === 0 ? (
          <TipBadge tone="info" tooltip="Technical Task">
            technical
          </TipBadge>
        ) : null}
        {card.blocks.map((b, at) => (
          <BlockedBadge key={at} badge={b} />
        ))}
        <FailedBadge reason={card.autopilotFailed} />
      </Head>
      <h3 className="font-semibold break-words">{card.title}</h3>
      {card.refs.length > 0 ? <RefChips refs={card.refs} /> : null}
      {card.drift !== null ? (
        <p className="text-xs text-muted-foreground">
          from Drift <IdTag name={cardNameOf(env.numbers, "drift", card.drift)} />
        </p>
      ) : null}
      {card.body ? (
        <div id={detailsId} hidden={!open} className="text-muted-foreground">
          <Markdown source={card.body} openLink={env.context.openLink} />
        </div>
      ) : null}
      <Actions>
        {card.body ? (
          <Button variant="ghost" size="sm" aria-label={`${toggle} of task ${card.name.text}`} aria-expanded={open} aria-controls={detailsId} onClick={() => env.toggleExpanded(key)}>
            {open ? <ChevronUp aria-hidden="true" focusable="false" /> : <ChevronDown aria-hidden="true" focusable="false" />}
            {toggle}
          </Button>
        ) : null}
        {card.views.diagram ? <ViewButton kind="diagram" focus={{ kind: "task", id: card.id }} verb="touches" name={card.name.text} /> : null}
        {card.views.requirements ? <ViewButton kind="requirements" focus={{ kind: "task", id: card.id }} verb="touches" name={card.name.text} /> : null}
        {runnable ? (
          <BoardButton icon={Play} label="Run" aria={`Run task ${card.name.text}`} variant="default" disabled={runReason !== null} tooltip={runReason} onClick={() => env.context.post({ type: "launch", action: { kind: "implement", task: card.id } })} />
        ) : null}
        <BoardButton icon={FileInput} label="Open" aria={`Open file of task ${card.name.text}`} variant="ghost" onClick={() => env.context.post({ type: "openFile", path: card.file })} />
      </Actions>
    </Shell>
  );
}

/** A fix Task other Tasks wait for, in Blocked: the fix Task stays in Active, and this card lists the Tasks it holds up, with no buttons. */
function WaitingCardView({ card }: { card: WaitingCard }) {
  const env = useBoardEnv();
  const link = "Go to the card of this Task in Active";
  return (
    <Shell card={card} kind="waiting" label={`Waiting for ${card.task.name.text} ${card.task.title}`} className="border-l-muted-foreground">
      <Head kind="Waiting for">
        <StatusDot task={card.task} />
        <IdTag name={card.task.name} className="text-[11px] font-semibold text-muted-foreground" />
      </Head>
      <h3 className="font-semibold break-words">
        <Tip text={link}>
          <button type="button" aria-label={link} className="rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => env.showCard(card.task.key)}>
            {card.task.title}
          </button>
        </Tip>
      </h3>
      {card.waiting.map((t) => (
        <TaskRow key={t.key} card={t} containing={null} />
      ))}
    </Shell>
  );
}

export function CardView({ card }: { card: BoardCard }) {
  if (card.kind === "proposal") return <ProposalCardView card={card} />;
  if (card.kind === "drift") return <DriftCardView card={card} />;
  if (card.kind === "waiting") return <WaitingCardView card={card} />;
  return <TaskCardView card={card} />;
}

/**
 * The ghost of a card the agent is about to create: a skeleton with the card's kind, its title and what the agent is
 * doing about it. It cannot be clicked, moved or focused and has no buttons or links; its accessible name says the kind,
 * the title and the phase, and its content is hidden from assistive technology.
 */
export function GhostCard({ card }: { card: AnnouncedCard }) {
  return (
    <Card role="img" aria-label={card.label} data-key={card.key} data-kind="ghost" className="pointer-events-none shrink-0 gap-1.5 rounded-md border-dashed px-2.5 py-2.5 opacity-70 shadow-none select-none">
      <span className="text-[11px] font-semibold text-muted-foreground">{card.kindLabel}</span>
      <div className="font-semibold break-words">{card.title}</div>
      <div className="flex flex-col gap-1.5">
        <span className="block h-2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <span className="block h-2 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      {card.phase === "" ? null : <div className="text-xs text-muted-foreground italic">{card.phase}</div>}
    </Card>
  );
}
