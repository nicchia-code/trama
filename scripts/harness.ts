// Builds extension/dist/harness.html: the webview running in a plain browser against a demo snapshot,
// with a mocked acquireVsCodeApi. Open it with Chrome to look at the UI without VS Code.
// Every message the webview posts is appended to window.__posts.
import { FIX_OPTIONS } from "../test/fix-options";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withdrawAll } from "../src/core/announcements";
import { editInProposal, newProposal, submitProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import { moveTask, newDrift, newTask, resolveDrift } from "../src/core/work";

// TRAMA_DEMO_DIR=<dir>: also write the demo `.trama/` into <dir>, to open in VS Code. Rerunning resets it to
// the seeded state and leaves everything else in <dir> (.vscode, .agents, …) alone.
const keep = process.env["TRAMA_DEMO_DIR"];
const dir = mkdtempSync(join(tmpdir(), "trama-harness-"));
cpSync("examples/shop", dir, { recursive: true });
const p = projectAt(dir);

/**
 * Makes `to` match `from` without deleting directories that still exist in `from`, and without rewriting files that
 * already match. Deleting and recreating `.trama/` makes VS Code's file watcher lose the new subfolders, so an
 * open Trama panel would silently stop seeing changes.
 */
function syncInPlace(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  const wanted = new Set(readdirSync(from));
  for (const name of readdirSync(to)) if (!wanted.has(name)) rmSync(join(to, name), { recursive: true, force: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      if (existsSync(target) && !statSync(target).isDirectory()) rmSync(target, { force: true });
      syncInPlace(source, target);
    } else {
      const content = readFileSync(source);
      if (!existsSync(target) || !readFileSync(target).equals(content)) writeFileSync(target, content);
    }
  }
}

// An open Proposal: a Returned State and a new Machine.
const proposal = newProposal(p, "Returns after shipping", "Customers may send a shipped order back.");
const order = editInProposal(p, proposal.id, "checkout/order.md");
writeFileSync(
  order,
  readFileSync(order, "utf8")
    .replace("### Shipped (final)", "### Shipped\nThe package is with the customer.\n- `user.RETURN` → Returned: within 30 days; refunds the customer.\n\n### Returned (final)")
    .replace("- `user.CANCEL` → Refunding: once preparation has started.", "- `user.CANCEL` → Refunding: once preparation has started; the courier is told."),
);
writeFileSync(
  editInProposal(p, proposal.id, "actors/user.md"),
  `${readFileSync(join(dir, ".trama/model/actors/user.md"), "utf8")}\n### RETURN\nThe user sends a shipped order back.\n`,
);
writeFileSync(
  editInProposal(p, proposal.id, "checkout/return.md"),
  "# Return\n\nA package coming back.\n\n## States\n\n### Requested (initial)\n- `user.RETURN` → In transit\n\n### In transit\n- `courier.PICKED_UP` → Received\n\n### Received (final)\n",
);
submitProposal(p, proposal.id);

// Drifts: one plain, one with its own Proposal.
newDrift(p, { options: [{ title: "Refuse the refund", text: "Check the **courier status** before refunding.\n\n- Customers lose the refund after pickup." }, { title: "Refund only after the return", text: "Hold the money until the parcel is **back**; slower for customers." }], title: "Code refunds after the package is picked up", refs: ["order/Shipped"], happens: "A **shipped** order is still refunded after the courier has picked the package up.\n\n- The customer gets the money back *and* keeps the parcel.\n- Finance sees a refund with no return.", should: "A shipped order can **no longer be refunded** once the courier has picked the package up. See [the refund policy](https://example.com/policy).", where: "- `src/refund.ts`, the refund step\n- `src/courier.ts`" });
const forgotten = newProposal(p, "Orders can be lost in transit", "The code handles a lost package; the Model forgot it.");
const lost = editInProposal(p, forgotten.id, "checkout/payment.md");
writeFileSync(lost, readFileSync(lost, "utf8").replace("### Declined (final)", "### Declined (final)\n### Written off (final)"));
submitProposal(p, forgotten.id);
newDrift(p, { options: FIX_OPTIONS, title: "Code has a Written off payment", refs: ["payment"], proposal: forgotten.id, happens: "worker/lost.ts writes the payment off after 30 days.", should: "A payment ends as Declined or Refunded; nothing writes it off." });

// Tasks in every column.
newTask(p, { title: "Implement refunds for prepared orders", refs: ["order/Refunding", "order/Paid/user.CANCEL"], technical: false, body: "When a paid order is cancelled after preparation has started:\n\n- the customer is **refunded**\n- the courier is told\n\nSee `order/Refunding`." });
newTask(p, { title: "Payment declined email", refs: ["order/Awaiting payment/payment.DECLINED"], technical: false });
const doing = newTask(p, { title: "Cart confirmation", refs: ["cart/Has items/user.CHECKOUT"], technical: false });
const done = newTask(p, { title: "Upgrade dependencies", refs: [], technical: true });
moveTask(p, doing.id, "doing", "developer");
moveTask(p, done.id, "done", "developer");
// Taken by the agent: alone, and as one Task of a design.
moveTask(p, newTask(p, { title: "Refund after pickup", refs: ["order/Refunding"], technical: false }).id, "doing", "agent");
const returns = newProposal(p, "Returns after shipping");
submitProposal(p, returns.id);
const returnTask = (title: string) => newTask(p, { title, refs: ["order/Cancelled"], technical: false, proposal: returns.id }).id;
returnTask("Return request");
moveTask(p, returnTask("Refund on return"), "doing", "agent");

// An open Drift blocks the Tasks that concern the same thing, alone or inside the design (filed after the agent took them, which a blocked Task would refuse); a Drift fixed in the code makes its origin wait.
newDrift(p, { options: FIX_OPTIONS, title: "Code never closes a return", refs: ["order/Cancelled"], happens: "src/return.ts leaves a returned order open.", should: "A returned order ends as Cancelled." });
const origin = newTask(p, { title: "Order confirmation email", refs: ["cart/Has items/user.CHECKOUT"], technical: false });
moveTask(p, origin.id, "doing", "developer");
resolveDrift(p, newDrift(p, { options: FIX_OPTIONS, title: "Code sends the email twice", refs: ["cart/Has items/user.CHECKOUT"], origin: origin.id, happens: "The confirmation email goes out twice.", should: "The customer gets one confirmation email." }).id, "fix-code", [], { option: 1 });

// A draft still being written, shown separately from what awaits the developer.
const draft = newProposal(p, "Inventory checks", "The agent is still writing this change.");
newDrift(p, { options: FIX_OPTIONS, title: "Inventory Model is incomplete", refs: ["cart"], proposal: draft.id, happens: "The code checks inventory before checkout.", should: "The Model does not mention inventory checks; the attached Proposal is still being written." });

withdrawAll(p); // The Drafts above made ghosts of their own; the demo starts with none.
const snapshot = buildSnapshot(p);
if (keep) syncInPlace(join(dir, ".trama"), join(keep, ".trama"));
rmSync(dir, { recursive: true, force: true });

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Trama harness</title></head>
<body><div id="app"></div>
<script>
  window.__posts = [];
  window.acquireVsCodeApi = () => ({ postMessage: (m) => { window.__posts.push(m); console.log("post", JSON.stringify(m)); } });
  window.__snapshot = ${JSON.stringify(snapshot).replace(/</g, "\\u003c")};
  // The real host answers "ready" with a snapshot.
  window.addEventListener("load", () => setTimeout(() => window.postMessage({ type: "snapshot", snapshot: window.__snapshot }, "*"), 0));
</script>
<script src="webview.js"></script></body></html>`;
writeFileSync("extension/dist/harness.html", html);
console.log("wrote extension/dist/harness.html");
