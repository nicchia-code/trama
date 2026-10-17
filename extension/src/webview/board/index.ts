import { namerOf, noNumbers } from "../../../../src/core/card-names";
import { joinReasons, runBlocker } from "../../../../src/core/design";
import type { AnnouncementView, Snapshot } from "../../../../src/core/snapshot";
import type { DriftAutopilotStatus } from "../../host/drift-resolution";
import type { MountView } from "../types";
import css from "./board.css" with { type: "text" };
import { announcedGhosts, autopilotNote, buildBoard, type Card, COLUMN_ORDER, COLUMN_TITLES, type ColumnId, DONE_PERIODS, type DonePeriod, doneGroups, interleave, withdrawnNotice } from "./logic";
import { type CardEnv, renderAnnounced, renderCard } from "./render";
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

export const mountBoard: MountView = (root, context) => {
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

  const toolbarButton = (name: IconName, label: string, onClick: () => void, primary = false, title?: string) => {
    const node = el("button", `trama-btn${primary ? " primary" : ""}`);
    setIconLabel(node, name, label);
    node.type = "button";
    if (title !== undefined) node.title = title;
    node.addEventListener("click", onClick);
    toolbar.append(node);
    return node;
  };
  const runAll = toolbarButton("play", "Run Ready Tasks", () => context.post({ type: "launch", action: { kind: "implement-all" } }), true);
  const resolveDrifts = toolbarButton("wand", "Resolve Drifts", () => context.post({ type: "launch", action: { kind: "resolve-drifts" } }));
  const scanSystem = toolbarButton("search", "Scan System", () => context.post({ type: "launch", action: { kind: "scan" } }));
  toolbarButton("comment", "Quick request…", () => context.post({ type: "launch", action: { kind: "design" } }), false, "Ask an agent to design a change in one line");
  toolbarButton("add", "Add Work Item…", () => context.post({ type: "writeDesignRequest" }), false, "Write a work item in Markdown and send it to an agent");

  let snapshot: Snapshot | null = null;
  /** Whether a question round is open: the ghosts then say the agent waits for the developer's answers. */
  let asking = false;
  /** Whether Resolve Drifts works and why the host would refuse it now; `runReason` is why every Run is disabled, if any. */
  let resolve: { blocker: string | null; runReason: string | null; autopilot: DriftAutopilotStatus } = {
    blocker: null,
    runReason: null,
    autopilot: { mode: "disabled", phase: "manual", reason: null, failures: [] },
  };
  /** What the developer was told about announced cards the agent never delivered; kept until closed, or until the panel closes. */
  const notices: { id: number; text: string }[] = [];
  let nextNotice = 0;
  /** Task details the developer left open. Kept while the panel lives, so a refresh does not close them. */
  const expanded = new Set<string>();
  /** The period of the Done column. Kept while the panel lives, so a refresh does not reset it. */
  let period: DonePeriod = "week";
  /** Whether the Done column is open. It starts collapsed; kept while the panel lives, so a refresh does not reopen it. */
  let doneOpen = false;

  const env: CardEnv = {
    context,
    numbers: () => snapshot?.numbers ?? noNumbers,
    resolvingReason: () => resolve.runReason,
    isExpanded: (key) => expanded.has(key),
    setExpanded: (key, open) => {
      if (open) expanded.add(key);
      else expanded.delete(key);
    },
    showCard: (key) => {
      const card = [...board.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset["key"] === key);
      // A Task inside a closed design card is hidden: open that card first, then show the Task.
      const design = card?.closest<HTMLElement>(".board-card-design");
      const list = design?.querySelector<HTMLElement>(".board-design-tasks");
      if (design && list?.hidden) design.querySelector<HTMLButtonElement>(".board-design-toggle")?.click();
      card?.scrollIntoView({ block: "nearest" });
      card?.focus();
    },
  };

  /** Work Items ends with Work Item only, and Ready with Run all only; each stays even when its column is empty. */
  const columnRuns: HTMLButtonElement[] = [];
  const footButton = (kind: "add" | "run"): HTMLElement => {
    const foot = el("div", "board-column-foot");
    if (kind === "add") {
      const add = el("button", "trama-btn board-column-add");
      add.type = "button";
      add.append(icon("add"), el("span", "", "Work Item"));
      add.title = "Write a work item in Markdown and send it to an agent";
      add.setAttribute("aria-label", "Add Work Item");
      add.addEventListener("click", () => context.post({ type: "writeDesignRequest" }));
      foot.append(add);
    } else {
      const run = el("button", "trama-btn primary board-column-run");
      run.type = "button";
      run.append(icon("play"), el("span", "", "Run all"));
      run.setAttribute("aria-label", "Run Ready Tasks");
      run.addEventListener("click", () => context.post({ type: "launch", action: { kind: "implement-all" } }));
      columnRuns.push(run);
      foot.append(run);
    }
    return foot;
  };
  /** Run Ready Tasks is named by its tooltip when available, and says why it is not otherwise; its accessible name stays. */
  const setRunReason = (button: HTMLButtonElement, reason: string | null) => {
    button.disabled = reason !== null;
    button.title = reason ?? "Run Ready Tasks";
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
    if (id === "done") {
      const toggle = el("button", "board-collapse");
      toggle.type = "button";
      const applyDoneOpen = () => {
        section.classList.toggle("is-collapsed", !doneOpen);
        toggle.setAttribute("aria-expanded", String(doneOpen));
        toggle.setAttribute("aria-label", doneOpen ? "Collapse Done column" : "Expand Done column");
        toggle.title = doneOpen ? "Collapse Done column" : "Expand Done column";
        setIcon(toggle, doneOpen ? "chevron-right" : "chevron-left");
      };
      toggle.addEventListener("click", () => {
        doneOpen = !doneOpen;
        applyDoneOpen();
      });
      applyDoneOpen();
      heading.append(toggle);
    }
    heading.append(title, count);
    section.append(heading);
    if (id === "done") {
      const select = el("select", "board-done-period");
      select.setAttribute("aria-label", "Done period");
      for (const p of DONE_PERIODS) {
        const option = el("option", "", p.label);
        option.value = p.id;
        select.append(option);
      }
      select.value = period;
      select.addEventListener("change", () => {
        period = select.value as DonePeriod;
        render();
      });
      section.append(select);
    }
    section.append(body);
    if (id === "decide") section.append(footButton("add"));
    if (id === "todo") section.append(footButton("run"));
    columnsEl.append(section);
    parts[id] = { section, count, body, hint: el("p", "board-hint") };
  }

  const cache = new Map<string, { signature: string; node: HTMLElement }>();
  const announced = new Map<string, { signature: string; node: HTMLElement }>();
  /** The day headings of the Done column, reused across refreshes. */
  let dayHeads = new Map<string, HTMLElement>();

  function render() {
    if (snapshot === null) return;
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && board.contains(active) ? { key: active.closest<HTMLElement>("[data-key]")?.dataset["key"], action: active.dataset["action"] } : null;

    const live = new Set<string>();
    const columns = buildBoard(snapshot, resolve.autopilot.failures, resolve.blocker);
    const placedGhosts = announcedGhosts(columns, snapshot.announcements, asking);
    const liveAnnounced = new Set<string>();
    const nextHeads = new Map<string, HTMLElement>();
    for (const column of columns) {
      const part = parts[column.id];
      part.hint.textContent = column.hint;
      const cardNode = (card: Card) => {
        live.add(card.key);
        const signature = JSON.stringify(card) + resolve.runReason;
        let entry = cache.get(card.key);
        if (entry?.signature !== signature) {
          entry = { signature, node: renderCard(card, env) };
          cache.set(card.key, entry);
        }
        return entry.node;
      };
      let shown: HTMLElement[];
      if (column.id === "done") {
        // Done has no ghosts: its cards come grouped by day, filtered by the period, and the count is what is shown.
        const groups = doneGroups(column.cards, period);
        part.count.textContent = String(groups.reduce((n, g) => n + g.cards.length, 0));
        shown = groups.flatMap((g) => {
          const head = dayHeads.get(g.key) ?? el("h3", "board-done-day");
          head.textContent = g.heading;
          nextHeads.set(g.key, head);
          return [head, ...g.cards.map(cardNode)];
        });
      } else {
        part.count.textContent = String(column.cards.length);
        shown = interleave(
          column.cards.map(cardNode),
          placedGhosts[column.id].map((g) => {
            liveAnnounced.add(g.card.key);
            const signature = JSON.stringify(g.card);
            let entry = announced.get(g.card.key);
            if (entry?.signature !== signature) {
              entry = { signature, node: renderAnnounced(g.card) };
              announced.set(g.card.key, entry);
            }
            return { item: entry.node, index: g.index };
          }),
        );
      }
      reconcile(part.body, shown.length > 0 ? shown : [part.hint]);
    }
    dayHeads = nextHeads;
    const blocker = joinReasons([resolve.runReason, runBlocker(snapshot.tasks, namerOf(snapshot.numbers ?? noNumbers))]);
    const setReason = (button: HTMLButtonElement, reason: string | null, note: string | null = reason) => {
      button.disabled = reason !== null;
      button.title = note ?? "";
      if (note === null) button.removeAttribute("aria-description");
      else button.setAttribute("aria-description", note);
    };
    setReason(runAll, blocker);
    for (const run of columnRuns) setRunReason(run, blocker);
    const scanLabel = scanButtonLabel("Scan System", snapshot.tasksSinceScan);
    setIconLabel(scanSystem, "search", scanLabel.text);
    if (scanLabel.tooltip) scanSystem.title = scanLabel.tooltip;
    else scanSystem.removeAttribute("title");
    scanSystem.setAttribute("aria-label", scanLabel.ariaLabel);
    // The priority reason comes first; the mode and any waiting reason follow, as text only: the button stays enabled.
    const resolveNote = resolve.blocker === null ? autopilotNote(resolve.autopilot) : `${resolve.blocker}\n${autopilotNote(resolve.autopilot)}`;
    setReason(resolveDrifts, resolve.blocker, resolveNote);
    for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);
    for (const key of announced.keys()) if (!liveAnnounced.has(key)) announced.delete(key);

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
    update(next, isAsking = false, resolveState: typeof resolve = { blocker: null, runReason: null, autopilot: { mode: "disabled", phase: "manual", reason: null, failures: [] } }) {
      snapshot = next;
      asking = isAsking;
      resolve = resolveState;
      render();
    },
    withdrawn(gone: AnnouncementView[]) {
      for (const a of gone) notices.push({ id: nextNotice++, text: withdrawnNotice(a) });
      renderNotices();
    },
    show() {},
  };
};
