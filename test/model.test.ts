import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { buildModel } from "../src/core/model";
import { readTree } from "../src/core/store";
import type { FileMap } from "../src/core/types";

const machine = (states: string, extra = "") => `# M\n\nA machine.\n\n## States\n\n${states}\n${extra}`;

const GOOD_STATES = `### A (initial)
- \`user.GO\` → B

### B (final)
`;

function files(overrides: Record<string, string | null> = {}): FileMap {
  const base: Record<string, string> = {
    "system.md": "# Sys\n\nA system.\n",
    "actors/user.md": "# User\n\nSomeone.\n\n## Events\n\n### GO\nThey go.\n",
    "feat/feature.md": "# Feat\n\nA feature.\n",
    "feat/m.md": machine(GOOD_STATES),
  };
  const out: FileMap = new Map();
  for (const [path, content] of Object.entries({ ...base, ...overrides })) if (content !== null) out.set(path, content);
  return out;
}

const errors = (f: FileMap) => buildModel(f).diagnostics.map((d) => d.message);

test("the example Shop Model is valid", () => {
  const model = buildModel(readTree(join(import.meta.dir, "../examples/shop/.trama/model")));
  expect(model.diagnostics).toEqual([]);
  expect([...model.machines.keys()].sort()).toEqual(["cart", "order", "payment"]);
});

describe("validation rules", () => {
  const cases: [string, Record<string, string | null>, RegExp][] = [
    ["no initial State", { "feat/m.md": machine("### A\n### B (final)\n") }, /exactly one \(initial\) State, found 0/],
    ["two initial States", { "feat/m.md": machine("### A (initial)\n### B (initial)\n") }, /exactly one \(initial\) State, found 2/],
    ["no initial sub-State", { "feat/m.md": machine("### A (initial)\n#### X\n#### Y\n") }, /Sub-States of "A" must have exactly one/],
    ["duplicate State names, case-insensitive", { "feat/m.md": machine("### A (initial)\n### a\n") }, /Duplicate State name "a"/],
    ["final State with a Transition", { "feat/m.md": machine("### A (initial)\n### B (final)\n- `user.GO` → A\n") }, /Final State "B" cannot have outgoing/],
    ["final State with sub-States", { "feat/m.md": machine("### A (initial)\n### B (final)\n#### C (initial)\n") }, /Final State "B" cannot have sub-States/],
    ["Transition to an unknown State", { "feat/m.md": machine("### A (initial)\n- `user.GO` → Nowhere\n") }, /unknown State "Nowhere"/],
    ["unknown Event owner", { "feat/m.md": machine("### A (initial)\n- `ghost.GO` → A\n") }, /unknown owner "ghost"/],
    ["undeclared Event", { "feat/m.md": machine("### A (initial)\n- `user.STOP` → A\n") }, /"user" does not declare Event STOP/],
    ["bare Event the Machine does not declare", { "feat/m.md": machine("### A (initial)\n- `GO` → A\n") }, /"m" does not declare Event GO/],
    ["malformed Transition", { "feat/m.md": machine("### A (initial)\n- `user.GO` to A\n") }, /Malformed Transition/],
    ["skipped heading level", { "feat/m.md": machine("### A (initial)\n##### Deep (initial)\n") }, /Heading level skipped/],
    ["Event name not UPPER_SNAKE_CASE", { "feat/m.md": machine(GOOD_STATES, "\n## Events\n\n### Done\nx\n") }, /not UPPER_SNAKE_CASE/],
    ["duplicate Event in an owner", { "actors/user.md": "# U\n\n## Events\n\n### GO\na\n\n### GO\nb\n" }, /Duplicate Event "GO"/],
    ["Machine without ## States", { "feat/m.md": "# M\n\nNo states here.\n" }, /Missing required section "## States"/],
    ["sections out of order", { "feat/m.md": machine(GOOD_STATES, "").replace("## States", "## Events\n\n### E\nx\n\n## States") }, /out of order/],
    ["unknown section", { "feat/m.md": machine(GOOD_STATES, "\n## Notes\n\nhi\n") }, /Unknown section "## Notes"/],
    ["two H1s", { "feat/m.md": `${machine(GOOD_STATES)}\n# Again\n` }, /More than one H1/],
    ["Machine outside a Feature folder", { "loose.md": machine(GOOD_STATES) }, /must live inside a Feature folder/],
    ["nested Feature", { "feat/inner/m2.md": machine(GOOD_STATES) }, /cannot be nested/],
    ["ID shared by an Actor and a Machine", { "feat/user.md": machine(GOOD_STATES) }, /Duplicate ID "user"/],
    ["ID shared by a Feature and a Machine", { "feat/feat.md": machine(GOOD_STATES) }, /Duplicate ID "feat"/],
    ["non-kebab-case ID", { "feat/My_Machine.md": machine(GOOD_STATES) }, /Invalid ID "My_Machine"/],
    ["reserved ID", { "feat/system.md": machine(GOOD_STATES) }, /"system" is a reserved name/],
    ["Windows device name as a Machine ID", { "feat/com1.md": machine(GOOD_STATES) }, /"com1" is a name Windows reserves for devices/],
    ["Windows device name as a Feature ID", { "nul/feature.md": "# Nul\n\nA feature.\n" }, /"nul" is a name Windows reserves for devices/],
    ["Windows device name as an Actor ID", { "actors/lpt9.md": "# L\n\nSomeone.\n" }, /"lpt9" is a name Windows reserves for devices/],
    ["Feature folder without feature.md", { "feat/feature.md": null }, /has no feature\.md/],
    ["missing system.md", { "system.md": null }, /Missing system\.md/],
    ["Actor with States", { "actors/user.md": "# U\n\n## States\n\n### A (initial)\n" }, /Unknown section "## States"/],
  ];
  for (const [name, overrides, expected] of cases) {
    test(name, () => {
      expect(errors(files(overrides)).some((m) => expected.test(m))).toBe(true);
    });
  }
});

