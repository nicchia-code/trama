import { ChevronLeft, ChevronRight, ChevronUp, Play, Plus, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { namerOf, noNumbers } from "../../../../src/core/card-names";
import { joinReasons, runBlocker } from "../../../../src/core/design";
import type { AnnouncementView, Snapshot } from "../../../../src/core/snapshot";
import type { ModelSuggestion } from "../../host/model-lists";
import type { BoardModels } from "../../host/proposal-models";
import { cn } from "../lib/utils";
import { scanButtonLabel } from "../scan-label";
import type { Slot, View, ViewContext } from "../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SplitButton } from "../split-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { TooltipProvider } from "../ui/tooltip";
import { CardView, GhostCard } from "./cards";
import { type ModelList, ModelDialog, ProposalBodyDialog } from "./dialogs";
import { HistoryEntryView } from "./history";
import { announcedGhosts, type BoardColumn, type BoardResolve, buildBoard, type Card, COLUMN_TITLES, type ColumnId, EMPTY_HINTS, finalReviewMissingNotice, GHOST_COLUMN, HISTORY_PERIODS, type HistoryPeriod, historyGroups, interleave, NO_MODELS, type ProposalCard, stoppedFollowingNotice, withdrawnNotice } from "./logic";
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
}

export interface BoardPageProps {
  snapshot: Snapshot | null;
  /** Whether a question round is open. */
  asking: boolean;
  resolve: ResolveState;
  /** Unify Drifts: why its menu item is disabled and which Drifts its agent works on. */
  unify?: UnifyState;
  /** Whether the Advisor Scanner is on: the Scan System button is then disabled. */
  advisorScanner: boolean;
  /** The models chosen for the Proposals that carry Tasks, and the agent of `trama.agent`. */
  models: BoardModels;
  /** The model names the agent offers to the model window. */
  modelList: ModelList;
  notices: Notice[];
  closeNotice(id: number): void;
  context: ViewContext;
}

const COLUMN_CLASS = "flex min-h-0 flex-col rounded-lg border bg-muted/40";

