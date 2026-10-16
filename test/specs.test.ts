import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildProject, resolveProjectRef } from "../src/core/requirements";
import { scanScope } from "../src/core/scan-scope";
import { SPECS_FILE, parseSpecs } from "../src/core/specs";
import type { FileMap } from "../src/core/types";
import { readTracked } from "../src/core/store";

const shop = join(import.meta.dir, "../examples/shop/.trama");
const shopFiles = (): FileMap => readTracked(shop);
const withSpecs = (text: string): FileMap => new Map([...shopFiles(), [SPECS_FILE, text]]);
const messages = (text: string) => parseSpecs(SPECS_FILE, text).diagnostics.map((d) => d.message);

describe("parseSpecs", () => {
  test("reads entries, optional fields and notes", () => {
    const { specs, diagnostics } = parseSpecs(
      SPECS_FILE,
      [
        "languages:",
        "  - name: TypeScript",
        "    version: '5.6'",
        "frameworks:",
        "  - name: React",
        "    chosenByAgent: fits the existing UI",
        "notes: |",
        "  Free **Markdown**.",
        "",
      ].join("\n"),
    );
    expect(diagnostics).toEqual([]);
    expect(specs.lists.languages).toEqual([{ name: "TypeScript", version: "5.6", note: null, chosenByAgent: null }]);
    expect(specs.lists.frameworks).toEqual([{ name: "React", version: null, note: null, chosenByAgent: "fits the existing UI" }]);
    expect(specs.lists.data).toEqual([]);
    expect(specs.notes).toBe("Free **Markdown**.\n");
  });

  test("an empty file is a valid Specs with every field empty", () => {
    expect(parseSpecs(SPECS_FILE, "").diagnostics).toEqual([]);
  });

  test("names an unknown field, a field out of order, and a non-list field", () => {
    expect(messages("colours:\n  - name: Red\n")).toEqual([`"colours" is not a Specs field; the fields are languages, frameworks, data, testing, ci, repository, deployment, cloud, infrastructure, notes`]);
    expect(messages("frameworks: []\nlanguages: []\n")[0]).toContain("fields must be in this order");
    expect(messages("languages: TypeScript\n")).toEqual(["languages must be a list of entries"]);
  });

  test("checks each entry: name, keys, text types and chosenByAgent", () => {
    expect(messages("languages:\n  - version: '1'\n")).toEqual(["languages entry 1: name is required and must be non-empty text"]);
    expect(messages("languages:\n  - name: ' '\n")).toEqual(["languages entry 1: name is required and must be non-empty text"]);
    expect(messages("languages:\n  - name: Go\n    colour: blue\n")).toEqual([`languages entry 1: "colour" is not an entry field; the fields are name, version, note, chosenByAgent`]);
    expect(messages("languages:\n  - name: Go\n    version: 1.2\n")).toEqual([`languages "Go": version must be text`]);
    expect(messages("languages:\n  - name: Go\n    chosenByAgent: ''\n")).toEqual([`languages "Go": chosenByAgent must be non-empty text when present`]);
  });

  test("two entries of one field cannot share a name, whatever the case", () => {
    expect(messages("ci:\n  - name: GitHub Actions\n  - name: github actions\n")).toEqual([`ci: two entries are named "github actions" (names are compared without case)`]);
  });

  test("invalid YAML is one diagnostic and an empty Specs", () => {
    const { specs, diagnostics } = parseSpecs(SPECS_FILE, "languages: [");
    expect(diagnostics).toHaveLength(1);
    expect(specs.lists.languages).toEqual([]);
  });
});

describe("Specs in the project", () => {
  test("a missing file reads as every field empty, with no diagnostics", () => {
    const project = buildProject(shopFiles());
    expect(project.specs.lists.frameworks).toEqual([]);
    expect(project.specs.notes).toBe("");
    expect(project.diagnostics.filter((d) => d.file === SPECS_FILE)).toEqual([]);
  });

  test("an invalid specs.yaml is a project diagnostic naming the file", () => {
    const project = buildProject(withSpecs("colours: []\n"));
    expect(project.diagnostics.some((d) => d.file === SPECS_FILE)).toBe(true);
  });

  test("specs.yaml is not Model", () => {
    const project = buildProject(withSpecs("frameworks:\n  - name: React\n"));
    expect(project.model.features.size).toBe(buildProject(shopFiles()).model.features.size);
    expect(project.specs.lists.frameworks.map((e) => e.name)).toEqual(["React"]);
  });

  test("specs and specs#<field> resolve, a field outside the fixed names does not", () => {
    const project = buildProject(shopFiles());
    expect(resolveProjectRef(project, "specs")).toMatchObject({ kind: "specs", field: null });
    expect(resolveProjectRef(project, "specs#frameworks")).toMatchObject({ kind: "specs", field: "frameworks" });
    expect(resolveProjectRef(project, "specs#notes")).toMatchObject({ kind: "specs", field: "notes" });
    expect(() => resolveProjectRef(project, "specs#colours")).toThrow('Specs has no field "colours"');
  });

  test("changing a Specs field adds its scope entry only", () => {
    const before = buildProject(shopFiles());
    const after = buildProject(withSpecs("frameworks:\n  - name: React\n"));
    expect(scanScope(before, after)).toEqual([{ ref: "specs#frameworks", reason: "changed" }]);
  });

  test("removing an existing Specs file changes each field it had", () => {
    const before = buildProject(withSpecs("frameworks:\n  - name: React\nnotes: hi\n"));
    const after = buildProject(shopFiles());
    expect(scanScope(before, after).map((e) => e.ref)).toEqual(["specs#frameworks", "specs#notes"]);
  });

  test("an unchanged Specs file adds no scope", () => {
    const text = readFileSync(join(import.meta.dir, "../examples/shop/.trama/model/system.md"), "utf8");
    expect(scanScope(buildProject(withSpecs(text)), buildProject(withSpecs(text)))).toEqual([]);
  });
});
