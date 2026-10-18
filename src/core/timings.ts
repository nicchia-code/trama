import { appendFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { AgentOrigin, Chat, CheckPhase } from "./announcements";
import { type Project, readTextLf, writeFileEnsuringDir } from "./store";

/*
 * Phase timings: one JSON line per event of an agent's work, in `.trama/timings/`. A job file is named by the instant its
 * job started and the holder that ran it (terminal or chat); its records all belong to that holder until the next job
 * of the same holder starts. The newest TIMING_JOBS_KEPT job files are kept. Recording never fails the command that
 * records, and reading skips what it cannot parse.
 */

/** Job files kept: the newest this many; older ones are deleted when a new job starts. */
export const TIMING_JOBS_KEPT = 20;

/** Jobs `trama timings` shows when no `--last` is given. */
export const TIMINGS_DEFAULT_LAST = 5;

/** An event worth timing; `at`, the holder and the job are added when it is recorded. */
export type TimingEvent =
  | { event: "phase-start"; check: string; phase: CheckPhase; title: string }
  | { event: "phase-end"; check: string; phase: CheckPhase; outcome: "done" | "failed" }
  | { event: "task-start"; task: string; title: string }
  | { event: "task-end"; task: string; title: string; outcome: "done" | "unchanged" | "drift"; drift?: string }
  | { event: "compare-start"; comparison: string; machine: string; refs: number }
  | { event: "compare-end"; comparison: string; tasks: number; drifts: number }
  | { event: "queue"; requested: number; given: number; remaining: number };

/** One line of a job file. */
export type TimingRecord = TimingEvent & { at: string; terminal?: string; chat?: Chat; job?: string };

export interface RecordOptions {
  /** The coordinator job the event belongs to, when the agent runs one. */
  job?: string;
  /** Whether the event starts a job: a check of the pre-flight or a scan. */
  startsJob?: boolean;
}

const JOB_FILE = /^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z)-([a-z0-9]+)\.jsonl$/;

interface JobFile {
  name: string;
  holder: string;
}

/** The job files, oldest first: their names begin with the instant their job started. */
function jobFiles(dir: string): JobFile[] {
  if (!existsSync(dir)) return [];
  const files: JobFile[] = [];
  for (const name of readdirSync(dir)) {
    const match = JOB_FILE.exec(name);
    if (match) files.push({ name, holder: match[2] as string });
  }
  return files.sort((a, b) => (a.name < b.name ? -1 : 1));
}

/**
 * Appends an event to the current job of its holder, starting a new job file when `startsJob` is set or the holder has
 * none, and then keeps only the newest jobs. Does nothing without a terminal or chat, and never throws: a failed write
 * must not change the command that records it.
 */
export function recordTiming(p: Project, origin: AgentOrigin, event: TimingEvent, options: RecordOptions = {}, now = new Date()): void {
  const holder = origin.terminal ?? origin.chat;
  if (holder === undefined) return;
  try {
    const dir = join(p.dir, "timings");
    const current = jobFiles(dir).filter((f) => f.holder === holder).at(-1);
    const record: TimingRecord = {
      at: now.toISOString(),
      ...(origin.terminal !== undefined ? { terminal: origin.terminal } : { chat: origin.chat }),
      ...(options.job ? { job: options.job } : {}),
      ...event,
    };
    if (current === undefined || options.startsJob === true) {
      if (!existsSync(join(dir, ".gitignore"))) writeFileEnsuringDir(join(dir, ".gitignore"), "*\n");
      appendFileSync(join(dir, `${now.toISOString().replace(/:/g, "-")}-${holder}.jsonl`), `${JSON.stringify(record)}\n`);
      const files = jobFiles(dir);
      for (const old of files.slice(0, Math.max(0, files.length - TIMING_JOBS_KEPT))) rmSync(join(dir, old.name), { force: true });
    } else {
      appendFileSync(join(dir, current.name), `${JSON.stringify(record)}\n`);
    }
  } catch {
    // Timings describe the work; losing a record must not fail the command.
  }
}

export interface PhaseTiming {
  check: string;
  title: string;
  phase: CheckPhase;
  start: string;
  /** When the phase was left: the next phase of the check, or the check's end; null while running. */
  end: string | null;
  durationMs: number;
  outcome: "done" | "failed" | "running";
}

export interface ComparisonTiming {
  comparison: string;
  machine: string;
  refs: number;
  start: string;
  end: string | null;
  durationMs: number;
  /** The cards the comparison filed; null while it runs. */
  tasks: number | null;
  drifts: number | null;
}

export interface TaskTiming {
  task: string;
  title: string;
  /** When the agent took the Task; null when the job did not start it. */
  start: string | null;
  end: string | null;
  durationMs: number | null;
  outcome: "done" | "unchanged" | "drift" | "open";
}

export interface QueueTiming {
  /** Waits for Tasks: a batch that gave fewer Tasks than asked while Tasks remained in To do. */
  waits: number;
  totalMs: number;
  longestMs: number;
}

