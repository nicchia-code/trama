import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { TramaError } from "./errors";
import { listHistory, saveHistory } from "./history";
import { listProposals, save as writeProposal } from "./proposals";
import { canonicalCardId } from "./schema";
import { type CardEntry, type CardLayout, listCards, type Project, readDocument, sha256, writeDocument } from "./store";
import { type Drift, listDrifts, listTasks, type Task } from "./work";

export type CardKind = "proposal" | "task" | "drift";

export interface RewrittenCard {
  kind: CardKind;
  from: string;
  to: string;
  created: string;
}

interface NumberedCard {
  kind: CardKind;
  /** The numbered identity, padded to four digits. */
  number: string;
  /** The part of the name after the first hyphen, kept as it is. */
  slug: string;
  entry: CardEntry;
  dir: string;
  layout: CardLayout;
}

const LABEL: Record<CardKind, string> = { proposal: "Proposal", task: "Task", drift: "Drift" };

/** The identity a numbered card receives: the same on every copy that starts from the same number. */
export function rewrittenId(kind: CardKind, number: string): string {
  return sha256(`${kind}:${number}`).slice(0, 8);
}

/** The creation instant that keeps number order and does not depend on when the command runs. */
export function rewrittenInstant(number: string): string {
  return new Date(Number(number)).toISOString();
}

