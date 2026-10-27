import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const shop = join(import.meta.dir, "../examples/shop");

/** The cards `examples/shop` carries as the product of its own Tasks; the tests that copy it want a project with Model and Requirements and no cards. */
const CARDS = ["proposals", "tasks", "history", "drifts", "short-numbers"];

/** Copies `examples/shop` into `dest` without its Proposals, Tasks, History, Drifts and short numbers. */
export function copyShop(dest: string): void {
  cpSync(shop, dest, { recursive: true });
  for (const name of CARDS) rmSync(join(dest, ".trama", name), { recursive: true, force: true });
}
