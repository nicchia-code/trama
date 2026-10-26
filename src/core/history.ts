import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import { writeFileAtomic } from "./atomic-write";
import { TramaError } from "./errors";
import { canonicalCardId, instantField, type Raw, stringList } from "./schema";
import { createdNow, listNames, newCardId, type Project, readDocument, slugify } from "./store";
import { getTask, type Task } from "./work";

/** The copy of a Task that Clear deleted, kept by each History entry that cites it: what the entry shows once the Task is gone. */
export interface ClearedTask {
  title: string;
  /** The Proposal the Task came from; null when it had none. */
  proposal: string | null;
  /** The text of the tag the Board showed on the Task; null when it showed none. */
  tag: string | null;
  /** When the Task arrived in Done, UTC ISO 8601; null when unknown. */
  finished: string | null;
  refs: string[];
}

/** A History entry: a macro-feature summary of the Tasks finished for it. */
export interface HistoryEntry {
  id: string;
  name: string;
  path: string;
  title: string;
  body: string;
  created: string;
  updated: string;
  summary: string;
  /** Identities of the Tasks cited, in the order they were added. */
  tasks: string[];
  /** The copies Clear wrote, by Task identity; every key is also in `tasks`. Empty until Clear deletes a cited Task. */
  cleared: Record<string, ClearedTask>;
}

/** A History file that cannot be read; the other entries stay readable. */
export interface HistoryFault {
  file: string;
  message: string;
}

export interface HistoryRead {
  entries: HistoryEntry[];
  faults: HistoryFault[];
}

const SUMMARY_MAX = 280;
const ID = /^[a-z0-9]{8}$/;
const FIELDS = ["created", "updated", "summary", "tasks", "cleared"];

const historyDir = (p: Project) => join(p.dir, "history");

/** Problems with a title, one line each; none when it is fine. */
function titleProblems(title: string): string[] {
  const t = title.trim();
  if (t === "") return ["the title is empty"];
  if (/[\r\n]/.test(t)) return ["the title spans several lines"];
  return [];
}

/** Problems with a summary, one line each; none when it is fine. */
function summaryProblems(summary: string): string[] {
  const s = summary.trim();
  if (s === "") return ["the summary is empty"];
  if (/[\r\n]/.test(s)) return ["the summary spans several lines"];
  if (Array.from(s).length > SUMMARY_MAX) return [`the summary is longer than ${SUMMARY_MAX} characters`];
  return [];
}

function refusal(what: string, problems: string[]): TramaError {
  return new TramaError(`${what}:\n${problems.map((x) => `- ${x}`).join("\n")}`);
}

/** The `cleared` field: a map from a Task identity the entry cites to its copy; absent is none. */
function clearedField(raw: unknown, tasks: readonly string[], path: string): Record<string, ClearedTask> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) throw new TramaError(`${path}: "cleared" must map Task identities to their copies`);
  const out: Record<string, ClearedTask> = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = canonicalCardId(key);
    if (!tasks.includes(id)) throw new TramaError(`${path}: "cleared" holds Task ${key}, which "tasks" does not cite`);
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TramaError(`${path}: the copy of Task ${key} must be a map`);
    const copy = value as Raw;
    for (const field of Object.keys(copy)) if (!["title", "proposal", "tag", "finished", "refs"].includes(field)) throw new TramaError(`${path}: the copy of Task ${key} has an unknown field "${field}"`);
    const title = copy["title"];
    if (typeof title !== "string") throw new TramaError(`${path}: the copy of Task ${key} needs a "title" as text`);
    const text = (field: string): string | null => {
      const v = copy[field];
      if (v === undefined || v === null) return null;
      if (typeof v !== "string") throw new TramaError(`${path}: "${field}" of the copy of Task ${key} must be text`);
      return v;
    };
    out[id] = { title, proposal: text("proposal"), tag: text("tag"), finished: instantField(copy, "finished", path), refs: stringList(copy, "refs", path) };
  }
  return out;
}

function readEntry(path: string, name: string): HistoryEntry {
  const id = name.slice(0, 8);
  if (!ID.test(id) || name[8] !== "-" || !name.endsWith(".md")) throw new TramaError(`${path}: a history entry is named <id>-<slug>.md`);
  const doc = readDocument(path);
  for (const key of Object.keys(doc.data)) if (!FIELDS.includes(key)) throw new TramaError(`${path}: unknown field "${key}"`);
  const created = instantField(doc.data as Raw, "created", path);
  const updated = instantField(doc.data as Raw, "updated", path);
  if (created === null || updated === null) throw new TramaError(`${path}: "created" and "updated" are required`);
  const summary = doc.data["summary"];
  if (typeof summary !== "string") throw new TramaError(`${path}: "summary" must be text`);
  const sp = summaryProblems(summary);
  if (sp.length > 0) throw new TramaError(`${path}: ${sp[0]}`);
  const tasks = stringList(doc.data as Raw, "tasks", path).map(canonicalCardId);
  const bad = tasks.filter((t) => !ID.test(t) && !/^\d{4,}$/.test(t));
  if (bad.length > 0) throw new TramaError(`${path}: "tasks" must hold Task identities, found ${bad.join(", ")}`);
  if (new Set(tasks).size !== tasks.length) throw new TramaError(`${path}: "tasks" lists a Task twice`);
  const heading = /^# (.+)\n?([\s\S]*)$/.exec(doc.body.replace(/^\n+/, ""));
  if (!heading) throw new TramaError(`${path}: the body must start with the title as a heading`);
  return {
    id,
    name,
    path,
    title: (heading[1] as string).trim(),
    body: (heading[2] as string).trim(),
    created,
    updated,
    summary: summary.trim(),
    tasks,
    cleared: clearedField(doc.data["cleared"], tasks, path),
  };
}