/** A column of the Board: its heading with the number of its cards, its body, and the one action at its foot. */
function Column({ id, count, children, foot }: { id: ColumnId; count?: number; children: ReactNode; foot?: ReactNode }) {
  const heading = `board-column-${id}`;
  return (
    <section data-column={id} aria-labelledby={heading} className={COLUMN_CLASS}>
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

function CardColumn({ column, ghosts, foot }: { column: BoardColumn; ghosts: { item: ReactNode; index: number }[]; foot: ReactNode }) {
  const cards = interleave<ReactNode>(
    column.cards.map((card: Card) => <CardView key={card.key} card={card} />),
    column.id === GHOST_COLUMN ? ghosts : [],
  );
  return (
    <Column id={column.id} count={column.id === GHOST_COLUMN ? undefined : column.cards.length} foot={foot}>
      <ColumnBody>{cards.length > 0 ? cards : <Hint id={column.id} />}</ColumnBody>
    </Column>
  );
}

/** The Board: four columns of cards, a bar with the one Scan button, and the notices of cards that never came. */
export function BoardPage({ snapshot, asking, resolve, unify = NO_UNIFY_STATE, advisorScanner, models, modelList, notices, closeNotice, context }: BoardPageProps) {
  const root = useRef<HTMLDivElement>(null);
  /** Task details the developer left open. Kept while the panel lives, so a refresh does not close them. */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  /** The period of the History column. Kept while the panel lives, so a refresh does not reset it. */
  const [period, setPeriod] = useState<HistoryPeriod>("week");
  /** Whether the History column is open. It starts collapsed; kept while the panel lives, so a refresh does not reopen it. */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bodyOf, setBodyOf] = useState<string | null>(null);
  const [modelOf, setModelOf] = useState<string | null>(null);

  const numbers = snapshot?.numbers ?? noNumbers;
  const runReason = snapshot === null ? null : joinReasons([resolve.runReason, runBlocker(snapshot.tasks, namerOf(numbers))]);
  const columns = useMemo(() => {
    if (snapshot === null) return [];
    const boardResolve: BoardResolve = { blocker: resolve.blocker, drifts: resolve.drifts, resolving: resolve.resolving, unifying: unify.unifying };
    return buildBoard(snapshot, boardResolve, models);
  }, [snapshot, resolve, unify, models]);

  const backlogCard = (proposal: string | null): ProposalCard | undefined =>
    proposal === null ? undefined : columns.find((column) => column.id === "backlog")?.cards.find((card): card is ProposalCard => card.kind === "proposal" && card.id === proposal);
  const bodyCard = backlogCard(bodyOf);
  const modelCard = backlogCard(modelOf);
  const modelChoosable = modelCard?.choosable === true ? modelCard : undefined;
  // A window follows its Proposal: it closes when the card is gone, and stays closed if the card comes back.
  useEffect(() => {
    if (bodyOf !== null && bodyCard === undefined) setBodyOf(null);
    if (modelOf !== null && modelChoosable === undefined) setModelOf(null);
  }, [bodyOf, bodyCard, modelOf, modelChoosable]);

  const env: BoardEnv = {
    context,
    numbers,
    runReason: resolve.runReason,
    isExpanded: (key) => expanded.has(key),
    toggleExpanded: (key) =>
      setExpanded((now) => {
        const next = new Set(now);
        if (!next.delete(key)) next.add(key);
        return next;
      }),
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
    openTaskImage: (task, name) => context.post({ type: "openTaskImage", task, name }),
  };

  if (snapshot === null) return <div ref={root} />;

  const ghosts = announcedGhosts(snapshot.announcements, asking).map((g) => ({ item: <GhostCard key={g.card.key} card={g.card} />, index: g.index }));
  const scanLabel = scanButtonLabel("Scan System", snapshot.tasksSinceScan, advisorScanner);
  const history = historyGroups(snapshot.history, period);
  const historyCount = history.reduce((n, group) => n + group.entries.length, 0);
  const now = new Date();
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
              tooltip: "Merge every open Drift into one Drift to resolve",
              disabled: unify.blockers.length > 0,
              reason: unify.blockers.join(". "),
              onSelect: () => context.post({ type: "launch", action: { kind: "unify-drifts" } }),
            },
            { label: "Add Quick Task", tooltip: "Ask an agent for a quick job, without scans or cards", onSelect: () => context.post({ type: "openQuickTask" }) },
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
  const historyTitle = historyOpen ? "Collapse History column" : "Expand History column";

  return (
    <BoardEnvContext.Provider value={env}>
      <TooltipProvider>
        <div ref={root} className="flex h-full min-h-0 flex-col">
          <div role="toolbar" aria-label="Board actions" className="flex flex-wrap gap-1.5 border-b px-3 py-2">
            <BoardButton
              icon={Search}
              label={scanLabel.text}
              aria={scanLabel.ariaLabel}
              disabled={scanLabel.disabled}
              tooltip={scanLabel.tooltip}
              onClick={() => context.post({ type: "launch", action: { kind: "scan" } })}
            />
          </div>
          {notices.length > 0 && (
            <div role="status" className="flex flex-col gap-1 px-3">
              {notices.map((notice) => (
                <div key={notice.id} className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-amber-600 bg-amber-600/10 px-2 py-1 dark:border-amber-400 dark:bg-amber-400/15">
                  <span className="break-words">{notice.text}</span>
                  <Button variant="outline" size="sm" aria-label={`Close the notice: ${notice.text}`} onClick={() => closeNotice(notice.id)}>
                    <X aria-hidden="true" focusable="false" />
                    Close
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div
            className="grid min-h-0 flex-1 [grid-template-rows:minmax(0,1fr)] gap-2.5 overflow-x-auto p-2.5"
            style={{ gridTemplateColumns: historyOpen ? "repeat(4, minmax(250px, 1fr))" : "repeat(3, minmax(250px, 1fr)) 40px" }}
          >
            {columns.map((column) => (
              <CardColumn key={column.id} column={column} ghosts={ghosts} foot={foot(column.id)} />
            ))}
            <section data-column="history" aria-labelledby="board-column-history" className={cn(COLUMN_CLASS, !historyOpen && "items-center")}>
              <div className={cn("flex items-center gap-2 px-2.5 py-2", historyOpen ? "border-b" : "flex-col px-1.5")}>
                <Tip text={historyTitle}>
                  <Button variant="ghost" size="icon" className="size-6" aria-label={historyTitle} aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}>
                    {historyOpen ? <ChevronRight aria-hidden="true" focusable="false" /> : <ChevronLeft aria-hidden="true" focusable="false" />}
                  </Button>
                </Tip>
                <h2 id="board-column-history" className={cn("text-xs font-semibold tracking-wide uppercase", !historyOpen && "[writing-mode:vertical-rl] tracking-normal normal-case")}>
                  {COLUMN_TITLES.history}
                </h2>
                {historyOpen ? (
                  <Badge variant="secondary" className="px-1.5 py-0 tabular-nums">
                    {historyCount}
                  </Badge>
                ) : null}
              </div>
              {historyOpen ? (
                <>
                  <div className="px-2 pt-2">
                    <Select value={period} onValueChange={(value) => setPeriod(value as HistoryPeriod)}>
                      <SelectTrigger aria-label="History period" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HISTORY_PERIODS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <ColumnBody>
                    {history.length === 0 ? (
                      <Hint id="history" />
                    ) : (
                      history.map((group) => (
                        <div key={group.key} className="flex flex-col gap-2">
                          <h3 className="mt-1 text-[11px] font-semibold text-muted-foreground">{group.heading}</h3>
                          {group.entries.map((entry) => (
                            <HistoryEntryView key={entry.id} entry={entry} now={now} />
                          ))}
                        </div>
                      ))
                    )}
                  </ColumnBody>
                </>
              ) : null}
            </section>
          </div>
          <ProposalBodyDialog card={bodyCard} onClose={() => setBodyOf(null)} />
          <ModelDialog card={modelChoosable} agent={models.agent} list={modelList} onClose={() => setModelOf(null)} />
        </div>
      </TooltipProvider>
    </BoardEnvContext.Provider>
  );
}

/** The Board: its view, and the model names the Board's model window offers. */
export interface BoardView extends View {
  update(next: Snapshot, isAsking?: boolean, resolveState?: ResolveState, scans?: { advisorScanner: boolean }, models?: BoardModels, unify?: UnifyState): void;
  receiveModels(message: { models: ModelSuggestion[]; error?: string }): void;
}

/**
 * Switch for the yellow notices of withdrawn ghosts (the agent finished or stopped without delivering) and of the Run
 * that ended without the Advisor's final review. Off: the host still prepares them (`extension/src/host/controller.ts`
 * is unchanged) but the Board does not draw them. Set it back to `true` to show them again.
 */
export const SHOW_WITHDRAWN_NOTICES = false;

export const mountBoard = (slot: Slot, context: ViewContext): BoardView => {
  let nextNotice = 0;
  let page: BoardPageProps = {
    snapshot: null,
    asking: false,
    resolve: NO_RESOLVE_STATE,
    unify: NO_UNIFY_STATE,
    advisorScanner: false,
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
    update(next, isAsking = false, resolveState = NO_RESOLVE_STATE, scans = { advisorScanner: false }, models = NO_MODELS, unify = NO_UNIFY_STATE) {
      page = { ...page, snapshot: next, asking: isAsking, resolve: resolveState, unify, advisorScanner: scans.advisorScanner, models };
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
    finalReviewMissing(reason: string) {
      if (!SHOW_WITHDRAWN_NOTICES) return;
      page = { ...page, notices: [...page.notices, { id: nextNotice++, text: finalReviewMissingNotice(reason) }] };
      render();
    },
    stoppedFollowing(subject: string, reason: string) {
      page = { ...page, notices: [...page.notices, { id: nextNotice++, text: stoppedFollowingNotice(subject, reason) }] };
      render();
    },
    show() {},
  };
};
