import { randomInt } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError, UsageError } from "./errors";
import { withFileLock } from "./file-lock";
import { enumField, idField, type Raw } from "./schema";
import { cardName } from "./short-numbers";
import { documentText, type Project, readDocument, writeFileEnsuringDir } from "./store";

/**
 * An announcement is a card the agent is about to create, kept in a temporary file so the Board can show a ghost of
 * it meanwhile. It is not a card: nothing decides on it, and it lasts only as long as the agent's work. A delivered or
 * withdrawn announcement ceases to exist, so there is no ended state to read back. A `check` announces no card but the
 * work the agent still does when no card shows it (the final check of a run, or a scan); it ends when the agent says so.
 */
/** `work` is announced by Trama when it launches an import; the Proposal of Resolve Drifts is a `proposal` that names its `drifts`. A `comparison` is a Machine compared with its code: it names its `machine` and the Drafts taken from it. */
export type AnnouncementKind = "proposal" | "task" | "drift" | "check" | "work" | "comparison";
export const ANNOUNCEMENT_KINDS: readonly AnnouncementKind[] = ["proposal", "task", "drift", "check", "work", "comparison"];
/** The kinds the agent may announce with `trama announcement new`. */
export const AGENT_ANNOUNCEMENT_KINDS: readonly AnnouncementKind[] = ["proposal", "task", "drift", "check"];

/** The phase of a check: the final verification (tests, lint, build), the scan, or the History update at the end of a run. Phases only move forward: Verifying → Scanning → History, or Verifying → History. */
export type CheckPhase = "verifying" | "scanning" | "history";
export const CHECK_PHASES: readonly CheckPhase[] = ["verifying", "scanning", "history"];
/** The phases a check is announced in: a check never starts in History. */
export const CHECK_START_PHASES: readonly CheckPhase[] = ["verifying", "scanning"];

/** `agent`: announced by the agent. `request`: announced by Trama when a design request or Resolve Drifts was sent. */
export type AnnouncementSource = "agent" | "request";
const SOURCES: readonly AnnouncementSource[] = ["agent", "request"];

/** The most notes an announcement keeps; the oldest is dropped past it. */
export const MAX_NOTES = 6;
/** The longest a note is, in Unicode characters: a longer one is cut to the first 119 followed by `…`. */
export const NOTE_LENGTH = 120;

/** A line the agent declared about what it is doing, with the instant it arrived (UTC ISO 8601). */
export interface AnnouncementNote {
  at: string;
  text: string;
}

export interface Announcement {
  /** Six random lowercase letters and digits. */
  id: string;
  kind: AnnouncementKind;
  source: AnnouncementSource;
  /** The Draft bound to it once there is one: the announcement is then Writing, before that Preparing. */
  proposal: string | null;
  /** Timestamp of announcement or Draft binding; check phase changes update it too. */
  touched: string;
  /** When it was announced; set once and never changed, so it orders the list (`touched` moves with a binding). */
  announced: string;
  /** The agent terminal it belongs to (see `TERMINAL_ENV`), or null when it was written before this field existed or by a comparison briefed outside a terminal. */
  terminal: string | null;
  /** The phase of a check; null for every other kind. */
  phase: CheckPhase | null;
  /** The Drifts a Proposal of Resolve Drifts names, in creation order; empty for every other announcement. */
  drifts: string[];
  /** The Machine a comparison compares; null for every other announcement. */
  machine: string | null;
  /** The references a comparison covers, in the briefing's order; empty for every other announcement. */
  refs: string[];
  /** The code fingerprint taken when a comparison was briefed; null outside git and for every other announcement. */
  code: string | null;
  /** The text fingerprint of each reference a comparison covers at its briefing, by the element it is recorded under; empty for every other announcement. */
  texts: Record<string, string>;
  /** The Drafts a comparison has taken, in creation order; empty for every other announcement. */
  proposals: string[];
  /** What the agent declared about what it is doing, oldest first, at most `MAX_NOTES`; empty when it declared nothing. */
  notes: AnnouncementNote[];
  /** The title as announced; the ghost of a bound Draft shows the Draft's own title instead. */
  title: string;
}

