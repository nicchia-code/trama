import { cardName } from "../src/core/short-numbers";
 import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approvalBlock, approveProposal, deleteInProposal, driftListProblems, getProposal, newProposal, rejectProposal, save, submitProposal, unfixableDrifts } from "../src/core/proposals";
import { awaitingResolution, resolveDriftBlocker, resolveDriftInProposal, resolveDriftsBlocker, runWindowBlocker } from "../src/core/resolution";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, getTask, moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-resolution-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const drift = (title: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS });
const resolution = () => newProposal(p, "Resolve", "", { kind: "resolution" });

describe("resolution Proposals", () => {
  test("keep the ordered decisions in the file, one per Drift, and after approval", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "fix-code", option: 2, note: " keep it " });
    resolveDriftInProposal(p, r.id, b.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, a.id, { decision: "proposal" });
    expect(getProposal(p, r.id).data.drifts).toEqual([{ drift: a.id, decision: "proposal" }, { drift: b.id, decision: "dismissed" }]);
    resolveDriftInProposal(p, r.id, a.id, { decision: "fix-code", option: 1, note: "  " });
    expect(getProposal(p, r.id).data.drifts[0]).toEqual({ drift: a.id, decision: "fix-code", option: 1 });
    resolveDriftInProposal(p, r.id, a.id, { remove: true });
    expect(getProposal(p, r.id).data.drifts.map((d) => d.drift)).toEqual([b.id]);
  });

  test("an open one goes back to Draft on every registration", () => {
    const a = drift("A");
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    submitProposal(p, r.id);
    expect(resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" }).returnedToDraft).toBe(true);
    expect(getProposal(p, r.id).data.status).toBe("draft");
  });

  test("refuses, changing nothing, what the rules forbid", () => {
    const a = drift("A");
    const r = resolution();
    const refused = (id: string, drift: string, input: Parameters<typeof resolveDriftInProposal>[3], why: RegExp) => {
      expect(() => resolveDriftInProposal(p, id, drift, input)).toThrow(why);
      expect(getProposal(p, id).data.drifts).toEqual([]);
    };
    refused(newProposal(p, "Change").id, a.id, { decision: "dismissed" }, /not a resolution/);
    refused(r.id, a.id, { decision: "fix-code" }, /option must be chosen/);
    refused(r.id, a.id, { decision: "fix-code", option: 3 }, /option must be chosen/);
    refused(r.id, a.id, { decision: "dismissed", option: 1 }, /only goes with fix-code/);
    refused(r.id, a.id, { decision: "proposal", note: "x" }, /only goes with fix-code/);
    refused(r.id, a.id, { decision: "dismissed", note: "" }, /only goes with fix-code/);
    refused(r.id, a.id, { decision: "proposal", note: "   " }, /only goes with fix-code/);
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    const other = resolution();
    refused(other.id, a.id, { decision: "dismissed" }, /already in resolution/);
  });

  test("refuses a resolved Drift", () => {
    const a = drift("A");
    resolveDrift(p, a.id, "dismiss");
    const r = resolution();
    expect(() => resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" })).toThrow(/already resolved/);
  });

  test("hand-over names every Drift in default and stays Draft; ordinary Proposals are not checked", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const r = resolution();
    expect(() => submitProposal(p, r.id)).toThrow(/list is empty/);
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, b.id, { decision: "dismissed" });
    const other = resolution();
    other.data.drifts = [{ drift: b.id, decision: "dismissed" }];
    save(other);
    resolveDrift(p, a.id, "dismiss");
    expect(() => submitProposal(p, r.id)).toThrow(/no longer open[\s\S]*also in resolution/);
    expect(getProposal(p, r.id).data.status).toBe("draft");
    expect(driftListProblems(p, getProposal(p, r.id))).toHaveLength(2);
    expect(driftListProblems(p, newProposal(p, "Change"))).toEqual([]);
    expect(submitProposal(p, newProposal(p, "Change two").id).data.status).toBe("open");
  });
});

