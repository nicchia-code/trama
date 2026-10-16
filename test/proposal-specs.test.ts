import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changes, deleteInProposal, editInProposal, getProposal, newProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-proposal-specs-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("edit writes specs.yaml into the Proposal empty when the project has none, and registers it as base", () => {
  const prop = newProposal(p, "Add specs");
  const path = editInProposal(p, prop.id, "specs.yaml");
  expect(path).toBe(join(prop.dir, "specs.yaml"));
  expect(readFileSync(path, "utf8")).toBe("");
  expect(getProposal(p, prop.id).data.base["specs.yaml"]).toBe("new");
});

test("edit fills specs.yaml with the current Specs and show reports the change field by field", () => {
  writeFileSync(join(dir, ".trama", "specs.yaml"), "languages:\n  - name: TypeScript\n    version: '5.6'\nframeworks:\n  - name: React\n");
  const prop = newProposal(p, "Upgrade");
  const path = editInProposal(p, prop.id, "specs.yaml");
  expect(readFileSync(path, "utf8")).toContain("TypeScript");
  writeFileSync(path, "languages:\n  - name: TypeScript\n    version: '5.7'\n  - name: Go\n    chosenByAgent: fits the CLI\nframeworks:\n  - name: React\n");
  const details = changes(p, getProposal(p, prop.id)).find((c) => c.path === "specs.yaml")?.details ?? [];
  expect(details).toEqual([`~ languages: TypeScript version "5.6" → "5.7"`, "+ languages: Go"]);
});

test("delete marks specs.yaml for deletion, and refuses when there is no Specs to delete", () => {
  writeFileSync(join(dir, ".trama", "specs.yaml"), "notes: hello\n");
  const prop = newProposal(p, "Drop specs");
  deleteInProposal(p, prop.id, "specs.yaml");
  expect(getProposal(p, prop.id).data.delete).toContain("specs.yaml");
  expect(changes(p, getProposal(p, prop.id)).find((c) => c.path === "specs.yaml")?.change).toBe("removed");
  rmSync(join(dir, ".trama", "specs.yaml"));
  const empty = newProposal(p, "Nothing");
  expect(() => deleteInProposal(p, empty.id, "specs.yaml")).toThrow("does not exist");
});