export const announcementsDir = (p: Project) => join(p.dir, "announcements");


const ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const FILE_PATTERN = /^[a-z0-9]{6}\.md$/;

/** Set by the Trama extension in every agent terminal it starts, to the terminal's ID. */
export const TERMINAL_ENV = "TRAMA_TERMINAL";
const TERMINAL_PATTERN = /^[a-z0-9]{6}$/;

/** A fresh terminal ID: six random lowercase letters and digits, like an announcement's. */
export function newTerminalId(): string {
  let id = "";
  for (let i = 0; i < 6; i++) id += ID_CHARS[randomInt(ID_CHARS.length)];
  return id;
}

/** The ID of the agent terminal an agent runs in, from its environment; undefined when it was not started by Trama (or the value is not an ID). */
export function terminalFromEnv(env: Record<string, string | undefined>): string | undefined {
  const value = env[TERMINAL_ENV];
  return value !== undefined && TERMINAL_PATTERN.test(value) ? value : undefined;
}

/** Where an agent's command runs: a Trama-started terminal, or none (an agent Trama did not start). An omp Chat conversation has the terminal it replaces. */
export interface AgentOrigin {
  terminal?: string;
}

/** The terminal an agent runs in, from its environment; empty when it was not started by Trama. */
export function originFromEnv(env: Record<string, string | undefined>): AgentOrigin {
  const terminal = terminalFromEnv(env);
  return terminal ? { terminal } : {};
}

/** A six-character ID no announcement file and no unowned comparison file has. */
function newId(dir: string): string {
  for (;;) {
    let id = "";
    for (let i = 0; i < 6; i++) id += ID_CHARS[randomInt(ID_CHARS.length)];
    if (!existsSync(join(dir, `${id}.md`)) && !existsSync(join(dir, `${id}.json`))) return id;
  }
}

function parse(raw: Raw, body: string, id: string, where: string): Announcement {
  const stamp = (key: string): string => {
    const v = raw[key];
    if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return v;
    throw new TramaError(`${where}: "${key}" must be a date and time`);
  };
  return {
    id,
    kind: enumField(raw, "kind", ANNOUNCEMENT_KINDS, "proposal", where),
    source: enumField(raw, "source", SOURCES, "agent", where),
    proposal: idField(raw, "proposal", where),
    announced: raw["announced"] === undefined ? stamp("touched") : stamp("announced"),
    touched: stamp("touched"),
    terminal: terminalField(raw, where),
    phase: raw["phase"] === undefined || raw["phase"] === null ? null : enumField(raw, "phase", CHECK_PHASES, "verifying", where),
    drifts: idListField(raw, "drifts", where),
    proposals: idListField(raw, "proposals", where),
    notes: notesField(raw),
    machine: machineField(raw, where),
    refs: refsField(raw, where),
    code: codeField(raw, where),
    texts: textsField(raw, where),
    title: /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? id,
  };
}

/** The notes of a file; a value that is not a list, or an entry without a valid `at` and `text`, is ignored as if it were missing. */
function notesField(raw: Raw): AnnouncementNote[] {
  const v = raw["notes"];
  if (!Array.isArray(v)) return [];
  const notes: AnnouncementNote[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const { at, text } = item as Record<string, unknown>;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at)) || typeof text !== "string" || text.trim() === "") continue;
    notes.push({ at, text });
  }
  return notes.slice(-MAX_NOTES);
}

function refsField(raw: Raw, where: string): string[] {
  const v = raw["refs"];
  if (v === undefined || v === null) return [];
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  throw new TramaError(`${where}: "refs" must be a list of references or none`);
}

function codeField(raw: Raw, where: string): string | null {
  const v = raw["code"];
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && /^[0-9a-f]{64}$/.test(v)) return v;
  throw new TramaError(`${where}: "code" must be a code fingerprint or none`);
}