describe("approving a resolution", () => {
  test("resolves the listed open Drifts with their decisions, sets aside attached Proposals and skips Drifts resolved meanwhile", () => {
    const origin = newTask(p, { title: "Origin", refs: ["order"], technical: false });
    moveTask(p, origin.id, "doing", "agent");
    const a = newDrift(p, { where: "src/refund.ts", title: "A", refs: ["order"], happens: "x", should: "y", options: FIX_OPTIONS, origin: origin.id });
    const attached = newProposal(p, "Attached");
    const b = newDrift(p, { where: "src/refund.ts", title: "B", refs: ["order"], happens: "x", should: "y", options: FIX_OPTIONS, proposal: attached.id });
    const c = drift("C");
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "fix-code", option: 2, note: "keep log" });
    resolveDriftInProposal(p, r.id, b.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, c.id, { decision: "proposal" });
    submitProposal(p, r.id);
    resolveDrift(p, c.id, "dismiss");

    const { resolved } = approveProposal(p, r.id);
    const task = getDrift(p, a.id).data.task as string;
    expect(resolved).toEqual([
      { drift: a.id, decision: "fix-code", task, skipped: false },
      { drift: b.id, decision: "dismissed", task: null, skipped: false },
      { drift: c.id, decision: "proposal", task: null, skipped: true },
    ]);
    expect(getDrift(p, a.id).data).toMatchObject({ status: "resolved", resolution: "fix-code", option: 2, note: "keep log", resolvedBy: r.id });
    expect(getTask(p, origin.id).data.column).toBe("todo");
    expect(getDrift(p, b.id).data).toMatchObject({ status: "resolved", resolution: "dismissed", proposal: null, resolvedBy: r.id });
    expect(getProposal(p, attached.id).data.status).toBe("discarded");
    expect(getDrift(p, c.id).data).toMatchObject({ resolution: "dismissed", resolvedBy: null });
  });

  test("a fix-code decision on a Drift whose reference vanished still creates the Task, on the nearest container left", () => {
    const a = drift("A");
    writeFileSync(getDrift(p, a.id).path, readFileSync(getDrift(p, a.id).path, "utf8").replace("- order", "- order/Gone/user.CANCEL\n  - requirements/ui#Gone"));
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "fix-code", option: 1 });
    submitProposal(p, r.id);

    approveProposal(p, r.id);
    expect(getProposal(p, r.id).data.status).toBe("approved");
    expect(getDrift(p, a.id).data).toMatchObject({ status: "resolved", resolution: "fix-code" });
    expect(getTask(p, getDrift(p, a.id).data.task as string).data.refs).toEqual(["order", "requirements/ui"]);
  });

  test("fix-code is refused, in the command, the list and the delivery, when no Model element of the Drift is left", () => {
    const a = drift("A");
    writeFileSync(getDrift(p, a.id).path, readFileSync(getDrift(p, a.id).path, "utf8").replace("- order", "- gone/Paid\n  - requirements/ui#General"));
    const r = resolution();
    expect(() => resolveDriftInProposal(p, r.id, a.id, { decision: "fix-code", option: 1 })).toThrow(/no longer exist/);
    expect(() => resolveDrift(p, a.id, "fix-code", [], { option: 1 })).toThrow(/no longer exist.*drift move <id> dismissed/);
    expect(getDrift(p, a.id).data.status).toBe("open");

    // A decision recorded while the Machine was there is refused at delivery once it is gone.
    const b = drift("B");
    const r2 = newProposal(p, "Resolve again", "", { kind: "resolution" });
    resolveDriftInProposal(p, r2.id, b.id, { decision: "fix-code", option: 1 });
    writeFileSync(getDrift(p, b.id).path, readFileSync(getDrift(p, b.id).path, "utf8").replace("- order", "- gone"));
    expect(driftListProblems(p, getProposal(p, r2.id)).join("\n")).toMatch(/no longer exist/);
    expect(() => submitProposal(p, r2.id)).toThrow(/no longer exist/);
  });

  test("approval is refused whole, leaving the resolution Open and every Drift open, when a fix-code Drift lost its Model elements after the hand-over", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, b.id, { decision: "fix-code", option: 1 });
    submitProposal(p, r.id);
    expect(approvalBlock(p, r.id)).toBeNull();
    writeFileSync(getDrift(p, b.id).path, readFileSync(getDrift(p, b.id).path, "utf8").replace("- order", "- gone"));

    expect(approvalBlock(p, r.id)?.kind).toBe("unfixable");
    expect(buildSnapshot(p).proposals.find((x) => x.id === r.id)?.unfixable.join()).toMatch(/no longer exist/);
    expect(buildSnapshot(p).proposals.find((x) => x.id === r.id)?.errors).toEqual([]);
    expect(() => approveProposal(p, r.id)).toThrow(/no longer exist/);
    expect(getProposal(p, r.id).data.status).toBe("open");
    expect([getDrift(p, a.id).data.status, getDrift(p, b.id).data.status]).toEqual(["open", "open"]);
  });

  test("the checks of a hand-over name the Drift whose code cannot be fixed, as approval does", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, b.id, { decision: "fix-code", option: 1 });
    submitProposal(p, r.id);
    writeFileSync(getDrift(p, b.id).path, readFileSync(getDrift(p, b.id).path, "utf8").replace("- order", "- gone"));

    const unfixable = unfixableDrifts(p, getProposal(p, r.id));
    expect(unfixable.join("\n")).toContain(cardName(p, "drift", b.id));
    expect(unfixable.join("\n")).toMatch(/no longer exist/);
  });

  test("a resolution whose own files remove the Machine of a fix-code Drift is refused at hand-over and at approval, changing nothing", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, b.id, { decision: "fix-code", option: 1 });
    deleteInProposal(p, r.id, "checkout/order.md");

    expect(driftListProblems(p, getProposal(p, r.id)).join("\n")).toMatch(/no longer exist/);
    expect(() => submitProposal(p, r.id)).toThrow(/no longer exist/);
    expect(getProposal(p, r.id).data.status).toBe("draft");
    expect([getDrift(p, a.id).data.status, getDrift(p, b.id).data.status]).toEqual(["open", "open"]);
  });

  test("an open attached Proposal is rejected with the Drift in its feedback; rejecting the resolution leaves Drifts open", () => {
    const attached = submitProposal(p, newProposal(p, "Attached").id);
    const a = newDrift(p, { where: "src/refund.ts", title: "A", refs: ["order"], happens: "x", should: "y", options: FIX_OPTIONS, proposal: attached.id });
    const r = resolution();
    resolveDriftInProposal(p, r.id, a.id, { decision: "proposal" });
    submitProposal(p, r.id);
    rejectProposal(p, r.id);
    expect(getDrift(p, a.id).data).toMatchObject({ status: "open", proposal: attached.id });

    const again = resolution();
    resolveDriftInProposal(p, again.id, a.id, { decision: "proposal" });
    submitProposal(p, again.id);
    approveProposal(p, again.id);
    expect(getDrift(p, a.id).data).toMatchObject({ status: "resolved", resolution: "proposal", resolvedBy: again.id });
    expect(getProposal(p, attached.id).data.status).toBe("rejected");
    expect(getProposal(p, attached.id).body).toContain(`Drift ${a.id} resolved by Proposal ${again.id}`);
  });
});