test("a name that only contains a Windows device name stays valid", () => {
  expect(errors(files({ "feat/console.md": machine(GOOD_STATES), "feat/com-port.md": machine(GOOD_STATES) }))).toEqual([]);
});

describe("parsing", () => {
  test("Transitions and headings inside code fences are prose", () => {
    const fenced = machine("### A (initial)\n```\n- `user.NOPE` → B\n### Fake (initial)\n```\n- `user.GO` → B\n\n### B (final)\n");
    const model = buildModel(files({ "feat/m.md": fenced }));
    expect(model.diagnostics).toEqual([]);
    const a = model.machines.get("m")?.states[0];
    expect(a?.transitions.map((t) => t.event.name)).toEqual(["GO"]);
  });

  test("a list item that does not start with a code span is prose", () => {
    const m = buildModel(files({ "feat/m.md": machine("### A (initial)\nNotes:\n- remember to ask about this\n- `user.GO` → B\n\n### B (final)\n") }));
    expect(m.diagnostics).toEqual([]);
    expect(m.machines.get("m")?.states[0]?.description).toContain("remember to ask about this");
  });

  test("Transition prose continues on indented lines and `->` is accepted", () => {
    const m = buildModel(files({ "feat/m.md": machine("### A (initial)\n- `user.GO` -> B: first part\n  second part\n\n### B (final)\n") }));
    expect(m.diagnostics).toEqual([]);
    expect(m.machines.get("m")?.states[0]?.transitions[0]?.prose).toBe("first part second part");
  });

  test("a bare Event belongs to the Machine that writes it", () => {
    const src = machine("### A (initial)\n- `PING` → A\n", "\n## Events\n\n### PING\nx\n");
    const model = buildModel(files({ "feat/m.md": src }));
    expect(model.diagnostics).toEqual([]);
    expect(model.machines.get("m")?.states[0]?.transitions[0]?.event).toEqual({ owner: "m", name: "PING" });
  });

  test("the same Event may lead to several Transitions from one State", () => {
    const src = machine("### A (initial)\n- `user.GO` → B: if fast\n- `user.GO` → C: otherwise\n\n### B (final)\n### C (final)\n");
    const model = buildModel(files({ "feat/m.md": src }));
    expect(model.diagnostics).toEqual([]);
    expect(model.machines.get("m")?.states[0]?.transitions.map((t) => t.target)).toEqual(["B", "C"]);
  });
});