function textsField(raw: Raw, where: string): Record<string, string> {
  const v = raw["texts"];
  if (v === undefined || v === null) return {};
  if (typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string")) return v as Record<string, string>;
  throw new TramaError(`${where}: "texts" must be a map of text fingerprints or none`);
}

function terminalField(raw: Raw, where: string): string | null {
  const v = raw["terminal"];
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && TERMINAL_PATTERN.test(v)) return v;
  throw new TramaError(`${where}: "terminal" must be an ID of six lowercase letters and digits, or none`);
}

function idListField(raw: Raw, key: string, where: string): string[] {
  const v = raw[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new TramaError(`${where}: "${key}" must be a list of card IDs or none`);
  return v.map((item) => {
    const id = idField({ item }, "item", where);
    if (id === null) throw new TramaError(`${where}: "${key}" must be a list of card IDs or none`);
    return id;
  });
}

function machineField(raw: Raw, where: string): string | null {
  const v = raw["machine"];
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() !== "") return v;
  throw new TramaError(`${where}: "machine" must be a machine name or none`);
}

const ANNOUNCEMENTS_LOCK = "announcements";
const ID_PATTERN = /^[a-z0-9]{6}$/;
const fileOf = (p: Project, id: string) => join(announcementsDir(p), `${id}.md`);

/**
 * Runs `fn` holding the `announcements` lock, so the read-modify-writes of announcements, across processes, run one
 * after the other. Inside it, read the announcement again: only a read made under the lock is current.
 */
export function withAnnouncementsLock<T>(p: Project, fn: () => T): T {
  return withFileLock(announcementsDir(p), ANNOUNCEMENTS_LOCK, fn);
}

/** As `withAnnouncementsLock`, but without an announcements folder there is nothing to change: `none` is returned and the lock does not create the folder. */
function lockedIfAny<T>(p: Project, none: T, fn: () => T): T {
  return existsSync(announcementsDir(p)) ? withAnnouncementsLock(p, fn) : none;
}

/** The announcement `id` as it is on disk now, or null when its file no longer exists (or cannot be read). */
function readOne(p: Project, id: string): Announcement | null {
  if (!ID_PATTERN.test(id)) return null;
  const file = fileOf(p, id);
  try {
    const doc = readDocument(file);
    return parse(doc.data, doc.body, id, file);
  } catch {
    return null;
  }
}

/** Writes the announcement through a temporary file renamed over its file. Callers that change an existing announcement hold the lock and have read it under it. */
function write(p: Project, a: Announcement) {
  const dir = announcementsDir(p);
  // The folder ignores itself and everything in it, so announcements are never versioned.
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const { id, title, phase, drifts, machine, refs, code, texts, proposals, notes, ...data } = a;
  // `phase`, `drifts`, `machine`, `refs`, `code`, `texts`, `proposals` and `notes` are written only when set, so the other announcements look as before.
  writeFileAtomic(fileOf(p, id), documentText({ ...data, ...(phase ? { phase } : {}), ...(drifts.length > 0 ? { drifts } : {}), ...(machine ? { machine } : {}), ...(refs.length > 0 ? { refs } : {}), ...(code ? { code } : {}), ...(Object.keys(texts).length > 0 ? { texts } : {}), ...(proposals.length > 0 ? { proposals } : {}), ...(notes.length > 0 ? { notes } : {}) }, `# ${title}\n`));
}

function remove(p: Project, id: string) {
  rmSync(fileOf(p, id), { force: true });
}

/**
 * The announcements that still exist, in the order they were announced. A file that cannot be read is skipped: the
 * files are written by other processes while this one reads, and an announcement is only a hint for the Board.
 */
