import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getProposal, health, newProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";

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
