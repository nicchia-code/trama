import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { approveProposal, editInProposal, getProposal, listProposals, newProposal, submitProposal, validateProposal } from "../src/core/proposals";
import { awaitingResolution, resolveDriftBlocker, resolveDriftsBlocker, writePreparedResolution } from "../src/core/resolution";
import { buildSnapshot } from "../src/core/snapshot";
import { type Project, projectAt } from "../src/core/store";
import { getDrift, newDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-prepared-"));
  copyShop(dir);
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const cli = (...args: string[]) => run(args, dir, {}).out;
const drift = (title: string, proposal?: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS, ...(proposal ? { proposal } : {}) });
const free = { resolving: false, running: false };

/** Writes `prepared: true` into a Proposal's front matter, as a hand-written file would have it. */
function markPrepared(id: string) {
  const file = join(getProposal(p, id).dir, "proposal.md");
  writeFileSync(file, readFileSync(file, "utf8").replace("---\n", "---\nprepared: true\n"));
}

/** A Draft Proposal that changes the first line of the `order` Model file, attached to a new Drift. */
function attachedDrift() {
  const attached = newProposal(p, "Attached");
  const path = editInProposal(p, attached.id, "checkout/order.md");
  writeFileSync(path, `${readFileSync(path, "utf8").trimEnd()}\n\nA prepared change.\n`);
  return { attached, drift: drift("Attached drift", attached.id), path };
}

