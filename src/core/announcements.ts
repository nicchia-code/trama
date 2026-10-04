import { randomInt } from "node:crypto";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { TramaError } from "./errors";
import { enumField, idField, type Raw } from "./schema";
import { type Project, readDocument, writeDocument, writeFileEnsuringDir } from "./store";

/**
 * An announcement is a card the agent is about to create, kept in a temporary file so the Board can show a ghost of
 * it meanwhile. It is not a card: nothing decides on it, and it lasts only as long as the agent's work. A delivered or
 * withdrawn announcement ceases to exist, so there is no ended state to read back.
 */
export type AnnouncementKind = "proposal" | "task" | "drift";
export const ANNOUNCEMENT_KINDS: readonly AnnouncementKind[] = ["proposal", "task", "drift"];

/** `agent`: announced by the agent. `request`: announced by Trama when a design request was sent. */
export type AnnouncementSource = "agent" | "request";
const SOURCES: readonly AnnouncementSource[] = ["agent", "request"];

export interface Announcement {
  /** Six random lowercase letters and digits. */
  id: string;
  kind: AnnouncementKind;
  source: AnnouncementSource;
  /** The Draft bound to it once there is one: the announcement is then Writing, before that Preparing. */
  proposal: string | null;
  /** When it was announced, as an ISO date and time; the Board keeps ghosts in this order. */
  created: string;
  /** When the agent last did something about an announced card, as an ISO date and time. */
  touched: string;
  /** The agent terminal it belongs to (see `TERMINAL_ENV`), or null: made from a chat or by an agent Trama did not start, or written before this field existed. */
  terminal: string | null;
  /** `cursor` when Cursor's chat agent made it (see `CURSOR_AGENT_ENV`); null otherwise and in announcements written before this field existed. Never set together with `terminal`. */
  chat: Chat | null;
  /** The title as announced; the ghost of a bound Draft shows the Draft's own title instead. */
  title: string;
}

/** How long the agent may do nothing about an announced card before the extension takes it to have stopped. */
export const QUIET_PERIOD_MS = 15 * 60 * 1000;

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
export type Chat = "cursor";
const CHATS: readonly Chat[] = ["cursor"];

/** Where an agent's command runs: the agent terminal Trama started, Cursor's chat, or neither (the developer, or an agent Trama cannot tell). */
export interface AgentOrigin {
  terminal?: string;
  chat?: Chat;
}

/** The agent terminal wins: Cursor's chat counts only for a command run without `TRAMA_TERMINAL`. */
export function originFromEnv(env: Record<string, string | undefined>): AgentOrigin {
  const terminal = terminalFromEnv(env);
  if (terminal) return { terminal };
  return env[CURSOR_AGENT_ENV] === "1" ? { chat: "cursor" } : {};
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
    created: stamp("created"),
    touched: stamp("touched"),
    terminal: terminalField(raw, where),
    chat: raw["chat"] === undefined || raw["chat"] === null ? null : enumField(raw, "chat", CHATS, "cursor", where),
    title: /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? id,
  };
}

function terminalField(raw: Raw, where: string): string | null {
  const v = raw["terminal"];
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && TERMINAL_PATTERN.test(v)) return v;
  throw new TramaError(`${where}: "terminal" must be an ID of six lowercase letters and digits, or none`);
}

function write(p: Project, a: Announcement) {
  const dir = announcementsDir(p);
  // The folder ignores itself and everything in it, so announcements are never versioned.
  const ignore = join(dir, ".gitignore");
  if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
  const { id, title, chat, ...data } = a;
  // `chat` is written only when set, so announcements of a terminal or of the developer look as before.
  writeDocument(join(dir, `${id}.md`), chat ? { ...data, chat } : data, `# ${title}\n`);
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
  return out.sort((a, b) => a.created.localeCompare(b.created) || a.id.localeCompare(b.id));
}

export const getAnnouncement = (p: Project, id: string): Announcement | null => listAnnouncements(p).find((a) => a.id === id) ?? null;