export function listAnnouncements(p: Project): Announcement[] {
  const dir = announcementsDir(p);
  if (!existsSync(dir)) return [];
  const out: Announcement[] = [];
  for (const name of readdirSync(dir)) {
    if (!FILE_PATTERN.test(name)) continue;
    const id = name.slice(0, -3);
    try {
      const doc = readDocument(join(dir, name));
      out.push(parse(doc.data, doc.body, id, join(dir, name)));
    } catch {
      // Half written or edited by hand: not an announcement.
    }
  }
  return out.sort((x, y) => Date.parse(x.announced) - Date.parse(y.announced) || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/**
 * The stamp for a new announcement: the clock now, but always after every announcement already in the folder. The file
 * clock can be too coarse to tell two announcements made together apart, and the list is in the order they were made.
 */
function nextAnnouncedStamp(p: Project): string {
  const latest = listAnnouncements(p).reduce((max, a) => Math.max(max, Date.parse(a.announced)), 0);
  return new Date(Math.max(Date.now(), latest + 1)).toISOString();
}

export const getAnnouncement = (p: Project, id: string): Announcement | null => listAnnouncements(p).find((a) => a.id === id) ?? null;

/** Announces a card as soon as it is known it will be created. */
export function announce(
  p: Project,
  input: { kind: AnnouncementKind; title: string; source?: AnnouncementSource; proposal?: string; phase?: CheckPhase; drifts?: string[]; machine?: string; refs?: string[]; code?: string | null; texts?: Record<string, string> } & AgentOrigin,
  now = new Date(),
): Announcement {
  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) throw new TramaError("An announcement needs a title");
  if ((input.kind === "check") !== (input.phase !== undefined)) throw new TramaError(input.kind === "check" ? "A check needs a phase" : "Only a check has a phase");
  if (input.drifts !== undefined && input.drifts.length > 0 && input.kind !== "proposal") throw new TramaError("Only a Proposal names Drifts");
  if ((input.kind === "comparison") !== (input.machine !== undefined)) throw new TramaError(input.kind === "comparison" ? "A comparison needs a machine" : "Only a comparison has a machine");
  if (input.kind !== "comparison" && (input.refs !== undefined || input.code !== undefined || input.texts !== undefined)) throw new TramaError("Only a comparison has references and a code fingerprint");
  // A scan the agent announces is the check of a scan Trama announced at launch, if one still waits in the same terminal: it takes that one over. So is a Drift of Unify Drifts, announced by Trama at launch, and it keeps its title.
  // Under the lock the oldest waiting one is read again, so two agents of a terminal never take the same file at once and a ghost withdrawn meanwhile is not brought back.
  return withAnnouncementsLock(p, () => {
    if (((input.kind === "check" && input.phase === "scanning") || input.kind === "drift") && input.source === undefined && input.terminal !== undefined) {
      // The oldest one of the same terminal wins.
      const waiting = listAnnouncements(p).find((a) => a.kind === input.kind && a.source === "request" && a.terminal === input.terminal);
      if (waiting) {
        const taken: Announcement = { ...waiting, ...(input.kind === "check" ? { phase: "scanning" as const } : {}), touched: now.toISOString() };
        write(p, taken);
        return taken;
      }
    }
    const stamp = now.toISOString();
    const announcement: Announcement = {
      id: newId(announcementsDir(p)),
      kind: input.kind,
      source: input.source ?? "agent",
      proposal: input.proposal ?? null,
      announced: nextAnnouncedStamp(p),
      touched: stamp,
      terminal: input.terminal ?? null,
      phase: input.phase ?? null,
      drifts: input.drifts ?? [],
      machine: input.machine ?? null,
      refs: input.refs ?? [],
      code: input.code ?? null,
      texts: input.texts ?? {},
      proposals: [],
      notes: [],
      title,
    };
    write(p, announcement);
    return announcement;
  });
}

/** What a comparison briefed outside a Trama terminal keeps: the code fingerprint and the texts it compared, for the registry. */
export interface UnownedComparison {
  code: string | null;
  texts: Record<string, string>;
}

const unownedFile = (p: Project, id: string) => join(announcementsDir(p), `${id}.json`);

/**
 * A comparison briefed without a terminal has no announcement, so no ghost that a terminal's end or an orphan withdrawal
 * could take: its data go to `<id>.json` beside the announcements, which neither the Snapshot nor a withdrawal reads.
 * Returns the ID the briefing prints; `deliverComparison` deletes the file.
 */
export function keepUnownedComparison(p: Project, data: UnownedComparison): string {
  return withAnnouncementsLock(p, () => {
    const id = newId(announcementsDir(p));
    writeFileAtomic(unownedFile(p, id), `${JSON.stringify(data, null, 2)}\n`);
    return id;
  });
}

/** The data kept by `keepUnownedComparison` for `id`, or null when there are none (or they cannot be read). */
export function readUnownedComparison(p: Project, id: string): UnownedComparison | null {
  if (!ID_PATTERN.test(id)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(unownedFile(p, id), "utf8"));
    if (typeof raw !== "object" || raw === null) return null;
    const { code, texts } = raw as { code?: unknown; texts?: unknown };
    if (code !== null && typeof code !== "string") return null;
    if (typeof texts !== "object" || texts === null || Array.isArray(texts) || !Object.values(texts).every((t) => typeof t === "string")) return null;
    return { code: code as string | null, texts: texts as Record<string, string> };
  } catch {
    return null;
  }
}

