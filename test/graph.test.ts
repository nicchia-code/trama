import { describe, expect, test } from "bun:test";
import { analyze, findPaths } from "../src/core/graph";
import { buildModel } from "../src/core/model";
import type { FileMap, Machine } from "../src/core/types";

const ACTOR = "# U\n\nx\n\n## Events\n\n### GO\nx\n\n### STOP\nx\n\n### SPARE\nnobody listens\n";

function modelOf(states: string) {
  const f: FileMap = new Map([
    ["system.md", "# S\n"],
    ["actors/u.md", ACTOR],
    ["f/feature.md", "# F\n"],
    ["f/m.md", `# M\n\n## States\n\n${states}`],
  ]);
  const model = buildModel(f);
  expect(model.diagnostics).toEqual([]);
  return model;
}

const machineOf = (states: string): Machine => modelOf(states).machines.get("m") as Machine;

describe("findPaths", () => {
  const states = `### Idle (initial)
- \`u.GO\` → Active

### Active
- \`u.STOP\` → Done: from the parent

#### Warming (initial)
- \`u.GO\` → Hot

#### Hot

### Done (final)
`;

  test("entering a State with sub-States lands in its initial sub-State", () => {
    const { paths } = findPaths(machineOf(states), "Idle", "Warming", 10);
    expect(paths.map((p) => p.map((s) => s.state))).toEqual([["Idle", "Warming"]]);
  });

  test("a parent's Transitions apply from every sub-State and are reported with their declaring State", () => {
    const { paths } = findPaths(machineOf(states), "Idle", "Done", 10);
    const routes = paths.map((p) => p.map((s) => s.state).join(">"));
    expect(routes).toEqual(["Idle>Warming>Done", "Idle>Warming>Hot>Done"]);
    expect(paths[0]?.[2]?.via?.source).toBe("Active");
  });

  test("a State with sub-States as the source stands for any of its leaves", () => {
    const { paths } = findPaths(machineOf(states), "Active", "Done", 10);
    expect(paths.map((p) => p.map((s) => s.state).join(">")).sort()).toEqual(["Hot>Done", "Warming>Done", "Warming>Hot>Done"]);
  });

  test("no State is visited twice and --max limits the result", () => {
    const loop = "### A (initial)\n- `u.GO` → B\n- `u.STOP` → C\n\n### B\n- `u.GO` → A\n- `u.STOP` → C\n\n### C (final)\n";
    const all = findPaths(machineOf(loop), "A", "C", 10);
    expect(all.paths.map((p) => p.map((s) => s.state).join(">"))).toEqual(["A>C", "A>B>C"]);
    const limited = findPaths(machineOf(loop), "A", "C", 1);
    expect(limited.paths).toHaveLength(1);
    expect(limited.limited).toBe(true);
  });

  test("an unknown State is an error", () => {
    expect(() => findPaths(machineOf(states), "Idle", "Nope", 5)).toThrow(/Unknown State "Nope"/);
  });
});

describe("analyze", () => {
  test("reports unreachable States, dead ends and Events nobody receives", () => {
    const model = modelOf("### A (initial)\n- `u.GO` → B\n\n### B\n\n### Island\n- `u.GO` → A\n\n### End (final)\n");
    const byKind = (kind: string) => analyze(model).filter((w) => w.kind === kind).map((w) => w.subject).sort();
    expect(byKind("unreachable-state")).toEqual(["m/End", "m/Island"]);
    expect(byKind("dead-end")).toEqual(["m/B"]);
    expect(byKind("unreceived-event")).toEqual(["u.SPARE", "u.STOP"]);
  });

  test("a State whose parent has a way out is not a dead end, and a final State never is", () => {
    const model = modelOf("### P (initial)\n- `u.STOP` → End\n\n#### Child (initial)\n\n### End (final)\n");
    expect(analyze(model, "m").filter((w) => w.kind === "dead-end" || w.kind === "unreachable-state")).toEqual([]);
  });
});
