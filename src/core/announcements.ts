import { randomInt } from "node:crypto";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { TramaError } from "./errors";
import { enumField, idField, type Raw } from "./schema";
import { cardName } from "./short-numbers";
import { type Project, readDocument, writeDocument, writeFileEnsuringDir } from "./store";

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
  /** The agent terminal it belongs to (see `TERMINAL_ENV`), or null: made from a chat or by an agent Trama did not start, or written before this field existed. */
  terminal: string | null;
  /** `cursor` or `editor` when a chat agent made it; null in announcements written before this field existed. Never set together with `terminal`. */
  chat: Chat | null;
  /** The phase of a check; null for every other kind. */
  phase: CheckPhase | null;
  /** The transient coordinator job bound to this check, when present. */
  job: string | null;
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

/** Set to `1` by Cursor in the shell of its chat agent, and not in the developer's terminals. */
export const CURSOR_AGENT_ENV = "CURSOR_AGENT";

/** The editor chat whose agent made an announcement. */
export type Chat = "cursor" | "editor";
const CHATS: readonly Chat[] = ["cursor", "editor"];
/** Where an agent's command runs: a Trama-started terminal, Cursor's chat, the editor chat, or neither. */
export interface AgentOrigin {
  terminal?: string;
  chat?: Chat;
}

/** A recognized terminal wins; otherwise chat announcements belong to Cursor or the editor. */
export function originFromEnv(env: Record<string, string | undefined>): AgentOrigin {
  const terminal = terminalFromEnv(env);
  if (terminal) return { terminal };
  return { chat: env[CURSOR_AGENT_ENV] === "1" ? "cursor" : "editor" };
}

