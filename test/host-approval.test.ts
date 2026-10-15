import { FIX_OPTIONS } from "./fix-options";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main";
import { approveProposal, editInProposal, getProposal, newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { coverWithTask } from "./cover";
import { type Project, projectAt } from "../src/core/store";
import { newDrift, resolveDrift } from "../src/core/work";
import { cardName } from "../src/core/short-numbers";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-approval-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function proposalEditing(path: string, transform: (text: string) => string, ordinary = true): string {
  const prop = newProposal(p, "Change");
  const file = editInProposal(p, prop.id, path);
  writeFileSync(file, transform(readFileSync(file, "utf8")));
  if (ordinary) coverWithTask(p, prop.id, "checkout", "user");
  handOver(p, prop.id);
  return prop.id;
}

const orderChange = (t: string) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)");

describe("approving a Proposal applies it and starts no scan", () => {
  test("the Approve button applies an ordinary Proposal", () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    approveProposal(p, id);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("accepting a Drift's attached Proposal applies it and resolves the Drift", () => {
    const id = proposalEditing("checkout/order.md", orderChange, false);
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Code has Lost", refs: ["order"], proposal: id, happens: "The code does it one way.", should: "The Model says another." });
    resolveDrift(p, drift.id, "accept-proposal");
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("a Proposal that affects no Feature is applied too", () => {
    const id = proposalEditing("system.md", (t) => `${t}\nMore.\n`);
    approveProposal(p, id);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("a failed approval changes nothing and propagates the error", () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    writeFileSync(join(dir, ".trama/model/checkout/order.md"), `${readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")}\n`);
    expect(() => approveProposal(p, id)).toThrow(/stale/);
    expect(getProposal(p, id).data.status).toBe("open");
  });

  test("accepting a Drift without an attached Proposal is refused before anything happens", () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Plain", refs: ["order"], happens: "The code does it one way.", should: "The Model says another." });
    expect(() => resolveDrift(p, drift.id, "accept-proposal")).toThrow(/no attached Proposal/);
    expect(getProposal(p, id).data.status).toBe("open");
  });

  test("an old Hold scan switch is left as it was by an approval", () => {
    const state = join(dir, ".trama/scan-hold/state");
    mkdirSync(join(dir, ".trama/scan-hold"), { recursive: true });
    writeFileSync(state, "on\n");
    const id = proposalEditing("checkout/order.md", orderChange);
    approveProposal(p, id);
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(readFileSync(state, "utf8")).toBe("on\n");
  });
});

describe("an approval from the command line applies it and starts no scan", () => {
  const cli = (...args: string[]) => run(["--root", dir, ...args], dir, {});

  test("trama proposal approve applies the Proposal", () => {
    const id = proposalEditing("checkout/order.md", orderChange);
    expect(cli("proposal", "approve", id).out).toBe(`Approved Proposal ${cardName(p, "proposal", id)}`);
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("trama drift resolve --accept-proposal applies the attached Proposal", () => {
    const id = proposalEditing("checkout/order.md", orderChange, false);
    const drift = newDrift(p, { where: "src/refund.ts", options: FIX_OPTIONS, title: "Code has Lost", refs: ["order"], proposal: id, happens: "The code does it one way.", should: "The Model says another." });
    cli("drift", "resolve", drift.id, "--accept-proposal");
    expect(getProposal(p, id).data.status).toBe("approved");
  });

  test("a leftover multi-branch switch is ignored: the Proposal is applied here and the folder is left as it was", () => {
    const leftover = join(p.dir, "multi-branch");
    mkdirSync(leftover, { recursive: true });
    writeFileSync(join(leftover, "state"), "on\n");
    const id = proposalEditing("checkout/order.md", orderChange);
    expect(cli("proposal", "approve", id).out).toBe(`Approved Proposal ${cardName(p, "proposal", id)}`);
    expect(getProposal(p, id).data.status).toBe("approved");
    expect(getProposal(p, id).data.scanScope).toBeNull();
    expect(readFileSync(join(leftover, "state"), "utf8")).toBe("on\n");
    expect(() => cli("proposal", "withdraw", id)).toThrow();
  });
});
