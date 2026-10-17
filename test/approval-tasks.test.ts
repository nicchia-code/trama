import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { coverWithTask } from "./cover";
import { approveProposal, editInProposal, getProposal, newProposal, submitProposal } from "../src/core/proposals";
import { listTasks } from "../src/core/work";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-approval-tasks-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("Tasks created when an ordinary Proposal is approved", () => {
  test("its Task files become Tasks in To do, sharing the approval instant and its identity", () => {
    const prop = newProposal(p, "Checkout total", "", { label: "Checkout" });
    const file = editInProposal(p, prop.id, "tasks/checkout-total.md");
    writeFileSync(file, "---\ntechnical: false\nrefs: [order]\n---\n\n# Checkout total\n\nSum the cart.\n");
    const taskId = basename(file).slice(0, 8);
    submitProposal(p, prop.id);

    approveProposal(p, prop.id);

    const created = listTasks(p).filter((t) => t.data.proposal === prop.id);
    expect(created.map((t) => t.id)).toEqual([taskId]);
    expect(created[0]?.data).toMatchObject({ column: "todo", technical: false, refs: ["order"], drift: null, proposal: prop.id, agent: false });
    expect(typeof created[0]?.data.created).toBe("string");
    expect(created[0]?.body).toContain("Sum the cart.");
  });

  test("a Task whose identity the project already has refuses the approval before any file changes", () => {
    const prop = newProposal(p, "Clash", "", { label: "Clash" });
    const file = editInProposal(p, prop.id, "tasks/clash.md");
    writeFileSync(file, "---\ntechnical: false\nrefs: [order]\n---\n\n# Clash\n");
    const taken = basename(file).slice(0, 8);
    mkdirSync(join(p.dir, "tasks"), { recursive: true });
    writeFileSync(join(p.dir, "tasks", `${taken}-already.md`), "---\ncolumn: todo\nrefs: [order]\n---\n\n# Already\n");
    submitProposal(p, prop.id);
    const before = readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8");

    expect(() => approveProposal(p, prop.id)).toThrow(/already a Task of the project/);
    expect(getProposal(p, prop.id).data.status).toBe("open");
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toBe(before);
  });

  test("removing a State creates a Remove code Task for it, pointing at its Machine", () => {
    const prop = newProposal(p, "Drop shipped", "", { label: "Drop shipped" });
    const file = editInProposal(p, prop.id, "checkout/order.md");
    const text = readFileSync(file, "utf8").replace("- `courier.PICKED_UP` → Shipped\n", "").replace("### Shipped (final)\n\n", "");
    writeFileSync(file, text);
    coverWithTask(p, prop.id, "order");
    submitProposal(p, prop.id);

    approveProposal(p, prop.id);

    const removal = listTasks(p).find((t) => t.title === "Remove code of order/Shipped");
    expect(removal?.data).toMatchObject({ technical: false, refs: ["order"], column: "todo", proposal: prop.id });
    expect(existsSync(join(dir, ".trama/model/checkout/order.md"))).toBe(true);
  });

  test("an ordinary Proposal's approval applies it and starts no scan", () => {
    const prop = newProposal(p, "Scan-free", "", { label: "Scan-free" });
    const file = editInProposal(p, prop.id, "checkout/order.md");
    writeFileSync(file, `${readFileSync(file, "utf8")}\n`);
    coverWithTask(p, prop.id, "order");
    submitProposal(p, prop.id);

    approveProposal(p, prop.id);
    expect(getProposal(p, prop.id).data.status).toBe("approved");
  });
});
