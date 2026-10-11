import type { CardKind, CardNumbers } from "./card-names";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError } from "./errors";
import { createdField, idField, type Raw } from "./schema";
import { compareByCreation, listCards, type CardLayout, type Project, readDocument } from "./store";

export type { CardKind };

export const CARD_KINDS: readonly CardKind[] = ["proposal", "task", "drift"];

/** The letter a short number is written with: `P3`, `T3`, `D3`. */
export const KIND_LETTER: Record<CardKind, string> = { proposal: "P", task: "T", drift: "D" };

/** Where the numbers of one working copy live. The folder is not versioned: it ignores itself and everything in it. */
export const shortNumbersDir = (p: Project) => join(p.dir, "short-numbers");
const assignedFile = (p: Project) => join(shortNumbersDir(p), "assigned");
const ignoreFile = (p: Project) => join(shortNumbersDir(p), ".gitignore");

interface LiveCard {
  id: string;
  created: string | null;
  /** A Done Task of a design still under way: it keeps the number it has but never takes one. */
  keepOnly?: boolean;
}

/** A card read from its file: a live one, or a Done Task of a design that may keep its number. */
interface ReadCard extends LiveCard {
  /** The design (Proposal) of a Task, or null. */
  design: string | null;
  done: boolean;
}

/** The Proposal a Task's file links it to, or null when there is none or it cannot be read. */
function designField(raw: Raw, file: string): string | null {
  try {
    return idField(raw, "proposal", file);
  } catch {
    return null;
  }
}

/** Where a kind's cards are and which status or column leaves a card live: a Proposal not yet approved, rejected or discarded, a Drift not yet resolved, a Task in To do or In progress. */
const KIND_SPEC: Record<CardKind, { folder: string; layout: CardLayout; field: string; fallback: string; live: readonly string[] }> = {
  proposal: { folder: "proposals", layout: "folder", field: "status", fallback: "open", live: ["draft", "open"] },
  task: { folder: "tasks", layout: "file", field: "column", fallback: "todo", live: ["todo", "doing"] },
  drift: { folder: "drifts", layout: "file", field: "status", fallback: "open", live: ["open"] },
};

/**
 * The live cards of a kind in one `.trama/` folder, and its Done Tasks that belong to a design. A card that cannot be
 * read has no number: reading it is another command's error to report.
 */
function cardsIn(dir: string, kind: CardKind): ReadCard[] {
  const spec = KIND_SPEC[kind];
  const folder = join(dir, spec.folder);
  const cards: ReadCard[] = [];
  for (const entry of listCards(folder, spec.layout)) {
    const file = spec.layout === "folder" ? join(folder, entry.name, "proposal.md") : join(folder, entry.name);
    try {
      const raw = readDocument(file).data;
      const state = raw[spec.field] ?? spec.fallback;
      const design = kind === "task" ? designField(raw, file) : null;
      const live = typeof state === "string" && spec.live.includes(state);
      if (live || (kind === "task" && state === "done" && design !== null))
        cards.push({ id: entry.id, created: createdField(raw, file), design, done: !live });
    } catch {
      // not a readable card: it gets no number
    }
  }
  return cards;
}

/**
 * The cards of a kind that hold or may take a number, oldest first, read only from this working copy. A Done Task is
 * among them only while a Task of its design is in To do or In progress, and then only to keep the number it has.
 */
function liveCards(p: Project, kind: CardKind): LiveCard[] {
  const cards = cardsIn(p.dir, kind);
  const underWay = new Set(cards.filter((c) => !c.done && c.design !== null).map((c) => c.design));
  return cards
    .filter((c) => !c.done || underWay.has(c.design))
    .map((c): LiveCard => (c.done ? { id: c.id, created: c.created, keepOnly: true } : { id: c.id, created: c.created }))
    .sort(compareByCreation);
}

type Numbers = Record<CardKind, Map<string, number>>;

const emptyNumbers = (): Numbers => ({ proposal: new Map(), task: new Map(), drift: new Map() });

/**
 * The numbers recorded in `assigned`, or null when the file cannot be trusted: a line that is not `<kind> <identity> <number>`,
 * a number that is not a positive integer without leading zeros, or a number or a card repeated within a kind.
 */
function parseAssigned(text: string): Numbers | null {
  const numbers = emptyNumbers();
  const taken = { proposal: new Set<number>(), task: new Set<number>(), drift: new Set<number>() };
  for (const line of text.split("\n")) {
    if (line === "") continue;
    const [kind, id, number, ...extra] = line.split(" ");
    if (extra.length > 0 || !id || !number || !CARD_KINDS.includes(kind as CardKind) || !/^[1-9]\d*$/.test(number)) return null;
    const n = Number(number);
    const own = numbers[kind as CardKind];
    if (!Number.isSafeInteger(n) || taken[kind as CardKind].has(n) || own.has(id)) return null;
    taken[kind as CardKind].add(n);
    own.set(id, n);
  }
  return numbers;
}

/**
 * The numbers of the live cards of a kind. A card that has one keeps it; the others, oldest first, take the lowest free
 * number. `previous` is null to start again from zero.
 */
function assign(live: LiveCard[], previous: Map<string, number> | undefined): Map<string, number> {
  const kept = new Map<string, number>();
  for (const card of live) {
    const n = previous?.get(card.id);
    if (n !== undefined) kept.set(card.id, n);
  }
  const used = new Set(kept.values());
  let next = 1;
  const numbers = new Map<string, number>();
  for (const card of live) {
    let n = kept.get(card.id);
    if (n === undefined) {
      if (card.keepOnly) continue;
      while (used.has(next)) next++;
      n = next;
      used.add(n);
    }
    numbers.set(card.id, n);
  }
  return numbers;
}

