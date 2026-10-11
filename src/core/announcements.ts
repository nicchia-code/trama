import { randomInt } from "node:crypto";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
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
export type AnnouncementKind = "proposal" | "task" | "drift" | "check";
export const ANNOUNCEMENT_KINDS: readonly AnnouncementKind[] = ["proposal", "task", "drift", "check"];

/** The phase of a check: the final verification (tests, lint, build) or the scan. The only change is Verifying → Scanning. */
export type CheckPhase = "verifying" | "scanning";
export const CHECK_PHASES: readonly CheckPhase[] = ["verifying", "scanning"];

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
  /** The agent terminal it belongs to (see `TERMINAL_ENV`), or null: made from a chat or by an agent Trama did not start, or written before this field existed. */
  terminal: string | null;
  /** `cursor` or `editor` when a chat agent made it; null in announcements written before this field existed. Never set together with `terminal`. */
  chat: Chat | null;
  /** The phase of a check; null for every other kind. */
  phase: CheckPhase | null;
  /** The transient coordinator job bound to this check, when present. */
  job: string | null;
  /** The title as announced; the ghost of a bound Draft shows the Draft's own title instead. */
  title: string;
}

export const announcementsDir = (p: Project) => join(p.dir, "announcements");
/** Shared only by Task-release and resolution-job timers; announcements never use it. */
export const QUIET_PERIOD_MS = 15 * 60 * 1000;


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
    touched: stamp("touched"),
    terminal: terminalField(raw, where),
    chat: raw["chat"] === undefined || raw["chat"] === null ? null : enumField(raw, "chat", CHATS, "cursor", where),
    phase: raw["phase"] === undefined || raw["phase"] === null ? null : enumField(raw, "phase", CHECK_PHASES, "verifying", where),
    job: jobField(raw, where),
    title: /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? id,
  };
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

function write(p: Project, a: Announcement) {
  const dir = announcementsDir(p);
  // The folder ignores itself and everything in it, so announcements are never versioned.
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const { id, title, chat, phase, job, ...data } = a;
  // `chat`, `phase` and `job` are written only when set, so the other announcements look as before.
  writeDocument(join(dir, `${id}.md`), { ...data, ...(chat ? { chat } : {}), ...(phase ? { phase } : {}), ...(job ? { job } : {}) }, `# ${title}\n`);
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
  const out: { a: Announcement; born: bigint; changed: bigint }[] = [];
  for (const name of readdirSync(dir)) {
    if (!FILE_PATTERN.test(name)) continue;
    const id = name.slice(0, -3);
    try {
      const doc = readDocument(join(dir, name));
      const st = statSync(join(dir, name), { bigint: true });
      // ponytail: announcement order is the file's birth, with the last change breaking equal birth times.
      out.push({ a: parse(doc.data, doc.body, id, join(dir, name)), born: st.birthtimeNs > 0n ? st.birthtimeNs : st.mtimeNs, changed: st.mtimeNs });
    } catch {
      // Half written or edited by hand: not an announcement.
    }
  }
  return out.sort((x, y) => (x.born < y.born ? -1 : x.born > y.born ? 1 : x.changed < y.changed ? -1 : x.changed > y.changed ? 1 : x.a.id.localeCompare(y.a.id))).map((x) => x.a);
}

export const getAnnouncement = (p: Project, id: string): Announcement | null => listAnnouncements(p).find((a) => a.id === id) ?? null;

/** Announces a card as soon as it is known it will be created. */
export function announce(
  p: Project,
  input: { kind: AnnouncementKind; title: string; source?: AnnouncementSource; proposal?: string; phase?: CheckPhase; job?: string } & AgentOrigin,
  now = new Date(),
): Announcement {
  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) throw new TramaError("An announcement needs a title");
  if ((input.kind === "check") !== (input.phase !== undefined)) throw new TramaError(input.kind === "check" ? "A check needs a phase" : "Only a check has a phase");
  if (input.job !== undefined && input.kind !== "check") throw new TramaError("Only a check has a job");
  const stamp = now.toISOString();
  const announcement: Announcement = {
    id: newId(announcementsDir(p)),
    kind: input.kind,
    source: input.source ?? "agent",
    proposal: input.proposal ?? null,
    touched: stamp,
    terminal: input.terminal ?? null,
    chat: input.terminal ? null : (input.source === "request" ? null : (input.chat ?? "editor")),
    phase: input.phase ?? null,
    job: input.job ?? null,
    title,
  };
  write(p, announcement);
  return announcement;
}

/**
 * Says why `id` cannot deliver a card of `kind`, or returns null when it can (or none was named). Never a reason to
 * refuse creating the card: the card is created and the output carries this note.
 */
export function announcementNote(p: Project, id: string | undefined, kind: AnnouncementKind): string | null {
  if (!id) return null;
  const a = getAnnouncement(p, id);
  if (!a) return `No announcement "${id}" was found (unknown, or already delivered or withdrawn); the ${kind} was created without a ghost.`;
  // A Drift announcement is also usable by the Draft its Drift will carry; a Drift filed with it delivers it, Draft or not.
  if (a.kind !== kind && !(kind === "proposal" && a.kind === "drift")) return `Announcement "${id}" is for a ${a.kind}, not a ${kind}; the ${kind} was created without using it.`;
  if (a.proposal !== null && kind !== "drift") return `Announcement "${id}" is already bound to Proposal ${cardName(p, "proposal", a.proposal)}; the ${kind} was created without using it.`;
  return null;
}

/**
 * A Draft uses only an announcement from its own origin. Automatic binding is reserved for terminal requests;
 * chat and unknown origins cannot claim a request sent to a terminal.
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
    : origin.terminal !== undefined
      ? all.find((a) => a.kind === "proposal" && a.source === "request" && a.proposal === null && a.terminal === origin.terminal)
      : undefined;
  if (target) {
    // A Drift announcement keeps the Drift's title; the Draft's title is the Proposal's own.
    const bound = { ...target, title: target.kind === "drift" ? target.title : proposal.title, proposal: proposal.id, touched: now.toISOString() };
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
  for (const a of listAnnouncements(p)) if (a.proposal === proposalId && !(handedOver && a.kind === "drift")) remove(p, a.id);
}

/**
 * A Task or a Drift was filed, and its matching announcement, if any, is delivered. Any other ID is ignored.
 */
export function deliverCard(p: Project, id: string | undefined, kind: "task" | "drift") {
  const a = id ? getAnnouncement(p, id) : null;
  if (a?.kind === kind) remove(p, a.id);
}

const findCheck = (p: Project, id: string) => {
  const a = getAnnouncement(p, id);
  return a?.kind === "check" ? a : null;
};

/**
 * The agent moves a check to Scanning. Returns `changed`, `unchanged` when it is already Scanning, or `missing` when
 * `id` is no check that still exists: never an error, so the agent goes on.
 */
export function changeCheckPhase(p: Project, id: string, phase: "scanning", now = new Date()): "changed" | "unchanged" | "missing" {
  const check = findCheck(p, id);
  if (!check) return "missing";
  if (check.phase === phase) return "unchanged";
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

