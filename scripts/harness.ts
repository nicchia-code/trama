// Builds extension/dist/harness.html: the webview running in a plain browser against a demo snapshot,
// with a mocked acquireVsCodeApi. Open it with Chrome to look at the UI without VS Code.
// Every message the webview posts is appended to window.__posts.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editInProposal, newProposal } from "../src/core/proposals";
import { buildSnapshot } from "../src/core/snapshot";
import { projectAt } from "../src/core/store";
import { moveTask, newDrift, newTask } from "../src/core/work";

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

// Drifts: one plain, one with its own Proposal.
newDrift(p, { title: "Code refunds after the package is picked up", refs: ["order/Shipped"], body: "src/refund.ts refunds even when the courier already picked the package up." });
const forgotten = newProposal(p, "Orders can be lost in transit", "The code handles a lost package; the Model forgot it.");
const lost = editInProposal(p, forgotten.id, "checkout/payment.md");
writeFileSync(lost, readFileSync(lost, "utf8").replace("### Declined (final)", "### Declined (final)\n### Written off (final)"));
newDrift(p, { title: "Code has a Written off payment", refs: ["payment"], proposal: forgotten.id, body: "worker/lost.ts writes the payment off after 30 days." });

// Tasks in every column.
newTask(p, { title: "Implement refunds for prepared orders", refs: ["order/Refunding", "order/Paid/user.CANCEL"], technical: false, body: "When a paid order is cancelled after preparation has started, the customer is refunded and the courier is told." });
newTask(p, { title: "Payment declined email", refs: ["order/Awaiting payment/payment.DECLINED"], technical: false });
const doing = newTask(p, { title: "Cart confirmation", refs: ["cart/Has items/user.CHECKOUT"], technical: false });
const done = newTask(p, { title: "Upgrade dependencies", refs: [], technical: true });
moveTask(p, doing.id, "doing", "developer");
moveTask(p, done.id, "done", "developer");
// Taken by the agent: alone, and as one Task of a design.
moveTask(p, newTask(p, { title: "Refund after pickup", refs: ["order/Refunding"], technical: false }).id, "doing", "agent");
const returns = newProposal(p, "Returns after shipping");
const returnTask = (title: string) => newTask(p, { title, refs: ["order/Shipped"], technical: false, proposal: returns.id }).id;
returnTask("Return request");
moveTask(p, returnTask("Refund on return"), "doing", "agent");

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
