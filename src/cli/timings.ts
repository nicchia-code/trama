import { type ShortNumbers, syncShortNumbers } from "../core/short-numbers";
import { type JobTiming, PARALLEL_CHOICE_KINDS, timingJobs } from "../core/timings";
import type { Project } from "../core/store";
import type { Result } from "./result";

/** Milliseconds as a short duration: seconds, minutes and seconds, or hours and minutes; `n/a` when unknown. */
function formatDuration(ms: number | null): string {
  if (ms === null) return "n/a";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${seconds % 60} s`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** The `Parallel choices` section of a job: the count per kind, then one line per choice in time order. */
function parallelChoicesMd(job: JobTiming, numbers: ShortNumbers): string[] {
  const counts = PARALLEL_CHOICE_KINDS.map((kind) => `${job.parallelChoices.filter((c) => c.kind === kind).length} ${kind}`).join(", ");
  return [
    "- Parallel choices:",
    `  - ${counts}`,
    ...job.parallelChoices.map((c) => `  - ${c.kind}: ${c.tasks.map((t) => `${numbers.name("task", t.id)} ${t.title}`).join("; ")} - ${c.reason}`),
  ];
}

function jobMd(job: JobTiming, numbers: ShortNumbers): string {
  const holder = job.terminal !== null ? `terminal ${job.terminal}` : `chat ${job.chat}`;
  const named = job.job === null ? "" : `, job ${job.job}`;
  const state = job.end === null ? "running" : `ended ${job.end}`;
  const queue = job.queue;
  return [
    `## Job started ${job.start} (${holder}${named})`,
    `- ${state}; total ${formatDuration(job.durationMs)}.`,
    "- Phases:",
    ...(job.phases.length === 0 ? ["  - none"] : job.phases.map((p) => `  - ${p.title} (${p.phase}): ${formatDuration(p.durationMs)}, ${p.outcome}`)),
    "- Machine comparisons:",
    ...(job.comparisons.length === 0
      ? ["  - none"]
      : job.comparisons.map((c) => {
          const cards = c.tasks === null || c.drifts === null ? "running" : `${c.tasks + c.drifts} cards (${c.tasks} Tasks, ${c.drifts} Drifts)`;
          return `  - ${c.machine}: ${formatDuration(c.durationMs)}, ${cards}`;
        })),
    "- Tasks:",
    ...(job.tasks.length === 0 ? ["  - none"] : job.tasks.map((t) => `  - ${t.task} ${t.title}: ${formatDuration(t.durationMs)}, ${t.outcome}`)),
    `- Queue: ${queue.waits === 0 ? "no waits" : `${queue.waits} waits, ${formatDuration(queue.totalMs)} in total, longest ${formatDuration(queue.longestMs)}`}.`,
    ...(job.parallelChoices.length === 0 ? [] : parallelChoicesMd(job, numbers)),
  ].join("\n");
}

/** `trama timing list`: the newest jobs, newest first, with the phases, comparisons, Tasks and queue waits of each. */
export function timingsView(p: Project, last: number, now = new Date()): Result {
  const jobs = timingJobs(p, last, now);
  if (jobs.length === 0) return { md: "_No timings recorded yet._", json: { jobs } };
  const numbers = syncShortNumbers(p);
  return { md: jobs.map((job) => jobMd(job, numbers)).join("\n\n"), json: { jobs } };
}