/** The title of a Resolve Drifts ghost: «Resolving Drift <short number>» for the one Drift it names. Undefined when it names none. */
export function resolutionTitle(p: Project, drifts: readonly string[]): string | undefined {
  const [only] = drifts;
  return only === undefined ? undefined : `Resolving Drift ${cardName(p, "drift", only)}`;
}

/**
 * Says why `id` cannot deliver a card of `kind`, or returns null when it can (or none was named). Never a reason to
 * refuse creating the card: the card is created and the output carries this note.
 */
export function announcementNote(p: Project, id: string | undefined, kind: AnnouncementKind): string | null {
  if (!id) return null;
  const a = getAnnouncement(p, id);
  if (!a) return `No announcement "${id}" was found (unknown, or already delivered or withdrawn); the ${kind} was created without a ghost.`;
  if (a.kind === "comparison" && kind === "proposal") return null;
  // A Drift announcement is also usable by the Draft its Drift will carry; a Drift filed with it delivers it, Draft or not.
  if (a.kind !== kind && !(kind === "proposal" && a.kind === "drift")) return `Announcement "${id}" is for a ${a.kind}, not a ${kind}; the ${kind} was created without using it.`;
  if (a.proposal !== null && kind !== "drift") return `Announcement "${id}" is already bound to Proposal ${cardName(p, "proposal", a.proposal)}; the ${kind} was created without using it.`;
  return null;
}

/**
 * A Draft takes the oldest request of its own terminal, or the announcement named by ID when that one belongs to the
 * same terminal. Without a terminal, nothing is bound and no announcement is made: the Draft has no ghost.
 */
export function bindDraft(p: Project, proposal: { id: string; title: string }, announcementId?: string, origin: AgentOrigin = {}, now = new Date()): Announcement | null {
  const terminal = origin.terminal;
  if (terminal === undefined) return null;
  // An announcement named by ID needs the folder to exist; without a name a new ghost creates it.
  if (announcementId !== undefined && !existsSync(announcementsDir(p))) return null;
  // Everything is read under the lock, so a ghost delivered or withdrawn meanwhile is not bound and not brought back.
  return withAnnouncementsLock(p, () => {
    const all = listAnnouncements(p);
    const target = announcementId !== undefined
      ? all.find((a) => a.id === announcementId && (a.kind === "proposal" || a.kind === "drift") && a.proposal === null && a.terminal === terminal)
      : all.find((a) => a.kind === "proposal" && a.source === "request" && a.proposal === null && a.terminal === terminal);
    if (announcementId !== undefined) {
      const comparison = all.find((a) => a.id === announcementId && a.kind === "comparison" && a.terminal === terminal);
      if (comparison) {
        // A comparison keeps its title and its ghost: the Draft only joins its list.
        const joined = { ...comparison, proposals: [...comparison.proposals, proposal.id], touched: now.toISOString() };
        write(p, joined);
        return joined;
      }
    }
    if (target) {
      // A Drift and a Resolve Drifts announcement keep their own title; a Proposal's ghost takes the Draft's title.
      const bound = { ...target, title: target.kind === "drift" || target.drifts.length > 0 ? target.title : proposal.title, proposal: proposal.id, touched: now.toISOString() };
      write(p, bound);
      return bound;
    }
    if (announcementId !== undefined) return null;
    return announce(p, { kind: "proposal", title: proposal.title, proposal: proposal.id, ...origin }, now);
  });
}