/** Every History entry that reads, newest first; the files that do not read are returned as faults. */
export function readHistory(p: Project): HistoryRead {
  const dir = historyDir(p);
  if (!existsSync(dir)) return { entries: [], faults: [] };
  const entries: HistoryEntry[] = [];
  const faults: HistoryFault[] = [];
  for (const name of listNames(dir).filter((n) => !n.startsWith(".")).sort()) {
    try {
      entries.push(readEntry(join(dir, name), name));
    } catch (err) {
      faults.push({ file: `history/${name}`, message: err instanceof Error ? err.message : String(err) });
    }
  }
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
  const shared = entries.filter((e) => (counts.get(e.id) ?? 0) > 1);
  for (const e of shared) faults.push({ file: `history/${e.name}`, message: `${e.path}: identity ${e.id} is shared with another entry` });
  const newest = (a: HistoryEntry, b: HistoryEntry) => Date.parse(b.updated) - Date.parse(a.updated) || Date.parse(b.created) - Date.parse(a.created) || b.id.localeCompare(a.id);
  return { entries: entries.filter((e) => (counts.get(e.id) ?? 0) === 1).sort(newest), faults };
}

/** Every History entry, newest first; refuses when one file does not read. */
export function listHistory(p: Project): HistoryEntry[] {
  const read = readHistory(p);
  if (read.faults.length > 0) throw new TramaError(read.faults.map((f) => f.message).join("\n"));
  return read.entries;
}

/** The entry with this identity; it is read on its own, so another unreadable file does not stop it. */
export function getHistory(p: Project, id: string): HistoryEntry {
  const dir = historyDir(p);
  const name = existsSync(dir) ? readdirSync(dir).find((n) => n.endsWith(".md") && n.slice(0, 8) === id) : undefined;
  if (name === undefined) throw new TramaError(`No history entry with ID ${id}`);
  return readEntry(join(dir, name), name);
}

/**
 * Resolves Task references to identities. A Task already cited is skipped. Each other Task must exist, be Done and not
 * closed unchanged; every problem is returned, none is hidden by the first.
 */
function resolveTasks(p: Project, refs: string[], cited: readonly string[]): { ids: string[]; problems: string[] } {
  const ids: string[] = [];
  const problems: string[] = [];
  for (const ref of refs) {
    if (cited.includes(ref)) continue;
    let task: Task;
    try {
      task = getTask(p, ref, true);
    } catch (err) {
      problems.push(`Task ${ref}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (cited.includes(task.id) || ids.includes(task.id)) continue;
    if (task.data.column !== "done") problems.push(`Task ${task.id} is not Done (it is in ${task.data.column})`);
    else if (task.data.unchanged !== null) problems.push(`Task ${task.id} was closed unchanged`);
    else ids.push(task.id);
  }
  return { ids, problems };
}

/** Writes an entry to its own file, atomically; the identity and the file name are kept as they are. */
export function saveHistory(entry: HistoryEntry): void {
  const data: Record<string, unknown> = { created: entry.created, updated: entry.updated, summary: entry.summary, tasks: entry.tasks };
  if (Object.keys(entry.cleared).length > 0)
    data["cleared"] = Object.fromEntries(
      Object.entries(entry.cleared).map(([id, c]) => [id, { title: c.title, ...(c.proposal === null ? {} : { proposal: c.proposal }), ...(c.tag === null ? {} : { tag: c.tag }), ...(c.finished === null ? {} : { finished: c.finished }), refs: c.refs }]),
    );
  const yaml = stringify(data, { lineWidth: 0 }).trimEnd();
  const text = `---\n${yaml}\n---\n# ${entry.title}\n${entry.body === "" ? "" : `\n${entry.body}\n`}`;
  mkdirSync(dirname(entry.path), { recursive: true });
  writeFileAtomic(entry.path, text);
}

export function addHistory(p: Project, input: { title: string; summary: string; body?: string; tasks: string[] }): HistoryEntry {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const problems = [...titleProblems(title), ...summaryProblems(summary)];
  if (input.tasks.length === 0) problems.push("no Task is cited: name one in `tasks`");
  const resolved = resolveTasks(p, input.tasks, []);
  problems.push(...resolved.problems);
  if (problems.length > 0) throw refusal("The history entry was not written", problems);
  const now = createdNow();
  const id = newCardId(historyDir(p), "file", "history entry");
  const name = `${id}-${slugify(title)}.md`;
  const path = join(historyDir(p), name);
  const body = (input.body ?? "").trim();
  const entry: HistoryEntry = { id, name, path, title, body, created: now, updated: now, summary, tasks: resolved.ids, cleared: {} };
  saveHistory(entry);
  return entry;
}

export function updateHistory(p: Project, id: string, input: { title?: string; summary?: string; body?: string; tasks: string[] }): HistoryEntry {
  const entry = getHistory(p, id);
  const title = input.title === undefined ? entry.title : input.title.trim();
  const summary = input.summary === undefined ? entry.summary : input.summary.trim();
  const body = input.body === undefined ? entry.body : input.body.trim();
  const problems = [
    ...(input.title === undefined ? [] : titleProblems(title)),
    ...(input.summary === undefined ? [] : summaryProblems(summary)),
  ];
  const resolved = resolveTasks(p, input.tasks, entry.tasks);
  problems.push(...resolved.problems);
  if (problems.length > 0) throw refusal(`The history entry ${entry.id} was not changed`, problems);
  const tasks = [...entry.tasks, ...resolved.ids];
  const updated = createdNow();
  const saved: HistoryEntry = { ...entry, title, body, updated, summary, tasks };
  saveHistory(saved);
  return saved;
}
