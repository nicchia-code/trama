import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { approvalBlock, deleteInProposal, editInProposal, getProposal, health, newProposal, submitProposal, validateProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { newDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-proposal-tasks-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const writeTask = (file: string, title = "Checkout total") => writeFileSync(file, `---\ntechnical: false\nrefs: [order]\n---\n\n# ${title}\n`);

describe("Tasks written inside a Proposal", () => {
  test("a new Task gets a fresh identity, returns an open Proposal to Draft, and leaves no base behind", () => {
    const prop = newProposal(p, "Design");
    submitProposal(p, prop.id);
    expect(getProposal(p, prop.id).data.status).toBe("open");

    const file = editInProposal(p, prop.id, "tasks/checkout-total.md");
    const after = getProposal(p, prop.id);
    expect(after.data.status).toBe("draft");
    expect(after.tasks.map((t) => t.name)).toEqual([basename(file)]);
    expect(basename(file)).toMatch(/^[a-z0-9]{8}-checkout-total\.md$/);
    expect(after.data.base).toEqual({});
    expect(health(p, after).stale).toEqual([]);
  });

  test("the Diagram view of a Proposal lists its Tasks, with the body behind the toggle", () => {
    const prop = newProposal(p, "Design");
    writeTask(editInProposal(p, prop.id, "tasks/checkout-total.md"), "First checkout total");
    submitProposal(p, prop.id);
    const view = buildSnapshot(p).proposals.find((v) => v.id === prop.id);
    expect(view?.tasks.map((t) => ({ title: t.title, technical: t.technical, refs: t.refs }))).toEqual([{ title: "First checkout total", technical: false, refs: ["order"] }]);
    expect(view?.tasks[0]?.body).not.toContain("# First checkout total");
    expect(view?.removals).toEqual([]);
  });

  test("rewriting a Task takes its full printed name and keeps its file", () => {
    const prop = newProposal(p, "Design");
    const file = editInProposal(p, prop.id, "tasks/first.md");
    writeTask(file, "First");
    expect(editInProposal(p, prop.id, `tasks/${basename(file)}`)).toBe(file);
    expect(getProposal(p, prop.id).tasks[0]?.title).toBe("First");
  });

  test("deleting a Task removes its file and returns the Proposal to Draft; a name that is not there is refused", () => {
    const prop = newProposal(p, "Design");
    const file = editInProposal(p, prop.id, "tasks/gone.md");
    writeTask(file);
    submitProposal(p, prop.id);

    deleteInProposal(p, prop.id, `tasks/${basename(file)}`);
    expect(existsSync(file)).toBe(false);
    expect(getProposal(p, prop.id).data.status).toBe("draft");
    expect(() => deleteInProposal(p, prop.id, `tasks/${basename(file)}`)).toThrow(/is not a Task file/);
  });

  test("a Task file with any field besides technical and refs, or without a title, is a validation error", () => {
    const prop = newProposal(p, "Design");
    const file = editInProposal(p, prop.id, "tasks/bad.md");
    writeFileSync(file, "---\ntechnical: false\nrefs: []\ncreated: 2026-01-01T00:00:00Z\n---\n\nNo title here\n");
    const messages = validateProposal(p, getProposal(p, prop.id)).map((d) => d.message);
    expect(messages.some((m) => m.includes('"created"'))).toBe(true);
    expect(messages.some((m) => m.includes("no H1 title"))).toBe(true);
    expect(readFileSync(file, "utf8")).toContain("created:");
  });

  test("a valid Task file validates cleanly", () => {
    const prop = newProposal(p, "Design");
    writeTask(editInProposal(p, prop.id, "tasks/ok.md"));
    expect(validateProposal(p, getProposal(p, prop.id))).toEqual([]);
  });
});

describe("A Proposal's Tasks cover its scope", () => {
  const writeTaskFile = (file: string, front: string, title = "Confirmation text") => writeFileSync(file, `---\n${front}\n---\n\n# ${title}\n`);
  const messages = (id: string) => validateProposal(p, getProposal(p, id)).map((d) => d.message);
  /** Rewords order.CONFIRMED: its scope is that Event (changed) and the Transition of payment that reacts to it (leads into a change). */
  const rewordEvent = (id: string) => {
    const file = editInProposal(p, id, "checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("Emitted when the order leaves Draft.", "Emitted when the customer places the order."));
  };
  const UNCOVERED = [
    "order.CONFIRMED (changed) is not covered by a Task or an Already present row",
    "payment/Idle/order.CONFIRMED (leads into a change) is not covered by a Task or an Already present row",
  ];

  test("every entry of the scope needs a Task naming it or something that contains it, and a Draft with an uncovered entry is not handed over", () => {
    const prop = newProposal(p, "Reword");
    rewordEvent(prop.id);
    expect(messages(prop.id)).toEqual(UNCOVERED);
    expect(() => submitProposal(p, prop.id)).toThrow(/order\.CONFIRMED \(changed\) is not covered/);
    expect(getProposal(p, prop.id).data.status).toBe("draft");

    writeTaskFile(editInProposal(p, prop.id, "tasks/event.md"), "technical: false\nrefs: [order, payment]");
    expect(messages(prop.id)).toEqual([]);
    expect(submitProposal(p, prop.id).data.status).toBe("open");
  });

  test("an Already present row covers an entry the same way, and every row must resolve", () => {
    const row = newProposal(p, "Already there", "## Already present\n- `order` — checkout/order.md\n- `payment` — checkout/payment.md\n");
    rewordEvent(row.id);
    expect(messages(row.id)).toEqual([]);

    const dangling = newProposal(p, "Dangling row", "## Already present\n- `order/Nowhere` — nowhere\n");
    expect(messages(dangling.id).join("\n")).toContain('"Already present" names order/Nowhere, which does not exist with the Proposal applied');
  });

  test("a Task must name existing elements, a non-technical Task needs a Model element and a technical one may not have one", () => {
    const prop = newProposal(p, "Bad refs");
    rewordEvent(prop.id);
    const file = editInProposal(p, prop.id, "tasks/ghost.md");
    writeTaskFile(file, "technical: false\nrefs: [order, payment, order/Nowhere]");
    expect(messages(prop.id).join("\n")).toContain('Task "Confirmation text" names order/Nowhere, which does not exist with the Proposal applied');

    writeTaskFile(file, "technical: false\nrefs: [requirements/ui]");
    expect(messages(prop.id).join("\n")).toContain('Task "Confirmation text" must reference a Model element, unless it is technical');

    writeTaskFile(file, "technical: true\nrefs: [order, payment]");
    expect(messages(prop.id).join("\n")).toContain("Technical Task \"Confirmation text\" cannot reference the Model: order, payment");

    writeTaskFile(file, "technical: true\nrefs: [requirements/ui]");
    expect(messages(prop.id)).toEqual(UNCOVERED);
  });

  test("a Requirement section is covered by a Task naming it or its Area", () => {
    const prop = newProposal(p, "Screens");
    const ui = editInProposal(p, prop.id, "requirements/ui/main.md");
    writeFileSync(ui, readFileSync(ui, "utf8").replace("Every checkout screen shows the cart total at the bottom.", "Every checkout screen shows the cart total at the top."));
    expect(messages(prop.id)).toEqual(["requirements/ui#checkout (changed) is not covered by a Task or an Already present row"]);

    const file = editInProposal(p, prop.id, "tasks/top.md");
    writeTaskFile(file, "technical: false\nrefs: [order, requirements/ui]");
    expect(messages(prop.id)).toEqual([]);
  });

  test("a Proposal attached to an open Drift holds no Tasks: the Task file is refused before it is created", () => {
    const prop = newProposal(p, "Attached design");
    newDrift(p, { where: "src/refund.ts", title: "Attached", refs: ["order"], happens: "The code does it another way.", should: "The Model says otherwise.", options: FIX_OPTIONS, proposal: prop.id });
    expect(() => editInProposal(p, prop.id, "tasks/attached.md")).toThrow("only an ordinary Proposal, not attached to a Drift, can hold Tasks");
    expect(getProposal(p, prop.id).tasks).toEqual([]);
  });

  test("an open Proposal whose Task is removed is blocked from approval", () => {
    const prop = newProposal(p, "Reword and name");
    rewordEvent(prop.id);
    const file = editInProposal(p, prop.id, "tasks/event.md");
    writeTaskFile(file, "technical: false\nrefs: [order, payment]");
    submitProposal(p, prop.id);
    expect(approvalBlock(p, prop.id)).toBeNull();

    rmSync(file);
    expect(approvalBlock(p, prop.id)?.kind).toBe("invalid");
  });
});
