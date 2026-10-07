import { afterAll, beforeAll, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runClassify } from "../src/cli/main";

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-classify-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("trama classify prints the editor's one word and exits 0; only a wrong use fails", async () => {
  const seen: string[] = [];
  const classify = async (_p: unknown, machine: string, state: string) => (seen.push(machine, state), { answer: "conflict" as const, reason: "Jev answered HTTP 500." });
  expect(await runClassify(["classify", "--machine", "order"], dir, "state\n", { classify })).toEqual({ out: "conflict", err: "Jev answered HTTP 500.", exit: 0 });
  expect(seen).toEqual(["order", "state\n"]);
  expect(await runClassify(["classify", "--machine", "order"], dir, "state", { classify: async () => ({ answer: "unavailable" }) })).toEqual({ out: "unavailable", exit: 0 });

  expect((await runClassify(["classify", "--machine", "nope"], dir, "state", { classify })).exit).toBe(1);
  expect((await runClassify(["classify", "--machine", "order"], dir, " \n", { classify })).exit).toBe(2);
  expect((await runClassify(["classify"], dir, "state", { classify })).exit).toBe(2);
  expect(seen).toHaveLength(2);
});
