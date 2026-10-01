import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { approveProposal, editInProposal, getProposal, newProposal, validateProposal } from "../src/core/proposals";
import { syncRequirementSkills } from "../src/core/requirement-skills";
import { loadProject, requirementsFor } from "../src/core/requirements";
import { proposalScope } from "../src/core/scope";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { newTask } from "../src/core/work";

let dir: string;
let p: Project;

const UI = `---
description: Use when building screens.
---
# Interface

## General
Material 3 everywhere.

## checkout
Checkout screens use the brand colour.

## order/Paid
Show a green badge.

## order/Preparing
Show a progress bar.
`;

const reqFile = (area: string) => join(p.dir, "requirements", `${area}.md`);
const skillFile = (area: string) => join(dir, ".agents/skills", `trama-req-${area}`, "SKILL.md");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-req-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  rmSync(join(p.dir, "requirements"), { recursive: true, force: true });
  mkdirSync(join(p.dir, "requirements"), { recursive: true });
  writeFileSync(reqFile("ui"), UI);
  mkdirSync(join(dir, ".agents/skills/trama-design"), { recursive: true });
  writeFileSync(join(dir, ".agents/skills/trama-design/SKILL.md"), "---\nname: trama-design\n---\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("Areas", () => {
  test("a section must name an existing Model element, once, and the Area needs a description", () => {
    writeFileSync(reqFile("data"), "# Data\n\n## order/Lost\nx\n\n## General\na\n\n## general\nb\n");
    const messages = loadProject(p).diagnostics.map((d) => `${d.file}:${d.line} ${d.message}`);
    expect(messages).toEqual([
      expect.stringContaining('requirements/data.md:1 Missing "description"'),
      expect.stringMatching(/requirements\/data\.md:3 Section "## order\/Lost" does not match the Model.*no State "Lost"/),
      expect.stringContaining('requirements/data.md:9 Duplicate section "## general"'),
    ]);
  });

  test("a State gets the Requirements of its parent States, Machine and Feature, most specific first", () => {
    const found = requirementsFor(loadProject(p), "order/Preparing").map((r) => `${r.section.ref} via ${r.ref}`);
    expect(found).toEqual(["order/Preparing via order/Preparing", "order/Paid via order/Paid", "checkout via checkout"]);
    expect(requirementsFor(loadProject(p), "cart").map((r) => r.section.ref)).toEqual(["checkout"]);
  });
});

