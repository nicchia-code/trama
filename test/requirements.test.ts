import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { approveProposal, deleteInProposal, editInProposal, getProposal, newProposal, validateProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { syncRequirementSkills } from "../src/core/requirement-skills";
import { loadProject, requirementsFor, resolveProjectRef } from "../src/core/requirements";
import { proposalScope } from "../src/core/scope";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

const UI_AREA = `---
description: Use when building screens.
---
# Interface
`;

const UI = `---
description: Use when building screens.
---
# Screens

## General
Material 3 everywhere.

## checkout
Checkout screens use the brand colour.

## order/Paid
Show a green badge.

## order/Preparing
Show a progress bar.
`;

const areaDir = (area: string) => join(p.dir, "requirements", area);
const reqFile = (area: string, file = "main") => join(areaDir(area), `${file}.md`);
const writeArea = (area: string, areaMd: string, fragments: Record<string, string> = {}) => {
  mkdirSync(areaDir(area), { recursive: true });
  writeFileSync(reqFile(area, "area"), areaMd);
  for (const [name, content] of Object.entries(fragments)) writeFileSync(reqFile(area, name), content);
};
const skillFile = (area: string) => join(dir, ".agents/skills", `trama-req-${area}`, "SKILL.md");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-req-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
  rmSync(join(p.dir, "requirements"), { recursive: true, force: true });
  writeArea("ui", UI_AREA, { main: UI });
  mkdirSync(join(dir, ".agents/skills/trama-design"), { recursive: true });
  writeFileSync(join(dir, ".agents/skills/trama-design/SKILL.md"), "---\nname: trama-design\n---\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("Areas", () => {
  test("a section must name an existing Model element, once, and the fragment needs a description", () => {
    writeArea("data", '---\ndescription: "Data."\n---\n# Data\n', { main: "# Data\n\n## order/Lost\nx\n\n## General\na\n\n## general\nb\n" });
    const messages = loadProject(p).diagnostics.map((d) => `${d.file}:${d.line} ${d.message}`);
    expect(messages).toEqual([
      expect.stringContaining('requirements/data/main.md:1 Missing "description"'),
      expect.stringMatching(/requirements\/data\/main\.md:3 Section "## order\/Lost" does not match the Model.*no State "Lost"/),
      expect.stringContaining('requirements/data/main.md:9 Duplicate section "## General"'),
    ]);
  });

  test("the sections of every fragment form the Area, and a reference finds a section without naming its fragment", () => {
    const [general, paid] = UI.split("## order/Paid\n");
    writeArea("ui", UI_AREA, { main: general as string, orders: `---\ndescription: Use when showing orders.\n---\n# Orders\n\n## order/Paid\n${paid}` });
    const project = loadProject(p);
    expect(project.diagnostics).toEqual([]);
    const ui = project.areas.find((a) => a.id === "ui");
    expect(ui?.fragments.map((f) => [f.id, f.title, f.sections.map((s) => s.ref)])).toEqual([
      ["main", "Screens", [null, "checkout"]],
      ["orders", "Orders", ["order/Paid", "order/Preparing"]],
    ]);
    const found = resolveProjectRef(project, "requirements/ui#order/Paid");
    expect(found.kind === "requirement" && found.section).toMatchObject({ text: "Show a green badge.", file: "requirements/ui/orders.md" });
    expect(requirementsFor(project, "order/Preparing").map((r) => r.section.file)).toEqual(["requirements/ui/orders.md", "requirements/ui/orders.md", "requirements/ui/main.md"]);
  });

  test("the Area layout is checked: area.md alone without sections, kebab-case fragments with sections only, no subfolders, no file at the top", () => {
    writeArea("ui", `${UI_AREA}\nFor every screen.\n`, {
      main: UI,
      Bad_Name: UI,
      notes: "# Notes\n\nSome words.\n\n## order/Paid\nAgain.\n",
    });
    mkdirSync(join(areaDir("ui"), "old"));
    writeFileSync(join(areaDir("ui"), "old/x.md"), UI);
    writeArea("tech", '---\ndescription: "Tech."\n---\n# Tech\n\n## General\nBun.\n');
    mkdirSync(areaDir("data"));
    writeFileSync(reqFile("data"), '---\ndescription: "Data."\n---\n# Data\n\n## General\nCents.\n');
    writeFileSync(join(p.dir, "requirements/rules.md"), UI);
    const messages = loadProject(p).diagnostics.map((d) => `${d.file}:${d.line} ${d.message}`).sort();
    expect(messages).toEqual([
      expect.stringMatching(/^requirements\/data\/area\.md:0 Missing area\.md/),
      expect.stringMatching(/^requirements\/rules\.md:0 .*run "trama skills update"/),
      expect.stringMatching(/^requirements\/tech\/area\.md:6 area\.md has no sections: move "## General" into a fragment/),
      expect.stringMatching(/^requirements\/ui\/Bad_Name\.md:0 Fragment "Bad_Name" is not a kebab-case name/),
      expect.stringMatching(/^requirements\/ui\/notes\.md:1 Missing "description"/),
      expect.stringMatching(/^requirements\/ui\/notes\.md:3 Text before the first section/),
      expect.stringMatching(/^requirements\/ui\/notes\.md:5 Section "## order\/Paid" is already in requirements\/ui\/main\.md:\d+/),
      expect.stringMatching(/^requirements\/ui\/old\/x\.md:0 No subfolders inside an Area/),
    ]);
  });

  test("an Area folder or a fragment cannot be named after a Windows device", () => {
    writeArea("con", UI_AREA, { main: UI });
    writeFileSync(reqFile("ui", "nul"), '---\ndescription: "Nul."\n---\n# Nul\n\n## General\nx\n');
    writeFileSync(reqFile("ui", "com-port"), '---\ndescription: "Port."\n---\n# Port\n');
    const messages = loadProject(p).diagnostics.map((d) => `${d.file}:${d.line} ${d.message}`);
    expect(messages).toEqual(expect.arrayContaining([
      expect.stringMatching(/^requirements\/con\/area\.md:0 Area folder "con" is a name Windows reserves for devices/),
      expect.stringMatching(/^requirements\/con\/main\.md:0 Area folder "con" is a name Windows reserves for devices/),
      expect.stringMatching(/^requirements\/ui\/nul\.md:0 Fragment "nul" is a name Windows reserves for devices/),
    ]));
    expect(messages.some((m) => m.startsWith("requirements/ui/com-port.md"))).toBe(false);
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
    handOver(p, prop.id);
    expect(validateProposal(p, getProposal(p, prop.id)).map((d) => d.file)).toEqual(["requirements/ui/main.md"]);
    expect(() => approveProposal(p, prop.id)).toThrow(/order\/Preparing/);

    const ui = editInProposal(p, prop.id, ".trama/requirements/ui/main.md");
    writeFileSync(ui, UI.replace("## order/Preparing\nShow a progress bar.\n", "## order/Ready to ship\nShow the courier's name.\n"));
    expect(validateProposal(p, getProposal(p, prop.id))).toEqual([]);
    handOver(p, prop.id);
    approveProposal(p, prop.id);

    expect(readFileSync(reqFile("ui"), "utf8")).toContain("## order/Ready to ship");
    expect(readFileSync(skillFile("ui-main"), "utf8")).toContain("Show the courier's name.");
    expect(readFileSync(skillFile("ui-main"), "utf8")).not.toContain("progress bar");
  });

  test("approving refreshes the Requirement skills in the configured skills folder too, when it holds trama-design", () => {
    const custom = join(dir, "tools/agent-skills");
    mkdirSync(join(custom, "trama-design"), { recursive: true });
    writeFileSync(join(custom, "trama-design/SKILL.md"), "---\nname: trama-design\n---\n");
    const prop = newProposal(p, "Badge colour");
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/main.md"), UI.replace("Show a green badge.", "Show a blue badge."));
    handOver(p, prop.id);
    approveProposal(p, prop.id, ["tools/agent-skills"]);

    expect(readFileSync(join(custom, "trama-req-ui-main/SKILL.md"), "utf8")).toContain("Show a blue badge.");
    expect(readFileSync(skillFile("ui-main"), "utf8")).toContain("Show a blue badge.");
  });

  test("a Proposal that only edits Requirements shows as an Area change, not as a Machine", () => {
    const prop = newProposal(p, "Badge colour");
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/main.md"), UI.replace("Show a green badge.", "Show a blue badge.").replace("## order/Preparing\nShow a progress bar.\n", "") + "\n## cart\nSticky total.\n");
    handOver(p, prop.id);
    const view = buildSnapshot(p).proposals[0];
    expect(view?.machines).toEqual([]);
    expect(view?.areas.map((a) => [a.id, a.change])).toEqual([["ui", "modified"]]);
    expect(view?.areas[0]?.fragments.map((f) => [f.id, f.change])).toEqual([["main", "modified"]]);
    expect(view?.areas[0]?.fragments[0]?.sections.map((s) => [s.ref, s.change, s.before])).toEqual([
      [null, "same", null],
      ["checkout", "same", null],
      ["order/Paid", "changed", "Show a green badge."],
      ["cart", "added", null],
      ["order/Preparing", "removed", "Show a progress bar."],
    ]);
  });

  test("the Requirements tab view shows fragments by name, General first, new and removed fragments, and a moved section only where it arrives", () => {
    writeArea("ui", UI_AREA, { main: UI, old: "---\ndescription: Old.\n---\n# Old\n\n## cart\nSticky total.\n" });
    writeArea("data", '---\ndescription: "Data."\n---\n# Data\n');
    const [general, paid] = UI.split("## order/Paid\n");
    const prop = newProposal(p, "Split");
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/main.md"), (general as string).replace("## General\nMaterial 3 everywhere.\n\n", ""));
    writeFileSync(
      editInProposal(p, prop.id, "requirements/ui/orders.md"),
      `---\ndescription: Use when showing **orders**.\n---\n# Orders\n\n## order/Paid\n${(paid as string).replace("progress bar", "spinner")}\n## General\nMaterial 3 everywhere.\n`,
    );
    run(["proposal", "delete", prop.id, "requirements/ui/old.md"], dir, {});
    handOver(p, prop.id);
    const snapshot = buildSnapshot(p);
    expect(snapshot.areas.find((a) => a.id === "data")?.fragments).toEqual([]);
    const ui = snapshot.proposals[0]?.areas.find((a) => a.id === "ui");
    expect(ui?.fragments.map((f) => [f.id, f.change, f.description])).toEqual([
      ["main", "modified", "Use when building screens."],
      ["old", "removed", "Old."],
      ["orders", "added", "Use when showing **orders**."],
    ]);
    expect(ui?.fragments.map((f) => f.sections.map((s) => [s.ref, s.change, s.movedFrom, s.before]))).toEqual([
      [["checkout", "same", null, null]],
      [["cart", "removed", null, "Sticky total."]],
      [
        [null, "same", "main", null],
        ["order/Paid", "same", "main", null],
        ["order/Preparing", "changed", "main", "Show a progress bar."],
      ],
    ]);
  });

  test("Requirement paths are area.md or a fragment of an Area folder, never a file at the top, deeper or outside requirements/", () => {
    const prop = newProposal(p, "x");
    expect(editInProposal(p, prop.id, "requirements/ui/extra.md")).toEndWith(join("requirements", "ui", "extra.md"));
    expect(() => editInProposal(p, prop.id, "requirements/ui.md")).toThrow(/Areas are folders/);
    expect(() => editInProposal(p, prop.id, "requirements/ui/old/extra.md")).toThrow(/no subfolders/);
    expect(() => editInProposal(p, prop.id, "requirements/../../x.md")).toThrow(/must be relative/);
  });

  test("a Proposal that recorded a single-file Area before Areas became folders still loads", () => {
    const prop = newProposal(p, "Old");
    const file = join(prop.dir, "proposal.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("status: draft\nbase: {}", 'status: rejected\nbase:\n  requirements/rules.md: "abc"'));
    expect(getProposal(p, prop.id).data.base).toEqual({ "requirements/rules.md": "abc" });
    expect(run(["proposal", "list", "--all"], dir, {}).out).toContain("Old");
  });

  test("a Proposal writes a new Area and fragment, deletes a fragment, shows changes by Area and fragment, and is validated against the whole Area", () => {
    writeArea("ui", UI_AREA, { main: UI, old: "---\ndescription: Old.\n---\n# Old\n\n## cart\nSticky total.\n" });
    const prop = newProposal(p, "Data and screens");
    writeFileSync(editInProposal(p, prop.id, "requirements/data/area.md"), '---\ndescription: "Use when storing data."\n---\n# Data\n');
    writeFileSync(editInProposal(p, prop.id, "requirements/data/money.md"), '---\ndescription: "Use when storing amounts."\n---\n# Money\n\n## order\nCents.\n');
    run(["proposal", "delete", prop.id, "requirements/ui/old.md"], dir, {});
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/badges.md"), "---\ndescription: Badges.\n---\n# Badges\n\n## order/Paid\nA blue badge.\n");
    expect(() => run(["proposal", "delete", prop.id, "requirements/ui.md"], dir, {})).toThrow(/Areas are folders/);

    const show = run(["proposal", "show", prop.id], dir, {}).out;
    expect(show).toContain("- `requirements/data/area.md` (added) · Area `data`, area.md");
    expect(show).toContain("- `requirements/data/money.md` (added) · Area `data`, fragment `money`\n  - + Requirements for order");
    expect(show).toContain("- `requirements/ui/old.md` (removed) · Area `ui`, fragment `old`\n  - - Requirements for cart");
    expect(validateProposal(p, getProposal(p, prop.id)).map((d) => `${d.file} ${d.message}`)).toEqual([
      expect.stringMatching(/^requirements\/ui\/main\.md Section "## order\/Paid" is already in requirements\/ui\/badges\.md/),
    ]);
  });

  test("applying a Proposal writes new fragments and deletes removed ones", () => {
    writeArea("ui", UI_AREA, { main: UI, old: "---\ndescription: Old.\n---\n# Old\n\n## cart\nSticky total.\n" });
    const prop = newProposal(p, "Split the screens");
    const [general, paid] = UI.split("## order/Paid\n");
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/main.md"), `${general}## cart\nSticky total.\n`);
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/orders.md"), `---\ndescription: Use when showing orders.\n---\n# Orders\n\n## order/Paid\n${paid}`);
    deleteInProposal(p, prop.id, "requirements/ui/old.md");
    expect(validateProposal(p, getProposal(p, prop.id))).toEqual([]);
    handOver(p, prop.id);
    approveProposal(p, prop.id);

    expect(existsSync(reqFile("ui", "old"))).toBe(false);
    expect(readFileSync(reqFile("ui", "orders"), "utf8")).toContain("Show a progress bar.");
    const ui = loadProject(p).areas.find((a) => a.id === "ui");
    expect(ui?.fragments.map((f) => f.id)).toEqual(["main", "orders"]);
    expect(ui?.sections.map((s) => s.ref)).toEqual([null, "checkout", "cart", "order/Paid", "order/Preparing"]);
  });

  test("the scan scope of a Requirement change is the Feature of the changed sections, or everything for General", () => {
    const scoped = newProposal(p, "Badge");
    writeFileSync(editInProposal(p, scoped.id, "requirements/ui/main.md"), UI.replace("green", "blue"));
    expect(proposalScope(p, scoped.id)).toEqual(["checkout"]);

    mkdirSync(join(p.dir, "model/billing"), { recursive: true });
    writeFileSync(join(p.dir, "model/billing/feature.md"), "# Billing\n\nInvoices.\n");
    const general = newProposal(p, "Material You");
    writeFileSync(editInProposal(p, general.id, "requirements/ui/main.md"), UI.replace("Material 3 everywhere.", "Material You everywhere."));
    expect(proposalScope(p, general.id)).toEqual(["billing", "checkout"]);
  });
});

describe("Tasks and generated skills", () => {
  test("a Technical Task may reference Requirements only; any other Task needs a Model element", () => {
    expect(newTask(p, { title: "Theme", refs: ["requirements/ui#General"], technical: true }).data.refs).toEqual(["requirements/ui#General"]);
    expect(() => newTask(p, { title: "Badge", refs: ["requirements/ui#order/Paid"], technical: false })).toThrow(/at least one Model element/);
    expect(() => newTask(p, { title: "Badge", refs: ["order/Paid", "requirements/ui#order/Lost"], technical: false })).toThrow(/no section "## order\/Lost"/);
  });

  test("fixing the code for a Drift against Requirements only creates a technical Task; with a Model element, an ordinary one", () => {
    const theme = resolveDrift(p, newDrift(p, { options: FIX_OPTIONS, title: "Uses Material 2", refs: ["requirements/ui#General"], happens: "The code does it one way.", should: "The Model says another." }).id, "fix-code", [], { option: 1 });
    const badge = resolveDrift(p, newDrift(p, { options: FIX_OPTIONS, title: "Red badge", refs: ["order/Paid", "requirements/ui#order/Paid"], happens: "The code does it one way.", should: "The Model says another." }).id, "fix-code", [], { option: 1 });
    const show = (id: string | null) => JSON.parse(run(["--json", "task", "show", id ?? ""], dir, {}).out);
    expect(show(theme.data.task)).toMatchObject({ technical: true, refs: ["requirements/ui#General"], drift: theme.id });
    expect(show(badge.data.task)).toMatchObject({ technical: false, refs: ["order/Paid", "requirements/ui#order/Paid"], drift: badge.id });
  });

  test("a technical fix Task belongs to the design of the Task its Drift came from, and a plain Technical Task to none", () => {
    const design = newProposal(p, "Design");
    expect(newTask(p, { title: "Theme", refs: ["requirements/ui#General"], technical: true, proposal: design.id }).data.proposal).toBeNull();
    const origin = newTask(p, { title: "Badge", refs: ["order/Paid"], technical: false, proposal: design.id });
    const fixed = resolveDrift(p, newDrift(p, { options: FIX_OPTIONS, title: "Uses Material 2", refs: ["requirements/ui#General"], origin: origin.id, happens: "The code does it one way.", should: "The Model says another." }).id, "fix-code", [], { option: 1 });
    expect(JSON.parse(run(["--json", "task", "show", fixed.data.task ?? ""], dir, {}).out)).toMatchObject({ technical: true, proposal: design.id });
  });

  test("a Task filed by hand for a Drift takes the design of the Drift's origin, whoever names the design", () => {
    const design = newProposal(p, "Design");
    const other = newProposal(p, "Other");
    const origin = newTask(p, { title: "Badge", refs: ["order/Paid"], technical: false, proposal: design.id });
    const loose = newTask(p, { title: "Loose", refs: ["order/Paid"], technical: false });
    const fromDesign = newDrift(p, { options: FIX_OPTIONS, title: "Badge differs", refs: ["order/Paid"], origin: origin.id, happens: "The code does it one way.", should: "The Model says another." });
    const fromLoose = newDrift(p, { options: FIX_OPTIONS, title: "Loose differs", refs: ["order/Paid"], origin: loose.id, happens: "The code does it one way.", should: "The Model says another." });
    const fromNone = newDrift(p, { options: FIX_OPTIONS, title: "Scan differs", refs: ["order/Paid"], happens: "The code does it one way.", should: "The Model says another." });
    expect(newTask(p, { title: "Fix A", refs: ["order/Paid"], technical: false, drift: fromDesign.id }).data.proposal).toBe(design.id);
    expect(newTask(p, { title: "Fix A2", refs: ["order/Paid"], technical: false, drift: fromDesign.id, proposal: design.id }).data.proposal).toBe(design.id);
    expect(newTask(p, { title: "Fix B", refs: ["order/Paid"], technical: false, drift: fromLoose.id }).data.proposal).toBeNull();
    expect(newTask(p, { title: "Fix C", refs: ["requirements/ui#General"], technical: true, drift: fromDesign.id }).data.proposal).toBe(design.id);
    expect(() => newTask(p, { title: "Fix D", refs: ["order/Paid"], technical: false, drift: fromDesign.id, proposal: other.id })).toThrow(/belongs to Proposal/);
    expect(() => newTask(p, { title: "Fix E", refs: ["order/Paid"], technical: false, drift: fromLoose.id, proposal: design.id })).toThrow(/belongs to no Proposal/);
    expect(() => newTask(p, { title: "Fix F", refs: ["order/Paid"], technical: false, drift: fromNone.id, proposal: design.id })).toThrow(/belongs to no Proposal/);
    expect(newTask(p, { title: "Fix G", refs: ["order/Paid"], technical: false, drift: fromNone.id }).data.proposal).toBeNull();
  });

  test("task show quotes the Requirements attached to the referenced elements and writes each General section in full", () => {
    const task = newTask(p, { title: "Prepare", refs: ["order/Preparing"], technical: false });
    const out = run(["task", "show", task.id], dir, {});
    expect(out.out).toContain("`requirements/ui#order/Preparing`\n  > Show a progress bar.");
    expect(out.out).toContain("`requirements/ui#order/Paid`\n  > Show a green badge.");
    expect(out.out).toContain("`requirements/ui#General`\n  > Material 3 everywhere.");
    expect(out.out).not.toContain("trama-req-");
  });

  test("task show inlines a Machine, a State's inherited Transitions, an Event's reactions and a whole Area, with no command or skill pointers", () => {
    writeArea("tech", '---\ndescription: "Use when choosing libraries."\n---\n# Technology\n\nPick a library.\n');
    const machine = newTask(p, { title: "The order", refs: ["order"], technical: false });
    const state = newTask(p, { title: "Preparing", refs: ["order/Preparing"], technical: false });
    const event = newTask(p, { title: "Cancel", refs: ["user.CANCEL"], technical: false });
    const area = newTask(p, { title: "Screens", refs: ["requirements/ui"], technical: true });
    const show = (id: string) => run(["task", "show", id], dir, {}).out;

    const order = show(machine.id);
    const machineView = run(["machine", "order"], dir, {}).out;
    const machineFacts = machineView.split("## Requirements")[0] ?? "";
    for (const line of machineFacts.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("-")) expect(order).toContain(trimmed);
    }
    expect(order).toContain("An order placed by a customer, from composition to delivery.");
    expect(order).not.toMatch(/trama (machine|state|event|paths|requirements|validate)/);
    expect(order).not.toContain("trama-req-");
    expect(order).not.toContain("Technology");

    const preparing = show(state.id);
    const stateView = run(["state", "order/Preparing"], dir, {}).out;
    const outgoing = stateView.split("## Incoming Transitions")[0] ?? "";
    for (const line of outgoing.split("\n")) {
      if (line.trimStart().startsWith("- `")) expect(preparing).toContain(line.trim());
    }
    expect(preparing).toContain("_(inherited from Paid)_");
    expect(preparing).not.toContain("trama state");

    const cancel = show(event.id);
    const eventView = run(["event", "user.CANCEL"], dir, {}).out;
    const eventFacts = eventView.split("## Requirements")[0] ?? "";
    for (const line of eventFacts.split("\n")) {
      if (line.trimStart().startsWith("- ")) expect(cancel).toContain(line.trim());
    }
    expect(cancel).toContain("emitted by Actor `user`");
    expect(cancel).toContain("The user asks to cancel an order.");
    expect(cancel).not.toContain("trama event");

    const screens = show(area.id);
    for (const text of ["Material 3 everywhere.", "Checkout screens use the brand colour.", "Show a green badge.", "Show a progress bar."])
      expect(screens).toContain(text);
    expect(screens).toContain("## checkout");
    expect(screens).not.toContain("Load the trama-req-");
    expect(screens).not.toContain("trama-req-");
  });

  test("skills follow the fragments: written for those with content, removed when a fragment or an Area is emptied or deleted", () => {
    writeArea("tech", '---\ndescription: "Use when choosing libraries."\n---\n# Technology\n', { main: '---\ndescription: "Libraries."\n---\n# Libraries\n\n## General\n' });
    expect(syncRequirementSkills(p)).toMatchObject({ mode: "fragment", budget: "trama-req-ui-main".length + "Use when building screens.".length, switchedFrom: null });
    expect(readFileSync(skillFile("ui-main"), "utf8")).toStartWith("---\nname: trama-req-ui-main\ndescription: Use when building screens.\n---\n# Requirements: Interface, Screens\n");
    expect(existsSync(skillFile("tech-main"))).toBe(false);

    rmSync(areaDir("ui"), { recursive: true });
    syncRequirementSkills(p);
    expect(existsSync(join(dir, ".agents/skills/trama-req-ui-main"))).toBe(false);
  });

  test("past the budget every Area gets one index skill with its General section and fragment files, and back under it the fragment skills return", () => {
    expect(syncRequirementSkills(p).mode).toBe("fragment");
    expect(existsSync(skillFile("ui-main"))).toBe(true);
    const [general, paid] = UI.split("## order/Paid\n");
    const long = "x".repeat(2100);
    writeArea("ui", `${UI_AREA}\nFor every screen.\n`, { main: general as string, orders: `---\ndescription: Use when showing orders. ${long}\n---\n# Orders\n\n## order/Paid\n${paid}` });
    writeArea("data", '---\ndescription: "Use when storing data."\n---\n# Data\n', { money: `---\ndescription: "Use when storing amounts. ${long}"\n---\n# Money\n\n## order\nCents.\n` });

    const sync = syncRequirementSkills(p);
    expect(sync).toMatchObject({ mode: "index", switchedFrom: "fragment" });
    expect(sync.budget).toBeGreaterThan(4000);
    expect(readdirSync(join(dir, ".agents/skills")).filter((n) => n.startsWith("trama-req-")).sort()).toEqual(["trama-req-data", "trama-req-ui"]);
    const index = readFileSync(skillFile("ui"), "utf8");
    expect(index).toStartWith("---\nname: trama-req-ui\ndescription: Use when building screens.\n---\n");
    expect(index).toContain("For every screen.");
    expect(index).toContain("## General\n\nMaterial 3 everywhere.");
    expect(index).toContain("- **Screens** (`main.md`): Use when building screens. Sections: `General`, `checkout`.");
    expect(index).toContain("Sections: `order/Paid`, `order/Preparing`.");
    expect(readdirSync(join(dir, ".agents/skills/trama-req-ui")).sort()).toEqual(["SKILL.md", "main.md", "orders.md"]);
    const main = readFileSync(join(dir, ".agents/skills/trama-req-ui/main.md"), "utf8");
    expect(main).toContain("## checkout\n\nCheckout screens use the brand colour.");
    expect(main).not.toContain("Material 3");

    writeArea("data", '---\ndescription: "Use when storing data."\n---\n# Data\n', { money: '---\ndescription: "Use when storing amounts."\n---\n# Money\n\n## order\nCents.\n' });
    writeArea("ui", UI_AREA, { main: general as string, orders: `---\ndescription: Use when showing orders.\n---\n# Orders\n\n## order/Paid\n${paid}` });
    expect(syncRequirementSkills(p)).toMatchObject({ mode: "fragment", switchedFrom: "index" });
    expect(readdirSync(join(dir, ".agents/skills")).filter((n) => n.startsWith("trama-req-")).sort()).toEqual(["trama-req-data-money", "trama-req-ui-main", "trama-req-ui-orders"]);
    const out = run(["skills", "update"], dir, {}).out;
    expect(out).toContain("Requirement skills: one skill per fragment (budget ");
    expect(out).toContain("/4000 characters).");
  });

  test("validate, submit and analyze warn about fragments over 12 KB and about a mode switch, apart from errors and without failing", () => {
    const big = `---\ndescription: Use when showing orders.\n---\n# Orders\n\n## order/Paid\n${"- A rule.\n".repeat(1300)}`;
    writeArea("ui", UI_AREA, { main: UI.replace("## order/Paid\nShow a green badge.\n\n", ""), orders: big });
    const validate = run(["validate"], dir, {});
    expect(validate.exit).toBe(0);
    expect(validate.out).toStartWith("The Model and its Requirements are valid.\n\n1 warning(s), which do not prevent validation or the hand-over:\n");
    expect(validate.out).toContain(`- requirements/ui/orders.md: fragment is ${big.length} bytes, more than 12288 (12 KB)`);
    expect(run(["analyze"], dir, {}).out).toContain(`[large-fragment] requirements/ui/orders.md: fragment is ${big.length} bytes`);

    writeFileSync(join(p.dir, "model/checkout/order.md"), readFileSync(join(p.dir, "model/checkout/order.md"), "utf8").replace("### Paid", "### Settled"));
    const broken = run(["validate"], dir, {});
    expect(broken.exit).toBe(1);
    expect(broken.out.indexOf("error(s):")).toBeLessThan(broken.out.indexOf("warning(s)"));
  });

  test("a Proposal that pushes the skills past the budget is warned about in validate and still handed over", () => {
    const prop = newProposal(p, "Long descriptions");
    writeFileSync(editInProposal(p, prop.id, "requirements/ui/main.md"), UI.replace("description: Use when building screens.", `description: Use when building screens. ${"x".repeat(4000)}`));
    const validate = run(["validate", "--proposal", prop.id], dir, {});
    expect(validate.exit).toBe(0);
    expect(validate.out).toContain("once applied, the Requirement skills switch from one skill per fragment to one index skill per Area");
    const submit = run(["proposal", "submit", prop.id], dir, {});
    expect(submit.exit).toBe(0);
    expect(submit.out).toContain("Submitted Proposal");
    expect(submit.out).toContain("switch from one skill per fragment to one index skill per Area");
  });

  test("Trama names the Requirement skill that exists in the current mode: the fragment's, or the Area's index", () => {
    const [general, paid] = UI.split("## order/Paid\n");
    const orders = (extra: string) => `---\ndescription: Use when showing orders.${extra}\n---\n# Orders\n\n## order/Paid\n${paid}`;
    writeArea("ui", UI_AREA, { main: general as string, orders: orders("") });
    const installed = () => readdirSync(join(dir, ".agents/skills")).filter((n) => n.startsWith("trama-req-"));
    const named = (out: string) => [...out.matchAll(/`(trama-req-[a-z0-9-]+)`/g)].map((m) => m[1] as string);

    syncRequirementSkills(p);
    const paidView = run(["requirements", "order/Preparing"], dir, {}).out;
    expect(paidView).toContain("`requirements/ui#order/Paid` (via order/Paid) (skill `trama-req-ui-orders`)");
    expect(paidView).toContain("`requirements/ui#checkout` (via checkout) (skill `trama-req-ui-main`)");
    expect(run(["requirements", "ui"], dir, {}).out).toContain("Load: skills `trama-req-ui-main`, `trama-req-ui-orders`");
    for (const name of named(run(["requirements"], dir, {}).out)) expect(installed()).toContain(name);

    writeArea("ui", UI_AREA, { main: general as string, orders: orders(` ${"x".repeat(4100)}`) });
    syncRequirementSkills(p);
    expect(installed()).toEqual(["trama-req-ui"]);
    const indexView = run(["requirements", "order/Preparing"], dir, {}).out;
    expect(named(indexView)).toEqual(["trama-req-ui", "trama-req-ui", "trama-req-ui"]);
    expect(run(["requirements", "ui"], dir, {}).out).toContain("Load: skill `trama-req-ui`");
  });

  test("a skills update moves each single-file Area into its folder, keeping the text and the references, and leaves an Area that already has a folder", () => {
    const task = newTask(p, { title: "Badge", refs: ["order/Paid", "requirements/ui#order/Paid"], technical: false });
    rmSync(join(p.dir, "requirements"), { recursive: true });
    mkdirSync(join(p.dir, "requirements"));
    const old = (name: string) => join(p.dir, "requirements", `${name}.md`);
    writeFileSync(old("ui"), UI.replace("# Screens\n", "# Interface\n\nFor every screen.\n"));
    writeFileSync(old("tech"), '---\ndescription: "Use when choosing libraries."\n---\n# Technology\n\n## General\n');
    writeFileSync(old("data"), UI);
    writeArea("data", UI_AREA);

    const out = run(["skills", "update"], dir, {}).out;
    expect(out).toContain("Converted 2 single-file Requirement Area(s)");
    expect(out).toContain("tech, ui");
    expect(out).toContain("Left 1 single-file Requirement Area(s) as they were: data (requirements/data/ already exists)");
    expect(existsSync(old("ui"))).toBe(false);
    expect(existsSync(old("data"))).toBe(true);
    expect(readFileSync(reqFile("ui", "area"), "utf8")).toBe("---\ndescription: Use when building screens.\n---\n# Interface\n\nFor every screen.\n");
    expect(readFileSync(reqFile("ui"), "utf8")).toBe(UI.replace("# Screens\n", "# Interface\n"));
    expect(readdirSync(areaDir("tech"))).toEqual(["area.md"]);
    expect(run(["task", "show", task.id], dir, {}).out).toContain("`requirements/ui#order/Paid`\n  > Interface, order/Paid:\n  > Show a green badge.");
  });

  test("init and a skills update without requirements/ create the five starting Areas as folders with only area.md, valid, and no Requirement skills", () => {
    const fresh = mkdtempSync(join(tmpdir(), "trama-init-"));
    try {
      expect(run(["init"], fresh, {}).exit).toBe(0);
      const project = loadProject(projectAt(fresh));
      expect(project.areas.map((a) => [a.id, a.file, a.fragments.length])).toEqual(
        ["data", "quality", "rules", "tech", "ui"].map((id) => [id, `requirements/${id}/area.md`, 0]),
      );
      expect(project.areas.find((a) => a.id === "ui")).toMatchObject({ title: "Interface", intro: "" });
      expect(readdirSync(join(fresh, ".trama/requirements/ui"))).toEqual(["area.md"]);
      expect(project.diagnostics).toEqual([]);
      expect(existsSync(join(fresh, ".agents/skills/trama-req-ui"))).toBe(false);

      rmSync(join(fresh, ".trama/requirements"), { recursive: true });
      expect(run(["skills", "update"], fresh, {}).exit).toBe(0);
      expect(readdirSync(join(fresh, ".trama/requirements")).sort()).toEqual(["data", "quality", "rules", "tech", "ui"]);
      expect(readdirSync(join(fresh, ".trama/requirements/tech"))).toEqual(["area.md"]);
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});
