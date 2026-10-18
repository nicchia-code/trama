import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProposal, health, newProposal, withProposalLock } from "../src/core/proposals";
import { syncShortNumbers } from "../src/core/short-numbers";
import { lockNameOf, type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-proposal-lock-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("registrations on one Proposal from several processes at once all survive, and the lock leaves nothing behind", async () => {
  const prop = newProposal(p, "Many writers");
  const workers = 6;
  const files = 12;
  const worker = join(dir, "worker.ts");
  writeFileSync(
    worker,
    `import { editInProposal } from ${JSON.stringify(join(import.meta.dir, "../src/core/proposals.ts"))};
import { projectAt } from ${JSON.stringify(join(import.meta.dir, "../src/core/store.ts"))};
const p = projectAt(${JSON.stringify(dir)});
for (let n = 0; n < ${files}; n++) editInProposal(p, ${JSON.stringify(prop.id)}, \`billing/w\${process.env.WORKER}-\${n}.md\`);
`,
  );

  const runs = Array.from({ length: workers }, (_, w) =>
    Bun.spawn([process.execPath, worker], { env: { ...process.env, WORKER: String(w) }, stdout: "pipe", stderr: "pipe" }),
  );
  const exits = await Promise.all(runs.map(async (run) => ({ code: await run.exited, stderr: await new Response(run.stderr).text() })));
  expect(exits.filter((e) => e.code !== 0).map((e) => e.stderr)).toEqual([]);

  const written = Array.from({ length: workers }, (_, w) => Array.from({ length: files }, (_, n) => `billing/w${w}-${n}.md`)).flat();
  const after = getProposal(p, prop.id);
  expect(Object.keys(after.data.base).sort()).toEqual(written.sort());
  expect(health(p, after).unbased).toEqual([]);
  expect(readdirSync(join(p.dir, "proposals", ".locks"))).toEqual([".gitignore"]);
}, 60_000);

test("the lock of a Proposal is taken on its folder name, before its file is read", () => {
  const prop = newProposal(p, "Corrupt");
  writeFileSync(join(prop.dir, "proposal.md"), "---\nstatus: [unclosed\n---\n# Corrupt\n");
  expect(withProposalLock(p, prop.id, (id) => id)).toBe(prop.id);
  expect(() => getProposal(p, prop.id)).toThrow();
});

test("a numbered Proposal is locked under one name however it is cited", () => {
  const folder = join(p.dir, "proposals", "0007-numbered");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "proposal.md"), "---\nstatus: draft\nbase: {}\ndelete: []\n---\n# Numbered\n");
  const dir = join(p.dir, "proposals");
  expect(lockNameOf(dir, "7", "Proposal")).toBe("0007");
  expect(lockNameOf(dir, "0007", "Proposal")).toBe("0007");
  expect(lockNameOf(dir, "0007-numbered", "Proposal")).toBe("0007");
  expect(withProposalLock(p, "7", (id) => id, true)).toBe("0007");
  expect(() => lockNameOf(dir, "8", "Proposal")).toThrow('No Proposal with ID "8"');
});

test("a short number of a live Proposal names it under its lock", () => {
  const prop = newProposal(p, "Live");
  const label = syncShortNumbers(p).label("proposal", prop.id);
  expect(withProposalLock(p, String(label), (id) => id, true)).toBe(prop.id);
});

test("a short number whose Proposal closed before the lock is taken is refused, and nothing runs", () => {
  const prop = newProposal(p, "Closing");
  const label = String(syncShortNumbers(p).label("proposal", prop.id));
  const file = join(prop.dir, "proposal.md");
  writeFileSync(file, readFileSync(file, "utf8").replace(/^status: .*$/m, "status: discarded"));
  let ran = false;
  expect(() => withProposalLock(p, label, () => { ran = true; }, true)).toThrow(`${label} no longer names a live Proposal`);
  expect(ran).toBe(false);
});

test("a short number the saved numbers do not name is refused before any card is read", () => {
  const prop = newProposal(p, "Unsaved");
  const label = String(syncShortNumbers(p).label("proposal", prop.id));
  rmSync(join(p.dir, "short-numbers", "assigned"), { force: true });
  writeFileSync(join(prop.dir, "proposal.md"), "---\nstatus: [unclosed\n---\n# Unsaved\n");
  let ran = false;
  expect(() => withProposalLock(p, label, () => { ran = true; }, true)).toThrow(`${label} is not in the short numbers saved`);
  expect(ran).toBe(false);
});
