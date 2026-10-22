import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newProposal, rejectProposal, submitProposal } from "../src/core/proposals";
import { awaitingResolution, resolveDriftInProposal, reworkProposalBlocker, reworkProposalDrifts } from "../src/core/resolution";
import { type Project, projectAt } from "../src/core/store";
import { newDrift, resolveDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-rework-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const drift = (title: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS });
const openResolution = (...ids: string[]) => {
  const r = newProposal(p, "Resolve", "", { kind: "resolution" });
  for (const id of ids) resolveDriftInProposal(p, r.id, id, { decision: "dismissed" });
  return submitProposal(p, r.id);
};
const idle = { resolving: false, running: false };

test("Rework on an open resolution is refused while work goes on or another resolution waits, and only for an open resolution", () => {
  const [a, b] = [drift("A"), drift("B")] as const;
  const r = openResolution(a.id);
  expect(reworkProposalBlocker(p, idle, r.id)).toBeNull();
  expect(reworkProposalBlocker(p, { resolving: true, running: false }, r.id)).toContain("Drifts are being resolved");
  expect(reworkProposalBlocker(p, { resolving: false, running: true }, r.id)).toContain("A run is in progress");
  const other = openResolution(b.id);
  expect(reworkProposalBlocker(p, idle, r.id)).toContain("awaits a decision");
  rejectProposal(p, other.id);
  expect(reworkProposalBlocker(p, idle, other.id)).toContain("not an open resolution");
  expect(awaitingResolution(p, r.id)).toBeNull();
});

test("a prepared resolution never stops Rework on another", () => {
  const [a, b] = [drift("A"), drift("B")] as const;
  const r = openResolution(a.id);
  const prepared = newProposal(p, "Prepared", "", { kind: "resolution", prepared: true });
  resolveDriftInProposal(p, prepared.id, b.id, { decision: "dismissed" });
  submitProposal(p, prepared.id);
  expect(reworkProposalBlocker(p, idle, r.id)).toBeNull();
});

test("after the rejection, the Drifts collected are the still open ones in no other resolution", () => {
  const [a, b, c] = [drift("A"), drift("B"), drift("C")] as const;
  const r = openResolution(a.id, b.id, c.id);
  rejectProposal(p, r.id, "Try again");
  resolveDrift(p, b.id, "dismiss");
  expect(reworkProposalDrifts(p, r.id)).toEqual([a.id, c.id]);
});