describe("resolveDriftsBlocker", () => {
  test("gives every reason that holds, in order, and nothing when Resolve Drifts can start", () => {
    const free = { resolving: false, running: false };
    const busy = { resolving: true, running: true };
    expect(resolveDriftsBlocker(p, free)).toBe("No open Drifts");
    const a = drift("A");
    expect(resolveDriftsBlocker(p, free)).toBeNull();
    expect(resolveDriftsBlocker(p, { resolving: false, running: true })).toBe("A run is in progress");
    expect(resolveDriftsBlocker(p, { resolving: true, running: false })).toBe("Drifts are being resolved");
    expect(resolveDriftsBlocker(p, busy)).toBe("Drifts are being resolved. A run is in progress");
    const r = resolution(); // a Draft already waits, even before it lists anything
    expect(resolveDriftsBlocker(p, free)).toMatch(/^Proposal .* resolving Drifts awaits a decision$/);
    expect(resolveDriftsBlocker(p, busy)).toMatch(/^Drifts are being resolved\. A run is in progress\. Proposal .* resolving Drifts awaits a decision$/);
    resolveDriftInProposal(p, r.id, a.id, { decision: "dismissed" });
    submitProposal(p, r.id);
    expect(resolveDriftsBlocker(p, free)).toMatch(/awaits a decision/);
    expect(awaitingResolution(p)?.id).toBe(r.id);
  });
});

