import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { announce, listAnnouncements } from "../src/core/announcements";
import { archiveComparison, briefing, parseComparisonFile } from "../src/core/compare";
import { TramaError } from "../src/core/errors";
import { run } from "../src/cli/main";
import { type Project, projectAt } from "../src/core/store";
import { listDrifts, listTasks, newTask } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const validComparison = JSON.stringify({
  tasks: [{ title: "Refund paid orders", refs: ["order/Paid"] }],
  drifts: [
    {
      title: "Late refund",
      refs: ["order/Shipped"],
      happens: "The shipped order refunds late.",
      should: "The Model forbids it.",
      where: "src/refund.ts",
      options: [
        { title: "Change the code", text: "Make it so." },
        { title: "Remove the code", text: "Drop it." },
      ],
    },
  ],
});

describe("trama comparison new", () => {
  test("a Machine's briefing takes its whole scope by default and refuses references outside it, announcing nothing", () => {
    const b = briefing(p, "order", [], false);
    expect(b.scope).toContain("order");
    expect(b.scope).toContain("order/Paid");
    expect(() => briefing(p, "nope", [], false)).toThrow(TramaError);
    expect(() => briefing(p, "order", ["payment"], false)).toThrow(TramaError);
    expect(listAnnouncements(p)).toEqual([]);
  });

  test("the briefing lists the open Tasks on the references, and candidates name the Tasks a Drift would block", () => {
    const t = newTask(p, { title: "Refund paid orders", refs: ["order/Paid"], technical: false });
    const b = briefing(p, "order", ["order/Paid"], true);
    expect(b.openTasks.map((x) => x.id)).toEqual([t.id]);
    expect(b.candidates?.get("order/Paid")?.map((x) => x.id)).toEqual([t.id]);
    expect(briefing(p, "order", ["order/Paid"], false).candidates).toBeNull();
  });

  test("the command announces the comparison and prints its announcement first", () => {
    const out = run(["--root", dir, "comparison", "new", "order"], dir, {}).out;
    const [ghost] = listAnnouncements(p);
    expect(ghost?.kind).toBe("comparison");
    expect(out.startsWith(ghost?.id ?? "")).toBe(true);
    expect(out).toContain("Machine `order`");
  });

  test("the command refuses an unknown Machine and announces nothing", () => {
    expect(() => run(["--root", dir, "comparison", "new", "nope"], dir, {})).toThrow(TramaError);
    expect(listAnnouncements(p)).toEqual([]);
  });
});

describe("trama comparison move", () => {
  test("the comparison file is read as a JSON object with tasks and drifts lists", () => {
    expect(() => parseComparisonFile("[]")).toThrow(TramaError);
    expect(() => parseComparisonFile('{"tasks":[]}')).toThrow(TramaError);
    expect(() => parseComparisonFile("{not json")).toThrow(TramaError);
    expect(parseComparisonFile(validComparison).tasks).toHaveLength(1);
  });

  test("a card with a bad field writes nothing at all", () => {
    const comparison = announce(p, { kind: "comparison", title: "Comparing order", machine: "order" });
    const bad = JSON.stringify({ tasks: [{ title: "Good", refs: ["order/Paid"] }, { title: 3, refs: [] }], drifts: [] });
    expect(() => archiveComparison(p, comparison.id, bad)).toThrow(/nothing was written/);
    expect(listTasks(p)).toEqual([]);
    expect(listDrifts(p)).toEqual([]);
  });

  test("a valid comparison files its Tasks and Drifts and delivers the waiting comparison", () => {
    const comparison = announce(p, { kind: "comparison", title: "Comparing order", machine: "order" });
    const result = archiveComparison(p, comparison.id, validComparison);
    expect(result.tasks.map((t) => t.title)).toEqual(["Refund paid orders"]);
    expect(result.drifts.map((d) => d.title)).toEqual(["Late refund"]);
    expect(result.delivered).toBe(true);
    expect(listTasks(p)).toHaveLength(1);
    expect(listDrifts(p)).toHaveLength(1);
  });

  test("an unknown comparison ID still files the cards, without delivering anything", () => {
    const result = archiveComparison(p, "zzzzzz", validComparison);
    expect(result.delivered).toBe(false);
    expect(listTasks(p)).toHaveLength(1);
    expect(listDrifts(p)).toHaveLength(1);
  });

  test("the command files a comparison file and says whether the comparison was waiting", () => {
    const out = run(["--root", dir, "comparison", "move", "zzzzzz", "delivered", "--input", validComparison], dir, {}).out;
    expect(out).toContain("No comparison is waiting for zzzzzz");
    expect(listTasks(p)).toHaveLength(1);
  });
});