/**
 * The announcements bound to a Draft cease to exist: its card arrives when it is handed over, or the developer
 * discarded it (no notice to give then). The announcement of a Drift is not delivered by the hand-over of its Draft:
 * the Drift delivers it.
 */
export function removeBoundTo(p: Project, proposalId: string, handedOver = false) {
  lockedIfAny(p, undefined, () => {
    for (const a of listAnnouncements(p)) {
      if (a.kind === "comparison") {
        // A comparison keeps its ghost; only the Draft leaves its list.
        if (a.proposals.includes(proposalId)) write(p, { ...a, proposals: a.proposals.filter((id) => id !== proposalId) });
      } else if (a.proposal === proposalId && !(handedOver && a.kind === "drift")) remove(p, a.id);
    }
  });
}

/**
 * A Task or a Drift was filed, and its matching announcement, if any, is delivered. Any other ID is ignored.
 */
export function deliverCard(p: Project, id: string | undefined, kind: "task" | "drift") {
  if (id === undefined) return;
  lockedIfAny(p, undefined, () => {
    if (readOne(p, id)?.kind === kind) remove(p, id);
  });
}

/** A comparison is delivered by its `comparison move`: its ghost goes, or the file of one briefed without a terminal, and no notice is given. Any other ID is ignored. */
export function deliverComparison(p: Project, id: string): void {
  lockedIfAny(p, undefined, () => {
    if (readOne(p, id)?.kind === "comparison") remove(p, id);
    if (ID_PATTERN.test(id)) rmSync(unownedFile(p, id), { force: true });
  });
}

/** The order a check's phases can only move in. */
const PHASE_RANK: Record<CheckPhase, number> = { verifying: 0, scanning: 1, history: 2 };

type PhaseChange = "changed" | "unchanged" | "refused" | "missing";

/**
 * The agent moves a check forward: Verifying → Scanning, Verifying or Scanning → History. Returns `changed`, `unchanged`
 * when it is already in `phase`, `refused` for a backward move (nothing changes), or `missing` when `id` is no check that
 * still exists (also when it was delivered or withdrawn while this waited for the lock): never an error, so the agent goes on.
 */
export function changeCheckPhase(p: Project, id: string, phase: CheckPhase, now = new Date()): PhaseChange {
  return lockedIfAny<PhaseChange>(p, "missing", () => {
    const check = readOne(p, id);
    if (check?.kind !== "check") return "missing";
    if (check.phase === phase) return "unchanged";
    if (check.phase !== null && PHASE_RANK[check.phase] > PHASE_RANK[phase]) return "refused";
    write(p, { ...check, phase, touched: now.toISOString() });
    return "changed";
  });
}

/** Whether an announcement belongs to the agent terminal an agent runs in. These are the rules by which a terminal's end withdraws its announcements. */
export function ownedBy(a: Announcement, origin: AgentOrigin): boolean {
  return origin.terminal !== undefined && a.terminal === origin.terminal;
}

/** What `declareNote` did: the announcements the note went to (in the order announced) and whether it was cut. */
export interface DeclaredNote {
  announcements: Announcement[];
  truncated: boolean;
}

