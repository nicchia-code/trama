import { namerOf, noNumbers } from "../../../../src/core/card-names";
import { joinReasons, runBlocker } from "../../../../src/core/design";
import type { AnnouncementView, Snapshot } from "../../../../src/core/snapshot";
import type { DriftAutopilotStatus } from "../../host/drift-resolution";
import type { BoardModels } from "../../host/proposal-models";
import type { ModelSuggestion } from "../../host/model-lists";
import type { View, ViewContext } from "../types";
import css from "./board.css" with { type: "text" };
import { announcedGhosts, autopilotNote, type BoardColumn, type BoardResolve, buildBoard, type Card, COLUMN_ORDER, COLUMN_TITLES, type ColumnId, EMPTY_HINTS, GHOST_COLUMN, HISTORY_PERIODS, type HistoryPeriod, historyGroups, interleave, NO_MODELS, type ProposalCard, withdrawnNotice } from "./logic";
import { type CardEnv, renderAnnounced, renderCard } from "./render";
import { historyEntryNode, type HistoryEntryNode } from "./history-entry";
import { modelDialog } from "./model-dialog";
import { proposalDialog } from "./proposal-dialog";
import { icon, type IconName, setIcon, setIconLabel } from "../icons";
import { scanButtonLabel } from "../scan-label";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Puts `next` in `parent` in order, touching only the nodes that are not already in place. */
function reconcile(parent: HTMLElement, next: HTMLElement[]) {
  next.forEach((node, i) => {
    if (parent.children[i] !== node) parent.insertBefore(node, parent.children[i] ?? null);
  });
  while (parent.children.length > next.length) parent.lastElementChild?.remove();
}

/** Puts `next` in order without moving a node already in `parent`: moving an open dialog out of the page closes it. The order is set with the CSS `order` property. */
function arrange(parent: HTMLElement, next: HTMLElement[]) {
  const shown = new Set<Element>(next);
  for (const child of [...parent.children]) if (!shown.has(child)) child.remove();
  next.forEach((node, i) => {
    if (node.parentElement !== parent) parent.append(node);
    node.style.order = String(i);
  });
}

/** The Board: its view, and the model names the Board's model window offers. */
export interface BoardView extends View {
  update(next: Snapshot, isAsking?: boolean, resolveState?: Parameters<View["update"]>[2], models?: BoardModels): void;
  receiveModels(message: { models: ModelSuggestion[]; error?: string }): void;
}