/** Announces a card as soon as it is known it will be created. Refreshes the quiet period of every announcement. */
export function announce(
  p: Project,
  input: { kind: AnnouncementKind; title: string; source?: AnnouncementSource; proposal?: string } & AgentOrigin,
  now = new Date(),
): Announcement {
  const title = input.title.trim().replace(/\s+/g, " ");
  if (!title) throw new TramaError("An announcement needs a title");
  markActivity(p, now);
  // Strictly after the latest one, so announcements announced within one millisecond still keep their order.
  const latest = Math.max(0, ...listAnnouncements(p).map((a) => Date.parse(a.created)));
  const stamp = new Date(Math.max(now.getTime(), latest + 1)).toISOString();
  const announcement: Announcement = {
    id: newId(announcementsDir(p)),
    kind: input.kind,
    source: input.source ?? "agent",
    proposal: input.proposal ?? null,
    created: stamp,
    touched: stamp,
    terminal: input.terminal ?? null,
    chat: input.terminal ? null : (input.chat ?? null),
    title,
  };
  write(p, announcement);
  return announcement;
}

/** The agent did something about an announced card: every announcement starts its quiet period again. */
export function markActivity(p: Project, now = new Date()) {
  const stamp = now.toISOString();
  for (const a of listAnnouncements(p)) write(p, { ...a, touched: stamp });
}

/**
 * Says why `id` cannot deliver a card of `kind`, or returns null when it can (or none was named). Never a reason to
 * refuse creating the card: the card is created and the output carries this note.
 */
export function announcementNote(p: Project, id: string | undefined, kind: AnnouncementKind): string | null {
  if (!id) return null;
  const a = getAnnouncement(p, id);
  if (!a) return `No announcement "${id}" was found (unknown, or already delivered or withdrawn); the ${kind} was created without a ghost.`;
  if (a.kind !== kind) return `Announcement "${id}" is for a ${a.kind}, not a ${kind}; the ${kind} was created without using it.`;
  if (a.proposal !== null) return `Announcement "${id}" is already bound to Proposal ${a.proposal}; the ${kind} was created without using it.`;
  return null;
}

/**
 * A Draft was started: it is bound to the announcement the agent named; failing that to the oldest announcement of a
 * design request still Preparing; failing that it makes an announcement of its own, already Writing.
 */
export function bindDraft(p: Project, proposal: { id: string; title: string }, announcementId?: string, origin: AgentOrigin = {}, now = new Date()): Announcement {
  markActivity(p, now);
  const all = listAnnouncements(p);
  const named = announcementId ? all.find((a) => a.id === announcementId && a.kind === "proposal" && a.proposal === null) : undefined;
  const target = named ?? all.find((a) => a.kind === "proposal" && a.source === "request" && a.proposal === null);
  if (target) {
    const bound = { ...target, proposal: proposal.id, touched: now.toISOString() };
    write(p, bound);
    return bound;
  }
  return announce(p, { kind: "proposal", title: proposal.title, proposal: proposal.id, ...origin }, now);
}

/**
 * The announcements bound to a Draft cease to exist: its card arrives when it is handed over, or the developer
 * discarded it (no notice to give then).
 */
export function removeBoundTo(p: Project, proposalId: string) {
  for (const a of listAnnouncements(p)) if (a.proposal === proposalId) remove(p, a.id);
}

/**
 * A Task or a Drift was filed: that is activity of the agent, and the announcement it names, if it is one of that
 * kind, is delivered. Any other ID is ignored.
 */
export function deliverCard(p: Project, id: string | undefined, kind: "task" | "drift") {
  const a = id ? getAnnouncement(p, id) : null;
  if (a?.kind === kind) remove(p, a.id);
  markActivity(p);
}

/** Withdraws every announcement still waiting, or only `ids`; returns what was withdrawn so the developer can be told. */
export function withdrawAll(p: Project, ids?: readonly string[]): Announcement[] {
  const gone = listAnnouncements(p).filter((a) => !ids || ids.includes(a.id));
  for (const a of gone) remove(p, a.id);
  return gone;
}

/** The agent changed a Draft that has an announcement: every announcement starts its quiet period again. */
export function markDraftActivity(p: Project, proposalId: string) {
  if (listAnnouncements(p).some((a) => a.proposal === proposalId)) markActivity(p);
}

/**
 * Whether the agent has done nothing about its announced cards for the quiet period. The count starts at the latest
 * activity, or at `resumedAt` if later: a question round was open until then and does not count. No announcement
 * waiting means nothing to withdraw.
 */
export function isQuiet(announcements: readonly Announcement[], now: number, resumedAt = 0): boolean {
  if (announcements.length === 0) return false;
  const lastActivity = Math.max(...announcements.map((a) => Date.parse(a.touched)));
  return now - Math.max(lastActivity, resumedAt) >= QUIET_PERIOD_MS;
}
