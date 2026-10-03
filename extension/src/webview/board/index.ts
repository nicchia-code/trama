import type { AnnouncementView, Snapshot } from "../../../../src/core/snapshot";
import type { MountView } from "../types";
import css from "./board.css" with { type: "text" };
import { announcedGhosts, buildBoard, COLUMN_ORDER, COLUMN_TITLES, type ColumnId, dropTarget, interleave, runAllBlocker, type TaskCard, withdrawnNotice } from "./logic";
import { type CardEnv, renderAnnounced, renderCard, setDesignPending, setPending } from "./render";

/** The host answers a move with a snapshot, or with an error that releases the dimmed cards at once; if neither comes, they are released after this long. */
const PENDING_TIMEOUT_MS = 5000;

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

  const toolbarButton = (label: string, onClick: () => void, primary = false) => {
    const node = el("button", `trama-btn${primary ? " primary" : ""}`, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    toolbar.append(node);
    return node;
  };
  const runAll = toolbarButton("Run all To do", () => context.post({ type: "launch", action: { kind: "implement-all" } }), true);
  toolbarButton("Scan System", () => context.post({ type: "launch", action: { kind: "scan" } }));
  toolbarButton("Design…", () => context.post({ type: "launch", action: { kind: "design" } }));
  toolbarButton("Fix…", () => context.post({ type: "launch", action: { kind: "fix" } }));

  let dragged: TaskCard | null = null;
  /** Tasks whose move waits for the host's next snapshot, with the column each is going to. */
  const pending = new Map<string, TaskCard["column"]>();
  let pendingTimer: number | undefined;
  let snapshot: Snapshot | null = null;
  /** Whether a question round is open: the ghosts then say the agent waits for the developer's answers. */
  let asking = false;
  /** What the developer was told about announced cards the agent never delivered; kept until closed, or until the panel closes. */
  const notices: { id: number; text: string }[] = [];
  let nextNotice = 0;
  /** Design cards the developer left open. Kept while the panel lives, so a refresh does not close them. */
  const expanded = new Set<string>();

  const env: CardEnv = {
    context,
    drag: (card) => {
      dragged = card;
      if (card === null) for (const column of Object.values(parts)) column.section.classList.remove("drop-ok", "drop-refused");
    },
    isExpanded: (key) => expanded.has(key),
    setExpanded: (key, open) => {
      if (open) expanded.add(key);
      else expanded.delete(key);
    },
    showTask: (id) => {
      const card = [...board.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset["key"] === `task:${id}`);
      card?.scrollIntoView({ block: "nearest" });
      card?.focus();
    },
    moveTask: (card, column) => {
      if (card.agent || pending.has(card.id)) return;
      context.post({ type: "moveTask", id: card.id, column });
      pending.set(card.id, column);
      clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => {
        pending.clear();
        render();
      }, PENDING_TIMEOUT_MS);
      render();
    },
  };

  const parts = {} as Record<ColumnId, { section: HTMLElement; count: HTMLElement; body: HTMLElement; hint: HTMLElement }>;
  for (const id of COLUMN_ORDER) {
    const section = el("section", "board-column");
    section.dataset["column"] = id;
    const heading = el("h2", "board-column-head");
    const title = el("span", "board-column-title", COLUMN_TITLES[id]);
    const count = el("span", "board-count");
    heading.append(title, count);
    const headingId = `board-column-${id}`;
    heading.id = headingId;
    section.setAttribute("aria-labelledby", headingId);
    const body = el("div", "board-column-body");
    section.append(heading, body);
    columnsEl.append(section);
    parts[id] = { section, count, body, hint: el("p", "board-hint") };

    const allowed = () => (dragged === null ? undefined : dropTarget(dragged.column, id));
    const over = (event: DragEvent) => {
      const target = allowed();
      if (target === undefined) return;
      const accepts = target !== null;
      if (accepts) event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = accepts ? "move" : "none";
      section.classList.toggle("drop-ok", accepts);
      section.classList.toggle("drop-refused", !accepts && id === "decide");
    };
    section.addEventListener("dragenter", over);
    section.addEventListener("dragover", over);
    section.addEventListener("dragleave", (event) => {
      if (!(event.relatedTarget instanceof Node) || !section.contains(event.relatedTarget)) section.classList.remove("drop-ok", "drop-refused");
    });
    section.addEventListener("drop", (event) => {
      section.classList.remove("drop-ok", "drop-refused");
      const target = allowed();
      const card = dragged;
      if (!target || !card) return;
      event.preventDefault();
      dragged = null;
      env.moveTask(card, target);
    });
  }

  const cache = new Map<string, { signature: string; node: HTMLElement }>();
  const announced = new Map<string, { signature: string; node: HTMLElement }>();

  function render() {
    if (snapshot === null) return;
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && board.contains(active) ? { key: active.closest<HTMLElement>("[data-key]")?.dataset["key"], action: active.dataset["action"] } : null;

    const live = new Set<string>();
    const columns = buildBoard(snapshot);
    const placedGhosts = announcedGhosts(columns, snapshot.announcements, asking);
    const liveAnnounced = new Set<string>();
    for (const column of columns) {
      const part = parts[column.id];
      part.count.textContent = String(column.cards.length);
      part.hint.textContent = column.hint;
      const nodes = column.cards.map((card) => {
        live.add(card.key);
        const signature = JSON.stringify(card);
        let entry = cache.get(card.key);
        if (entry?.signature !== signature) {
          entry = { signature, node: renderCard(card, env) };
          cache.set(card.key, entry);
        }
        if (card.kind === "task") setPending(entry.node, pending.has(card.id));
        if (card.kind === "design") setDesignPending(entry.node, pending);
        return entry.node;
      });
      const withAnnounced = interleave(
        nodes,
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
      reconcile(part.body, withAnnounced.length > 0 ? withAnnounced : [part.hint]);
    }
    // Run all To do covers the Tasks inside design cards too, which may stand in another column.
    const blocker = runAllBlocker(snapshot.tasks);
    runAll.disabled = blocker !== null;
    runAll.title = blocker ?? "";
    if (blocker === null) runAll.removeAttribute("aria-description");
    else runAll.setAttribute("aria-description", blocker);
    for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);
    for (const key of announced.keys()) if (!liveAnnounced.has(key)) announced.delete(key);

    if (focused?.key !== undefined && (document.activeElement === document.body || document.activeElement === null)) {
      const card = [...board.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset["key"] === focused.key);
      const enabled = [...(card?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const other = focused.action?.startsWith("move-") ? `move-${focused.action === "move-left" ? "right" : "left"}` : undefined;
      const target = enabled.find((b) => b.dataset["action"] === focused.action) ?? enabled.find((b) => b.dataset["action"] === other) ?? enabled[0] ?? card;
      target?.focus();
    }
  }

  function renderNotices() {
    noticesEl.replaceChildren(
      ...notices.map((notice) => {
        const row = el("div", "board-notice");
        const close = el("button", "trama-btn board-btn board-notice-close", "Close");
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
    update(next, isAsking = false) {
      snapshot = next;
      asking = isAsking;
      pending.clear();
      clearTimeout(pendingTimer);
      render();
    },
    fail() {
      pending.clear();
      clearTimeout(pendingTimer);
      render();
    },
    withdrawn(gone: AnnouncementView[]) {
      for (const a of gone) notices.push({ id: nextNotice++, text: withdrawnNotice(a) });
      renderNotices();
    },
    show() {},
  };
};