/**
 * The agent declares what it is doing. With `id` the note goes to that announcement only, of any kind; without, to every
 * announcement still waiting that belongs to the agent's terminal, a comparison excepted. The note is
 * one line (line breaks become spaces, the ends are trimmed) of at most `NOTE_LENGTH` characters; each announcement keeps
 * at most `MAX_NOTES`, and a note equal to the last one only renews its instant. Nothing else of the announcement changes,
 * `touched` included. An empty note is a usage error and an `id` that no longer exists (unknown, delivered or withdrawn,
 * also while this waited for the lock) an error; no announcement to go to is not one, and writes nothing. The
 * announcements are read and written under the lock, so no note is lost to another change and a ghost that went stays gone.
 */
export function declareNote(p: Project, input: { id?: string; text: string } & AgentOrigin, now = new Date()): DeclaredNote {
  let text = input.text.replace(/\s*[\r\n\u2028\u2029]+\s*/g, " ").trim();
  if (text === "") throw new UsageError("A note cannot be empty.");
  const chars = [...text];
  const truncated = chars.length > NOTE_LENGTH;
  if (truncated) text = `${chars.slice(0, NOTE_LENGTH - 1).join("")}…`;
  const missing = (id: string) => new TramaError(`Announcement "${id}" no longer exists (unknown, delivered or withdrawn); the note was not saved.`);
  if (!existsSync(announcementsDir(p))) {
    if (input.id !== undefined) throw missing(input.id);
    return { announcements: [], truncated };
  }
  return withAnnouncementsLock(p, () => {
    let targets: Announcement[];
    if (input.id !== undefined) {
      const named = readOne(p, input.id);
      if (!named) throw missing(input.id);
      targets = [named];
    } else {
      // Without a terminal there is no announcement to go to.
      targets = input.terminal === undefined ? [] : listAnnouncements(p).filter((a) => a.kind !== "comparison" && ownedBy(a, input));
    }
    const at = now.toISOString();
    const announcements: Announcement[] = [];
    for (const a of targets) {
      const last = a.notes[a.notes.length - 1];
      const notes = last?.text === text ? [...a.notes.slice(0, -1), { at, text }] : [...a.notes, { at, text }].slice(-MAX_NOTES);
      const noted = { ...a, notes };
      write(p, noted);
      announcements.push(noted);
    }
    return { announcements, truncated };
  });
}

/**
 * A check the agent finished is delivered, whether it succeeded or failed (the phase timings tell the two apart): its
 * ghost goes. Returns the check as it was, or null when `id` is no check that still exists.
 */
export function deliverCheck(p: Project, id: string): Announcement | null {
  return lockedIfAny<Announcement | null>(p, null, () => {
    const check = readOne(p, id);
    if (check?.kind !== "check") return null;
    remove(p, id);
    return check;
  });
}

/**
 * Gives the announcement bound to Draft `proposalId` the title `title`, when it is still a Proposal's ghost named by its
 * Draft (not one of Resolve Drifts, not a Drift's, not a comparison's) and its title differs. Read and written under the
 * lock, and only while its file exists: a ghost delivered or withdrawn is never brought back. Everything else of the
 * announcement, identity and `touched` included, stays. Returns whether a title was written.
 */
export function retitleBoundAnnouncement(p: Project, id: string, proposalId: string, title: string): boolean {
  return lockedIfAny(p, false, () => {
    const current = readOne(p, id);
    if (!current || current.kind !== "proposal" || current.proposal !== proposalId || current.drifts.length > 0 || current.title === title) return false;
    write(p, { ...current, title });
    return true;
  });
}

/** Withdraws every announcement still waiting, or only `ids`; returns what was withdrawn so the developer can be told. */
export function withdrawAll(p: Project, ids?: readonly string[]): Announcement[] {
  return lockedIfAny<Announcement[]>(p, [], () => {
    const gone = listAnnouncements(p).filter((a) => !ids || ids.includes(a.id));
    for (const a of gone) remove(p, a.id);
    return gone;
  });
}