export const mountBoard = (root: HTMLElement, context: ViewContext): BoardView => {
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);

  const board = el("div", "board");
  const toolbar = el("div", "board-toolbar");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Board actions");
  const noticesEl = el("div", "board-notices");
  noticesEl.setAttribute("role", "status");
  const columnsEl = el("div", "board-columns");
  board.append(toolbar, noticesEl, columnsEl);
  root.append(board);

  const toolbarButton = (name: IconName, label: string, onClick: () => void) => {
    const node = el("button", "trama-btn");
    setIconLabel(node, name, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    toolbar.append(node);
    return node;
  };
  const scanSystem = toolbarButton("search", "Scan System", () => context.post({ type: "launch", action: { kind: "scan" } }));

  let snapshot: Snapshot | null = null;
  /** Whether a question round is open: the ghosts then say the agent waits for the developer's answers. */
  let asking = false;
  /** Whether Resolve Drifts works and why the host would refuse it now; `runReason` is why every Run is disabled, if any; `resolving` names the open Drifts the running resolution works on. */
  let resolve: { blocker: string | null; runReason: string | null; autopilot: DriftAutopilotStatus; drifts: Record<string, string | null>; resolving: string[] } = {
    blocker: null,
    runReason: null,
    autopilot: { mode: "disabled", phase: "manual", reason: null, failures: [] },
    drifts: {},
    resolving: [],
  };
  /** What the developer was told about announced cards the agent never delivered; kept until closed, or until the panel closes. */
  const notices: { id: number; text: string }[] = [];
  let nextNotice = 0;
  /** Task details the developer left open. Kept while the panel lives, so a refresh does not close them. */
  const expanded = new Set<string>();
  /** The period of the History column. Kept while the panel lives, so a refresh does not reset it. */
  let historyPeriod: HistoryPeriod = "week";
  /** Whether the History column is open. It starts collapsed; kept while the panel lives, so a refresh does not reopen it. */
  let historyOpen = false;
  /** Why every Run is disabled, the reasons of Run all; set before the cards are drawn. */
  let runReasonNow: string | null = null;
  /** The models chosen for the Proposals that carry Tasks, and the agent of `trama.agent`, from the newest picture. */
  let models: BoardModels = NO_MODELS;
  /** The columns as the newest picture drew them: the model window finds its Proposal's card here. */
  let lastColumns: BoardColumn[] = [];
  /** The window that chooses a Proposal's model; the developer's focus goes back to its gear when it closes. */
  const modelWindow = modelDialog(context, (proposal) => {
    board.querySelector<HTMLElement>(`[data-key="proposal:${proposal}"] [data-action="model"]`)?.focus();
  });
  root.append(modelWindow.node);
  /** The window that shows the body of a Backlog Proposal; the developer's focus goes back to its title when it closes. */
  const proposalWindow = proposalDialog(context, (proposal) => {
    board.querySelector<HTMLElement>(`[data-key="proposal:${proposal}"] [data-action="open"]`)?.focus();
  });
  root.append(proposalWindow.node);
  /** The Proposal card of the Backlog with this identity, as the newest picture drew it. */
  const backlogCard = (proposal: string): ProposalCard | undefined =>
    lastColumns.find((column) => column.id === "backlog")?.cards.find((card): card is ProposalCard => card.kind === "proposal" && card.id === proposal);
  /** The Proposal card of the Backlog that can have its model chosen, as the newest picture drew it. */
  const choosableCard = (proposal: string): ProposalCard | undefined =>
    lastColumns.find((column) => column.id === "backlog")?.cards.find((card): card is ProposalCard => card.kind === "proposal" && card.id === proposal && card.choosable);

  const env: CardEnv = {
    context,
    numbers: () => snapshot?.numbers ?? noNumbers,
    runReason: () => resolve.runReason,
    isExpanded: (key) => expanded.has(key),
    setExpanded: (key, open) => {
      if (open) expanded.add(key);
      else expanded.delete(key);
    },
    showCard: (key) => {
      const card = [...board.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset["key"] === key);
      card?.scrollIntoView({ block: "nearest" });
      card?.focus();
    },
    chooseModel: (proposal) => {
      const card = choosableCard(proposal);
      if (card !== undefined) modelWindow.open(card, models.agent);
    },
    openProposal: (proposal) => {
      const card = backlogCard(proposal);
      if (card !== undefined) proposalWindow.open(card);
    },
  };

  /** Each column ends with its one action, shown even when the column is empty: Add Work Item the Backlog, Run all the Active column, Resolve all the Blocked one. */
  const columnRuns: HTMLButtonElement[] = [];
  const columnResolves: HTMLButtonElement[] = [];
  const footButton = (kind: "add" | "run" | "resolve"): HTMLElement => {
    const foot = el("div", "board-column-foot");
    if (kind === "add") {
      const add = el("button", "trama-btn board-column-add");
      add.type = "button";
      add.append(icon("add"), el("span", "", "Add Work Item"));
      add.title = "Write a work item in Markdown and send it to an agent";
      add.setAttribute("aria-label", "Add Work Item");
      add.addEventListener("click", () => context.post({ type: "writeDesignRequest" }));
      foot.append(add);
    } else if (kind === "run") {
      const run = el("button", "trama-btn primary board-column-run");
      run.type = "button";
      run.append(icon("play"), el("span", "", "Run all"));
      run.setAttribute("aria-label", "Run all the Tasks in To do");
      run.addEventListener("click", () => context.post({ type: "launch", action: { kind: "implement-all" } }));
      columnRuns.push(run);
      foot.append(run);
    } else {
      const resolveAll = el("button", "trama-btn primary board-column-resolve");
      resolveAll.type = "button";
      resolveAll.append(icon("wand"), el("span", "", "Resolve all"));
      resolveAll.setAttribute("aria-label", "Resolve all the open Drifts");
      resolveAll.addEventListener("click", () => context.post({ type: "launch", action: { kind: "resolve-drifts" } }));
      columnResolves.push(resolveAll);
      foot.append(resolveAll);
    }
    return foot;
  };
  /** Run all is named by its tooltip when available, and says why it is not otherwise; its accessible name stays. */
  const setRunReason = (button: HTMLButtonElement, reason: string | null) => {
    button.disabled = reason !== null;
    button.title = reason ?? "Run all the Tasks in To do";
    if (reason === null) button.removeAttribute("aria-description");
    else button.setAttribute("aria-description", reason);
  };
  const parts = {} as Record<ColumnId, { section: HTMLElement; count: HTMLElement; body: HTMLElement; hint: HTMLElement }>;
  for (const id of COLUMN_ORDER) {
    const section = el("section", "board-column");
    section.dataset["column"] = id;
    const heading = el("h2", "board-column-head");
    const title = el("span", "board-column-title", COLUMN_TITLES[id]);
    const count = el("span", "board-count");
    const headingId = `board-column-${id}`;
    heading.id = headingId;
    section.setAttribute("aria-labelledby", headingId);
    const body = el("div", "board-column-body");
    if (id === "history") {
      const toggle = el("button", "board-collapse");
      toggle.type = "button";
      const applyHistoryOpen = () => {
        section.classList.toggle("is-collapsed", !historyOpen);
        toggle.setAttribute("aria-expanded", String(historyOpen));
        toggle.setAttribute("aria-label", historyOpen ? "Collapse History column" : "Expand History column");
        toggle.title = historyOpen ? "Collapse History column" : "Expand History column";
        setIcon(toggle, historyOpen ? "chevron-right" : "chevron-left");
      };
      toggle.addEventListener("click", () => {
        historyOpen = !historyOpen;
        applyHistoryOpen();
      });
      applyHistoryOpen();
      heading.append(toggle);
    }
    heading.append(title, count);
    section.append(heading);
    if (id === "history") {
      const select = el("select", "board-history-period");
      select.setAttribute("aria-label", "History period");
      for (const p of HISTORY_PERIODS) {
        const option = el("option", "", p.label);
        option.value = p.id;
        select.append(option);
      }
      select.value = historyPeriod;
      select.addEventListener("change", () => {
        historyPeriod = select.value as HistoryPeriod;
        render();
      });
      section.append(select);
    }
    section.append(body);
    if (id === "backlog") section.append(footButton("add"));
    if (id === "active") section.append(footButton("run"));
    if (id === "blocked") section.append(footButton("resolve"));
    columnsEl.append(section);
    parts[id] = { section, count, body, hint: el("p", "board-hint") };
  }

  const cache = new Map<string, { signature: string; node: HTMLElement }>();
  const announced = new Map<string, { signature: string; node: HTMLElement }>();
  /** The day headings of the History column, reused across refreshes. */
  let historyHeads = new Map<string, HTMLElement>();
  /** The History entries on the Board, reused across refreshes so an open details window stays open. */
  let historyEntries = new Map<string, HistoryEntryNode>();

  function render() {
    if (snapshot === null) return;
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && board.contains(active) ? { key: active.closest<HTMLElement>("[data-key]")?.dataset["key"], action: active.dataset["action"] } : null;

    runReasonNow = joinReasons([resolve.runReason, runBlocker(snapshot.tasks, namerOf(snapshot.numbers ?? noNumbers))]);
    const live = new Set<string>();
    const boardResolve: BoardResolve = { blocker: resolve.blocker, drifts: resolve.drifts, resolving: resolve.resolving, note: autopilotNote(resolve.autopilot) };
    const columns = buildBoard(snapshot, resolve.autopilot.failures, boardResolve, models);
    lastColumns = columns;
    const placedGhosts = announcedGhosts(columns, snapshot.announcements, asking);
    const liveAnnounced = new Set<string>();
    const nextHeads = new Map<string, HTMLElement>();
    for (const column of columns) {
      const part = parts[column.id];
      part.hint.textContent = column.hint;
      const cardNode = (card: Card) => {
        live.add(card.key);
        const signature = JSON.stringify(card) + runReasonNow;
        let entry = cache.get(card.key);
        if (entry?.signature !== signature) {
          entry = { signature, node: renderCard(card, env) };
          cache.set(card.key, entry);
        }
        return entry.node;
      };
      part.count.textContent = String(column.cards.length);
      const shown = interleave(
        column.cards.map(cardNode),
        column.id === GHOST_COLUMN
          ? placedGhosts.map((g) => {
              liveAnnounced.add(g.card.key);
              const signature = JSON.stringify(g.card);
              let entry = announced.get(g.card.key);
              if (entry?.signature !== signature) {
                entry = { signature, node: renderAnnounced(g.card) };
                announced.set(g.card.key, entry);
              }
              return { item: entry.node, index: g.index };
            })
          : [],
      );
      reconcile(part.body, shown.length > 0 ? shown : [part.hint]);
    }
    const history = historyGroups(snapshot.history, historyPeriod);
    parts.history.count.textContent = String(history.reduce((n, g) => n + g.entries.length, 0));
    parts.history.hint.textContent = EMPTY_HINTS.history;
    const numbers = snapshot.numbers ?? noNumbers;
    const nextEntries = new Map<string, HistoryEntryNode>();
    const historyShown = history.flatMap((g) => {
      const head = historyHeads.get(g.key) ?? el("h3", "board-history-day");
      head.textContent = g.heading;
      nextHeads.set(g.key, head);
      return [
        head,
        ...g.entries.map((entry) => {
          const entryNode = historyEntries.get(entry.id) ?? historyEntryNode(context);
          nextEntries.set(entry.id, entryNode);
          entryNode.update(entry, numbers);
          return entryNode.node;
        }),
      ];
    });
    arrange(parts.history.body, historyShown.length > 0 ? historyShown : [parts.history.hint]);
    historyHeads = nextHeads;
    historyEntries = nextEntries;
    const blocker = runReasonNow;
    const setReason = (button: HTMLButtonElement, reason: string | null, note: string | null = reason) => {
      button.disabled = reason !== null;
      button.title = note ?? "";
      if (note === null) button.removeAttribute("aria-description");
      else button.setAttribute("aria-description", note);
    };
    for (const run of columnRuns) setRunReason(run, blocker);
    const scanLabel = scanButtonLabel("Scan System", snapshot.tasksSinceScan);
    setIconLabel(scanSystem, "search", scanLabel.text);
    if (scanLabel.tooltip) scanSystem.title = scanLabel.tooltip;
    else scanSystem.removeAttribute("title");
    scanSystem.setAttribute("aria-label", scanLabel.ariaLabel);
    // The priority reason comes first; the mode and any waiting reason follow, as text only: the button stays enabled.
    const resolveNote = resolve.blocker === null ? autopilotNote(resolve.autopilot) : `${resolve.blocker}\n${autopilotNote(resolve.autopilot)}`;
    for (const r of columnResolves) setReason(r, resolve.blocker, resolveNote);
    for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);
    for (const key of announced.keys()) if (!liveAnnounced.has(key)) announced.delete(key);
    // The model window follows its Proposal: it redraws from the newest card, and closes when the card is gone.
    const shownProposal = modelWindow.shown();
    if (shownProposal !== null) modelWindow.update(choosableCard(shownProposal), models.agent);
    // The body window follows its Proposal too: it redraws from the newest card, and closes when the card left Backlog.
    const shownBody = proposalWindow.shown();
    if (shownBody !== null) proposalWindow.update(backlogCard(shownBody));

    if (focused?.key !== undefined && (document.activeElement === document.body || document.activeElement === null)) {
      const card = [...board.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset["key"] === focused.key);
      const enabled = [...(card?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const target = enabled.find((b) => b.dataset["action"] === focused.action) ?? enabled[0] ?? card;
      target?.focus();
    }
  }

  function renderNotices() {
    noticesEl.replaceChildren(
      ...notices.map((notice) => {
        const row = el("div", "board-notice");
        const close = el("button", "trama-btn board-btn board-notice-close");
        setIconLabel(close, "close", "Close");
        close.type = "button";
        close.setAttribute("aria-label", `Close the notice: ${notice.text}`);
        close.addEventListener("click", () => {
          notices.splice(notices.findIndex((n) => n.id === notice.id), 1);
          renderNotices();
        });
        row.append(el("span", "board-notice-text", notice.text), close);
        return row;
      }),
    );
  }

  return {
    update(next, isAsking = false, resolveState: typeof resolve = { blocker: null, runReason: null, autopilot: { mode: "disabled", phase: "manual", reason: null, failures: [] }, drifts: {}, resolving: [] }, modelsState: BoardModels = NO_MODELS) {
      snapshot = next;
      asking = isAsking;
      resolve = resolveState;
      models = modelsState;
      render();
    },
    receiveModels(message) {
      modelWindow.receiveModels(message.models, message.error ?? null);
    },
    withdrawn(gone: AnnouncementView[]) {
      for (const a of gone) notices.push({ id: nextNotice++, text: withdrawnNotice(a) });
      renderNotices();
    },
    show() {},
  };
};