describe("resolveDriftBlocker", () => {
  test("gives the reasons that hold for one Drift, without «No open Drifts», and names the agent working on it", () => {
    const free = { resolving: false, running: false };
    const a = drift("A");
    expect(resolveDriftBlocker(p, free, false)).toBeNull();
    expect(resolveDriftBlocker(p, { resolving: true, running: false }, false)).toBe("Drifts are being resolved");
    expect(resolveDriftBlocker(p, { resolving: true, running: false }, true)).toBe("An agent is resolving this Drift");
    expect(resolveDriftBlocker(p, { resolving: false, running: true }, false)).toBe("A run is in progress");
    expect(resolveDriftBlocker(p, { resolving: true, running: true }, true)).toBe("An agent is resolving this Drift. A run is in progress");
    resolution();
    expect(resolveDriftBlocker(p, free, false)).toMatch(/^Proposal .* resolving Drifts awaits a decision$/);
    expect(a.id).toBeTruthy();
  });
});

describe("runWindowBlocker", () => {
  test("disables Runs while Drifts are being resolved, and during a run unless submitting while running is enabled", () => {
    const free = { resolving: false, running: false };
    expect(runWindowBlocker(free, false)).toBeNull();
    expect(runWindowBlocker({ resolving: false, running: true }, false)).toBe("A run is in progress");
    expect(runWindowBlocker({ resolving: false, running: true }, true)).toBeNull();
    expect(runWindowBlocker({ resolving: true, running: false }, false)).toBe("Drifts are being resolved");
    expect(runWindowBlocker({ resolving: true, running: false }, true)).toBe("Drifts are being resolved");
  });
  test("gives every reason that holds, the resolution first, when a resolution and a run are both going", () => {
    expect(runWindowBlocker({ resolving: true, running: true }, false)).toBe("Drifts are being resolved. A run is in progress");
    expect(runWindowBlocker({ resolving: true, running: true }, true)).toBe("Drifts are being resolved");
  });
});

describe("the Board's picture of a resolution", () => {
  test("lists its Drifts in creation order with the decision, follows changes of decision and of the Drifts, and is empty for other Proposals", () => {
    const [a, b, c] = [drift("A"), drift("B"), drift("C")] as const;
    const r = resolution();
    resolveDriftInProposal(p, r.id, c.id, { decision: "dismissed" });
    resolveDriftInProposal(p, r.id, a.id, { decision: "fix-code", option: 2, note: "soon" });
    resolveDriftInProposal(p, r.id, b.id, { decision: "proposal" });
    submitProposal(p, r.id);
    const plain = newProposal(p, "Change");
    submitProposal(p, plain.id);
    const view = () => buildSnapshot(p).proposals;
    const mine = () => view().find((x) => x.id === r.id)?.resolves;
    expect(mine()).toEqual([
      { drift: a.id, title: "A", critical: false, previous: null, decision: "Code fixed with option Remove the code", note: "soon", notBlocking: [] },
      { drift: b.id, title: "B", critical: false, previous: null, decision: "Model updated to match the code", note: null, notBlocking: [] },
      { drift: c.id, title: "C", critical: false, previous: null, decision: "Closed, nothing changes", note: null, notBlocking: [] },
    ]);
    expect(view().find((x) => x.id === plain.id)?.resolves).toEqual([]);
    resolveDriftInProposal(p, r.id, b.id, { decision: "dismissed" });
    submitProposal(p, r.id);
    resolveDrift(p, c.id, "dismiss");
    expect(mine()?.map((x) => x.decision)).toEqual(["Code fixed with option Remove the code", "Closed, nothing changes", "(already resolved)"]);
  });
});
