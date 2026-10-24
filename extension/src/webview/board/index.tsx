import { ChevronLeft, ChevronRight, ChevronUp, Play, Plus, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { namerOf, noNumbers } from "../../../../src/core/card-names";
import { joinReasons, RUN_IN_PROGRESS, runBlocker } from "../../../../src/core/design";
import type { AnnouncementView, Snapshot } from "../../../../src/core/snapshot";
import type { ModelSuggestion } from "../../host/model-lists";
import type { RefinementView } from "../../protocol";
import type { BoardModels } from "../../host/proposal-models";
import { cn } from "../lib/utils";
import type { Slot, View, ViewContext } from "../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SplitButton } from "../split-button";
import { TooltipProvider } from "../ui/tooltip";
import { CardView, GhostCard } from "./cards";
import { DriftDetailsDialog, type ModelList, GhostDetailsDialog, ModelDialog, ProposalBodyDialog, TaskDetailsDialog } from "./dialogs";
import { announcedCard, announcedGhosts, type BoardColumn, type BoardResolve, buildBoard, CANCEL_REFINE_ALL_DELAY_MS, type Card, clearableTasks, COLUMN_TITLES, type ColumnId, doneGroups, EMPTY_HINTS, hideCleared, interleave, NO_MODELS, type ProposalCard, REFINEMENT_OFF, refineAllEntry, stoppedFollowingNotice, type TaskCard, withdrawnNotice } from "./logic";
import { BoardButton, BoardEnvContext, type BoardEnv, Tip } from "./parts";

/** The state of Resolve Drifts and of the Runs the host gives with each picture. */
export type ResolveState = NonNullable<Parameters<View["update"]>[2]>;

const NO_RESOLVE_STATE: ResolveState = { blocker: null, runReason: null, drifts: {}, resolving: [] };

/** What the host says of Unify Drifts: every reason it is unavailable (empty when it works) and the Drifts its agent works on. */
export interface UnifyState {
  blockers: string[];
  unifying: string[];
}

const NO_UNIFY_STATE: UnifyState = { blockers: [], unifying: [] };

/** What the developer was told about announced cards the agent never delivered; kept until closed, or until the panel closes. */
export interface Notice {
  id: number;
  text: string;
  /** The last lines of omp's error output, behind `Show details`. */
  details?: string;
}

/** One notice of the top of the Board: its text, a `Show details` toggle when it has details, and Close. */
function NoticeRow({ notice, close }: { notice: Notice; close: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const detailsId = `notice-details-${notice.id}`;
  return (
    <div className="mt-1.5 flex flex-col gap-1 rounded-md border border-amber-600 bg-amber-600/10 px-2 py-1 dark:border-amber-400 dark:bg-amber-400/15">
      <div className="flex items-center justify-between gap-2">
        <span className="break-words">{notice.text}</span>
        <div className="flex shrink-0 items-center gap-1">
          {notice.details !== undefined && (
            <Button variant="outline" size="sm" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(!open)}>
              {open ? "Hide details" : "Show details"}
            </Button>
          )}
          <Button variant="outline" size="sm" aria-label={`Close the notice: ${notice.text}`} onClick={() => close(notice.id)}>
            <X aria-hidden="true" focusable="false" />
            Close
          </Button>
        </div>
      </div>
      {notice.details !== undefined && (
        <pre id={detailsId} hidden={!open} className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
          {notice.details}
        </pre>
      )}
    </div>
  );
}

export interface BoardPageProps {
  snapshot: Snapshot | null;
  /** Whether a question round is open. */
  asking: boolean;
  resolve: ResolveState;
  /** Unify Drifts: why its menu item is disabled and which Drifts its agent works on. */
  unify?: UnifyState;
  /** The models chosen for the Proposals that carry Tasks. */
  models: BoardModels;
  /** The Proposal refinement: which Proposal the agent refines, and which wait for it. Absent: off. */
  refinement?: RefinementView;
  /** The model names the agent offers to the model window. */
  modelList: ModelList;
  notices: Notice[];
  closeNotice(id: number): void;
  context: ViewContext;
  /** The ghost the status bar asked for (`navigate` with `ghost`): its details open, replacing any other details window. `n` tells one request from the next for the same ghost. */
  ghostRequest?: { id: string; n: number };
  /** Counts the answers of the host to Clear (`clearDoneEnded`): each change ends the hiding of the cards Clear was deleting. */
  clearEnded?: number;
}

const COLUMN_CLASS = "flex min-h-0 flex-col rounded-lg border bg-muted/40";

/** A column of the Board: its heading with the number of its cards, its body, and the one action at its foot. */
function Column({ id, count, children, foot }: { id: ColumnId; count?: number; children: ReactNode; foot?: ReactNode }) {
  const heading = `board-column-${id}`;
  return (
    <section data-column={id} aria-labelledby={heading} tabIndex={-1} className={cn(COLUMN_CLASS, "outline-none")}>
      <div className="flex items-center gap-2 border-b px-2.5 py-2">
        <h2 id={heading} className="text-xs font-semibold tracking-wide uppercase">
          {COLUMN_TITLES[id]}
        </h2>
        {count === undefined ? null : (
          <Badge variant="secondary" className="px-1.5 py-0 tabular-nums">
            {count}
          </Badge>
        )}
      </div>
      {children}
      {foot === undefined ? null : <div className="flex flex-col gap-2 px-2 pb-2">{foot}</div>}
    </section>
  );
}

const ColumnBody = ({ children }: { children: ReactNode }) => <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">{children}</div>;

const Hint = ({ id }: { id: ColumnId }) => <p className="my-3 text-center text-muted-foreground italic">{EMPTY_HINTS[id]}</p>;

function CardColumn({ column, ghosts, foot }: { column: BoardColumn; ghosts: { item: ReactNode; index: number; column: ColumnId }[]; foot: ReactNode }) {
  const cards = interleave<ReactNode>(
    column.cards.map((card: Card) => <CardView key={card.key} card={card} />),
    ghosts.filter((g) => g.column === column.id),
  );
  return (
    <Column id={column.id} count={column.cards.length} foot={foot}>
      <ColumnBody>
        {column.cards.length === 0 ? <Hint id={column.id} /> : null}
        {cards}
      </ColumnBody>
    </Column>
  );
}

/**
 * The Done column: a Task per card, grouped by the day it finished, with `Clear` at its foot. It is collapsible with the chevron of its heading; collapsed it is a narrow
 * strip with the chevron and its title written downwards, and nothing else.
 */
function DoneColumn({ cards, open, toggle, chevron, clear, now }: { cards: Card[]; open: boolean; toggle: () => void; chevron: React.RefObject<HTMLButtonElement | null>; clear: ReactNode; now: Date }) {
  const title = open ? "Collapse Done column" : "Expand Done column";
  return (
    <section data-column="done" aria-labelledby="board-column-done" tabIndex={-1} className={cn(COLUMN_CLASS, "outline-none", !open && "items-center")}>
      <div className={cn("flex items-center gap-2 px-2.5 py-2", open ? "border-b" : "flex-col px-1.5")}>
        <Tip text={title}>
          <Button ref={chevron} variant="ghost" size="icon" className="size-6" aria-label={title} aria-expanded={open} onClick={toggle}>
            {open ? <ChevronRight aria-hidden="true" focusable="false" className="size-4" /> : <ChevronLeft aria-hidden="true" focusable="false" className="size-4" />}
          </Button>
        </Tip>
        <h2 id="board-column-done" className={cn("text-xs font-semibold tracking-wide uppercase", !open && "[writing-mode:vertical-rl] tracking-normal normal-case")}>
          {COLUMN_TITLES.done}
        </h2>
        {open ? (
          <Badge variant="secondary" className="px-1.5 py-0 tabular-nums">
            {cards.length}
          </Badge>
        ) : null}
      </div>
      {open ? (
        <>
          <ColumnBody>
            {cards.length === 0 ? <Hint id="done" /> : null}
            {doneGroups(cards, now).map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="mt-1 text-[11px] font-semibold text-muted-foreground">{group.heading}</h3>
                {group.cards.map((card) => (
                  <CardView key={card.key} card={card} now={now} />
                ))}
              </div>
            ))}
          </ColumnBody>
          <div className="flex flex-col gap-2 px-2 pb-2">{clear}</div>
        </>
      ) : null}
    </section>
  );
}

