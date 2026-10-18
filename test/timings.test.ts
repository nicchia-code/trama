import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { recordTiming, TIMING_JOBS_KEPT, timingJobs } from "../src/core/timings";
import { type Project, projectAt } from "../src/core/store";
import { newTask } from "../src/core/work";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const origin = { terminal: "abc123" };
/** A fixed instant, `minute` minutes after the start of the day used by every test. */
const at = (minute: number) => new Date(Date.UTC(2030, 0, 1, 0, minute));
/** The file name of the job started at `now` by the terminal `abc123`. */
const jobFile = (now: Date) => `${now.toISOString().replace(/:/g, "-")}-abc123.jsonl`;
const jobFiles = () => readdirSync(join(p.dir, "timings")).filter((f) => f.endsWith(".jsonl"));

describe("recording timings", () => {
  test("records nothing for a holder-less origin", () => {
    recordTiming(p, {}, { event: "task-start", task: "t1", title: "Refund" }, { startsJob: true }, at(0));
    expect(existsSync(join(p.dir, "timings"))).toBe(false);
  });

  test("starts a job file with its own .gitignore, and appends the events of the job to it", () => {
    recordTiming(p, origin, { event: "task-start", task: "t1", title: "Refund" }, { job: "j1", startsJob: true }, at(1));
    recordTiming(p, origin, { event: "task-end", task: "t1", title: "Refund", outcome: "done" }, { job: "j1" }, at(2));
    expect(jobFiles()).toEqual([jobFile(at(1))]);
    expect(readFileSync(join(p.dir, "timings", ".gitignore"), "utf8")).toBe("*\n");
    const lines = readFileSync(join(p.dir, "timings", jobFile(at(1))), "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1] ?? "")).toMatchObject({ event: "task-end", outcome: "done", terminal: "abc123", job: "j1" });
  });

  test("keeps only the newest jobs", () => {
    for (let i = 0; i < TIMING_JOBS_KEPT + 5; i++) recordTiming(p, origin, { event: "task-start", task: "t1", title: "Refund" }, { startsJob: true }, at(i));
    expect(jobFiles()).toHaveLength(TIMING_JOBS_KEPT);
    expect(jobFiles()).toContain(jobFile(at(TIMING_JOBS_KEPT + 4)));
    expect(jobFiles()).not.toContain(jobFile(at(0)));
  });

  test("the job summary holds the phase, Task, comparison and queue wait of its events", () => {
    recordTiming(p, origin, { event: "phase-start", check: "c1", phase: "verifying", title: "Verify" }, { job: "j1", startsJob: true }, at(0));
    recordTiming(p, origin, { event: "phase-end", check: "c1", phase: "verifying", outcome: "done" }, { job: "j1" }, at(1));
    recordTiming(p, origin, { event: "task-start", task: "t1", title: "Refund" }, { job: "j1" }, at(2));
    recordTiming(p, origin, { event: "queue", requested: 2, given: 1, remaining: 3 }, { job: "j1" }, at(3));
    recordTiming(p, origin, { event: "queue", requested: 2, given: 2, remaining: 1 }, { job: "j1" }, at(4));
    recordTiming(p, origin, { event: "task-end", task: "t1", title: "Refund", outcome: "done" }, { job: "j1" }, at(5));
    recordTiming(p, origin, { event: "compare-start", comparison: "k1", machine: "order", refs: 1 }, { job: "j1" }, at(6));
    recordTiming(p, origin, { event: "compare-end", comparison: "k1", tasks: 2, drifts: 0 }, { job: "j1" }, at(7));

    const jobs = timingJobs(p, 5, at(10));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ terminal: "abc123", job: "j1" });
    expect(jobs[0]?.phases).toEqual([expect.objectContaining({ check: "c1", outcome: "done", durationMs: 60_000 })]);
    expect(jobs[0]?.tasks).toEqual([expect.objectContaining({ task: "t1", outcome: "done", durationMs: 180_000 })]);
    expect(jobs[0]?.comparisons).toEqual([expect.objectContaining({ machine: "order", tasks: 2, drifts: 0, durationMs: 60_000 })]);
    expect(jobs[0]?.queue).toEqual({ waits: 1, totalMs: 60_000, longestMs: 60_000 });
  });
});

describe("trama timings", () => {
  test("says so when nothing is recorded", () => {
    expect(run(["--root", dir, "timings"], dir, {}).out).toContain("No timings recorded yet.");
  });

  test("refuses a --last that is not a positive integer", () => {
    expect(() => run(["--root", dir, "timings", "--last", "0"], dir, {})).toThrow("--last must be a positive integer");
    expect(() => run(["--root", dir, "timings", "--last", "x"], dir, {})).toThrow("--last must be a positive integer");
  });

  test("prints the newest jobs as JSON", () => {
    recordTiming(p, origin, { event: "task-start", task: "t1", title: "Refund" }, { startsJob: true }, at(1));
    const json = JSON.parse(run(["--json", "--root", dir, "timings"], dir, {}).out) as { jobs: { terminal: string | null }[] };
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0]?.terminal).toBe("abc123");
  });

  test("records the Tasks an agent moves, and nothing for the developer's own moves", () => {
    const mine = newTask(p, { title: "Refund paid orders", refs: ["order/Paid"], technical: false });
    const other = newTask(p, { title: "Refund unpaid orders", refs: ["order/Paid"], technical: false });
    run(["--root", dir, "task", "move", mine.id, "doing"], dir, {});
    expect(existsSync(join(p.dir, "timings"))).toBe(false);

    run(["--root", dir, "task", "move", other.id, "doing"], dir, { TRAMA_TERMINAL: "abc123", TRAMA_AGENT: "1" });
    run(["--root", dir, "task", "move", mine.id, "done"], dir, { TRAMA_TERMINAL: "abc123", TRAMA_AGENT: "1" });
    const [job] = timingJobs(p, 1);
    expect(job?.tasks).toEqual([
      expect.objectContaining({ task: other.id, outcome: "open" }),
      expect.objectContaining({ task: mine.id, outcome: "done", start: null }),
    ]);
  });
});
