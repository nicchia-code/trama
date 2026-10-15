import { describe, expect, test } from "bun:test";
import { buildModel } from "../src/core/model";
import { removedElements } from "../src/core/scan-scope";
import type { FileMap } from "../src/core/types";

const machine = (states: string, events: string | null = "### TICK\nTime passes.\n") =>
  `# M\n\nA machine.\n\n## States\n\n${states}${events === null ? "" : `\n## Events\n\n${events}`}`;

const BASE_STATES = "### A (initial)\n- `user.GO` → B\n\n### B (final)\n";

const BASE: Record<string, string> = {
  "system.md": "# Sys\n\nA system.\n",
  "actors/user.md": "# User\n\nSomeone.\n\n## Events\n\n### GO\nThey go.\n",
  "feat/feature.md": "# Feat\n\nA feature.\n",
  "feat/m.md": machine(BASE_STATES),
};

/** The Model of the base files with `overrides` applied: a path mapped to null is left out. */
function model(overrides: Record<string, string | null> = {}) {
  const files: FileMap = new Map();
  for (const [path, content] of Object.entries({ ...BASE, ...overrides })) if (content !== null) files.set(path, content);
  return buildModel(files);
}

describe("removedElements", () => {
  test("a removed Feature is listed alone, with no container; its Machines go with it", () => {
    const after = model({ "feat/feature.md": null, "feat/m.md": null });
    expect(removedElements(model(), after)).toEqual([{ ref: "feat", kind: "feature", container: null }]);
  });

  test("a removed Actor is listed with no container", () => {
    const before = model({ "actors/carrier.md": "# Carrier\n\nA courier.\n" });
    expect(removedElements(before, model())).toEqual([{ ref: "carrier", kind: "actor", container: null }]);
  });

  test("a removed Machine is listed under its Feature, and what it held is not listed again", () => {
    expect(removedElements(model(), model({ "feat/m.md": null }))).toEqual([{ ref: "m", kind: "machine", container: "feat" }]);
  });

  test("a removed Event is listed under its Machine", () => {
    const after = model({ "feat/m.md": machine(BASE_STATES, null) });
    expect(removedElements(model(), after)).toEqual([{ ref: "m.TICK", kind: "event", container: "m" }]);
  });

  test("a Transition removed from a State that stays is listed under that State", () => {
    const after = model({ "feat/m.md": machine("### A (initial)\n\n### B (final)\n") });
    expect(removedElements(model(), after)).toEqual([{ ref: "m/A/user.GO", kind: "transition", container: "m/A" }]);
  });

  test("a removed child State is listed under its surviving parent", () => {
    const before = model({ "feat/m.md": machine("### P (initial)\n#### C\n") });
    const after = model({ "feat/m.md": machine("### P (initial)\n") });
    expect(removedElements(before, after)).toEqual([{ ref: "m/C", kind: "state", container: "m/P" }]);
  });

  test("a removed State under a removed parent is covered by the parent alone", () => {
    const before = model({ "feat/m.md": machine("### P (initial)\n#### C\n") });
    const after = model({ "feat/m.md": machine("### Q (initial)\n") });
    expect(removedElements(before, after)).toEqual([{ ref: "m/P", kind: "state", container: "m" }]);
  });

  test("an unchanged Model removes nothing", () => {
    expect(removedElements(model(), model())).toEqual([]);
  });
});