/** The Board: three columns of cards (Backlog, Active, Done), and the notices at its top. */
export function BoardPage({ snapshot, asking, resolve, unify = NO_UNIFY_STATE, models, refinement = REFINEMENT_OFF, modelList, notices, closeNotice, context, ghostRequest, clearEnded }: BoardPageProps) {
  const root = useRef<HTMLDivElement>(null);
  /** The card whose queued refining was cancelled: its Approve gets the focus once the picture no longer queues it. */
  const refocus = useRef<string | null>(null);
  /** Whether the Done column is open. It starts collapsed; kept while the panel lives, so a refresh or a change of view does not reopen it. */
  const [doneOpen, setDoneOpen] = useState(false);
  const doneChevron = useRef<HTMLButtonElement>(null);
  const [bodyOf, setBodyOf] = useState<string | null>(null);
  const [taskOf, setTaskOf] = useState<string | null>(null);
  const [driftOf, setDriftOf] = useState<string | null>(null);
  const [modelOf, setModelOf] = useState<string | null>(null);
  const [ghostOf, setGhostOf] = useState<string | null>(null);
  /** Whether the open ghost details came from the status bar: closing them sends the focus to Backlog, as that ghost may have no column to go back to. */
  const [ghostFromBar, setGhostFromBar] = useState(false);
  /** The Tasks the last click on Clear is deleting: their cards stay out of Done until `clearEnded` changes. */
  const [hidden, setHidden] = useState<string[]>([]);
  /** The Task whose Delete was pressed last, until its window closes: the focus goes to Run all when that Task is gone. */
  const deleting = useRef<string | null>(null);
  const latest = useRef(snapshot);
  latest.current = snapshot;
  // Cancel Refine All works two seconds after the click on Refine All: the timer starts from the picture, runs on its own, and is cleared when the picture changes `since` or the page goes.
  const since = refinement.refineAll.mode === "cancel" ? refinement.refineAll.since : undefined;
  const [cancelReadyFor, setCancelReadyFor] = useState<number | null>(null);
  useEffect(() => {
    if (since === undefined) return;
    const wait = since + CANCEL_REFINE_ALL_DELAY_MS - Date.now();
    if (wait <= 0) {
      setCancelReadyFor(since);
      return;
    }
    const timer = setTimeout(() => setCancelReadyFor(since), wait);
    return () => clearTimeout(timer);
  }, [since]);
  const cancelReady = since !== undefined && (cancelReadyFor === since || Date.now() - since >= CANCEL_REFINE_ALL_DELAY_MS);

  const numbers = snapshot?.numbers ?? noNumbers;
  const runReason = snapshot === null ? null : joinReasons([resolve.runReason, runBlocker(snapshot.tasks, namerOf(numbers))]);
  const boardColumns = useMemo(() => {
    if (snapshot === null) return [];
    const boardResolve: BoardResolve = { blocker: resolve.blocker, drifts: resolve.drifts, resolving: resolve.resolving, unifying: unify.unifying, refinement, asking };
    return buildBoard(snapshot, boardResolve, models);
  }, [snapshot, resolve, unify, models, refinement, asking]);
  const columns = useMemo(() => hideCleared(boardColumns, hidden), [boardColumns, hidden]);
  // The host is done with Clear (cleared, refused or failed): the cards stop being hidden. The deleted ones are not in the picture any more; the others come back.
  useEffect(() => setHidden((current) => (current.length === 0 ? current : [])), [clearEnded]);
  useEffect(() => {
    if (refocus.current === null) return;
    const card = root.current?.querySelector<HTMLElement>(`[data-key="${refocus.current}"]`);
    const approve = [...(card?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((b) => b.getAttribute("aria-label")?.startsWith("Approve "));
    if (approve === undefined || approve.disabled) return;
    approve.focus();
    refocus.current = null;
  }, [columns]);

  const backlogCard = (proposal: string | null): ProposalCard | undefined =>
    proposal === null ? undefined : columns.find((column) => column.id === "backlog")?.cards.find((card): card is ProposalCard => card.kind === "proposal" && card.id === proposal);
  /** The card of a Task in Active or a Drift in Backlog, by identity; undefined once it has left its column. */
  const columnCard = <K extends "task" | "drift">(column: ColumnId, kind: K, id: string | null): Extract<Card, { kind: K }> | undefined =>
    id === null ? undefined : columns.find((c) => c.id === column)?.cards.find((card): card is Extract<Card, { kind: K }> => card.kind === kind && card.id === id);
  const bodyCard = backlogCard(bodyOf);
  // The details of a Task follow it from Active to Done, and close when it is in neither (cleared).
  const taskCard = columnCard("active", "task", taskOf) ?? columnCard("done", "task", taskOf);
  const driftCard = columnCard("backlog", "drift", driftOf);
  const modelCard = backlogCard(modelOf);
  const placedGhosts = useMemo(() => announcedGhosts(snapshot?.announcements ?? [], asking), [snapshot, asking]);
  // A ghost asked from the status bar is looked for among all the ghosts of the snapshot, the ones standing in no column included.
  const ghostCard = useMemo(
    () => (ghostOf === null ? undefined : (snapshot?.announcements ?? []).map((a) => announcedCard(a, asking)).find((card) => card.key === ghostOf)),
    [ghostOf, snapshot, asking],
  );
  // The column the open ghost stands in, remembered so the focus can go back to it once the ghost is gone.
  const ghostColumn = useRef<ColumnId>("backlog");
  const placedGhost = ghostOf === null ? undefined : placedGhosts.find((g) => g.card.key === ghostOf);
  if (placedGhost !== undefined) ghostColumn.current = placedGhost.column;
  const modelChoosable = modelCard?.choosable === true ? modelCard : undefined;
  // A window follows its Proposal: it closes when the card is gone, and stays closed if the card comes back.
  useEffect(() => {
    if (bodyOf !== null && bodyCard === undefined) setBodyOf(null);
    if (taskOf !== null && taskCard === undefined) setTaskOf(null);
    if (driftOf !== null && driftCard === undefined) setDriftOf(null);
    if (modelOf !== null && modelChoosable === undefined) setModelOf(null);
  }, [bodyOf, bodyCard, taskOf, taskCard, driftOf, driftCard, modelOf, modelChoosable]);
  // A ghost asked from the status bar replaces every other details window of the Board, the History entries' included (their column is drawn anew).
  useEffect(() => {
    if (ghostRequest === undefined) return;
    setBodyOf(null);
    setTaskOf(null);
    setDriftOf(null);
    setModelOf(null);
    setGhostFromBar(true);
    setGhostOf(`announced:${ghostRequest.id}`);
  }, [ghostRequest]);
  const focusBacklog = () => root.current?.querySelector<HTMLElement>('[data-column="backlog"]')?.focus();
  // The details of a ghost follow it: when the ghost goes away, delivered or withdrawn, they close and the focus goes back to the column it stood in (Backlog when the status bar opened them).
  useEffect(() => {
    if (ghostOf === null || ghostCard !== undefined) return;
    setGhostOf(null);
    if (ghostFromBar) focusBacklog();
    else root.current?.querySelector<HTMLElement>(`[data-column="${ghostColumn.current}"]`)?.focus();
  }, [ghostOf, ghostCard]);

  /** A Proposal with a model shows its thinking level from the model list, so the list is asked for as soon as one has a model. */
  const someModel = Object.keys(models.proposals).length > 0;
  useEffect(() => {
    if (someModel) context.post({ type: "modelSuggestionsWanted" });
  }, [someModel]);
  const env: BoardEnv = {
    context,
    numbers,
    models: modelList.models,
    runReason: resolve.runReason,
    running: resolve.running === true,
    showCard(key) {
      const card = [...(root.current?.querySelectorAll<HTMLElement>("[data-key]") ?? [])].find((node) => node.dataset["key"] === key);
      card?.scrollIntoView?.({ block: "nearest" });
      card?.focus();
    },
    chooseModel(proposal) {
      if (backlogCard(proposal)?.choosable !== true) return;
      setModelOf(proposal);
      context.post({ type: "modelSuggestionsWanted" });
    },
    openProposal: (proposal) => setBodyOf(proposal),
    openTask: (task) => {
      deleting.current = null;
      setTaskOf(task);
    },
    openDrift: (drift) => setDriftOf(drift),
    openGhost: (key) => {
      setGhostFromBar(false);
      setGhostOf(key);
    },
    openTaskImage: (task, name) => context.post({ type: "openTaskImage", task, name }),
    deleteTask(task) {
      deleting.current = task;
      context.post({ type: "deleteTask", task });
    },
    focusAfterDelete(task) {
      if (deleting.current !== task) return false;
      deleting.current = null;
      if (latest.current?.tasks.some((t) => t.id === task) !== false) return false;
      const runAll = root.current?.querySelector<HTMLButtonElement>('button[aria-label="Run all the Tasks in To do"]');
      // With no Task left in To do Run all is disabled and cannot take the focus: the Active column does.
      if (runAll !== null && runAll !== undefined && !runAll.disabled) runAll.focus();
      else root.current?.querySelector<HTMLElement>('[data-column="active"]')?.focus();
      return true;
    },
    cancelRefinement(proposal, key) {
      refocus.current = key;
      context.post({ type: "cancelRefinement", proposal });
    },
  };

  if (snapshot === null) return <div ref={root} />;

  const ghosts = placedGhosts.map((g) => ({ item: <GhostCard key={g.card.key} card={g.card} />, index: g.index, column: g.column }));
  const now = new Date();
  const doneCards = columns.find((column) => column.id === "done")?.cards ?? [];
  const clearable = doneCards.filter((card) => card.kind === "task" && card.keptBy.length === 0);
  const clearReason = joinReasons([resolve.running === true ? RUN_IN_PROGRESS : null, clearable.length === 0 ? "Nothing to clear" : null]);
  const refineAll = refineAllEntry(refinement.refineAll, cancelReady);
  const foot = (id: ColumnId): ReactNode => {
    if (id === "backlog")
      return (
        <SplitButton
          icon={Plus}
          label="Add Work Item"
          aria="Add Work Item"
          tooltip="Write a work item in Markdown and send it to an agent"
          dashed
          full
          arrowIcon={ChevronUp}
          side="top"
          arrowName="More ways to add work"
          items={[
            {
              label: "Unify Drifts",
              description: "Merge every open Drift into one Drift to resolve",
              disabled: unify.blockers.length > 0,
              reason: unify.blockers.join("\n"),
              onSelect: () => context.post({ type: "launch", action: { kind: "unify-drifts" } }),
            },
            {
              label: refineAll.label,
              description: refineAll.description,
              disabled: refineAll.disabled,
              reason: refineAll.reason,
              onSelect: () => context.post({ type: refineAll.message }),
            },
          ]}
          onClick={() => context.post({ type: "writeDesignRequest" })}
        />
      );
    if (id === "active")
      return (
        <BoardButton
          icon={Play}
          label="Run all"
          aria="Run all the Tasks in To do"
          variant="default"
          full
          disabled={runReason !== null}
          tooltip={runReason ?? "Run all the Tasks in To do"}
          description={runReason}
          onClick={() => context.post({ type: "launch", action: { kind: "implement-all" } })}
        />
      );
    return null;
  };
  const clear = (
    <BoardButton
      icon={Trash2}
      label="Clear"
      aria="Delete the Tasks in Done for good"
      full
      disabled={clearReason !== null}
      tooltip={clearReason ?? "Delete the Tasks in Done for good"}
      description={clearReason}
      onClick={() => {
        // The cards Clear deletes go at the click, and stay hidden until the host says it is done (`clearDoneEnded`).
        setHidden(clearableTasks(doneCards));
        context.post({ type: "clearDone", tasks: doneCards.map((card) => card.id) });
        doneChevron.current?.focus();
      }}
    />
  );

  return (
    <BoardEnvContext.Provider value={env}>
      <TooltipProvider>
        <div ref={root} className="flex h-full min-h-0 flex-col">
          {notices.length > 0 && (
            <div role="status" className="flex flex-col gap-1 px-3">
              {notices.map((notice) => (
                <NoticeRow key={notice.id} notice={notice} close={closeNotice} />
              ))}
            </div>
          )}
          <div
            className="grid min-h-0 flex-1 [grid-template-rows:minmax(0,1fr)] gap-2.5 overflow-x-auto p-2.5"
            style={{ gridTemplateColumns: doneOpen ? "repeat(3, minmax(250px, 1fr))" : "repeat(2, minmax(250px, 1fr)) 40px" }}
          >
            {columns.map((column) =>
              column.id === "done" ? (
                <DoneColumn key={column.id} cards={column.cards} open={doneOpen} toggle={() => setDoneOpen(!doneOpen)} chevron={doneChevron} clear={clear} now={now} />
              ) : (
                <CardColumn key={column.id} column={column} ghosts={ghosts} foot={foot(column.id)} />
              ),
            )}
          </div>
          <ProposalBodyDialog card={bodyCard} onClose={() => setBodyOf(null)} />
          <TaskDetailsDialog card={taskCard} onClose={() => setTaskOf(null)} />
          <DriftDetailsDialog card={driftCard} onClose={() => setDriftOf(null)} />
          <GhostDetailsDialog card={ghostCard} onClose={() => setGhostOf(null)} restoreFocus={(key) => (ghostFromBar ? focusBacklog() : root.current?.querySelector<HTMLElement>(`[data-key="${key}"]`)?.focus())} />
          <ModelDialog card={modelChoosable} list={modelList} onClose={() => setModelOf(null)} />
        </div>
      </TooltipProvider>
    </BoardEnvContext.Provider>
  );
}

/** The Board: its view, and the model names the Board's model window offers. */
export interface BoardView extends Omit<View, "update"> {
  update(next: Snapshot, isAsking?: boolean, resolveState?: ResolveState, models?: BoardModels, unify?: UnifyState, refinement?: RefinementView): void;
  receiveModels(message: { models: ModelSuggestion[]; error?: string }): void;
  /** The host is done with the last Clear (done, refused or failed): the cards it hid at the click are shown again, the deleted ones being gone from the picture. */
  clearDoneEnded(): void;
}

/**
 * Switch for the yellow notices of withdrawn ghosts (the agent finished or stopped without delivering). Off: the host
 * still prepares them (`extension/src/host/controller.ts` is unchanged) but the Board does not draw them. Set it back
 * to `true` to show them again.
 */
export const SHOW_WITHDRAWN_NOTICES = false;

export const mountBoard = (slot: Slot, context: ViewContext): BoardView => {
  let nextNotice = 0;
  let page: BoardPageProps = {
    snapshot: null,
    asking: false,
    resolve: NO_RESOLVE_STATE,
    unify: NO_UNIFY_STATE,
    models: NO_MODELS,
    modelList: { models: [], error: null },
    notices: [],
    closeNotice(id) {
      page = { ...page, notices: page.notices.filter((notice) => notice.id !== id) };
      render();
    },
    context,
  };
  const render = () => slot(<BoardPage {...page} />);
  render();

  return {
    update(next, isAsking = false, resolveState = NO_RESOLVE_STATE, models = NO_MODELS, unify = NO_UNIFY_STATE, refinement = REFINEMENT_OFF) {
      page = { ...page, snapshot: next, asking: isAsking, resolve: resolveState, unify, models, refinement };
      render();
    },
    receiveModels(message) {
      page = { ...page, modelList: { models: message.models, error: message.error ?? null } };
      render();
    },
    withdrawn(gone: AnnouncementView[]) {
      if (!SHOW_WITHDRAWN_NOTICES) return;
      page = { ...page, notices: [...page.notices, ...gone.map((a) => ({ id: nextNotice++, text: withdrawnNotice(a) }))] };
      render();
    },
    stoppedFollowing(subject: string, reason: string, details?: string) {
      page = { ...page, notices: [...page.notices, { id: nextNotice++, text: stoppedFollowingNotice(subject, reason), ...(details === undefined ? {} : { details }) }] };
      render();
    },
    notice(text: string) {
      page = { ...page, notices: [...page.notices, { id: nextNotice++, text }] };
      render();
    },
    clearDoneEnded() {
      page = { ...page, clearEnded: (page.clearEnded ?? 0) + 1 };
      render();
    },
    show(options) {
      if (options.ghost === undefined) return;
      page = { ...page, ghostRequest: { id: options.ghost, n: (page.ghostRequest?.n ?? 0) + 1 } };
      render();
    },
  };
};