function newId(dir: string): string {
  for (;;) {
    let id = "";
    for (let i = 0; i < 6; i++) id += ID_CHARS[randomInt(ID_CHARS.length)];
    if (!existsSync(join(dir, `${id}.md`))) return id;
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
    chat: raw["chat"] === undefined || raw["chat"] === null ? null : enumField(raw, "chat", CHATS, "cursor", where),
    phase: raw["phase"] === undefined || raw["phase"] === null ? null : enumField(raw, "phase", CHECK_PHASES, "verifying", where),
    job: jobField(raw, where),
    drifts: idListField(raw, "drifts", where),
    proposals: idListField(raw, "proposals", where),
    machine: machineField(raw, where),
    refs: refsField(raw, where),
    code: codeField(raw, where),
    texts: textsField(raw, where),
    title: /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? id,
  };
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
function jobField(raw: Raw, where: string): string | null {
  const value = raw["job"];
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  throw new TramaError(`${where}: "job" must be a string or none`);
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

function write(p: Project, a: Announcement) {
  const dir = announcementsDir(p);
  // The folder ignores itself and everything in it, so announcements are never versioned.
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const { id, title, chat, phase, job, drifts, machine, refs, code, texts, proposals, ...data } = a;
  // `chat`, `phase`, `job`, `drifts`, `machine`, `refs`, `code`, `texts` and `proposals` are written only when set, so the other announcements look as before.
  writeDocument(join(dir, `${id}.md`), { ...data, ...(chat ? { chat } : {}), ...(phase ? { phase } : {}), ...(job ? { job } : {}), ...(drifts.length > 0 ? { drifts } : {}), ...(machine ? { machine } : {}), ...(refs.length > 0 ? { refs } : {}), ...(code ? { code } : {}), ...(Object.keys(texts).length > 0 ? { texts } : {}), ...(proposals.length > 0 ? { proposals } : {}) }, `# ${title}\n`);
}

function remove(p: Project, id: string) {
  rmSync(join(announcementsDir(p), `${id}.md`), { force: true });
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
  input: { kind: AnnouncementKind; title: string; source?: AnnouncementSource; proposal?: string; phase?: CheckPhase; job?: string; drifts?: string[]; machine?: string; refs?: string[]; code?: string | null; texts?: Record<string, string> } & AgentOrigin,
  now = new Date(),
): Announcement {
  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) throw new TramaError("An announcement needs a title");
  if ((input.kind === "check") !== (input.phase !== undefined)) throw new TramaError(input.kind === "check" ? "A check needs a phase" : "Only a check has a phase");
  if (input.job !== undefined && input.kind !== "check") throw new TramaError("Only a check has a job");
  if (input.drifts !== undefined && input.drifts.length > 0 && input.kind !== "proposal") throw new TramaError("Only a Proposal names Drifts");
  if ((input.kind === "comparison") !== (input.machine !== undefined)) throw new TramaError(input.kind === "comparison" ? "A comparison needs a machine" : "Only a comparison has a machine");
  if (input.kind !== "comparison" && (input.refs !== undefined || input.code !== undefined || input.texts !== undefined)) throw new TramaError("Only a comparison has references and a code fingerprint");
  // A scan the agent announces is the check of a scan Trama announced at launch, if one still waits in the same terminal or chat: it takes that one over.
  if (input.kind === "check" && input.phase === "scanning" && input.source === undefined) {
    const waiting = listAnnouncements(p).find((a) => a.kind === "check" && a.source === "request" && (input.terminal !== undefined ? a.terminal === input.terminal : a.terminal === null && a.chat === (input.chat ?? "editor")));
    if (waiting) {
      const taken: Announcement = { ...waiting, phase: "scanning", job: input.job ?? waiting.job, touched: now.toISOString() };
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
    chat: input.terminal ? null : (input.chat ?? (input.source === "request" ? null : "editor")),
    phase: input.phase ?? null,
    job: input.job ?? null,
    drifts: input.drifts ?? [],
    machine: input.machine ?? null,
    refs: input.refs ?? [],
    code: input.code ?? null,
    texts: input.texts ?? {},
    proposals: [],
    title,
  };
  write(p, announcement);
  return announcement;
}

/** The title of a Resolve Drifts ghost: the Drift it names by its short number, or how many Drifts it names. Undefined when it names none. */
export function resolutionTitle(p: Project, drifts: readonly string[]): string | undefined {
  const [only] = drifts;
  if (drifts.length === 0 || only === undefined) return undefined;
  return drifts.length === 1 ? `Resolving Drift ${cardName(p, "drift", only)}` : `Resolving ${drifts.length} Drifts`;
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
 * A Draft takes the oldest request of its own origin (its terminal, or its chat when it has none), or the announcement
 * named by ID when that one belongs to the same origin. Without an origin, nothing is bound.
 */
export function bindDraft(p: Project, proposal: { id: string; title: string }, announcementId?: string, origin: AgentOrigin = {}, now = new Date()): Announcement | null {
  const all = listAnnouncements(p);
  const target = announcementId !== undefined
    ? all.find((a) =>
        a.id === announcementId
        && (a.kind === "proposal" || a.kind === "drift")
        && a.proposal === null
        && (origin.terminal !== undefined
          ? a.terminal === origin.terminal && a.chat === null
          : origin.chat !== undefined && a.chat === origin.chat && a.terminal === null))
    : origin.terminal !== undefined || origin.chat !== undefined
      ? all.find((a) => a.kind === "proposal" && a.source === "request" && a.proposal === null && (origin.terminal !== undefined ? a.terminal === origin.terminal : a.terminal === null && a.chat === origin.chat))
      : undefined;
  if (announcementId !== undefined) {
    const comparison = all.find((a) => a.id === announcementId && a.kind === "comparison" && (origin.terminal !== undefined
      ? a.terminal === origin.terminal && a.chat === null
      : origin.chat !== undefined && a.chat === origin.chat && a.terminal === null));
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
}

/**
 * The announcements bound to a Draft cease to exist: its card arrives when it is handed over, or the developer
 * discarded it (no notice to give then). The announcement of a Drift is not delivered by the hand-over of its Draft:
 * the Drift delivers it.
 */
export function removeBoundTo(p: Project, proposalId: string, handedOver = false) {
  for (const a of listAnnouncements(p)) {
    if (a.kind === "comparison") {
      // A comparison keeps its ghost; only the Draft leaves its list.
      if (a.proposals.includes(proposalId)) write(p, { ...a, proposals: a.proposals.filter((id) => id !== proposalId) });
    } else if (a.proposal === proposalId && !(handedOver && a.kind === "drift")) remove(p, a.id);
  }
}

/**
 * A Task or a Drift was filed, and its matching announcement, if any, is delivered. Any other ID is ignored.
 */
export function deliverCard(p: Project, id: string | undefined, kind: "task" | "drift") {
  const a = id ? getAnnouncement(p, id) : null;
  if (a?.kind === kind) remove(p, a.id);
}

/** A comparison is delivered by its `comparison move`: its ghost goes, and no notice is given. Any other ID is ignored. */
export function deliverComparison(p: Project, id: string): void {
  const a = getAnnouncement(p, id);
  if (a?.kind === "comparison") remove(p, a.id);
}

const findCheck = (p: Project, id: string) => {
  const a = getAnnouncement(p, id);
  return a?.kind === "check" ? a : null;
};

/** The order a check's phases can only move in. */
const PHASE_RANK: Record<CheckPhase, number> = { verifying: 0, scanning: 1, history: 2 };

/**
 * The agent moves a check forward: Verifying → Scanning, Verifying or Scanning → History. Returns `changed`, `unchanged`
 * when it is already in `phase`, `refused` for a backward move (nothing changes), or `missing` when `id` is no check that
 * still exists: never an error, so the agent goes on.
 */
export function changeCheckPhase(p: Project, id: string, phase: CheckPhase, now = new Date()): "changed" | "unchanged" | "refused" | "missing" {
  const check = findCheck(p, id);
  if (!check) return "missing";
  if (check.phase === phase) return "unchanged";
  if (check.phase !== null && PHASE_RANK[check.phase] > PHASE_RANK[phase]) return "refused";
  write(p, { ...check, phase, touched: now.toISOString() });
  return "changed";
}

/** A check the agent finished, as the editor is told it over the local channel. */
export interface FinishedCheck {
  id: string;
  title: string;
  phase: CheckPhase | null;
  terminal: string | null;
  chat: Chat | null;
  job: string | null;
  touched: string;
  failed: boolean;
}

/**
 * The outcome of a check the agent finished, for the editor over the local channel. Reading it changes nothing: the
 * caller forgets the ghost with `forgetCheck` only after it has tried the channel, so the editor hears of it first.
 */
export function checkOutcome(p: Project, id: string, failed = false): FinishedCheck | null {
  const check = findCheck(p, id);
  if (!check) return null;
  return { id: check.id, title: check.title, phase: check.phase, terminal: check.terminal, chat: check.chat, job: check.job, touched: check.touched, failed };
}

/** The ghost of a finished check goes, whether or not the editor heard of its outcome. */
export function forgetCheck(p: Project, id: string): void {
  remove(p, id);
}



/** Withdraws every announcement still waiting, or only `ids`; returns what was withdrawn so the developer can be told. */
export function withdrawAll(p: Project, ids?: readonly string[]): Announcement[] {
  const gone = listAnnouncements(p).filter((a) => !ids || ids.includes(a.id));
  for (const a of gone) remove(p, a.id);
  return gone;
}