export interface JobTiming {
  terminal: string | null;
  chat: Chat | null;
  job: string | null;
  start: string;
  /** When the next job of the same holder started; null while it is the holder's latest. */
  end: string | null;
  durationMs: number;
  phases: PhaseTiming[];
  comparisons: ComparisonTiming[];
  tasks: TaskTiming[];
  queue: QueueTiming;
}

/** The job's summary: durations run to `end`, or to `now` while the job runs. */
function buildJob(records: TimingRecord[], start: string, end: string | null, now: Date): JobTiming {
  const stop = end ?? now.toISOString();
  const span = (from: string, to: string | null) => Date.parse(to ?? stop) - Date.parse(from);
  const head = records[0] as TimingRecord;

  const closes = new Map<string, { at: string; outcome: "done" | "failed" }>();
  for (const r of records) if (r.event === "phase-end") closes.set(r.check, { at: r.at, outcome: r.outcome });
  const starts = records.flatMap((r) => (r.event === "phase-start" ? [r] : []));
  const phases: PhaseTiming[] = starts.map((s, i) => {
    const next = starts.slice(i + 1).find((n) => n.check === s.check);
    const close = closes.get(s.check);
    const end = next?.at ?? close?.at ?? null;
    return {
      check: s.check,
      title: s.title,
      phase: s.phase,
      start: s.at,
      end,
      durationMs: span(s.at, end),
      outcome: close?.outcome ?? (end === null ? "running" : "done"),
    };
  });

  const compared = new Map<string, { at: string; tasks: number; drifts: number }>();
  for (const r of records) if (r.event === "compare-end") compared.set(r.comparison, { at: r.at, tasks: r.tasks, drifts: r.drifts });
  const comparisons: ComparisonTiming[] = records.flatMap((r) => {
    if (r.event !== "compare-start") return [];
    const done = compared.get(r.comparison);
    return [
      {
        comparison: r.comparison,
        machine: r.machine,
        refs: r.refs,
        start: r.at,
        end: done?.at ?? null,
        durationMs: span(r.at, done?.at ?? null),
        tasks: done?.tasks ?? null,
        drifts: done?.drifts ?? null,
      },
    ];
  });

  const tasks = new Map<string, { title: string; start: string | null; end: string | null; outcome: TaskTiming["outcome"] }>();
  for (const r of records) {
    if (r.event === "task-start") {
      const known = tasks.get(r.task);
      if (known === undefined || known.end !== null) tasks.set(r.task, { title: r.title, start: r.at, end: null, outcome: "open" });
    } else if (r.event === "task-end") {
      const known = tasks.get(r.task) ?? { title: r.title, start: null, end: null, outcome: "open" as const };
      tasks.set(r.task, { ...known, title: r.title, end: r.at, outcome: r.outcome });
    }
  }
  const taskList: TaskTiming[] = [...tasks].map(([task, t]) => ({
    task,
    title: t.title,
    start: t.start,
    end: t.end,
    durationMs: t.start === null ? null : span(t.start, t.end),
    outcome: t.outcome,
  }));

  const waits: { start: string; end: string | null }[] = [];
  let open: string | null = null;
  for (const r of records) {
    if (r.event !== "queue") continue;
    const waiting = r.given < r.requested && r.remaining > 0;
    if (open !== null && (r.given > 0 || !waiting)) {
      waits.push({ start: open, end: r.at });
      open = null;
    }
    if (waiting && open === null) open = r.at;
  }
  if (open !== null) waits.push({ start: open, end: null });
  const waitMs = waits.map((w) => span(w.start, w.end));

  return {
    terminal: head.terminal ?? null,
    chat: head.chat ?? null,
    job: records.find((r) => r.job !== undefined)?.job ?? null,
    start,
    end,
    durationMs: span(start, end),
    phases,
    comparisons,
    tasks: taskList,
    queue: { waits: waits.length, totalMs: waitMs.reduce((sum, ms) => sum + ms, 0), longestMs: Math.max(0, ...waitMs) },
  };
}

function readRecords(path: string): TimingRecord[] {
  let text: string;
  try {
    text = readTextLf(path);
  } catch {
    return [];
  }
  const records: TimingRecord[] = [];
  for (const line of text.split("\n")) {
    try {
      const r = JSON.parse(line) as Partial<TimingRecord> | null;
      if (typeof r?.at === "string" && typeof r.event === "string") records.push(r as TimingRecord);
    } catch {
      // A torn or foreign line is skipped.
    }
  }
  return records;
}

/** The newest `last` jobs, newest first, from the job files. Reads nothing else and writes nothing. */
export function timingJobs(p: Project, last: number, now = new Date()): JobTiming[] {
  const dir = join(p.dir, "timings");
  const loaded: { holder: string; records: TimingRecord[]; start: string }[] = [];
  for (const file of jobFiles(dir)) {
    const records = readRecords(join(dir, file.name));
    const [first] = records;
    if (first !== undefined) loaded.push({ holder: file.holder, records, start: first.at });
  }
  const jobs = loaded.map((job, i) => {
    const next = loaded.slice(i + 1).find((j) => j.holder === job.holder);
    return buildJob(job.records, job.start, next?.start ?? null, now);
  });
  return jobs.slice(-last).reverse();
}