function stemOf(name: string): string {
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

function remembersCreated(dir: string, entry: CardEntry, layout: CardLayout): boolean {
  const path = layout === "folder" ? join(dir, entry.name, "proposal.md") : join(dir, entry.name);
  try {
    const created = readDocument(path).data["created"];
    return created !== undefined && created !== null;
  } catch {
    return false;
  }
}

function numberedIn(dir: string, layout: CardLayout, kind: CardKind): NumberedCard[] {
  const out: NumberedCard[] = [];
  for (const entry of listCards(dir, layout)) {
    const stem = stemOf(entry.name);
    const match = /^(\d{4,})-(.*)$/.exec(stem);
    const prefix = match?.[1];
    const slug = match?.[2];
    if (!prefix || slug === undefined) continue;
    // Eight digits that already remember an instant are a random identity, not a numbered card.
    if (prefix.length === 8 && remembersCreated(dir, entry, layout)) continue;
    const number = String(Number(prefix)).padStart(4, "0");
    out.push({ kind, number, slug, entry, dir, layout });
  }
  return out;
}

function numberedCards(p: Project): NumberedCard[] {
  return [
    ...numberedIn(join(p.dir, "proposals"), "folder", "proposal"),
    ...numberedIn(join(p.dir, "tasks"), "file", "task"),
    ...numberedIn(join(p.dir, "drifts"), "file", "drift"),
  ];
}

function refuseDuplicates(cards: NumberedCard[]): void {
  const groups = new Map<string, NumberedCard[]>();
  for (const card of cards) {
    const key = `${card.kind}:${card.number}`;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  for (const group of groups.values()) {
    const first = group[0];
    if (!first || group.length < 2) continue;
    const names = group.map((card) => card.entry.name).join(", ");
    throw new TramaError(`${group.length} ${LABEL[first.kind]}s share the number ${first.number} (${names}), so numbered cards were not rewritten.`);
  }
}

function refuseCollisions(p: Project, cards: NumberedCard[]): Map<string, string> {
  const assigned = new Map<string, string>();
  for (const card of cards) {
    const to = rewrittenId(card.kind, card.number);
    const key = `${card.kind}:${to}`;
    const previous = assigned.get(key);
    if (previous) throw new TramaError(`${LABEL[card.kind]} ${previous} and ${LABEL[card.kind]} ${card.number} would both become ${to}, so numbered cards were not rewritten.`);
    assigned.set(key, card.number);
  }
  const taken = {
    proposal: new Set(listCards(join(p.dir, "proposals"), "folder").map((card) => card.id)),
    task: new Set(listCards(join(p.dir, "tasks"), "file").map((card) => card.id)),
    drift: new Set(listCards(join(p.dir, "drifts"), "file").map((card) => card.id)),
  };
  for (const card of cards) taken[card.kind].delete(card.number);
  for (const card of cards) {
    const to = rewrittenId(card.kind, card.number);
    if (taken[card.kind].has(to))
      throw new TramaError(`The new identity of ${LABEL[card.kind]} ${card.number} would be ${to}, which another ${LABEL[card.kind]} already has, so numbered cards were not rewritten.`);
    const name = card.layout === "file" ? `${to}-${card.slug}.md` : `${to}-${card.slug}`;
    const destination = join(card.dir, name);
    const source = join(card.dir, card.entry.name);
    if (destination !== source && existsSync(destination))
      throw new TramaError(`The new name of ${LABEL[card.kind]} ${card.number} would be ${name}, which already exists, so numbered cards were not rewritten.`);
  }
  return new Map(cards.map((card) => [`${card.kind}:${card.number}`, rewrittenId(card.kind, card.number)]));
}

function mapped(kind: CardKind, value: string | null, ids: Map<string, string>): string | null {
  if (value === null) return null;
  return ids.get(`${kind}:${canonicalCardId(value)}`) ?? value;
}

function writeTask(task: Task): void {
  const data: { created?: string | null } = { ...task.data };
  if (data.created == null) delete data.created;
  writeDocument(task.path, data, task.body);
}

function writeDrift(drift: Drift): void {
  const data: { created?: string | null } = { ...drift.data };
  if (data.created == null) delete data.created;
  writeDocument(drift.path, data, drift.body);
}

/**
 * Gives every numbered Proposal, Task and Drift its own identity.
 * Checks duplicate numbers and colliding identities before it writes anything.
 * Does nothing, and says so, when no card is still numbered.
 */
export function rewriteNumberedCards(p: Project): RewrittenCard[] {
  const cards = numberedCards(p);
  if (cards.length === 0) return [];
  refuseDuplicates(cards);
  const ids = refuseCollisions(p, cards);
  const rewritten = new Map(cards.map((card) => [card.entry.name, card]));

  // Read every card before the first write: a card that does not read or parse stops the rewrite with nothing changed.
  const proposals = listProposals(p);
  const tasks = listTasks(p);
  const drifts = listDrifts(p);
  const history = listHistory(p);
  for (const proposal of proposals) {
    const card = rewritten.get(proposal.name);
    const requires = proposal.data.requires.map((id) => mapped("proposal", id, ids) as string);
    const drifts = proposal.data.drifts.map((entry) => ({ ...entry, drift: mapped("drift", entry.drift, ids) ?? entry.drift }));
    const changed = requires.some((id, i) => id !== proposal.data.requires[i]) || drifts.some((entry, i) => entry.drift !== proposal.data.drifts[i]?.drift);
    if (!card && !changed) continue;
    proposal.data.requires = requires;
    proposal.data.drifts = drifts;
    if (card) proposal.data.created = rewrittenInstant(card.number);
    writeProposal(proposal);
  }
  for (const task of tasks) {
    const card = rewritten.get(task.name);
    const proposal = mapped("proposal", task.data.proposal, ids);
    const drift = mapped("drift", task.data.drift, ids);
    const changed = proposal !== task.data.proposal || drift !== task.data.drift;
    if (!card && !changed) continue;
    task.data.proposal = proposal;
    task.data.drift = drift;
    if (card) task.data.created = rewrittenInstant(card.number);
    writeTask(task);
  }
  for (const drift of drifts) {
    const card = rewritten.get(drift.name);
    const proposal = mapped("proposal", drift.data.proposal, ids);
    const task = mapped("task", drift.data.task, ids);
    const origin = mapped("task", drift.data.origin, ids);
    const resolvedBy = mapped("proposal", drift.data.resolvedBy, ids);
    const previous = mapped("drift", drift.data.previous, ids);
    const changed = proposal !== drift.data.proposal || task !== drift.data.task || origin !== drift.data.origin || resolvedBy !== drift.data.resolvedBy || previous !== drift.data.previous;
    if (!card && !changed) continue;
    drift.data.proposal = proposal;
    drift.data.task = task;
    drift.data.origin = origin;
    drift.data.previous = previous;
    drift.data.resolvedBy = resolvedBy;
    if (card) drift.data.created = rewrittenInstant(card.number);
    writeDrift(drift);
  }
  for (const entry of history) {
    const cited = entry.tasks.map((id) => mapped("task", id, ids) as string);
    if (cited.every((id, i) => id === entry.tasks[i])) continue;
    saveHistory({ ...entry, tasks: cited });
  }

  const done: RewrittenCard[] = [];
  for (const card of cards) {
    const to = ids.get(`${card.kind}:${card.number}`) as string;
    const name = card.layout === "file" ? `${to}-${card.slug}.md` : `${to}-${card.slug}`;
    renameSync(join(card.dir, card.entry.name), join(card.dir, name));
    done.push({ kind: card.kind, from: card.number, to, created: rewrittenInstant(card.number) });
  }
  return done;
}
