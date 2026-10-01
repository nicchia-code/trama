import type { Snapshot } from "../../../../src/core/snapshot";
import type { MountView } from "../types";
import css from "./board.css" with { type: "text" };
import { buildBoard, COLUMN_ORDER, COLUMN_TITLES, type ColumnId, dropTarget, type TaskCard } from "./logic";
import { type CardEnv, renderCard, setPending } from "./render";

/** The host answers a move with a snapshot; if it fails it sends an error instead, so dimmed cards are released after this long. */
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
  const columnsEl = el("div", "board-columns");
  board.append(toolbar, columnsEl);
  root.append(board);

  const toolbarButton = (label: string, onClick: () => void, primary = false) => {
    const node = el("button", `trama-btn${primary ? " primary" : ""}`, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    toolbar.append(node);
    return node;
  };
  const runAll = toolbarButton("Run all To do", () => context.post({ type: "launch", action: { kind: "implement-all" } }), true);
  toolbarButton("New technical task", () => context.post({ type: "newTechnicalTask" }));
  toolbarButton("Scan System", () => context.post({ type: "launch", action: { kind: "scan" } }));
  toolbarButton("Design…", () => context.post({ type: "launch", action: { kind: "design" } }));

  let dragged: TaskCard | null = null;
  const pending = new Set<string>();
  let pendingTimer: number | undefined;
  let snapshot: Snapshot | null = null;

  const env: CardEnv = {
    context,
    drag: (card) => {
      dragged = card;
      if (card === null) for (const column of Object.values(parts)) column.section.classList.remove("drop-ok", "drop-refused");
    },
    moveTask: (card, column) => {
      if (pending.has(card.id)) return;
      context.post({ type: "moveTask", id: card.id, column });
      pending.add(card.id);
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

  function render() {
    if (snapshot === null) return;
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && board.contains(active) ? { key: active.closest<HTMLElement>("[data-key]")?.dataset["key"], action: active.dataset["action"] } : null;

    const live = new Set<string>();
    for (const column of buildBoard(snapshot)) {
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
        return entry.node;
      });
      reconcile(part.body, nodes.length > 0 ? nodes : [part.hint]);
      if (column.id === "todo") runAll.disabled = column.cards.length === 0;
    }
    for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);

    if (focused?.key !== undefined && (document.activeElement === document.body || document.activeElement === null)) {
      const card = [...board.querySelectorAll<HTMLElement>("[data-key]")].find((n) => n.dataset["key"] === focused.key);
      const enabled = [...(card?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const other = focused.action?.startsWith("move-") ? `move-${focused.action === "move-left" ? "right" : "left"}` : undefined;
      const target = enabled.find((b) => b.dataset["action"] === focused.action) ?? enabled.find((b) => b.dataset["action"] === other) ?? enabled[0] ?? card;
      target?.focus();
    }
  }

  return {
    update(next) {
      snapshot = next;
      pending.clear();
      clearTimeout(pendingTimer);
      render();
    },
    show() {},
  };
};