/** The text of `assigned`: one line per live card, by kind and number, so equal numbers always give equal text. */
function render(numbers: Numbers): string {
  const lines = CARD_KINDS.flatMap((kind) =>
    [...numbers[kind]].sort((a, b) => a[1] - b[1]).map(([id, n]) => `${kind} ${id} ${n}`),
  );
  return lines.map((l) => `${l}\n`).join("");
}

/** The folders whose `assigned` could not be saved, so a command warns once however many times it reads the numbers. */
const unsaved = new Set<string>();

/** The short numbers of one working copy, as `syncShortNumbers` left them. */
export class ShortNumbers {
  constructor(private readonly numbers: Numbers) {}

  /** The number of a live card, or null when the card is closed or unknown. */
  of(kind: CardKind, id: string): number | null {
    return this.numbers[kind].get(id) ?? null;
  }

  /** The number written with the letter of its kind (`T3`), or null. */
  label(kind: CardKind, id: string): string | null {
    const n = this.of(kind, id);
    return n === null ? null : `${KIND_LETTER[kind]}${n}`;
  }

  /** The identity of the live card of that kind with that number, or null. */
  find(kind: CardKind, number: number): string | null {
    for (const [id, n] of this.numbers[kind]) if (n === number) return id;
    return null;
  }

  /** Every live card's number written with its letter, by kind, as the panel receives them. */
  all(): CardNumbers {
    const labels = (kind: CardKind) => Object.fromEntries([...this.numbers[kind]].map(([id, n]) => [id, `${KIND_LETTER[kind]}${n}`]));
    return { proposal: labels("proposal"), task: labels("task"), drift: labels("drift") };
  }

  /** How a card is written wherever a person reads it: its short number while it is live, otherwise its permanent identity; never both. */
  name(kind: CardKind, id: string): string {
    return this.label(kind, id) ?? id;
  }
}

/**
 * Reads the live Proposals, Tasks and Drifts of this working copy and brings `.trama/short-numbers/assigned` up to date:
 * a card that has no number takes the lowest free one of its kind (several in one reading, in creation order), a card
 * that is no longer live or no longer exists loses its line, and a missing, unreadable, incomprehensible or repeating
 * file is rebuilt from zero in creation order. Never fails because of the file: when it cannot be saved either, the
 * command warns once and goes on with the numbers it rebuilt.
 */
export function syncShortNumbers(p: Project): ShortNumbers {
  const live = Object.fromEntries(CARD_KINDS.map((kind) => [kind, liveCards(p, kind)])) as Record<CardKind, LiveCard[]>;
  let current: string | null;
  try {
    current = readFileSync(assignedFile(p), "utf8");
  } catch {
    current = null; // missing, or unreadable: a folder in its place, no permission
  }
  const previous = current === null ? null : parseAssigned(current);
  const numbers = emptyNumbers();
  for (const kind of CARD_KINDS) numbers[kind] = assign(live[kind], previous?.[kind]);

  const text = render(numbers);
  if (text !== current && (text !== "" || existsSync(assignedFile(p)))) {
    try {
      mkdirSync(shortNumbersDir(p), { recursive: true });
      if (!existsSync(ignoreFile(p))) writeFileAtomic(ignoreFile(p), "*\n");
      writeFileAtomic(assignedFile(p), text);
    } catch (err) {
      // The numbers stay valid for this reading and are rebuilt by the next one; the command goes on.
      if (!unsaved.has(p.dir)) {
        unsaved.add(p.dir);
        console.warn(`warning: the short numbers could not be saved in ${assignedFile(p)} (${(err as Error).message}); they are rebuilt at every reading until it can be written.`);
      }
    }
  }
  return new ShortNumbers(numbers);
}

const SHORT_NUMBER = /^([PTDptd])(\d+)$/;
const LETTER_KIND: Record<string, CardKind> = { P: "proposal", T: "task", D: "drift" };
const KIND_NAME: Record<CardKind, string> = { proposal: "Proposal", task: "Task", drift: "Drift" };

/**
 * For an argument a command received where it expects a card of kind `expected`: the permanent identity of the live card
 * the argument names, when the argument is a short number (`T3` or `t3`); null when it is not shaped like one. A letter
 * followed only by digits is always a short number, never the start of an identity. It is refused, saying why, when the
 * letter is another kind's or when no live card of that kind has the number, so nothing is written for it.
 */
export function identityOfShortNumber(p: Project, expected: CardKind, argument: string): string | null {
  const match = SHORT_NUMBER.exec(argument);
  if (!match) return null;
  const kind = LETTER_KIND[(match[1] as string).toUpperCase()] as CardKind;
  const digits = match[2] as string;
  const cited = `${KIND_LETTER[kind]}${digits}`;
  if (kind !== expected)
    throw new TramaError(`"${argument}" is the short number ${cited} of a ${KIND_NAME[kind]}, not of a ${KIND_NAME[expected]}. A ${KIND_NAME[expected]} is cited as ${KIND_LETTER[expected]}<number>.`);
  const identity = /^[1-9]\d{0,14}$/.test(digits) ? syncShortNumbers(p).find(expected, Number(digits)) : null;
  if (identity === null)
    throw new TramaError(`No live ${KIND_NAME[expected]} has the short number ${cited}. A closed ${KIND_NAME[expected]} has no number: cite it by its identity.`);
  return identity;
}

/** How `id` is written in a message: its short number in this working copy while live, otherwise its identity. */
export function cardName(p: Project, kind: CardKind, id: string): string {
  return syncShortNumbers(p).name(kind, id);
}