describe("the prepared field", () => {
  test("proposal new writes it for a resolution, and the CLI and snapshot carry it", () => {
    const out = cli("proposal", "new", "--input", JSON.stringify({ title: "Answered", kind: "resolution", prepared: true }));
    const id = listProposals(p)[0]?.id as string;
    expect(out).toContain(id);
    expect(getProposal(p, id).data.prepared).toBe(true);
    expect(readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8")).toContain("prepared: true");
    const shown = JSON.parse(run(["proposal", "show", id, "--json"], dir, {}).out);
    expect(shown.prepared).toBe(true);
    const listed = JSON.parse(run(["proposal", "list", "--json"], dir, {}).out);
    expect(listed.proposals[0].prepared).toBe(true);
    cli("proposal", "edit", id, "--input", JSON.stringify({ drifts: [{ drift: drift("Snap").id, decision: "dismissed" }] }));
    submitProposal(p, id);
    expect(buildSnapshot(p).proposals.find((x) => x.id === id)?.prepared).toBe(true);
  });

  test("an ordinary resolution writes no prepared field", () => {
    const r = newProposal(p, "Plain", "", { kind: "resolution" });
    expect(getProposal(p, r.id).data.prepared).toBe(false);
    expect(readFileSync(join(getProposal(p, r.id).dir, "proposal.md"), "utf8")).not.toContain("prepared");
  });

  test("it survives a rewrite", () => {
    const r = newProposal(p, "Kept", "", { kind: "resolution", prepared: true });
    const a = drift("A");
    cli("proposal", "edit", r.id, "--input", JSON.stringify({ drifts: [{ drift: a.id, decision: "dismissed" }] }));
    expect(getProposal(p, r.id).data.prepared).toBe(true);
  });

  test("without a resolution it is a usage error that creates nothing", () => {
    expect(() => cli("proposal", "new", "--input", JSON.stringify({ title: "No", prepared: true }))).toThrow(/prepared: applies only with kind resolution/);
    expect(() => newProposal(p, "Change", "", { prepared: true })).toThrow(/prepared needs a resolution/);
    expect(listProposals(p)).toHaveLength(0);
  });

  test("validation reports it on a Proposal that is not a resolution", () => {
    const change = newProposal(p, "Change");
    markPrepared(change.id);
    expect(validateProposal(p, getProposal(p, change.id)).map((d) => d.message)).toContain("prepared is only valid for a resolution Proposal");
  });
});

describe("who stops Resolve", () => {
  test("prepared resolutions are ignored, and the oldest other one is named", () => {
    drift("A");
    newProposal(p, "Prepared one", "", { kind: "resolution", prepared: true });
    newProposal(p, "Prepared two", "", { kind: "resolution", prepared: true });
    expect(awaitingResolution(p)).toBeNull();
    expect(resolveDriftsBlocker(p, free)).toBeNull();
    expect(resolveDriftBlocker(p, free, false)).toBeNull();
    const manual = newProposal(p, "Manual", "", { kind: "resolution" });
    expect(awaitingResolution(p)?.id).toBe(manual.id);
    expect(resolveDriftsBlocker(p, free)).toMatch(/^Proposal .* resolving Drifts awaits a decision$/);
  });
});

describe("writePreparedResolution", () => {
  test("a dismissed answer opens a prepared resolution with the one decision", () => {
    const d = drift("Stale refund");
    const out = writePreparedResolution(p, d.id, { decision: "dismissed" });
    expect(out.refusal).toBeNull();
    const r = getProposal(p, out.proposal?.id as string);
    expect(r.title).toBe("Resolve: Stale refund");
    expect(r.data).toMatchObject({ status: "open", kind: "resolution", prepared: true, drifts: [{ drift: d.id, decision: "dismissed" }] });
    expect(r.body).toContain(d.id);
    expect(awaitingResolution(p)).toBeNull();
  });

  test("a fix-code answer keeps the option and the note", () => {
    const d = drift("Wrong total");
    const out = writePreparedResolution(p, d.id, { decision: "fix-code", option: 2, note: " soon " });
    expect(getProposal(p, out.proposal?.id as string).data.drifts).toEqual([{ drift: d.id, decision: "fix-code", option: 2, note: "soon" }]);
  });

  test("a proposal answer copies the attached Proposal's files, and approving applies them", () => {
    const { attached, drift: d, path } = attachedDrift();
    const out = writePreparedResolution(p, d.id, { decision: "proposal" });
    expect(out.refusal).toBeNull();
    const r = getProposal(p, out.proposal?.id as string);
    expect(r.data.status).toBe("open");
    expect(r.data.base["checkout/order.md"]).toBeDefined();
    expect(readFileSync(join(r.dir, "model/checkout/order.md"), "utf8")).toBe(readFileSync(path, "utf8"));
    approveProposal(p, r.id);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("A prepared change.");
    expect(getDrift(p, d.id).data.status).toBe("resolved");
    expect(getProposal(p, attached.id).data.status).toBe("discarded");
  });

  test("an attached Proposal that no longer applies is refused: the Draft is discarded and the refusal returned", () => {
    const { drift: d } = attachedDrift();
    const model = join(dir, ".trama/model/checkout/order.md");
    writeFileSync(model, `${readFileSync(model, "utf8").trimEnd()}\n\nChanged meanwhile.\n`);
    const out = writePreparedResolution(p, d.id, { decision: "proposal" });
    expect(out.proposal).toBeNull();
    expect(out.refusal).toMatch(/no longer applies/);
    const made = listProposals(p).filter((x) => x.data.kind === "resolution");
    expect(made).toHaveLength(1);
    expect(made[0]?.data.status).toBe("discarded");
    expect(getDrift(p, d.id).data.status).toBe("open");
    expect(buildSnapshot(p).proposals.some((x) => x.kind === "resolution")).toBe(false);
  });

  test("a proposal answer for a Drift with no attached Proposal is refused", () => {
    const d = drift("Plain");
    const out = writePreparedResolution(p, d.id, { decision: "proposal" });
    expect(out.refusal).toMatch(/no attached Proposal/);
    expect(listProposals(p)[0]?.data.status).toBe("discarded");
  });

  test("a Drift already in another resolution to decide is refused", () => {
    const d = drift("Held");
    expect(writePreparedResolution(p, d.id, { decision: "dismissed" }).refusal).toBeNull();
    const second = writePreparedResolution(p, d.id, { decision: "dismissed" });
    expect(second.refusal).toMatch(/already in resolution/);
    expect(listProposals(p).filter((x) => x.data.status === "discarded")).toHaveLength(1);
  });

  test("several prepared resolutions wait together, and an unrelated one is not touched", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    expect(writePreparedResolution(p, a.id, { decision: "dismissed" }).refusal).toBeNull();
    expect(writePreparedResolution(p, b.id, { decision: "dismissed" }).refusal).toBeNull();
    expect(listProposals(p).filter((x) => x.data.status === "open")).toHaveLength(2);
    expect(resolveDriftsBlocker(p, free)).toBeNull();
    expect(existsSync(dir)).toBe(true);
  });
});
