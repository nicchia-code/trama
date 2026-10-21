import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute } from "../src/cli/main";
import { driftShowView } from "../src/cli/work";
import { UsageError } from "../src/core/errors";
import { editDrift, preparedStatus, readPrepared, unpreparedDrifts } from "../src/core/prepared";
import { newProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { driftBody, driftOptions, driftSides, getDrift, listDrifts, newDrift, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const file = (title: string, extra: { proposal?: string; options?: typeof FIX_OPTIONS; job?: string; refs?: string[] } = {}) =>
  newDrift(p, { where: "src/refund.ts", title, refs: extra.refs ?? ["order/Paid"], happens: "The code does it one way.", should: "The Model says another.", options: extra.options ?? FIX_OPTIONS, ...extra });

const question = (id: string, options = 3) => ({
  id,
  question: "What should change?",
  context: "Some background.",
  options: Array.from({ length: options }, (_, i) => ({ label: `Option ${i + 1}`, description: `Does thing ${i + 1}.` })),
  recommended: 0,
  multi: false,
});

const prepared = (id: string) => ({ question: question(id), decisions: [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }] });

describe("drift edit with prepared", () => {
  test("writes the section after all the others, with fingerprint and instant, and leaves sides, options and body alone", () => {
    const d = file("Late refund");
    const before = { sides: driftSides(d), options: driftOptions(d), body: driftBody(d) };
    const edited = editDrift(p, d.id, { prepared: prepared(d.id) });
    const text = readFileSync(edited.path, "utf8");
    expect(text.lastIndexOf("## Prepared question")).toBeGreaterThan(text.lastIndexOf("## Where in the code"));
    const read = readPrepared(getDrift(p, d.id));
    expect(read).not.toBe("unreadable");
    expect(read).not.toBeNull();
    if (read === null || read === "unreadable") return;
    expect(read.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(Number.isNaN(Date.parse(read.prepared))).toBe(false);
    const again = getDrift(p, d.id);
    expect(driftSides(again)).toEqual(before.sides);
    expect(driftOptions(again)).toEqual(before.options);
    expect(driftBody(again)).toBe(before.body);
    expect(preparedStatus(p, again)?.state).toBe("valid");
  });

  test("a second edit replaces the section instead of adding another", () => {
    const d = file("Late refund");
    editDrift(p, d.id, { prepared: prepared(d.id) });
    editDrift(p, d.id, { prepared: { question: { ...question(d.id), question: "Changed?" }, decisions: prepared(d.id).decisions } });
    const text = readFileSync(getDrift(p, d.id).path, "utf8");
    expect(text.match(/## Prepared question/g)?.length).toBe(1);
    expect(text).toContain("Changed?");
  });

  test("a Drift written before the section keeps reading the same and a section that does not read counts as absent", () => {
    const d = file("Legacy");
    writeFileSync(d.path, `${readFileSync(d.path, "utf8").trimEnd()}\n\n## Prepared question\n\n\`\`\`json\n{ not json\n\`\`\`\n`);
    const again = getDrift(p, d.id);
    expect(readPrepared(again)).toBe("unreadable");
    expect(preparedStatus(p, again)?.state).toBe("unreadable");
    expect(driftSides(again)?.where).toBe("src/refund.ts");
    expect(unpreparedDrifts(p, [again])).toHaveLength(1);
  });

  test("with fix options it needs each of them once plus one proposal or dismissed, and says which field is wrong", () => {
    const d = file("Late refund");
    const refuses = (decisions: unknown[], question3 = question(d.id), message: RegExp) => {
      expect(() => editDrift(p, d.id, { prepared: { question: question3, decisions } })).toThrow(UsageError);
      expect(() => editDrift(p, d.id, { prepared: { question: question3, decisions } })).toThrow(message);
    };
    refuses([{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 1 }, { decision: "dismissed" }], question(d.id), /more than once/);
    refuses([{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 3 }, { decision: "dismissed" }], question(d.id), /fix option 3 does not exist/);
    refuses([{ decision: "fix-code", option: 1 }, { decision: "dismissed" }, { decision: "dismissed" }], question(d.id), /missing 2/);
    refuses([{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "proposal" }], question(d.id), /attached Proposal/);
    refuses([{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }], question(d.id, 2), /exactly one "proposal" or "dismissed"/);
    refuses([{ decision: "fix-code" }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }], question(d.id), /prepared\.decisions\[0\]/);
    expect(() => editDrift(p, d.id, { prepared: { question: { ...question(d.id), id: "other" }, decisions: prepared(d.id).decisions } })).toThrow(/prepared\.question\.id/);
    expect(() => editDrift(p, d.id, { prepared: { question: { ...question(d.id), multi: true }, decisions: prepared(d.id).decisions } })).toThrow(/prepared\.question\.multi/);
    expect(() => editDrift(p, d.id, { prepared: { question: { ...question(d.id), options: [{ label: "x", description: "y" }] }, decisions: [] } })).toThrow(/prepared\.question/);
    expect(readPrepared(getDrift(p, d.id))).toBeNull();
  });

  test("a Drift without fix options has exactly one proposal and one dismissed, and the Proposal given in the same command counts", () => {
    const draft = newProposal(p, "Fix the Model");
    const d = file("No options", { proposal: draft.id, options: [] as unknown as typeof FIX_OPTIONS });
    const both = [{ decision: "proposal" }, { decision: "dismissed" }];
    expect(() => editDrift(p, d.id, { prepared: { question: question(d.id, 2), decisions: [{ decision: "dismissed" }, { decision: "dismissed" }] } })).toThrow(/exactly one "proposal" and one "dismissed"/);
    editDrift(p, d.id, { prepared: { question: question(d.id, 2), decisions: both } });
    expect(preparedStatus(p, getDrift(p, d.id))?.state).toBe("valid");

    const second = file("Without proposal");
    const draft2 = newProposal(p, "Late one");
    const withBoth = [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "proposal" }];
    expect(() => editDrift(p, second.id, { prepared: { question: question(second.id), decisions: withBoth } })).toThrow(/attached Proposal/);
    const edited = editDrift(p, second.id, { proposal: draft2.id, prepared: { question: question(second.id), decisions: withBoth } });
    expect(edited.data.proposal).toBe(draft2.id);
  });

  test("an input with neither field, or a resolved Drift, is refused and nothing is written", () => {
    const d = file("Late refund");
    expect(() => editDrift(p, d.id, {})).toThrow(UsageError);
    resolveDrift(p, d.id, "dismiss");
    const before = readFileSync(getDrift(p, d.id).path, "utf8");
    expect(() => editDrift(p, d.id, { prepared: prepared(d.id) })).toThrow(/already resolved/);
    expect(readFileSync(getDrift(p, d.id).path, "utf8")).toBe(before);
  });
});

describe("drift edit with proposal", () => {
  test("attaches a Draft to an open Drift that has none, and refuses one already attached, held by another Drift or decided", () => {
    const d = file("Late refund");
    const draft = newProposal(p, "Adapt the Model");
    expect(editDrift(p, d.id, { proposal: draft.id }).data.proposal).toBe(draft.id);
    expect(() => editDrift(p, d.id, { proposal: newProposal(p, "Second").id })).toThrow(/already has the attached Proposal/);
    const e = file("Other");
    expect(() => editDrift(p, e.id, { proposal: draft.id })).toThrow(/already attached to Drift/);
  });
});

describe("validity", () => {
  test("a change of the Model or Requirements text of the references makes it stale; the code plays no part", () => {
    const d = file("Late refund");
    editDrift(p, d.id, { prepared: prepared(d.id) });
    writeFileSync(join(dir, "unrelated-code.ts"), "export const x = 1;\n");
    expect(preparedStatus(p, getDrift(p, d.id))?.state).toBe("valid");
    const machine = join(dir, ".trama/model/checkout/order.md");
    writeFileSync(machine, readFileSync(machine, "utf8").replace("refunds the customer.", "refunds the customer fully."));
    const status = preparedStatus(p, getDrift(p, d.id));
    expect(status?.state).toBe("stale");
    expect(status && status.state === "stale" ? status.reason : "").toBe("Model or Requirements changed");
    // A stale question is not erased by itself.
    expect(readPrepared(getDrift(p, d.id))).not.toBeNull();
  });

  test("a resolved Drift, or a proposal decision whose Proposal is gone, is not valid", () => {
    const draft = newProposal(p, "Adapt the Model");
    const d = file("Late refund", { proposal: draft.id });
    editDrift(p, d.id, { prepared: { question: question(d.id), decisions: [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "proposal" }] } });
    expect(preparedStatus(p, getDrift(p, d.id))?.state).toBe("valid");
    resolveDrift(p, d.id, "fix-code", [], { option: 1 });
    expect(preparedStatus(p, getDrift(p, d.id))?.state).toBe("stale");
  });
});

describe("drift list, show and the Snapshot", () => {
  test("list keeps by job and by unprepared, which leaves out valid questions and Drifts in a resolution", async () => {
    const a = file("Prepared", { job: "job-1" });
    const b = file("Not prepared", { job: "job-2", refs: ["order"] });
    editDrift(p, a.id, { prepared: prepared(a.id) });
    const run = async (input: object) => JSON.parse((await execute(["drift", "list", "--json", "--input", JSON.stringify(input), "--root", dir], dir)).out).drifts as { id: string; job: string | null; prepared: { valid: boolean } | null }[];
    expect((await run({})).map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect((await run({ job: "job-2" })).map((x) => x.id)).toEqual([b.id]);
    expect((await run({ unprepared: true })).map((x) => x.id)).toEqual([b.id]);
    expect((await run({ unprepared: true, job: "job-1" }))).toEqual([]);
    const all = await run({});
    expect(all.find((x) => x.id === a.id)).toMatchObject({ job: "job-1", prepared: { valid: true } });
    expect(all.find((x) => x.id === b.id)).toMatchObject({ job: "job-2", prepared: null });
    expect(listDrifts(p).find((x) => x.id === a.id)?.data.job).toBe("job-1");
  });

  test("list with currentJob keeps the Drifts of the command's TRAMA_JOB, none without it, and refuses job together with it", async () => {
    const a = file("Prepared", { job: "job-1" });
    const b = file("Not prepared", { job: "job-2", refs: ["order"] });
    editDrift(p, a.id, { prepared: prepared(a.id) });
    const run = async (input: object, env: Record<string, string | undefined>) =>
      (await execute(["drift", "list", "--json", "--input", JSON.stringify(input), "--root", dir], dir, { env })).out;
    const ids = async (input: object, env: Record<string, string | undefined>) => (JSON.parse(await run(input, env)).drifts as { id: string }[]).map((x) => x.id);
    expect(await ids({ currentJob: true }, { TRAMA_JOB: "job-2" })).toEqual([b.id]);
    expect(await ids({ currentJob: true, unprepared: true }, { TRAMA_JOB: "job-1" })).toEqual([]);
    expect(await ids({ currentJob: true, unprepared: true }, { TRAMA_JOB: "job-2" })).toEqual([b.id]);
    expect(await ids({ currentJob: true }, {})).toEqual([]);
    const none = await execute(["drift", "list", "--input", JSON.stringify({ currentJob: true }), "--root", dir], dir, { env: {} });
    expect(none.exit).toBe(0);
    expect(none.out).toContain("TRAMA_JOB");
    await expect(run({ currentJob: true, job: "job-1" }, { TRAMA_JOB: "job-1" })).rejects.toThrow(UsageError);
  });

  test("show gives the status block with the question, each option's decision and the recommended one; none without a section", () => {
    const d = file("Late refund");
    expect(driftShowView(p, d).md).not.toContain("Prepared question");
    editDrift(p, d.id, { prepared: prepared(d.id) });
    const view = driftShowView(p, getDrift(p, d.id));
    expect(view.md).toContain("## Prepared question");
    expect(view.md).toContain("Status: **valid**");
    expect(view.md).toContain("1. **Option 1** (recommended) → fix the code, option 1 (Change the code)");
    expect(view.md).toContain("3. **Option 3** → close without changes");
    const json = view.json as { prepared: { valid: boolean; question: { id: string }; decisions: unknown[] }; body: string };
    expect(json.prepared.valid).toBe(true);
    expect(json.prepared.question.id).toBe(d.id);
    expect(json.prepared.decisions).toHaveLength(3);
    expect(json.body).not.toContain("Prepared question");
    // The JSON of the section is not part of any other part of the page.
    expect(view.md.split("## What should happen")[1]?.split("## Prepared question")[0]).not.toContain("fingerprint");
  });

  test("show of an unreadable section says so and carries no prepared question in the JSON", () => {
    const d = file("Late refund");
    writeFileSync(d.path, `${readFileSync(d.path, "utf8").trimEnd()}\n\n## Prepared question\n\nnot a block\n`);
    const view = driftShowView(p, getDrift(p, d.id));
    expect(view.md).toContain("Status: **unreadable**");
    expect((view.json as { prepared: unknown }).prepared).toBeNull();
  });

  test("the Snapshot carries job and prepared for open Drifts", () => {
    const a = file("Prepared", { job: "job-9" });
    const b = file("Not prepared");
    editDrift(p, a.id, { prepared: prepared(a.id) });
    const drifts = buildSnapshot(p).drifts;
    expect(drifts.find((x) => x.id === a.id)).toMatchObject({ job: "job-9", prepared: { valid: true } });
    expect(drifts.find((x) => x.id === b.id)).toMatchObject({ job: null, prepared: null });
    expect(drifts.find((x) => x.id === a.id)?.body).not.toContain("Prepared question");
  });

  test("the fix Task carries neither the section nor its JSON, also for a Drift written before the sides", () => {
    const tasksDir = join(dir, ".trama/tasks");
    const taskText = (id: string) => readFileSync(join(tasksDir, readdirSync(tasksDir).find((n) => n.startsWith(id)) as string), "utf8");
    const d = file("Late refund");
    editDrift(p, d.id, { prepared: prepared(d.id) });
    const fixed = taskText(resolveDrift(p, d.id, "fix-code", [], { option: 1 }).data.task as string);
    expect(fixed).not.toContain("Prepared question");
    expect(fixed).not.toContain("fingerprint");
    expect(fixed).toContain("src/refund.ts");

    const legacy = file("Legacy");
    const head = readFileSync(legacy.path, "utf8");
    writeFileSync(legacy.path, `${head.slice(0, head.indexOf("\n---", 4) + 5)}# Legacy\n\nThe code does one thing and the Model says another.\n\n## Prepared question\n\n\`\`\`json\n{ "fingerprint": "x" }\n\`\`\`\n`);
    expect(driftBody(getDrift(p, legacy.id))).toBe("The code does one thing and the Model says another.");
    expect(driftShowView(p, getDrift(p, legacy.id)).md).not.toContain("fingerprint");
    const legacyTask = taskText(resolveDrift(p, legacy.id, "fix-code").data.task as string);
    expect(legacyTask).toContain("The code does one thing and the Model says another.");
    expect(legacyTask).not.toContain("fingerprint");
  });
});

describe("drift new and comparison move record the job", () => {
  test("drift new writes TRAMA_JOB into the front matter, comparison move does too, and a rewrite keeps it", async () => {
    const created = await execute(
      ["drift", "new", "--json", "--root", dir, "--input", JSON.stringify({ title: "Job one", refs: ["order/Paid"], happens: "A.", should: "B.", where: "src/x.ts", options: FIX_OPTIONS })],
      dir,
      { env: { TRAMA_JOB: "run-7" } },
    );
    const id = JSON.parse(created.out).id as string;
    expect(getDrift(p, id).data.job).toBe("run-7");
    editDrift(p, id, { prepared: prepared(id) });
    expect(getDrift(p, id).data.job).toBe("run-7");
    expect(readFileSync(getDrift(p, id).path, "utf8")).toContain("job: run-7");
    const none = await execute(["drift", "new", "--json", "--root", dir, "--input", JSON.stringify({ title: "No job", refs: ["order/Paid"], happens: "A.", should: "B.", where: "src/x.ts", options: FIX_OPTIONS })], dir, { env: {} });
    expect(getDrift(p, JSON.parse(none.out).id).data.job).toBeNull();
    expect(readFileSync(getDrift(p, JSON.parse(none.out).id).path, "utf8")).not.toContain("job:");
  });

  test("comparison move writes the job of the environment into each Drift", async () => {
    const briefing = await execute(["comparison", "new", "order", "--json", "--root", dir, "--input", "{}"], dir, { env: { TRAMA_JOB: "run-8" } });
    const comparison = JSON.parse(briefing.out).announcement as string;
    const moved = await execute(
      ["comparison", "move", comparison, "delivered", "--json", "--root", dir, "--input", JSON.stringify({ tasks: [], drifts: [{ title: "Compared", refs: ["order/Paid"], happens: "A.", should: "B.", where: "src/x.ts", options: FIX_OPTIONS }] })],
      dir,
      { env: { TRAMA_JOB: "run-8" } },
    );
    const id = JSON.parse(moved.out).drifts[0].id as string;
    expect(getDrift(p, id).data.job).toBe("run-8");
  });
});
