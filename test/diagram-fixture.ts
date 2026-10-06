import { FIX_OPTIONS } from "./fix-options";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildModel } from "../src/core/model";
import { deleteInProposal, editInProposal, newProposal } from "../src/core/proposals";
import { handOver } from "./handover";
import { type Snapshot, buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import type { FileMap } from "../src/core/types";
import { newDrift } from "../src/core/work";

/** `examples/shop` as it is on disk: no Proposals, no Drifts. */
export function shopSnapshot(): Snapshot {
  return buildSnapshot(projectAt("examples/shop"));
}

/**
 * `examples/shop` with: the oldest Proposal (a Returned State, a changed Transition, the RETURN Event and a new `return` Machine),
 * a second Proposal (a Written off State in payment), a Drift on `order/Shipped` and a Drift on `payment` attached to that second Proposal.
 */
export function shopWithProposals(): Snapshot {
  const dir = mkdtempSync(join(tmpdir(), "trama-diagram-"));
  try {
    cpSync("examples/shop", dir, { recursive: true });
    const p = projectAt(dir);

    const returns = newProposal(p, "Returns after shipping", "Customers may send a shipped order back.");
    const order = editInProposal(p, returns.id, "checkout/order.md");
    writeFileSync(
      order,
      readFileSync(order, "utf8")
        .replace("### Shipped (final)", "### Shipped\nThe package is with the customer.\n- `user.RETURN` → Returned: within 30 days; refunds the customer.\n\n### Returned (final)")
        .replace("- `user.CANCEL` → Refunding: once preparation has started.", "- `user.CANCEL` → Refunding: once preparation has started; the courier is told."),
    );
    writeFileSync(editInProposal(p, returns.id, "actors/user.md"), `${readFileSync(join(dir, ".trama/model/actors/user.md"), "utf8")}\n### RETURN\nThe user sends a shipped order back.\n`);
    writeFileSync(
      editInProposal(p, returns.id, "checkout/return.md"),
      "# Return\n\nA package coming back.\n\n## States\n\n### Requested (initial)\n- `user.RETURN` → In transit\n\n### In transit\n- `courier.PICKED_UP` → Received\n\n### Received (final)\n",
    );

    newDrift(p, { options: FIX_OPTIONS, title: "Code refunds after the package is picked up", refs: ["order/Shipped"], happens: "src/refund.ts refunds even when the courier already picked the package up.", should: "A shipped order can no longer be refunded once the courier has picked the package up." });
    const forgotten = newProposal(p, "Orders can be lost in transit", "The code handles a lost package; the Model forgot it.");
    const payment = editInProposal(p, forgotten.id, "checkout/payment.md");
    writeFileSync(payment, readFileSync(payment, "utf8").replace("### Declined (final)", "### Declined (final)\n### Written off (final)"));
    newDrift(p, { options: FIX_OPTIONS, title: "Code has a Written off payment", refs: ["payment"], proposal: forgotten.id, happens: "worker/lost.ts writes the payment off after 30 days.", should: "A payment ends as Declined or Refunded; nothing writes it off." });

    handOver(p, returns.id, forgotten.id);
    return buildSnapshot(p);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** `examples/shop` with one Proposal: no Cart, no Refunding State, and a new `billing` Feature with an `invoice` Machine. */
export function shopWithRemovals(): Snapshot {
  const dir = mkdtempSync(join(tmpdir(), "trama-diagram-"));
  try {
    cpSync("examples/shop", dir, { recursive: true });
    const p = projectAt(dir);
    const proposal = newProposal(p, "Drop carts and refunds");
    const order = editInProposal(p, proposal.id, "checkout/order.md");
    writeFileSync(order, readFileSync(order, "utf8").replace("- `user.CANCEL` → Refunding: once preparation has started.\n", "").replace("### Refunding\n- `payment.REFUNDED` → Cancelled\n\n", ""));
    deleteInProposal(p, proposal.id, "checkout/cart.md");
    writeFileSync(editInProposal(p, proposal.id, "billing/feature.md"), "# Billing\n\nInvoices.\n");
    writeFileSync(editInProposal(p, proposal.id, "billing/invoice.md"), "# Invoice\n\nA bill.\n\n## States\n\n### Open (initial)\n- `order.CONFIRMED` → Sent\n\n### Sent (final)\n");
    handOver(p, proposal.id);
    return buildSnapshot(p);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A Snapshot of an in-memory Model, without Proposals, Drifts or Tasks. */
export function snapshotOf(files: FileMap): Snapshot {
  const model = buildModel(files);
  return {
    system: { name: model.system.name, description: model.system.description },
    actors: [...model.actors.values()],
    features: [...model.features.values()],
    machines: [...model.machines.values()],
    diagnostics: model.diagnostics,
    areas: [],
    proposals: [],
    inWorktree: [],
    worktreeProposals: [],
    drifts: [],
    tasks: [],
    announcements: [],
    multiBranch: false,
    numbers: { proposal: {}, task: {}, drift: {} },
  };
}