describe("Proposals with Requirements", () => {
  const removePreparing = (t: string) =>
    t.replace("#### Preparing (initial)\n- `warehouse.PACKAGE_READY` → Ready to ship\n\n#### Ready to ship", "#### Ready to ship (initial)");

  test("removing a State a Requirement is attached to is invalid until the Requirement is updated in the same Proposal", () => {
    const prop = newProposal(p, "No preparing step");
    const order = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(order, removePreparing(readFileSync(order, "utf8")));
    expect(validateProposal(p, getProposal(p, prop.id)).map((d) => d.file)).toEqual(["requirements/ui.md"]);
    expect(() => approveProposal(p, prop.id)).toThrow(/order\/Preparing/);

    const ui = editInProposal(p, prop.id, ".trama/requirements/ui.md");
    writeFileSync(ui, UI.replace("## order/Preparing\nShow a progress bar.\n", "## order/Ready to ship\nShow the courier's name.\n"));
    expect(validateProposal(p, getProposal(p, prop.id))).toEqual([]);
    approveProposal(p, prop.id);

    expect(readFileSync(reqFile("ui"), "utf8")).toContain("## order/Ready to ship");
    expect(readFileSync(skillFile("ui"), "utf8")).toContain("Show the courier's name.");
    expect(readFileSync(skillFile("ui"), "utf8")).not.toContain("progress bar");
  });

  test("a Proposal that only edits Requirements shows as an Area change, not as a Machine", () => {
    const prop = newProposal(p, "Badge colour");
    writeFileSync(editInProposal(p, prop.id, "requirements/ui.md"), UI.replace("Show a green badge.", "Show a blue badge.").replace("## order/Preparing\nShow a progress bar.\n", "") + "\n## cart\nSticky total.\n");
    const view = buildSnapshot(p).proposals[0];
    expect(view?.machines).toEqual([]);
    expect(view?.areas.map((a) => [a.id, a.change])).toEqual([["ui", "modified"]]);
    expect(view?.areas[0]?.sections.map((s) => [s.ref, s.change, s.before])).toEqual([
      [null, "same", null],
      ["checkout", "same", null],
      ["order/Paid", "changed", "Show a green badge."],
      ["cart", "added", null],
      ["order/Preparing", "removed", "Show a progress bar."],
    ]);
  });

  test("Requirement paths cannot leave requirements/ or nest folders", () => {
    const prop = newProposal(p, "x");
    expect(() => editInProposal(p, prop.id, "requirements/ui/extra.md")).toThrow(/without subfolders/);
    expect(() => editInProposal(p, prop.id, "requirements/../../x.md")).toThrow(/must be relative/);
  });

  test("the scan scope of a Requirement change is the Feature of the changed sections, or everything for General", () => {
    const scoped = newProposal(p, "Badge");
    writeFileSync(editInProposal(p, scoped.id, "requirements/ui.md"), UI.replace("green", "blue"));
    expect(proposalScope(p, scoped.id)).toEqual(["checkout"]);

    mkdirSync(join(p.dir, "model/billing"), { recursive: true });
    writeFileSync(join(p.dir, "model/billing/feature.md"), "# Billing\n\nInvoices.\n");
    const general = newProposal(p, "Material You");
    writeFileSync(editInProposal(p, general.id, "requirements/ui.md"), UI.replace("Material 3 everywhere.", "Material You everywhere."));
    expect(proposalScope(p, general.id)).toEqual(["billing", "checkout"]);
  });
});

describe("Tasks and generated skills", () => {
  test("a Technical Task may reference Requirements only; any other Task needs a Model element", () => {
    expect(newTask(p, { title: "Theme", refs: ["requirements/ui#General"], technical: true }).data.refs).toEqual(["requirements/ui#General"]);
    expect(() => newTask(p, { title: "Badge", refs: ["requirements/ui#order/Paid"], technical: false })).toThrow(/at least one Model element/);
    expect(() => newTask(p, { title: "Badge", refs: ["order/Paid", "requirements/ui#order/Lost"], technical: false })).toThrow(/no section "## order\/Lost"/);
  });

  test("task show quotes the Requirements attached to the referenced elements and points at the General ones", () => {
    const task = newTask(p, { title: "Prepare", refs: ["order/Preparing"], technical: false });
    const out = run(["task", "show", task.id], dir, {});
    expect(out.out).toContain("`requirements/ui#order/Preparing`\n  > Show a progress bar.");
    expect(out.out).toContain("`requirements/ui#order/Paid`\n  > Show a green badge.");
    expect(out.out).toContain("General Requirements apply too: Interface (skill `trama-req-ui`)");
  });

  test("skills follow the Areas: written for those with content, removed when an Area is emptied or deleted", () => {
    writeFileSync(reqFile("tech"), '---\ndescription: "Use when choosing libraries."\n---\n# Technology\n\n## General\n');
    syncRequirementSkills(p);
    expect(readFileSync(skillFile("ui"), "utf8")).toStartWith("---\nname: trama-req-ui\ndescription: Use when building screens.\n---\n");
    expect(existsSync(skillFile("tech"))).toBe(false);

    rmSync(reqFile("ui"));
    syncRequirementSkills(p);
    expect(existsSync(join(dir, ".agents/skills/trama-req-ui"))).toBe(false);
  });

  test("init creates the five starting Areas, empty and valid, and no Requirement skills", () => {
    const fresh = mkdtempSync(join(tmpdir(), "trama-init-"));
    try {
      expect(run(["init"], fresh, {}).exit).toBe(0);
      const project = loadProject(projectAt(fresh));
      expect(project.areas.map((a) => a.id)).toEqual(["data", "quality", "rules", "tech", "ui"]);
      expect(project.diagnostics).toEqual([]);
      expect(existsSync(join(fresh, ".agents/skills/trama-req-ui"))).toBe(false);
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});
