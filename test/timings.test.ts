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

  test("two Cursor conversations never write in the same job, and the project's chat has its own", () => {
    const a = { chat: "cursor" as const, conversation: "conv-a" };
    const b = { chat: "cursor" as const, conversation: "conv-b" };
    recordTiming(p, a, { event: "task-start", task: "t1", title: "A" }, {}, at(0));
    recordTiming(p, b, { event: "task-start", task: "t2", title: "B" }, {}, at(1));
    recordTiming(p, a, { event: "task-end", task: "t1", title: "A", outcome: "done" }, {}, at(2));
    recordTiming(p, { chat: "cursor" }, { event: "task-start", task: "t3", title: "C" }, {}, at(3));
    const lines = (suffix: string) => readFileSync(join(p.dir, "timings", jobFiles().find((f) => f.endsWith(`-${suffix}.jsonl`))!), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(jobFiles()).toHaveLength(3);
    expect(lines("cursor-conv-a").map((r) => r.task)).toEqual(["t1", "t1"]);
    expect(lines("cursor-conv-a")[0].conversation).toBe("conv-a");
    expect(lines("cursor-conv-b").map((r) => r.task)).toEqual(["t2"]);
    expect(lines("cursor").map((r) => r.task)).toEqual(["t3"]);
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

describe("trama timing list", () => {
  test("says so when nothing is recorded", () => {
    expect(run(["--root", dir, "timing", "list"], dir, {}).out).toContain("No timings recorded yet.");
  });

  test("refuses a last that is not a positive integer", () => {
    expect(() => run(["--root", dir, "timing", "list", "--input", '{"last":0}'], dir, {})).toThrow(/last/);
    expect(() => run(["--root", dir, "timing", "list", "--input", '{"last":"x"}'], dir, {})).toThrow(/last/);
  });

  test("prints the newest jobs as JSON", () => {
    recordTiming(p, origin, { event: "task-start", task: "t1", title: "Refund" }, { startsJob: true }, at(1));
    const json = JSON.parse(run(["--json", "--root", dir, "timing", "list"], dir, {}).out) as { jobs: { terminal: string | null }[] };
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

describe("trama timing new", () => {
  const tasks = () => [
    newTask(p, { title: "Refund paid orders", refs: ["order/Paid"], technical: false }).id,
    newTask(p, { title: "Refund unpaid orders", refs: ["order/Draft"], technical: false }).id,
  ];
  const input = (value: object) => ["--root", dir, "timing", "new", "--input", JSON.stringify(value)];
  const agent = { TRAMA_TERMINAL: "abc123", TRAMA_AGENT: "1" };

  test("refuses fewer than two Tasks, an empty reason, an unknown kind or Task, and writes nothing", () => {
    const [a, b] = tasks() as [string, string];
    expect(() => run(input({ kind: "release", tasks: [a], reason: "Different files." }), dir, agent)).toThrow(/tasks/);
    expect(() => run(input({ kind: "release", tasks: [a, a], reason: "Different files." }), dir, agent)).toThrow(/two different Tasks/);
    expect(() => run(input({ kind: "release", tasks: [a, b], reason: "   " }), dir, agent)).toThrow(/reason/);
    expect(() => run(input({ kind: "release", tasks: [a, b], reason: "two\nlines" }), dir, agent)).toThrow(/reason/);
    expect(() => run(input({ kind: "later", tasks: [a, b], reason: "Why." }), dir, agent)).toThrow(/kind/);
    expect(() => run(input({ kind: "order", tasks: [a, "nothing0x"], reason: "Why." }), dir, agent)).toThrow(/not found/);
    expect(existsSync(join(p.dir, "timings"))).toBe(false);
  });

  test("outside a Trama terminal or chat it writes nothing, says so and exits with 0", () => {
    const [a, b] = tasks() as [string, string];
    const out = run(input({ kind: "order", tasks: [a, b], reason: "The second needs the first." }), dir, {});
    expect(out.exit).toBe(0);
    expect(out.out).toContain("Nothing recorded");
    expect(existsSync(join(p.dir, "timings"))).toBe(false);
  });

  test("records the choice in the job and timing list summarises the choices", () => {
    const [a, b] = tasks() as [string, string];
    run(input({ kind: "release", tasks: [a, b], reason: "They touch different files." }), dir, agent);
    run(input({ kind: "order", tasks: [b, a], reason: "The second needs the first." }), dir, agent);
    run(input({ kind: "release", tasks: [a, b], reason: "Still apart." }), dir, agent);

    const [job] = timingJobs(p, 1);
    expect(job?.parallelChoices.map((c) => [c.kind, c.tasks.map((t) => t.id), c.reason])).toEqual([
      ["release", [a, b], "They touch different files."],
      ["order", [b, a], "The second needs the first."],
      ["release", [a, b], "Still apart."],
    ]);
    const json = JSON.parse(run(["--json", "--root", dir, "timing", "list"], dir, {}).out) as { jobs: { parallelChoices: unknown[] }[] };
    expect(json.jobs[0]?.parallelChoices).toHaveLength(3);
    const md = run(["--root", dir, "timing", "list"], dir, {}).out;
    expect(md).toContain("Parallel choices");
    expect(md).toContain("2 release, 1 order, 0 conflict");
    expect(md).toContain("order:");
    expect(md).toContain("Refund unpaid orders");
    expect(md).toContain("The second needs the first.");
  });

  test("a job without choices shows no Parallel choices section", () => {
    recordTiming(p, origin, { event: "task-start", task: "t1", title: "Refund" }, { startsJob: true }, at(1));
    expect(run(["--root", dir, "timing", "list"], dir, {}).out).not.toContain("Parallel choices");
    expect(timingJobs(p, 1)[0]?.parallelChoices).toEqual([]);
  });
});
