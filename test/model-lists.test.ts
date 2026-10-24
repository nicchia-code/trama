import { expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { bunBinDir, ompModels, ompPathVariable, parseOmpList, parseOmpModels } from "../extension/src/host/model-lists";

test("omp suggests each model's selector, labelled by its name only when they differ", () => {
  const output = JSON.stringify({
    models: [
      { selector: "anthropic/claude-a", name: "Claude A" },
      { selector: "openai/gpt-b", name: "openai/gpt-b" },
      { selector: "anthropic/claude-a", name: "Claude A again" },
      { name: "no selector" },
    ],
  });
  expect(parseOmpModels(output)).toEqual([{ value: "anthropic/claude-a", label: "Claude A" }, { value: "openai/gpt-b" }]);
});

test("omp output that is not the models list gives no list; an empty list is a list", () => {
  expect(parseOmpModels("not json")).toBeUndefined();
  expect(parseOmpModels(JSON.stringify({ models: "none" }))).toBeUndefined();
  expect(parseOmpModels(JSON.stringify({ models: [] }))).toEqual([]);
});

test("omp lists the thinking levels a model declares, in its order; null, absent or invalid ones declare none", () => {
  const output = JSON.stringify({
    models: [
      { selector: "anthropic/claude-a", name: "Claude A", thinking: ["low", "high", "max"] },
      { selector: "anthropic/claude-b", name: "Claude B", thinking: null },
      { selector: "openai/gpt-c" },
      { selector: "openai/gpt-d", thinking: [] },
      { selector: "openai/gpt-e", thinking: ["high", 3] },
      { selector: "openai/gpt-f", thinking: "high" },
    ],
  });
  expect(parseOmpModels(output)).toEqual([
    { value: "anthropic/claude-a", label: "Claude A", thinking: ["low", "high", "max"] },
    { value: "anthropic/claude-b", label: "Claude B" },
    { value: "openai/gpt-c" },
    { value: "openai/gpt-d" },
    { value: "openai/gpt-e" },
    { value: "openai/gpt-f" },
  ]);
});

// Windows has no `#!/bin/sh` programs, so the tests that run a fake omp are skipped there.
const posix = process.platform === "win32" ? test.skip : test;

function fakeOmp(root: string, script: string): string {
  const program = join(root, "omp");
  writeFileSync(program, `#!/bin/sh\n${script}\n`);
  chmodSync(program, 0o755);
  return program;
}

test("omp models names a missing program, with the path it used", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = join(root, "no-such-omp");
    expect(await ompModels(program)).toEqual({ models: [], error: `omp not found at ${program}`, missing: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

posix("omp models lists the selectors its standard output gives", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const json = JSON.stringify({ models: [{ selector: "anthropic/claude-a", name: "Claude A", provider: "anthropic" }, { selector: "openai/gpt-b", name: "openai/gpt-b", provider: "openai-codex" }] });
    const program = fakeOmp(root, `cat <<'EOF'\n${json}\nEOF`);
    expect(await ompModels(program)).toEqual({ models: [{ value: "anthropic/claude-a", label: "Claude A" }, { value: "openai/gpt-b" }], providers: ["anthropic", "openai-codex"] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

posix("omp models names a program that does not answer in time", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = fakeOmp(root, "exec sleep 5");
    expect(await ompModels(program, 200)).toEqual({ models: [], error: "omp models did not answer within 0.2 s" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

posix("omp models names the exit code when omp fails, and never reads a list from its standard output", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = fakeOmp(root, "printf '%s' '{\"models\":[{\"selector\":\"a/b\"}]}'\necho failure >&2\nexit 3");
    expect(await ompModels(program)).toEqual({ models: [], error: "omp exited with code 3" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("omp runs with the folder of trama.ompPath in front of the PATH, then the folder of bun", () => {
  expect(ompPathVariable("/opt/omp/bin/omp", { PATH: "/usr/bin" })).toBe(["/opt/omp/bin", bunBinDir({ PATH: "/usr/bin" }), "/usr/bin"].join(delimiter));
  expect(ompPathVariable("", { PATH: "/usr/bin", BUN_INSTALL: "/srv/bun" })).toBe([join("/srv/bun", "bin"), "/usr/bin"].join(delimiter));
  expect(ompPathVariable("", { PATH: "/usr/bin", BUN_INSTALL: "" })).toBe([join(homedir(), ".bun", "bin"), "/usr/bin"].join(delimiter));
  expect(ompPathVariable(join("/srv/bun", "bin", "omp"), { PATH: "/usr/bin", BUN_INSTALL: "/srv/bun" })).toBe([join("/srv/bun", "bin"), "/usr/bin"].join(delimiter));
  expect(bunBinDir({ BUN_INSTALL: "/srv/bun" })).toBe(join("/srv/bun", "bin"));
});

posix("omp models says it did not return a list when its output is not JSON", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const program = fakeOmp(root, "echo not-json");
    expect(await ompModels(program)).toEqual({ models: [], error: "omp models did not return a valid list" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("omp's providers are the unique non-empty texts of models[].provider, in order, from the same list", () => {
  const output = JSON.stringify({
    models: [
      { selector: "a/1", provider: "anthropic" },
      { selector: "a/2", provider: "anthropic" },
      { selector: "x/1", provider: "xai-oauth" },
      { selector: "n/1", provider: "" },
      { selector: "n/2", provider: 3 },
      { selector: "n/3" },
    ],
  });
  expect(parseOmpList(output)?.providers).toEqual(["anthropic", "xai-oauth"]);
  expect(parseOmpList(output)?.models.map((model) => model.value)).toEqual(["a/1", "a/2", "x/1", "n/1", "n/2", "n/3"]);
  expect(parseOmpList(JSON.stringify({ models: [] }))).toEqual({ models: [], providers: [] });
  expect(parseOmpList("not json")).toBeUndefined();
});

posix("omp models has no providers when its list is in error, which leaves every provider unknown", async () => {
  const root = mkdtempSync(join(tmpdir(), "trama-omp-"));
  try {
    const failing = fakeOmp(root, "printf '%s' '{\"models\":[{\"selector\":\"a/b\",\"provider\":\"anthropic\"}]}'\nexit 3");
    const failed = await ompModels(failing);
    expect(failed.error).toBe("omp exited with code 3");
    expect(failed).not.toHaveProperty("providers");
    const garbage = fakeOmp(root, "echo not-json");
    expect(await ompModels(garbage)).not.toHaveProperty("providers");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
